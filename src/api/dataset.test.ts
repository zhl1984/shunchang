import axios, { AxiosError, type AxiosAdapter } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import http from "@/api/http";
import { getDatasetSamplesApi } from "@/api/dataset";

vi.mock("@/router", () => ({ toLogin: vi.fn() }));

const originalAdapter = http.defaults.adapter;

/** 模拟传输层按 validateStatus 分流响应，保留真实 HTTP 拦截器以验证不会整页跳转。 */
function respondWith(status: number, data: unknown): void {
  const adapter: AxiosAdapter = async (config) => {
    const response = { status, data, statusText: "", headers: {}, config };
    if (!config.validateStatus || config.validateStatus(status)) {
      return response;
    }
    // 与 Axios 传输层一致，未被接管的错误进入全局 rejected 拦截器。
    throw new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      config,
      undefined,
      response,
    );
  };
  http.defaults.adapter = adapter;
}

afterEach(() => {
  http.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
});

describe("dataset sample request failures", () => {
  it("keeps HTTP 404 local and allows a successful retry", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      performance: window.performance,
      location: { pathname: "/dataset-management/101", assign },
    });
    respondWith(404, { message: "样本接口不存在" });

    await expect(getDatasetSamplesApi({ datasetId: 101 })).rejects.toThrow(
      "样本接口不存在",
    );
    expect(assign).not.toHaveBeenCalled();

    respondWith(200, {
      code: "0",
      data: { list: [{ itemId: 132 }], total: 1, pageNo: 1, pageSize: 30 },
    });
    await expect(getDatasetSamplesApi({ datasetId: 101 })).resolves.toEqual({
      list: [{ id: 132, name: null, imagePath: null }],
      total: 1,
      page: 1,
      pageSize: 30,
    });
    // 接管规则只属于样本请求，不能改变其他接口的全局状态判断。
    expect(http.defaults.validateStatus).toBe(axios.defaults.validateStatus);
  });

  it("rejects HTTP 404 even with a success business code", async () => {
    respondWith(404, { code: "0", data: { list: [] } });
    await expect(getDatasetSamplesApi({ datasetId: 101 })).rejects.toThrow(
      "暂时无法获取数据集样本，请稍后重试。",
    );
  });
});
