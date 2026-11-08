<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import ModelListPanel from "./components/ModelListPanel.vue";
import ConnectModelModal from "./components/ConnectModelModal.vue";
import EditModelModal from "./components/EditModelModal.vue";
import type { ModelRecord } from "@/views/model-config/types";
import type { DmTableQuery } from "@/components/Table/types";
import type { ConnectModelForm } from "./components/ConnectModelModal.vue";
import type { EditModelForm } from "./components/EditModelModal.vue";
import {
  createModelConfigApi,
  deleteModelConfigApi,
  getModelConfigDetailApi,
  getModelConfigPageApi,
  updateModelConfigApi,
  type ModelConfigRecord,
} from "@/api/model-config";

const { t } = useI18n();
const connectModalOpen = ref(false);
const editModalOpen = ref(false);
const viewModelReadonly = ref(false);
const editingModel = ref<ModelRecord | null>(null);
const modelRecords = ref<ModelRecord[]>([]);
const loading = ref(false);
const submitting = ref(false);
const pageNo = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchInput = ref("");
const keyword = ref("");
const selectedSelfIterationSupported = ref<boolean>();
const accessTimeSortOrder = ref<"ascend" | "descend">();

/** 将模型接入时间格式化为“YYYY-MM-DD HH:mm:ss”，用于列表统一展示。 */
function formatModelAccessTime(value: string | null | undefined): string {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/** 将模型接口记录转换为卡片及编辑弹窗共用的展示结构。 */
function mapModelRecord(model: ModelConfigRecord): ModelRecord {
  return {
    apiKey: model.apiKey ?? "",
    confidence: model.accuracy === null ? "-" : String(model.accuracy),
    description: model.modelDesc ?? "-",
    endpoint: model.apiEndpoint,
    key: model.modelId,
    labels: model.labels.map((label) => ({
      outputLabelName: label.outputLabelName,
      platformLabelId: label.platformLabelId,
      platformLabelName: label.platformLabelName ?? "-",
    })),
    name: model.modelName,
    protocol:
      model.apiProtocol === "HTTP_JSON" ? "HTTP JSON" : model.apiProtocol,
    selfIterationEnabled: model.selfIterationEnabled,
    selfIterationSupported: model.selfIterationSupported,
    status: model.selfIterationEnabled ? "ready" : "notReady",
    updatedAt: formatModelAccessTime(model.createdAt),
    version: model.versionNo,
  };
}

/** 按当前分页参数加载模型列表，失败时显示空状态。 */
async function loadModels(): Promise<void> {
  loading.value = true;
  try {
    const result = await getModelConfigPageApi({
      keyword: keyword.value || undefined,
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      ...(selectedSelfIterationSupported.value === undefined
        ? {}
        : {
            selfIterationSupported: selectedSelfIterationSupported.value,
          }),
      ...(accessTimeSortOrder.value
        ? {
            sortField: "createdAt" as const,
            ascSort: accessTimeSortOrder.value === "ascend",
          }
        : {}),
    });
    modelRecords.value = result.list.map(mapModelRecord);
    total.value = result.total;
    pageNo.value = result.pageNo;
  } catch (error: unknown) {
    modelRecords.value = [];
    total.value = 0;
    message.error(
      error instanceof Error
        ? error.message
        : t("modelConfig.feedback.operationFailed"),
    );
  } finally {
    loading.value = false;
  }
}

/** 提交模型名称关键词并回到第一页，重复提交相同条件时不重复请求。 */
function handleSearchModel(value: string): void {
  const nextKeyword = value.trim();
  searchInput.value = value;
  if (nextKeyword === keyword.value) return;
  keyword.value = nextKeyword;
  pageNo.value = 1;
  void loadModels();
}
/** 同步模型名称搜索框的临时输入值，查询仅在提交或清空时触发。 */
function handleSearchInput(value: string): void {
  searchInput.value = value;
}
onMounted(loadModels);

/** 创建模型，成功后关闭弹窗并回到第一页刷新列表。 */
async function handleSubmitModel(form: ConnectModelForm): Promise<void> {
  submitting.value = true;
  try {
    await createModelConfigApi({
      apiEndpoint: form.endpoint,
      apiKey: form.apiKey,
      apiProtocol: "HTTP_JSON",
      labels: form.labels.flatMap((label) =>
        label.code.trim() && label.relatedKey
          ? [
              {
                outputLabelName: label.code.trim(),
                platformLabelId: label.relatedKey,
              },
            ]
          : [],
      ),
      modelDesc: form.purpose,
      modelName: form.name,
      selfIterationEnabled: form.supportsIteration,
      selfIterationSupported: true,
    });
    connectModalOpen.value = false;
    pageNo.value = 1;
    await loadModels();
    message.success(t("modelConfig.feedback.created"));
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("modelConfig.feedback.operationFailed"),
    );
  } finally {
    submitting.value = false;
  }
}

/** 查询最新模型详情后打开编辑弹窗，避免使用列表中的省略字段。 */
async function handleEditModel(model: ModelRecord): Promise<void> {
  viewModelReadonly.value = false;
  try {
    editingModel.value = mapModelRecord(
      await getModelConfigDetailApi(model.key),
    );
    editModalOpen.value = true;
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("modelConfig.feedback.operationFailed"),
    );
  }
}

/** 查看模型详情时复用编辑弹窗，但切换为完全只读模式。 */
async function handleViewModel(model: ModelRecord): Promise<void> {
  viewModelReadonly.value = true;
  await handleEditModel(model);
  viewModelReadonly.value = true;
}

/** 更新当前模型并刷新接口列表。 */
async function handleSaveModel(form: EditModelForm): Promise<void> {
  if (!editingModel.value) return;
  submitting.value = true;
  try {
    await updateModelConfigApi(editingModel.value.key, {
      apiKey: form.apiKey,
      labels: form.labels.flatMap((label) =>
        label.code.trim() && label.platformLabelId
          ? [
              {
                outputLabelName: label.code.trim(),
                platformLabelId: label.platformLabelId,
              },
            ]
          : [],
      ),
      modelDesc: form.purpose,
      selfIterationEnabled: form.supportsIteration,
      selfIterationSupported: editingModel.value.selfIterationSupported,
    });
    editModalOpen.value = false;
    editingModel.value = null;
    await loadModels();
    message.success(t("modelConfig.feedback.updated"));
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("modelConfig.feedback.operationFailed"),
    );
  } finally {
    submitting.value = false;
  }
}

/** 删除模型后修正空页并重新加载当前页。 */
async function handleDeleteModel(model: ModelRecord): Promise<void> {
  try {
    await deleteModelConfigApi(model.key);
    if (modelRecords.value.length === 1 && pageNo.value > 1) pageNo.value -= 1;
    await loadModels();
    message.success(t("modelConfig.feedback.deleted"));
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("modelConfig.feedback.operationFailed"),
    );
  }
}

/** 响应模型列表的过滤、排序和分页变化，并按需刷新服务端数据。 */
function handleTableQuery(query: DmTableQuery): void {
  const filterValue = Array.isArray(query.filters.selfIterationSupported)
    ? query.filters.selfIterationSupported[0]
    : query.filters.selfIterationSupported;
  // 表格枚举值使用字符串传递，接口参数在页面层还原为布尔值。
  const nextSupported =
    filterValue === "true" ? true : filterValue === "false" ? false : undefined;
  const nextSortOrder =
    query.sorter?.field === "updatedAt" ? query.sorter.order : undefined;
  const filterChanged = nextSupported !== selectedSelfIterationSupported.value;
  const sortChanged = nextSortOrder !== accessTimeSortOrder.value;
  const nextPage = query.pagination.current ?? 1;
  const nextPageSize = query.pagination.pageSize ?? pageSize.value;
  const pageChanged =
    nextPage !== pageNo.value || nextPageSize !== pageSize.value;
  selectedSelfIterationSupported.value = nextSupported;
  accessTimeSortOrder.value = nextSortOrder;
  pageNo.value = filterChanged || sortChanged ? 1 : nextPage;
  pageSize.value = nextPageSize;
  // 筛选和排序由服务端作用于完整结果集，条件变化时重新查询第一页。
  if (filterChanged || sortChanged || pageChanged) void loadModels();
}
</script>

<template>
  <div class="model-config-page">
    <!-- 页面头部只承载模型配置的定位说明和主操作入口。 -->

    <!-- GPU 资源区作为独立职责组件，后续可单独接入调度接口。 -->
    <!-- <GpuComputeResources /> -->
    <ModelListPanel
      :models="modelRecords"
      :loading="loading"
      :page-no="pageNo"
      :page-size="pageSize"
      :search-value="searchInput"
      :total="total"
      @edit="handleEditModel"
      @view="handleViewModel"
      @create="connectModalOpen = true"
      @delete="handleDeleteModel"
      @query-change="handleTableQuery"
      @search="handleSearchModel"
      @update:search-value="handleSearchInput"
    />
    <ConnectModelModal
      v-model:open="connectModalOpen"
      :submitting="submitting"
      @submit="handleSubmitModel"
    />
    <EditModelModal
      v-model:open="editModalOpen"
      :model="editingModel"
      :readonly="viewModelReadonly"
      :submitting="submitting"
      @submit="handleSaveModel"
    />
  </div>
</template>

<style scoped lang="less">
/* 页面纵向编排与主布局的 24px 内容边距配合。 */
.model-config-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  color: var(--dm-text);
}

.model-config-page :deep(.model-list-table-card) {
  flex: 1;
  height: 100%;
  min-height: 0;
  background: var(--dm-bg-container);
}

/* 标题卡使用与原型一致的水平主次布局。 */
.model-hero {
  border-radius: 0.12rem;
  background: var(--dm-bg-container);
  box-shadow: 0 1px 4px rgb(15 23 42 / 3%);
}
.model-hero :deep(.ant-card-body) {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  height: 142px;
  padding: 24px 26px;
}
.model-hero :deep(.ant-card-body)::before,
.model-hero :deep(.ant-card-body)::after {
  display: none;
}
.model-hero__eyebrow {
  color: var(--dm-link);
  font-weight: 600;
}
.model-hero h1 {
  margin: 8px 0 0;
  font-size: 0.28rem;
  line-height: 1.2;
}
.model-hero p {
  margin: 10px 0 0;
  color: var(--dm-text-2);
}

/* 窄屏让主操作换行并铺满，防止说明文字被过度压缩。 */
@media (max-width: 720px) {
  .model-hero :deep(.ant-card-body) {
    align-items: flex-start;
    flex-direction: column;
    height: auto;
  }
  .model-hero .ant-btn {
    width: 100%;
  }
}
</style>
