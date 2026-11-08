<template>
  <div class="dynamic-form-embedded">
    <DynamicFormPanel
      ref="panelRef"
      :schema="context.schema"
      :values="context.values"
      :disabled="context.disabled"
      :theme="context.theme"
      @change="handlePanelChange"
      @validation="handleValidation"
      @resize="handleResize"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";

import DynamicFormPanel from "@/components/dynamic-form/DynamicFormPanel.vue";
import {
  createDynamicFormMessage,
  isDynamicFormMessage,
  type DynamicFormChangePayload,
  type DynamicFormContext,
  type DynamicFormInitPayload,
  type DynamicFormMessage,
  type DynamicFormResizePayload,
  type DynamicFormValidationPayload,
} from "@/dynamic-form/protocol";
import type {
  DynamicFormTheme,
  DynamicFormValidationErrors,
} from "@/dynamic-form/types";

const panelRef = ref<InstanceType<typeof DynamicFormPanel>>();
const context = reactive<DynamicFormContext>({
  objectId: "",
  revision: 0,
  schema: [],
  values: {},
  disabled: false,
  // 首期由宿主显式传入主题，缺省固定为深色，不读取管理端 theme store。
  theme: "dark",
});

/** 只接受来自父级 iframe 宿主的协议消息，避免其他窗口污染表单状态。 */
function handleMessage(event: MessageEvent<unknown>) {
  if (
    event.source !== window.parent ||
    event.origin !== getParentOrigin() ||
    !isDynamicFormMessage(event.data)
  ) {
    return;
  }
  const message = event.data as DynamicFormMessage;
  if (message.event === "INIT" || message.event === "SET_CONTEXT") {
    applyContext(message.payload as DynamicFormInitPayload);
    return;
  }
  if (message.event === "REQUEST_VALIDATE") {
    panelRef.value?.validate();
  }
}

/** 用宿主快照替换当前 iframe 上下文，保持工作台为唯一业务数据源。 */
function applyContext(payload: DynamicFormInitPayload) {
  if (!payload || !Array.isArray(payload.schema) || !payload.values) {
    sendMessage("ERROR", { message: "收到的动态表单上下文无效" });
    return;
  }
  context.objectId = payload.objectId;
  context.revision = payload.revision;
  context.schema = payload.schema;
  context.values = { ...payload.values };
  context.disabled = Boolean(payload.disabled);
  context.theme = payload.theme === "light" ? "light" : "dark";
  applyThemeClass(context.theme);
}

/** 将控件变化写回 iframe 快照，并只向宿主发送字段级变化。 */
function handlePanelChange(name: string, value: unknown) {
  context.values[name] = value;
  sendMessage<DynamicFormChangePayload>("CHANGE", {
    name,
    value,
    values: { ...context.values },
  });
}

/** 将校验结果和字段错误通过统一协议回传工作台。 */
function handleValidation(valid: boolean, errors: DynamicFormValidationErrors) {
  sendMessage<DynamicFormValidationPayload>("VALIDATE_RESULT", {
    valid,
    errors,
  });
}

/** 将动态内容高度回传给工作台，由工作台调整 iframe 高度。 */
function handleResize(height: number) {
  sendMessage<DynamicFormResizePayload>("RESIZE", { height });
}

function sendMessage<T>(event: DynamicFormMessage["event"], payload?: T) {
  if (window.parent === window) return;
  const parentOrigin = getParentOrigin();
  window.parent.postMessage(
    createDynamicFormMessage(event, payload, {
      objectId: context.objectId,
      revision: context.revision,
    }),
    parentOrigin,
  );
}

/** 只向当前嵌入页面的 origin 回传消息，避免生产环境使用通配 targetOrigin。 */
function getParentOrigin() {
  return document.referrer
    ? new URL(document.referrer).origin
    : window.location.origin;
}

/** 根据宿主传入参数切换管理端根主题类，不读取主站主题状态。 */
function applyThemeClass(nextTheme: DynamicFormTheme) {
  document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  document.documentElement.classList.toggle(
    "theme-light",
    nextTheme === "light",
  );
}

onMounted(() => {
  document.documentElement.classList.add("dynamic-form-embedded-page");
  applyThemeClass(context.theme || "dark");
  window.addEventListener("message", handleMessage);
  sendMessage("READY");
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
  document.documentElement.classList.remove("dynamic-form-embedded-page");
});
</script>

<style scoped lang="less">
.dynamic-form-embedded {
  min-height: 0;
  padding: 0;
  overflow: visible;
  background: #111827;
}
</style>
