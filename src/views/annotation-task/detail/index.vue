<script setup lang="ts">
import {
  computed,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  ExclamationCircleOutlined,
  LinkOutlined,
  SendOutlined,
} from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import type { DmTableColumn } from "@/components/Table/types";
import {
  ANNOTATION_TASK_SAMPLE_DEFAULT_PAGE_SIZE,
  completeIterativeAnnotationTaskApi,
  getAnnotationTaskDetailApi,
  getAnnotationTaskQualityRecordsApi,
  getAnnotationTaskValidationRecordsApi,
  submitAnnotationTaskQualityApi,
} from "@/api/annotation-task";
import type {
  AnnotationTaskDetail,
  AnnotationTaskQualityRecord,
  AnnotationTaskSample,
  AnnotationTaskValidationRecord,
} from "../types";
import SampleCard from "../components/SampleCard.vue";
import { getTaskStatusTagStyle } from "../utils";
import { formatDate, formatDateTime } from "@/utils/format";
import { goToScenarioWorkbench } from "@/utils/common";
import {
  MAIN_LAYOUT_BREADCRUMB,
  type MainLayoutBreadcrumbSetter,
} from "@/constants/inject";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const setLayoutPath = inject<MainLayoutBreadcrumbSetter>(
  MAIN_LAYOUT_BREADCRUMB,
);
const taskId = computed(() => String(route.params.id ?? ""));
const detail = ref<AnnotationTaskDetail | null>(null);
const samples = ref<AnnotationTaskSample[]>([]);
const samplePage = ref(1);
const sampleTotal = ref(0);
const sampleStatistics = ref({ mustFix: 0, suggestion: 0 });
const qualityRecords = ref<AnnotationTaskQualityRecord[]>([]);
const qualityRecordTotal = ref(0);
const loading = ref(true);
const loadFailed = ref(false);
const actionLoading = ref(false);

type ValidationRecordTableRow = AnnotationTaskValidationRecord & {
  recordNo: number;
};

const validationTableRows = computed<ValidationRecordTableRow[]>(() =>
  (detail.value?.validationRecords ?? []).map((record, index) => ({
    ...record,
    recordNo: index + 1,
  })),
);

const validationColumns = computed<DmTableColumn<ValidationRecordTableRow>[]>(
  () => [
    {
      title: "记录序号",
      dataIndex: "recordNo",
      key: "recordNo",
      width: 120,
    },
    {
      title: "校验时间",
      dataIndex: "submittedAt",
      key: "submittedAt",
    },
    {
      title: "校验结果",
      dataIndex: "result",
      key: "result",
      width: 120,
    },
  ],
);
const qualityColumns = computed(() => [
  { title: "记录序号", dataIndex: "recordNo", key: "recordNo", width: 120 },
  { title: "提交人", dataIndex: "submitterName", key: "submitterName" },
  { title: "质检人", dataIndex: "inspectorName", key: "inspectorName" },
  { title: "质检时间", dataIndex: "submittedAt", key: "submittedAt" },
  { title: "质检结果", dataIndex: "result", key: "result", width: 120 },
]);
const qualityTableRows = computed(() =>
  qualityRecords.value.map((record, index) => ({
    ...record,
    recordNo: index + 1,
  })),
);

/** 加载详情顶部及记录信息。 */
async function loadDetail() {
  loading.value = true;
  loadFailed.value = false;
  // 切换任务后先清除旧标题，避免加载失败时保留上一任务名称。
  route.meta.title = undefined;
  try {
    const baseDetail = await getAnnotationTaskDetailApi(taskId.value);
    const [validationResult, qualityResult] = await Promise.allSettled([
      getAnnotationTaskValidationRecordsApi(taskId.value),
      getAnnotationTaskQualityRecordsApi(taskId.value),
    ]);
    detail.value = {
      ...baseDetail,
      validationRecords:
        validationResult.status === "fulfilled" ? validationResult.value : [],
    };
    qualityRecords.value =
      qualityResult.status === "fulfilled" ? qualityResult.value.list : [];
    qualityRecordTotal.value =
      qualityResult.status === "fulfilled" ? qualityResult.value.total : 0;
    route.meta.title = baseDetail.displayName;
    setLayoutPath?.(() => [
      {
        path: "/annotation-task",
        title: t("navigation.menus.annotationTask"),
      },
      {
        path: route.fullPath,
        title: t("navigation.pages.annotationTaskDetail"),
      },
    ]);
    updateSamplePage();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

/** 在详情接口返回的样本集合上分页，避免伪造独立样本接口。 */
function updateSamplePage() {
  const allSamples = detail.value?.samples ?? [];
  const start =
    (samplePage.value - 1) * ANNOTATION_TASK_SAMPLE_DEFAULT_PAGE_SIZE;
  samples.value = allSamples.slice(
    start,
    start + ANNOTATION_TASK_SAMPLE_DEFAULT_PAGE_SIZE,
  );
  sampleTotal.value = allSamples.length;
  sampleStatistics.value = {
    mustFix: allSamples.filter((sample) => sample.issueLevel === "mustFix")
      .length,
    suggestion: allSamples.filter(
      (sample) => sample.issueLevel === "suggestion",
    ).length,
  };
}

/** 调用公共工作台入口，定位到当前任务的指定样本。 */
function openWorkbench(sample?: AnnotationTaskSample) {
  const designerCode = detail.value?.designerCode;
  if (!taskId.value || !sample?.id || !designerCode) {
    message.warning(t("annotationTask.feedback.workbenchFailed"));
    return;
  }

  goToScenarioWorkbench(designerCode, {
    taskId: taskId.value,
    itemId: sample.id,
    status: detail.value?.status,
  });
}

/** 使用当前任务首个样本进入工作台。 */
function handleOpenWorkbench() {
  openWorkbench(detail.value?.samples[0]);
}

/** 使用样本对应的 itemId（页面模型中的 id）定位进入工作台。 */
function handleOpenSampleWorkbench(sample: AnnotationTaskSample) {
  openWorkbench(sample);
}

/** 根据当前任务状态打开提交质检确认，任务状态由后端接口决定。 */
function handleSubmitQuality() {
  const isRework = detail.value?.status === "reworking";
  Modal.confirm({
    icon: h(ExclamationCircleOutlined),
    title: t(
      isRework
        ? "annotationTask.confirm.resubmitTitle"
        : "annotationTask.confirm.submitTitle",
    ),
    content: t(
      isRework
        ? "annotationTask.confirm.resubmitContent"
        : "annotationTask.confirm.submitContent",
    ),
    okText: detailActionText.value,
    okType: "primary",
    cancelText: t("annotationTask.actions.cancel"),
    onOk: async () => {
      actionLoading.value = true;
      try {
        await submitAnnotationTaskQualityApi(taskId.value);
        message.success(t("annotationTask.feedback.actionSuccess"));
        await loadDetail();
      } catch (error: unknown) {
        // 400 业务响应由 API 层转为 Error，优先展示后端返回的可读 message。
        message.error(
          error instanceof Error
            ? error.message
            : t("annotationTask.feedback.actionFailed"),
        );
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 直接完成迭代预标注任务复核，确认后刷新详情数据。 */
function handleCompleteIterative() {
  Modal.confirm({
    icon: h(ExclamationCircleOutlined),
    title: t("annotationTask.confirm.completeIterativeTitle"),
    content: t("annotationTask.confirm.completeIterativeContent"),
    okText: t("annotationTask.actions.completeIterative"),
    okType: "primary",
    cancelText: t("annotationTask.actions.cancel"),
    onOk: async () => {
      actionLoading.value = true;
      try {
        await completeIterativeAnnotationTaskApi(taskId.value);
        message.success(t("annotationTask.feedback.actionSuccess"));
        await loadDetail();
      } catch (error: unknown) {
        message.error(
          error instanceof Error
            ? error.message
            : t("annotationTask.feedback.actionFailed"),
        );
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 顶部动作按任务状态切换文案；查看状态不触发提交请求。 */
function handleDetailAction() {
  if (canCompleteIterative.value) {
    handleCompleteIterative();
    return;
  }
  if (canSubmitQuality.value) {
    handleSubmitQuality();
    return;
  }
  handleOpenWorkbench();
}

/** 返回标注任务列表。 */
function handleBack() {
  void router.push({ name: "annotation-task" });
}

/** 翻页后仅请求当前样本页。 */
function handleSamplePageChange(page: number) {
  samplePage.value = page;
  updateSamplePage();
}

/** 使用列表页统一格式展示当前样本范围和总数。 */
function formatSamplePaginationTotal(total: number, range: [number, number]) {
  return t("annotationTask.paginationTotal", {
    start: range[0],
    end: range[1],
    total,
  });
}

/** 将规则校验结果映射为页面文案，未知状态保留原值。 */
function getValidationResultText(result: string): string {
  const resultMap: Record<string, string> = {
    processing: "处理中",
    passed: "通过",
    failed: "失败",
    error: "异常",
  };
  return resultMap[result] ?? result;
}

/** 将动态属性默认值转换为稳定的详情文案。 */
/** 根据状态展示详情操作按钮。 */
const canSubmitQuality = computed(
  () =>
    detail.value?.status === "annotating" ||
    detail.value?.status === "reworking",
);
const canCompleteIterative = computed(
  () =>
    detail.value?.taskType === "ITERATIVE_PRE_ANNOTATION" &&
    detail.value?.status !== "completed",
);
const detailActionText = computed(() => {
  if (canCompleteIterative.value) {
    return t("annotationTask.actions.completeIterative");
  }
  if (detail.value?.status === "annotating") {
    return t("annotationTask.actions.submitQuality");
  }
  if (detail.value?.status === "reworking") {
    return t("annotationTask.actions.resubmitQuality");
  }
  return t("annotationTask.actions.revisit");
});
onMounted(() => {
  void loadDetail();
});

onBeforeUnmount(() => {
  // 离开详情页时清理共享路由元数据，避免动态标题污染后续页面。
  route.meta.title = undefined;
});

watch(taskId, (nextTaskId, previousTaskId) => {
  // 同一详情组件切换任务时清理旧样本，避免短暂展示上一个任务的数据。
  if (nextTaskId && nextTaskId !== previousTaskId) {
    detail.value = null;
    samples.value = [];
    qualityRecords.value = [];
    qualityRecordTotal.value = 0;
    samplePage.value = 1;
    void loadDetail();
  }
});
</script>

<template>
  <main class="annotation-task-detail-page">
    <a-result
      v-if="loadFailed"
      status="404"
      :title="t('annotationTask.detail.loadFailed')"
      ><template #extra
        ><a-button @click="handleBack">{{
          t("annotationTask.actions.back")
        }}</a-button></template
      ></a-result
    >
    <template v-else-if="detail">
      <!-- 外层卡片：任务名称 + 状态在头部，右侧放置两个功能按钮 -->
      <a-card :bordered="false" class="annotation-task-detail-card">
        <template #title>
          <div class="annotation-task-detail-head">
            <h1 class="annotation-task-detail-title font-xxl">
              {{ detail.displayName }}
            </h1>
            <a-tag :style="getTaskStatusTagStyle(detail.status)">{{
              t(`annotationTask.status.${detail.status}`)
            }}</a-tag>
          </div>
        </template>
        <template #extra>
          <div class="annotation-task-detail-actions">
            <a-button
              class="annotation-task-workbench-button"
              :loading="actionLoading"
              @click="handleOpenWorkbench()"
              ><LinkOutlined />{{
                t("annotationTask.actions.workbench")
              }}</a-button
            >
            <a-button
              v-if="canSubmitQuality || canCompleteIterative"
              class="annotation-task-submit-button"
              :type="
                canSubmitQuality || canCompleteIterative ? 'primary' : 'default'
              "
              :loading="actionLoading"
              @click="handleDetailAction"
              ><SendOutlined />{{
                canCompleteIterative
                  ? detailActionText
                  : t("annotationTask.actions.submit")
              }}</a-button
            >
          </div>
        </template>
        <div class="annotation-task-detail-body">
          <div class="annotation-task-basic-grid">
            <div class="annotation-task-basic-item">
              <span class="annotation-task-basic-label">{{
                t("annotationTask.detail.taskCode")
              }}</span>
              <span class="annotation-task-basic-value">{{
                detail.projectCode || "--"
              }}</span>
            </div>
            <div
              v-if="detail.batchNo !== undefined"
              class="annotation-task-basic-item"
            >
              <span class="annotation-task-basic-label">{{
                t("annotationTask.detail.batch")
              }}</span>
              <span class="annotation-task-basic-value">{{
                t("annotationTask.detail.batchNo", { count: detail.batchNo })
              }}</span>
            </div>
            <div class="annotation-task-basic-item">
              <span class="annotation-task-basic-label">{{
                t("annotationTask.detail.operator")
              }}</span>
              <span class="annotation-task-basic-value">{{
                detail.assigneeName || t("annotationTask.unassigned")
              }}</span>
            </div>
            <div class="annotation-task-basic-item">
              <span class="annotation-task-basic-label">{{
                t("annotationTask.detail.sampleQuantity")
              }}</span>
              <span class="annotation-task-basic-value"
                >{{ detail.sampleCount }}
                {{ t("annotationTask.detail.sampleUnit") }}</span
              >
            </div>
            <div class="annotation-task-basic-item">
              <span class="annotation-task-basic-label">{{
                t("annotationTask.detail.startedAt")
              }}</span>
              <span class="annotation-task-basic-value">{{
                formatDate(detail.startedAt)
              }}</span>
            </div>
            <div class="annotation-task-basic-item">
              <span class="annotation-task-basic-label">{{
                t("annotationTask.detail.deadlineAt")
              }}</span>
              <span class="annotation-task-basic-value">{{
                formatDate(detail.deadlineAt)
              }}</span>
            </div>
          </div>
        </div>
      </a-card>

      <a-card :bordered="false" class="annotation-task-samples-card m-t-16">
        <template #title>
          <div class="annotation-task-section-heading">
            <div>
              <div class="annotation-task-section-title">
                {{ t("annotationTask.detail.samples") }}
              </div>
            </div>
            <div class="annotation-task-sample-statistics">
              <a-tag color="error">{{
                t("annotationTask.detail.mustFixCount", {
                  count: sampleStatistics.mustFix,
                })
              }}</a-tag>
              <a-tag color="warning">{{
                t("annotationTask.detail.suggestionCount", {
                  count: sampleStatistics.suggestion,
                })
              }}</a-tag>
            </div>
          </div>
        </template>
        <a-spin :spinning="false">
          <div class="annotation-task-sample-grid">
            <SampleCard
              v-for="sample in samples"
              :key="sample.id"
              :sample="sample"
              @open="handleOpenSampleWorkbench"
            />
          </div>
        </a-spin>
        <a-empty
          v-if="samples.length === 0"
          :description="t('annotationTask.detail.samplesEmpty')"
        />
        <div
          v-if="sampleTotal > 0"
          class="annotation-task-sample-pagination flex justify-end m-t-16"
        >
          <a-pagination
            :current="samplePage"
            :page-size="ANNOTATION_TASK_SAMPLE_DEFAULT_PAGE_SIZE"
            :total="sampleTotal"
            :show-size-changer="false"
            :show-total="formatSamplePaginationTotal"
            @change="handleSamplePageChange"
          />
        </div>
      </a-card>

      <div class="annotation-task-records m-t-16">
        <a-card :bordered="false" class="annotation-task-record-card">
          <template #title
            ><div class="annotation-task-section-heading">
              <div>
                <div class="annotation-task-section-title-row">
                  <div class="annotation-task-section-title">
                    {{ t("annotationTask.detail.validationRecords") }}
                  </div>
                  <span class="annotation-task-record-count">{{
                    t("annotationTask.detail.recordCount", {
                      count: detail.validationRecords.length,
                    })
                  }}</span>
                </div>
              </div>
            </div></template
          >
          <DmAppTable
            class="annotation-task-validation-table"
            row-key="id"
            :columns="validationColumns"
            :data-source="validationTableRows"
            :loading="false"
            :pagination="false"
            :column-manager="false"
            :table-title="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'submittedAt'">
                {{ formatDateTime(record.submittedAt) }}
              </template>
              <template v-else-if="column.key === 'result'">
                <a-tag
                  :color="
                    record.result === 'passed'
                      ? 'success'
                      : record.result === 'failed'
                        ? 'error'
                        : 'processing'
                  "
                >
                  {{ getValidationResultText(record.result) }}
                </a-tag>
              </template>
            </template>
          </DmAppTable>
        </a-card>
        <a-card :bordered="false" class="annotation-task-record-card">
          <template #title>
            <div class="annotation-task-section-heading">
              <div>
                <div class="annotation-task-section-title-row">
                  <div class="annotation-task-section-title">
                    {{ t("annotationTask.detail.qualityRecords") }}
                  </div>
                  <span class="annotation-task-record-count">{{
                    t("annotationTask.detail.recordCount", {
                      count: qualityRecordTotal,
                    })
                  }}</span>
                </div>
              </div>
            </div>
          </template>
          <DmAppTable
            :columns="qualityColumns"
            :data-source="qualityTableRows"
            :pagination="false"
            :column-manager="false"
            :table-title="false"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'submittedAt'">{{
                formatDateTime(record.submittedAt)
              }}</template>
              <template v-else-if="column.key === 'result'"
                ><a-tag
                  :color="record.result === 'passed' ? 'success' : 'error'"
                  >{{ t(`annotationTask.detail.${record.result}`) }}</a-tag
                ></template
              >
            </template>
            <template #emptyText
              ><a-empty :description="t('annotationTask.detail.noData')"
            /></template>
          </DmAppTable>
        </a-card>
      </div>
    </template>
    <a-spin v-else :spinning="loading" />
  </main>
</template>

<style scoped lang="less">
.annotation-task-detail-page {
  min-width: 0;
}
.annotation-task-detail-card {
  border: 1px solid var(--dm-border-2);
  background: var(--dm-bg-container);
}
.annotation-task-detail-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 20px 20px 0;
  border-bottom: 0;
}
.annotation-task-detail-card :deep(.ant-card-head-title) {
  padding: 0;
}
.annotation-task-detail-card > :deep(.ant-card-body) {
  padding: 18px;
}
.annotation-task-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}
.annotation-task-detail-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.annotation-task-workbench-button {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}
.annotation-task-submit-button {
  background: #3fd98e;
  border-color: #3fd98e;
  color: #fff;
}
.annotation-task-detail-title {
  margin: 0;
  color: var(--dm-text);
}
.annotation-task-detail-body {
  padding: 8px 0 12px 0;
}
.annotation-task-basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px 24px;
}
.annotation-task-basic-item {
  display: flex;
  align-items: baseline;
  gap: 16px;
  min-width: 0;
}
.annotation-task-basic-label {
  flex: 0 0 auto;
  min-width: 88px;
  color: var(--dm-text-3);
}
.annotation-task-basic-value {
  flex: 1;
  min-width: 0;
  color: var(--dm-text);
}
.annotation-task-samples-card,
.annotation-task-records :deep(.ant-card) {
  border: 1px solid var(--dm-border-2);
}
.annotation-task-record-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 0 20px;
  border-bottom: 0;
}
.annotation-task-record-card :deep(.ant-card-head-title) {
  padding: 20px 0 16px;
}
.annotation-task-record-card > :deep(.ant-card-body) {
  padding: 0 20px 20px;
}
.annotation-task-samples-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 0 20px;
  border-bottom: 0;
}
.annotation-task-samples-card :deep(.ant-card-head-title) {
  padding: 20px 0 16px;
}
.annotation-task-samples-card > :deep(.ant-card-body) {
  padding: 10px 20px 20px;
}
.annotation-task-record-card
  :deep(.annotation-sample-card--compact > .ant-card-body) {
  padding: 2px 8px;
}
.annotation-task-section-heading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  min-width: 0;
}
.annotation-task-section-title {
  color: var(--dm-text);
  font-size: 0.16rem;
  font-weight: 400;
  line-height: 1.4;
}
.annotation-task-section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.annotation-task-section-desc {
  margin-top: 4px;
  color: var(--dm-text-3);
  font-size: 0.13rem;
  font-weight: 400;
}
.annotation-task-record-card .annotation-task-section-title {
  font-size: 0.2rem;
  font-weight: 600;
}
.annotation-task-samples-card .annotation-task-section-title {
  font-size: 0.2rem;
  font-weight: 600;
}
.annotation-task-sample-statistics {
  display: flex;
  align-items: center;
  align-self: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.annotation-task-sample-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.annotation-task-sample-pagination {
  min-height: 32px;
}
.annotation-task-records {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.annotation-task-record-empty {
  display: flex;
  min-height: 240px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  margin: 0;
}
.annotation-task-validation-table {
  height: auto;
}
.annotation-task-validation-table :deep(.dm-table__content),
.annotation-task-validation-table :deep(.ant-table-wrapper),
.annotation-task-validation-table :deep(.ant-spin-nested-loading),
.annotation-task-validation-table :deep(.ant-spin-container) {
  display: block;
}
.annotation-task-validation-table :deep(.ant-table-body) {
  height: auto;
  overflow-y: visible !important;
}
.annotation-task-record-count {
  margin-left: 10px;
  flex: 0 0 auto;
  color: var(--dm-text-3);
  font-size: 0.13rem;
  font-weight: 400;
}
.annotation-task-quality-people {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 8px;
  color: var(--dm-text-3);
  font-size: 0.12rem;
}
.annotation-task-quality-list {
  display: grid;
  gap: 12px;
}
.annotation-task-quality-record {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dm-border-2);
}
.annotation-task-quality-record:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.annotation-task-quality-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--dm-text);
  font-size: 0.12rem;
  font-weight: 600;
  white-space: nowrap;
}
.annotation-task-quality-meta :deep(.ant-tag) {
  margin-inline-end: 0;
}
.annotation-task-quality-samples {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}
.annotation-task-rule-box {
  padding: 14px 16px;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  background: var(--dm-fill-4);
}
.annotation-task-rule-title {
  color: var(--dm-text);
  font-weight: 600;
}
.annotation-task-rule-summary {
  margin-top: 8px;
  color: var(--dm-text-2);
  font-size: 0.13rem;
}
.annotation-task-rule-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: var(--dm-text-3);
  font-size: 0.13rem;
}
@media (width <= 992px) {
  .annotation-task-detail-card :deep(.ant-card-head) {
    padding: 16px 24px;
  }
  .annotation-task-detail-body {
    padding: 8px 16px 12px;
  }
  .annotation-task-basic-grid {
    grid-template-columns: 1fr;
  }
  .annotation-task-records {
    grid-template-columns: 1fr;
  }
}
@media (width <= 576px) {
  .annotation-task-section-heading {
    flex-direction: column;
    gap: 8px;
  }
  .annotation-task-sample-statistics {
    justify-content: flex-start;
  }
}
</style>
