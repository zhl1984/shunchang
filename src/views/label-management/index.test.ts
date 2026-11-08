import { createApp, nextTick } from "vue";

import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

import zhCN from "@/locales/messages/zh-CN";

vi.mock("./components/LabelTreePanel.vue", async () => {
  // 左树桩依次模拟分组、标签和选择失效三类事件。
  const { h } = await import("vue");
  return {
    default: {
      name: "LabelTreePanel",
      emits: ["select"],
      setup(_, { emit }) {
        return () =>
          h("div", [
            h("button", { onClick: () => emit("select", "group-a") }, "group"),
            h("button", { onClick: () => emit("select", "label-a") }, "label"),
            h("button", { onClick: () => emit("select", null) }, "clear"),
          ]);
      },
    },
  };
});

vi.mock("./components/LabelDetailPanel.vue", async () => {
  // 详情桩将 prop 写入 data 属性，便于直接断言页面编排结果。
  const { h } = await import("vue");
  return {
    default: {
      name: "LabelDetailPanel",
      props: { nodeId: [String, Number] },
      setup(props) {
        return () =>
          h("div", { "data-detail-node-id": String(props.nodeId ?? "") });
      },
    },
  };
});

import LabelManagement from "./index.vue";

const mountedApps: Array<() => void> = [];

/** 挂载页面并安装页面标题所需的国际化依赖。 */
function mountPage(): HTMLDivElement {
  // 页面测试不安装 Pinia，因为两个业务子组件已替换为接口桩。
  const container = document.createElement("div");
  const app = createApp(LabelManagement);
  app.use(
    createI18n({
      legacy: false,
      locale: "zh-CN",
      messages: { "zh-CN": zhCN },
    }),
  );
  app.mount(container);
  mountedApps.push(() => app.unmount());
  return container;
}

/** 读取详情组件桩接收到的最新节点 ID。 */
function readDetailNodeId(container: HTMLElement): string {
  return (
    container.querySelector<HTMLElement>("[data-detail-node-id]")?.dataset
      .detailNodeId ?? ""
  );
}

afterEach(() => {
  // 每个用例卸载应用，避免 DOM 和响应式副作用跨用例保留。
  mountedApps.splice(0).forEach((unmount) => unmount());
});

describe("label management page", () => {
  /**
   * 页面不解释节点类型，只保存并透传左树的最新选择。
   * null 必须恢复详情空态，不能保留上一次有效标签。
   */
  it("passes the latest tree selection to the detail panel", async () => {
    const container = mountPage();
    const buttons = container.querySelectorAll("button");

    expect(readDetailNodeId(container)).toBe("");
    buttons[0]?.click();
    await nextTick();
    expect(readDetailNodeId(container)).toBe("group-a");
    buttons[1]?.click();
    await nextTick();
    expect(readDetailNodeId(container)).toBe("label-a");
    buttons[2]?.click();
    await nextTick();
    expect(readDetailNodeId(container)).toBe("");
  });
});
