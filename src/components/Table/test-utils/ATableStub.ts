import { defineComponent, h, type PropType } from "vue";

interface StubColumn {
  title?: unknown;
}

interface StubScroll {
  x?: number | string | true;
  y?: number | string;
}

/** 模拟 a-table 的 showHeader 默认行为，供包装组件回归测试使用。 */
export default defineComponent({
  name: "ATableStub",
  props: {
    columns: {
      type: Array as PropType<StubColumn[]>,
      default: () => [],
    },
    dataSource: {
      type: Array,
      default: () => [],
    },
    locale: {
      type: Object as PropType<Record<string, unknown>>,
      default: undefined,
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
    scroll: {
      type: Object as PropType<StubScroll>,
      default: undefined,
    },
    pagination: {
      type: [Boolean, Object] as PropType<boolean | Record<string, unknown>>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    /** 模拟用户切换到第二页，触发 a-table 对 pagination.onChange 的调用。 */
    function handleGoSecondPage(): void {
      if (props.pagination && typeof props.pagination === "object") {
        const onChange = props.pagination.onChange;

        if (typeof onChange === "function") onChange(2, 10);
      }
    }

    /** 模拟 Ant Table 在空数据时优先读取 emptyText Slot，再读取 locale.emptyText。 */
    function renderNativeEmptyText():
      | string
      | ReturnType<NonNullable<typeof slots.emptyText>> {
      const slotContent = slots.emptyText?.();

      if (slotContent) return slotContent;
      const localeContent = props.locale?.emptyText;
      return typeof localeContent === "function"
        ? String(localeContent)
        : String(localeContent ?? "");
    }

    return () =>
      h(
        "div",
        {
          "data-current": String(
            props.pagination && typeof props.pagination === "object"
              ? (props.pagination.current ?? "")
              : "",
          ),
          "data-scroll-x": String(props.scroll?.x ?? ""),
          "data-scroll-y": String(props.scroll?.y ?? ""),
        },
        [
          h("table", [
            props.showHeader
              ? h(
                  "thead",
                  props.columns.map((column) =>
                    h("th", String(column.title ?? "")),
                  ),
                )
              : undefined,
            props.dataSource.length === 0
              ? h("tbody", [h("tr", [h("td", renderNativeEmptyText())])])
              : undefined,
          ]),
          props.pagination === false
            ? undefined
            : h("footer", { "data-pagination": "true" }, [
                h(
                  "button",
                  {
                    "data-go-second-page": "true",
                    onClick: handleGoSecondPage,
                  },
                  "next",
                ),
              ]),
        ],
      );
  },
});
