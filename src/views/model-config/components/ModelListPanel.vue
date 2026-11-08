<script setup lang="ts">
import { computed } from "vue";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons-vue";
import { Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import DmAppTable from "@/components/Table/index.vue";
import type {
  DmFilterOption,
  DmTableColumn,
  DmTableQuery,
} from "@/components/Table/types";
import type { ModelRecord } from "@/views/model-config/types";
const props = defineProps<{
  loading?: boolean;
  models: ModelRecord[];
  pageNo: number;
  pageSize: number;
  searchValue: string;
  total: number;
}>();
const emit = defineEmits<{
  (event: "create"): void;
  (event: "delete", model: ModelRecord): void;
  (event: "edit", model: ModelRecord): void;
  (event: "view", model: ModelRecord): void;
  (event: "queryChange", query: DmTableQuery): void;
  (event: "search", value: string): void;
  (event: "update:searchValue", value: string): void;
}>();
const { t } = useI18n();
const iterationFilterOptions = computed<DmFilterOption[]>(() => [
  { value: "true", label: t("modelConfig.modelList.filter.supported") },
  { value: "false", label: t("modelConfig.modelList.filter.unsupported") },
]);
const iterationStatusClass = {
  ready: "dm-tag-3",
  notReady: "dm-tag-5",
  unsupported: "dm-tag-5",
} as const;
const columns = computed<DmTableColumn<ModelRecord>[]>(() => [
  {
    title: t("modelConfig.connectModal.name"),
    dataIndex: "name",
    key: "name",
    className: "table-bold-cell",
    fixed: "left",
    width: 240,
  },
  {
    title: t("modelConfig.connectModal.purpose"),
    dataIndex: "description",
    key: "description",
    width: 220,
  },
  {
    title: t("modelConfig.modelList.selfIterationStatus"),
    dataIndex: "selfIterationSupported",
    key: "selfIterationSupported",
    width: 180,
    dmFilter: {
      type: "enum",
      multiple: false,
      options: iterationFilterOptions.value,
    },
  },
  {
    title: t("modelConfig.modelList.accessTime"),
    dataIndex: "updatedAt",
    key: "updatedAt",
    sorter: true,
    width: 200,
  },
  {
    title: t("modelConfig.modelList.confidence"),
    dataIndex: "confidence",
    key: "confidence",
    width: 160,
  },
  {
    title: t("modelConfig.modelList.actions"),
    key: "actions",
    className: "table-actions-cell",
    fixed: "right",
    width: 180,
  },
]);
/** 将统一表格产生的过滤、排序和分页查询完整交给页面层处理。 */
function handleTableFilter(query: DmTableQuery): void {
  emit("queryChange", query);
}
/** 将搜索框当前值提交给页面层，由页面统一管理接口查询条件。 */
function handleSearch(): void {
  emit("search", props.searchValue);
}
/** 同步搜索框输入值；清空时立即提交空关键词以恢复完整列表。 */
function handleSearchInput(value: string): void {
  emit("update:searchValue", value);
  // a-input 的清除按钮通过值更新事件返回空字符串，需要在此主动查询。
  if (value === "") emit("search", "");
}
/** 打开删除确认并通知页面层执行删除。 */
function handleDeleteModel(model: ModelRecord): void {
  Modal.confirm({
    title: t("modelConfig.deleteModal.title"),
    content: t("modelConfig.deleteModal.description", { name: model.name }),
    okText: t("modelConfig.deleteModal.confirm"),
    cancelText: t("modelConfig.connectModal.cancel"),
    okButtonProps: { danger: true },
    centered: true,
    onOk: () => emit("delete", model),
  });
}
</script>
<template>
  <a-card :bordered="false" class="model-list-table-card">
    <DmAppTable
      row-key="key"
      :table-title="t('modelConfig.modelList.title')"
      :columns="columns"
      :data-source="props.models"
      :loading="props.loading"
      mode="service"
      :pagination="{
        current: props.pageNo,
        pageSize: props.pageSize,
        total: props.total,
        showSizeChanger: true,
        pageSizeOptions: ['5', '10', '20', '50', '100'],
      }"
      :scroll="{ x: 1280 }"
      @filter="handleTableFilter"
    >
      <template #titleTool>
        <a-input
          :value="props.searchValue"
          class="model-list-search"
          :placeholder="t('modelConfig.modelList.searchPlaceholder')"
          allow-clear
          size="large"
          @update:value="handleSearchInput"
          @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" size="large" @click="emit('create')">
          <template #icon><PlusOutlined /></template>
          {{ t("modelConfig.addModel") }}
        </a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'description'"
          ><span class="model-purpose">{{
            record.description || "-"
          }}</span></template
        >
        <template v-else-if="column.key === 'selfIterationSupported'"
          ><a-tag :class="iterationStatusClass[record.status]">{{
            t(`modelConfig.modelList.status.${record.status}`)
          }}</a-tag></template
        >
        <template v-else-if="column.key === 'actions'"
          ><div class="table-actions">
            <a-button
              type="link"
              @click="emit('view', record as ModelRecord)"
              >{{ t("modelConfig.modelList.view") }}</a-button
            ><a-button
              type="link"
              @click="emit('edit', record as ModelRecord)"
              >{{ t("modelConfig.modelList.edit") }}</a-button
            ><a-button
              type="link"
              danger
              @click="handleDeleteModel(record as ModelRecord)"
              >{{ t("modelConfig.modelList.delete") }}</a-button
            >
          </div></template
        >
      </template>
    </DmAppTable>
  </a-card>
</template>
<style scoped lang="less">
.model-list-table-card {
  height: 100%;
  min-height: 0;
  border-radius: 12px;
  background: var(--dm-bg-container);
}
.model-list-table-card :deep(.ant-card-body) {
  height: 100%;
  min-height: 0;
  padding: 20px;
}
.model-purpose {
  display: block;
  overflow: hidden;
  color: var(--dm-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-list-search {
  width: min(320px, 100%);
}
</style>
