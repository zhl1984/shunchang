import { defineComponent, h, ref } from "vue";

import AppTable from "../index.vue";

export const paginationHarnessData = ref([
  { name: "规则一" },
  { name: "规则二" },
]);

/** 提供可响应更新 dataSource 的独立测试宿主，避免在测试文件内声明额外组件。 */
export default defineComponent({
  name: "PaginationHarness",
  setup() {
    return () =>
      h(AppTable, {
        columns: [{ key: "name", dataIndex: "name", title: "名称" }],
        dataSource: paginationHarnessData.value,
        pagination: {},
      });
  },
});
