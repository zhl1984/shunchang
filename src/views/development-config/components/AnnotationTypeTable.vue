<script setup lang="ts">
import { computed, ref } from "vue";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import {
  deleteAnnotationTypeApi,
  type AnnotationTypeRecord,
} from "@/api/development-config";
import { useAnnotationTypeStore } from "@/stores/annotation-type";
import type { EditableAnnotationType } from "./CreateAnnotationTypeModal.vue";
import DmAppTable from "@/components/Table/index.vue";

const emit = defineEmits<{
  (event: "create"): void;
  (event: "edit", record: EditableAnnotationType): void;
}>();
const { t } = useI18n();
const annotationTypeStore = useAnnotationTypeStore();
const searchKeyword = ref("");
const filteredRecords = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return annotationTypeStore.annotationTypes;
  return annotationTypeStore.annotationTypes.filter((record) =>
    [
      record.annotationTypeName,
      record.annotationTypeDesc,
      record.dataFormat,
      record.designerName,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)),
  );
});
const loading = computed(() => annotationTypeStore.status === "loading");
const columns = [
  {
    title: t("developmentConfig.annotationType.fields.annotationType"),
    key: "name",
    dataIndex: "annotationTypeName",
    className: "table-bold-cell",
    width: 420,
  },
  {
    title: t("developmentConfig.annotationType.fields.dataType"),
    key: "dataFormat",
    dataIndex: "dataFormat",
    width: 150,
  },
  {
    title: t("developmentConfig.annotationType.fields.designer"),
    key: "designer",
    dataIndex: "designerName",
    width: 320,
  },
  {
    title: t("developmentConfig.annotationType.fields.actions"),
    key: "actions",
    className: "table-actions-cell",
    width: 120,
  },
];

/** 使用接口删除当前记录，后端拒绝时保持列表不变。 */
function handleDelete(record: AnnotationTypeRecord): void {
  Modal.confirm({
    title: t("developmentConfig.annotationType.deleteModal.title"),
    content: t("developmentConfig.annotationType.deleteModal.description", {
      name: record.annotationTypeName,
    }),
    cancelText: t("developmentConfig.annotationType.deleteModal.cancel"),
    okText: t("developmentConfig.annotationType.deleteModal.confirm"),
    okButtonProps: { danger: true },
    centered: true,
    onOk: async () => {
      if (record.isUsed) return;
      try {
        await deleteAnnotationTypeApi(record.annotationTypeId);
        message.success(t("developmentConfig.annotationType.feedback.deleted"));
        await annotationTypeStore.refresh();
      } catch (error: unknown) {
        message.error(
          error instanceof Error && error.message
            ? error.message
            : t("developmentConfig.annotationType.feedback.operationFailed"),
        );
      }
    },
  });
}

/** 将接口记录转换为编辑弹窗所需的数据结构。 */
function handleEdit(record: AnnotationTypeRecord): void {
  emit("edit", {
    key: record.annotationTypeId,
    name: record.annotationTypeName,
    designer: record.designerId,
    dataType: record.dataFormat,
    description: record.annotationTypeDesc,
  });
}
</script>

<template>
  <section
    :aria-label="t('developmentConfig.annotationType.title')"
    class="annotation-type-table"
  >
    <!--
    <header class="annotation-type-table__toolbar">
      <a-input
        v-model:value="searchKeyword"
        :placeholder="t('developmentConfig.annotationType.searchPlaceholder')"
        allow-clear
        size="large"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-button type="primary" size="large" @click="emit('create')">
        <template #icon><PlusOutlined /></template>
        {{ t("developmentConfig.annotationType.create") }}
      </a-button>
      </header> -->
    <DmAppTable
      row-key="annotationTypeId"
      :table-title="t('developmentConfig.annotationType.tableTitle')"
      :columns="columns"
      :data-source="filteredRecords"
      :loading="loading"
      :scroll="{ x: 1010 }"
    >
      <template #titleTool>
        <a-input
          v-model:value="searchKeyword"
          :placeholder="t('developmentConfig.annotationType.searchPlaceholder')"
          allow-clear
          size="large"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" size="large" @click="emit('create')">
          <template #icon><PlusOutlined /></template>
          {{ t("developmentConfig.annotationType.create") }}
        </a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <h3>{{ record.annotationTypeName }}</h3>
          <p>{{ record.annotationTypeDesc }}</p>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="table-actions">
            <a-button
              type="link"
              :disabled="record.isUsed"
              @click="handleEdit(record)"
            >
              {{ t("developmentConfig.annotationType.actions.edit") }}
            </a-button>
            <a-button
              type="link"
              danger
              :disabled="record.isUsed"
              @click="handleDelete(record)"
            >
              {{ t("developmentConfig.annotationType.actions.delete") }}
            </a-button>
          </div>
        </template>
      </template>
    </DmAppTable>
  </section>
</template>

<style scoped lang="less">
.annotation-type-table {
  width: 100%;
  min-width: 0;
  min-height: 360px;
  padding: 16px 20px 20px;
  overflow: hidden;
  border: 1px solid var(--dm-border-2);
  border-radius: 0.08rem;
  background: var(--dm-bg-container);
  box-shadow: 0 1px 4px rgb(15 23 42 / 3%);
}
.annotation-type-table__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  min-width: 0;
  padding: 16px 20px 12px;
}
.annotation-type-table__toolbar .ant-input-affix-wrapper {
  width: min(540px, 100%);
}
.annotation-type-table__scroll {
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  margin: 0 16px;
  border: 1px solid var(--dm-border-2);
  border-radius: 0.08rem;
}
.annotation-type-table__content {
  min-width: 1120px;
}
.annotation-type-table__columns,
.annotation-type-row {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) 150px 320px 96px;
  gap: 24px;
  padding-right: 20px;
  padding-left: 20px;
}
.annotation-type-table__columns {
  align-items: center;
  height: 40px;
  background: var(--dm-bg-layout);
  color: var(--dm-text-3);
  font-size: 0.12rem;
  font-weight: 600;
}
.text-right {
  text-align: right;
}
.annotation-type-row {
  align-items: center;
  min-height: 76px;
  padding-top: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dm-border-2);
}
.annotation-type-row:last-of-type {
  border-bottom: 0;
}
.annotation-type-row__main {
  min-width: 0;
}
.annotation-type-row h3 {
  margin: 0;
  font-size: 0.16rem;
  line-height: 1.5;
}
.annotation-type-row__main p {
  overflow: hidden;
  margin: 5px 0 0;
  color: var(--dm-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.annotation-type-row__field {
  overflow: hidden;
  min-width: 0;
  color: var(--dm-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.annotation-type-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.annotation-type-row__actions .ant-btn {
  border-radius: 0.06rem;
}
.annotation-type-table__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}
.annotation-type-table__footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
  height: 64px;
  padding: 0 20px;
  overflow-x: auto;
  color: var(--dm-text-2);
  font-size: 0.12rem;
}
.annotation-type-table__footer :deep(.ant-pagination) {
  margin: 0;
}
.annotation-type-table :deep(.dm-table) {
  height: 100%;
  min-height: 0;
}
.annotation-type-table :deep(.dm-table__content) {
  min-height: 0;
  flex: 1;
}
.annotation-type-table :deep(.dm-table__tools) {
  gap: 12px;
}
.annotation-type-table :deep(.dm-table__tools .ant-input-affix-wrapper) {
  width: max(15vw, 300px);
}
.annotation-type-table :deep(.table-actions-cell) {
  white-space: nowrap;
}
@media (max-width: 720px) {
  .annotation-type-table__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .annotation-type-table__toolbar .ant-input-affix-wrapper,
  .annotation-type-table__toolbar .ant-btn {
    width: 100%;
  }
  .annotation-type-table__footer {
    justify-content: flex-start;
    padding-right: 12px;
    padding-left: 12px;
    white-space: nowrap;
  }
  .annotation-type-table__footer :deep(.ant-pagination) {
    flex: 0 0 auto;
  }
}
</style>
