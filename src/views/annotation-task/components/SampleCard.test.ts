/* eslint-disable vue/one-component-per-file, vue/component-definition-name-casing, vue/require-default-prop */
import { createApp, defineComponent, h } from "vue";

import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it } from "vitest";

import zhCN from "@/locales/messages/zh-CN";
import type { AnnotationTaskSample } from "../types";
import SampleCard from "./SampleCard.vue";

const sample: AnnotationTaskSample = {
  id: "sample-29",
  code: "S-0029",
  name: "样本 29",
  issueLevel: "suggestion",
  issueCount: 1,
  issueSummary: "建议复核边界",
};
const mountedApps: Array<() => void> = [];

/** 挂载样本卡片并用轻量 Ant Design 桩暴露卡片和悬浮内容。 */
function mountSampleCard(
  compact: boolean,
  sampleValue: AnnotationTaskSample = sample,
) {
  const opened: AnnotationTaskSample[] = [];
  const root = defineComponent({
    setup: () => () =>
      h(SampleCard, {
        compact,
        sample: sampleValue,
        onOpen: (value: AnnotationTaskSample) => opened.push(value),
      }),
  });
  const container = document.createElement("div");
  const app = createApp(root);
  app.component("a-card", {
    emits: ["click"],
    setup(_, { emit, slots }) {
      return () =>
        h(
          "button",
          {
            "data-sample-card": "true",
            onClick: () => emit("click"),
          },
          slots.default?.(),
        );
    },
  });
  app.component("a-popover", {
    props: { title: String },
    setup(props, { slots }) {
      return () =>
        h("div", [
          h("span", { "data-popover-title": "true" }, props.title),
          slots.default?.(),
          h("div", { "data-popover-content": "true" }, slots.content?.()),
        ]);
    },
  });
  app.component("a-tag", {
    setup(_, { slots }) {
      return () => h("span", { "data-issue-tag": "true" }, slots.default?.());
    },
  });
  app.use(
    createI18n({ legacy: false, locale: "zh-CN", messages: { "zh-CN": zhCN } }),
  );
  app.mount(container);
  mountedApps.push(() => app.unmount());
  return { container, opened };
}

afterEach(() => mountedApps.splice(0).forEach((unmount) => unmount()));

describe("SampleCard", () => {
  it("reuses the hover details in compact quality records", () => {
    const { container } = mountSampleCard(true);

    expect(container.textContent).toContain("样本 29");
    expect(container.textContent).not.toContain("S-0029");
  });

  it("keeps code, name and issue tag in the full sample list card", () => {
    const { container } = mountSampleCard(false);

    expect(container.textContent).toContain("S-0029");
    expect(container.textContent).toContain("样本 29");
    expect(container.textContent).toContain("建议修改");
  });

  it("shows the no-change status for a sample without issues", () => {
    const { container } = mountSampleCard(false, {
      ...sample,
      issueLevel: "none",
      issueCount: 0,
    });
    expect(container.textContent).toContain("无需修改");
  });

  it.each(["annotating", "completed"] as const)(
    "uses the success style for a no-issue %s sample",
    (status) => {
      const { container } = mountSampleCard(false, {
        ...sample,
        issueLevel: "none",
        issueCount: 0,
        status,
      });

      expect(
        container.querySelector(".annotation-sample-card--success"),
      ).not.toBeNull();
    },
  );
});
