import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { Modal } from "ant-design-vue";

import { i18n } from "@/locales";
import { toLogin } from "@/router";

export interface HttpError extends Error {
  code?: string;
  data?: unknown;
  originalError: AxiosError;
  status?: number;
}

/** 统一读取 Axios fulfilled/rejected 响应中可能存在的后端错误消息。 */
export function getHttpResponseMessage(response: unknown): string | undefined {
  if (typeof response !== "object" || response === null) return undefined;
  const outer = response as { message?: unknown; data?: unknown };
  const inner =
    typeof outer.data === "object" && outer.data !== null
      ? (outer.data as { message?: unknown })
      : undefined;
  if (typeof inner?.message === "string" && inner.message) return inner.message;
  if (typeof outer.message === "string" && outer.message) return outer.message;
  return undefined;
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

const visibleErrorModals = new Set<number | "network">();
const pendingAutoCancelRequests = new Map<string, AbortController>();

const statusMessageKeys: Partial<Record<number, string>> = {
  403: "http.errors.403",
  408: "http.errors.408",
  429: "http.errors.429",
  500: "http.errors.500",
  502: "http.errors.502",
  503: "http.errors.503",
  504: "http.errors.504",
};

/** 根据 autoCancel 配置生成重复请求的唯一标识。 */
function getAutoCancelKey(
  config: InternalAxiosRequestConfig,
): string | undefined {
  if (!config.autoCancel) {
    return undefined;
  }

  if (typeof config.autoCancel === "function") {
    return config.autoCancel(config);
  }

  if (typeof config.autoCancel === "string") {
    return config.autoCancel;
  }

  return config.url;
}

/** 注册自动取消控制器，并取消相同 key 的前一个未完成请求。 */
function registerAutoCancel(config: InternalAxiosRequestConfig) {
  const key = getAutoCancelKey(config);

  if (!key) {
    return;
  }

  pendingAutoCancelRequests.get(key)?.abort();

  const controller = new AbortController();
  const originalSignal = config.signal;

  if (originalSignal?.aborted) {
    controller.abort();
  } else if (originalSignal) {
    originalSignal.addEventListener?.("abort", () => controller.abort(), {
      once: true,
    });
  }

  config.signal = controller.signal;
  config.autoCancelController = controller;
  config.autoCancelKey = key;
  pendingAutoCancelRequests.set(key, controller);
}

/** 请求完成后清理属于当前请求的自动取消控制器。 */
function clearAutoCancel(config?: InternalAxiosRequestConfig) {
  const key = config?.autoCancelKey;
  const controller = config?.autoCancelController;

  if (key && controller && pendingAutoCancelRequests.get(key) === controller) {
    pendingAutoCancelRequests.delete(key);
  }
}

/** 统一处理自动取消与登录 Token 请求配置。 */
http.interceptors.request.use((config) => {
  registerAutoCancel(config);
  return config;
});

/** 从未知响应数据中读取后端返回的错误信息。 */
function getResponseMessage(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("message" in data)) {
    return undefined;
  }

  return typeof data.message === "string" ? data.message : undefined;
}

/** 将 Axios 错误转换为包含状态码和响应数据的统一请求错误。 */
function createHttpError(error: AxiosError): HttpError {
  const responseMessage =
    getHttpResponseMessage(error.response) ??
    getResponseMessage(error.response?.data);
  const message = responseMessage ?? error.message ?? "Request failed";
  const httpError = new Error(message) as HttpError;

  httpError.name = "HttpError";
  httpError.code = error.code;
  httpError.data = error.response?.data;
  httpError.originalError = error;
  httpError.status = error.response?.status;

  return httpError;
}

/** 将无权限或资源不存在的请求统一导向 404 页面，不打断用户操作。 */
function redirectToNotFound() {
  if (window.location.pathname === "/404") return;
  window.location.assign("/404");
}

/** 根据常见 HTTP 状态码显示全局错误弹框，并避免同类弹框重复出现。 */
function showHttpErrorModal(error: HttpError) {
  const modalKey = error.status ?? "network";

  if (visibleErrorModals.has(modalKey)) {
    return;
  }

  visibleErrorModals.add(modalKey);

  const messageKey = error.status
    ? statusMessageKeys[error.status]
    : "http.errors.network";
  const content = messageKey ? i18n.global.t(messageKey) : error.message;

  Modal.error({
    title: i18n.global.t("http.errorTitle"),
    content,
    okText: i18n.global.t("common.confirm"),
    onOk: () => {
      visibleErrorModals.delete(modalKey);
    },
    afterClose: () => {
      visibleErrorModals.delete(modalKey);
    },
  });
}

http.interceptors.response.use(
  (response) => {
    clearAutoCancel(response.config);
    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      const axiosResponse = axiosError.response;
      const requestConfig = axiosError.config;
      clearAutoCancel(requestConfig);

      if (axios.isCancel(axiosError)) {
        return Promise.reject(axiosError);
      }

      const httpError = createHttpError(axiosError);

      // 400 通常携带可供业务层展示的校验信息，resolve 原始响应交给调用方处理。
      if (httpError.status === 400) {
        return Promise.resolve(axiosResponse);
      }

      // 登录失效不弹窗，避免遮挡登录跳转；403 提示后再跳转，404 直接跳转。
      if (httpError.status === 401) {
        await toLogin();
        return Promise.reject(httpError);
      }
      if (httpError.status === 404) {
        redirectToNotFound();
        return Promise.reject(httpError);
      }

      if (!requestConfig?.skipError) {
        showHttpErrorModal(httpError);
      }
      return Promise.reject(httpError);
    }

    return Promise.reject(error);
  },
);

export default http;
