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
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons-vue";
import { message, Modal, Tag } from "ant-design-vue";
import {
  getQualityTaskDetailApi,
  getQualityTaskQualityRecordsApi,
  getQualityTaskValidationRecordsApi,
  submitQualityTaskStatusApi,
} from "@/api/quality-task";
import type {
  QualityTaskDetail,
  QualityTaskDetailQualityRecord,
  QualityTaskDetailSample,
  QualityTaskQualityRecordResult,
  QualityTaskValidationRecord,
} from "../types";
import type { DmTableColumn } from "@/components/Table/types";
import {
  MAIN_LAYOUT_BREADCRUMB,
  type MainLayoutBreadcrumbSetter,
} from "@/constants/inject";
import { formatDate, formatDateTime } from "@/utils/format";
import SampleCard from "@/views/annotation-task/components/SampleCard.vue";
import { goToScenarioWorkbench } from "@/utils/common";
import type { SCENARIO_TYPE } from "@/constants/scenario";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const setLayoutPath = inject<MainLayoutBreadcrumbSetter>(
  MAIN_LAYOUT_BREADCRUMB,
);

const loading = ref(false);
const actionLoading = ref(false);
const loadFailed = ref(false);
const detail = ref<QualityTaskDetail | null>(null);
const validationRecords = ref<QualityTaskValidationRecord[]>([]);
const qualityRecords = ref<QualityTaskDetailQualityRecord[]>([]);
const validationCount = ref(0);
const qualityCount = ref(0);
const samplePage = ref(1);
const samplePageSize = ref(30);
const sampleTotal = ref(0);

type ValidationRecordTableRow = QualityTaskValidationRecord & {
  recordNo: number;
};

const validationTableRows = computed<ValidationRecordTableRow[]>(() =>
  validationRecords.value.map((record, index) => ({
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
      dataIndex: "createdAt",
      key: "createdAt",
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
  { title: "记录序号", dataIndex: "id", key: "id" },
  { title: "提交人", dataIndex: "submitterName", key: "submitterName" },
  { title: "质检人", dataIndex: "inspectorName", key: "inspectorName" },
  { title: "质检时间", dataIndex: "createdAt", key: "createdAt" },
  { title: "质检结果", dataIndex: "result", key: "result" },
]);

const taskId = computed(() => String(route.params.id ?? ""));
const samples = computed<QualityTaskDetailSample[]>(() => {
  const start = (samplePage.value - 1) * samplePageSize.value;
  return (detail.value?.samples ?? [])
    .slice(start, start + samplePageSize.value)
    .map(toDetailSample);
});
const statusTagStyle = computed(() => getStatusTagStyle(detail.value?.status));
const canSubmitPass = computed(
  () => detail.value?.status === "qualityChecking",
);

/** 将详情页顶部状态映射为统一标签样式。 */
function getStatusTagStyle(
  status: QualityTaskDetail["status"] | undefined,
): Record<string, string> {
  const styleMap: Record<
    QualityTaskDetail["status"],
    Record<string, string>
  > = {
    qualityChecking: {
      color: "#7B4AD8",
      backgroundColor: "#F9F0FF",
      borderColor: "transparent",
    },
    reworking: {
      color: "#D66A21",
      backgroundColor: "#FFF7E6",
      borderColor: "transparent",
    },
    completed: {
      color: "#2F8F67",
      backgroundColor: "#F6FFED",
      borderColor: "transparent",
    },
  };
  return status ? styleMap[status] : styleMap.qualityChecking;
}

/** 将任务样本分页展示，保持详情顶部和记录区域不受影响。 */
function syncSamplePage() {
  sampleTotal.value = detail.value?.samples.length ?? 0;
  const maxPage = Math.max(
    1,
    Math.ceil(sampleTotal.value / samplePageSize.value),
  );
  if (samplePage.value > maxPage) {
    samplePage.value = maxPage;
  }
}

/** 加载质检任务详情、规则记录和质检记录。 */
async function loadDetail() {
  loading.value = true;
  loadFailed.value = false;
  route.meta.title = undefined;
  try {
    const [baseDetail, validationResult, qualityResult] = await Promise.all([
      getQualityTaskDetailApi(taskId.value),
      getQualityTaskValidationRecordsApi(taskId.value),
      getQualityTaskQualityRecordsApi(taskId.value),
    ]);
    detail.value = baseDetail;
    validationRecords.value = validationResult.list;
    qualityRecords.value = mapQualityRecords(qualityResult);
    validationCount.value = validationResult.total;
    qualityCount.value = qualityResult.total;
    route.meta.title = baseDetail.displayName;
    setLayoutPath?.(() => [
      { path: "/quality-task", title: t("navigation.menus.qualityTask") },
      { path: route.fullPath, title: t("navigation.pages.qualityTaskDetail") },
    ]);
    syncSamplePage();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

/** 将检查范围字段映射为中文文案：全检 / 复检，未知值保留原值。 */
function getCheckScopeText(checkScope: string): string {
  const scopeMap: Record<string, string> = {
    FULL: t("qualityTask.detail.checkScopeFull"),
    SAMPLED: t("qualityTask.detail.checkScopeSampled"),
  };
  return scopeMap[checkScope] ?? checkScope;
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

/** 质检记录结果：PASS 视为通过，其余一律未通过。 */
function isQualityRecordPassed(result?: string): boolean {
  return (result ?? "").toUpperCase() === "PASS";
}

/** 将质检记录映射为页面结构，展示提交人、质检人和问题样本。 */
function mapQualityRecords(
  result: QualityTaskQualityRecordResult,
): QualityTaskDetailQualityRecord[] {
  return result.list.map((record) => ({
    id: record.id,
    createdAt: record.createdAt,
    submitterName: record.submitterName,
    inspectorName: record.inspectorName,
    result: record.result,
    samples: record.samples.map((sample) => toDetailSample(sample)),
  }));
}

/** 将通用样本模型转换成详情页样本卡片所需数据。 */
function toDetailSample(
  sample: QualityTaskDetail["samples"][number],
): QualityTaskDetailSample {
  const firstIssue = sample.issues[0];
  // 问题级别以实际问题的处理等级为准：必须修改>建议修改>无需修改。
  const issueLevel =
    sample.issues.some((issue) => issue.level === "mustFix") ||
    sample.issueCount > 0
      ? "mustFix"
      : sample.issues.some((issue) => issue.level === "suggestion")
        ? "suggestion"
        : "none";
  return {
    id: sample.id,
    code: sample.code,
    name: sample.name,
    issueLevel,
    issueCount: sample.issueCount,
    issueSummary: sample.issueSummary,
    issueDetail: firstIssue
      ? {
          objectName: firstIssue.objectName ?? "",
          handling: firstIssue.level === "mustFix" ? "必须修改" : "建议修改",
          comment: firstIssue.description,
          location: firstIssue.objectId,
        }
      : undefined,
    issues: sample.issues.map((issue) => ({
      objectName: issue.objectName ?? "",
      handling: issue.level === "mustFix" ? "必须修改" : "建议修改",
      comment: issue.description,
      location: issue.objectId,
    })),
  };
}

/** 使用标注详情一致的分页范围文案。 */
function formatSamplePaginationTotal(total: number, range: [number, number]) {
  return t("annotationTask.paginationTotal", {
    start: range[0],
    end: range[1],
    total,
  });
}

/** 将样本分页切换为指定页，详情其它区域保持稳定。 */
function handleSamplePageChange(page: number) {
  samplePage.value = page;
}

/** 使用统一场景工作台入口打开质检样本。 */
function openWorkbench(sample?: { id: string }) {
  // pc-tool 的 taskId 表示标注任务 ID，质检任务信息单独用 qualityTaskId 传递。
  const annotationTaskId = detail.value?.annotationTaskId;
  if (!taskId.value || !annotationTaskId || !sample?.id) {
    message.warning(t("qualityTask.feedback.workbenchFailed"));
    return;
  }
  goToScenarioWorkbench(detail.value?.designerCode as SCENARIO_TYPE, {
    taskId: annotationTaskId,
    itemId: sample.id,
    qualityTaskId: taskId.value,
    status: detail.value?.status,
  });
}

/** 使用当前任务首个样本进入工作台；传入样本则定位到对应样本。 */
function handleOpenWorkbench(sample?: { id: string }) {
  openWorkbench(sample ?? detail.value?.samples[0]);
}

/** 质检任务的“通过/不通过”使用二次确认控制提交。 */
function handleSubmit(result: "pass" | "fail") {
  Modal.confirm({
    icon: h(ExclamationCircleOutlined),
    title: t(
      result === "pass"
        ? "qualityTask.confirm.passTitle"
        : "qualityTask.confirm.failTitle",
    ),
    content: t(
      result === "pass"
        ? "qualityTask.confirm.passContent"
        : "qualityTask.confirm.failContent",
    ),
    okText:
      result === "pass"
        ? t("qualityTask.actions.pass")
        : t("qualityTask.actions.fail"),
    cancelText: t("qualityTask.actions.cancel"),
    okType: result === "pass" ? "primary" : "danger",
    onOk: async () => {
      actionLoading.value = true;
      try {
        await submitQualityTaskStatusApi(taskId.value, result);
        message.success(t("qualityTask.feedback.actionSuccess"));
        await loadDetail();
      } catch {
        message.error(t("qualityTask.feedback.actionFailed"));
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 返回质检任务列表。 */
function handleBack() {
  void router.push({ name: "quality-task" });
}

onMounted(() => {
  void loadDetail();
});

onBeforeUnmount(() => {
  route.meta.title = undefined;
});

watch(taskId, (nextTaskId, previousTaskId) => {
  if (nextTaskId && nextTaskId !== previousTaskId) {
    detail.value = null;
    validationRecords.value = [];
    qualityRecords.value = [];
    samplePage.value = 1;
    void loadDetail();
  }
});
</script>

<template>
  <main class="quality-task-detail-page">
    <a-result
      v-if="loadFailed"
      status="404"
      :title="t('qualityTask.detail.loadFailed')"
    >
      <template #extra>
        <a-button @click="handleBack">
          {{ t("qualityTask.actions.back") }}
        </a-button>
      </template>
    </a-result>
    <a-spin v-else-if="loading && !detail" :spinning="true" />
    <template v-else-if="detail">
      <!-- 外层卡片：任务名称 + 状态在头部，右侧放置功能按钮 -->
      <a-card :bordered="false" class="quality-task-detail-card">
        <template #title>
          <div class="quality-task-detail-head">
            <h1 class="quality-task-detail-title font-xxl">
              {{ detail.displayName }}
            </h1>
            <a-tag :style="statusTagStyle">{{
              t(`qualityTask.status.${detail.status}`)
            }}</a-tag>
          </div>
        </template>
        <template #extra>
          <div class="quality-task-detail-actions">
            <a-button
              class="quality-task-workbench-button"
              type="primary"
              @click="handleOpenWorkbench()"
            >
              <LinkOutlined />
              {{ t("qualityTask.actions.workbench") }}
            </a-button>
            <a-button
              v-if="canSubmitPass"
              class="quality-task-pass-button"
              :loading="actionLoading"
              @click="handleSubmit('pass')"
            >
              <CheckCircleOutlined />
              {{ t("qualityTask.actions.pass") }}
            </a-button>
            <a-button
              v-if="canSubmitPass"
              class="quality-task-fail-button"
              :loading="actionLoading"
              @click="handleSubmit('fail')"
            >
              <CloseCircleOutlined />
              {{ t("qualityTask.actions.reject") }}
            </a-button>
          </div>
        </template>
        <div class="quality-task-detail-body">
          <div class="quality-task-basic-grid">
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.taskCode")
              }}</span>
              <span class="quality-task-basic-value">{{
                detail.id || "--"
              }}</span>
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.relatedTask")
              }}</span>
              <span class="quality-task-basic-value">{{
                detail.annotationTaskName || "--"
              }}</span>
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.operator")
              }}</span>
              <span class="quality-task-basic-value">{{
                detail.inspectorName || "--"
              }}</span>
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.sampleQuantity")
              }}</span>
              <span class="quality-task-basic-value"
                >{{ detail.sampleCount }}
                {{ t("qualityTask.detail.sampleUnit") }}</span
              >
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.startedAt")
              }}</span>
              <span class="quality-task-basic-value">{{
                formatDate(detail.startedAt)
              }}</span>
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.deadlineAt")
              }}</span>
              <span class="quality-task-basic-value">{{
                formatDate(detail.deadlineAt)
              }}</span>
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.roundInfo")
              }}</span>
              <span class="quality-task-basic-value">{{
                t("qualityTask.detail.roundSummary", {
                  roundName: detail.qualityRoundName,
                  level: detail.qualityLevel,
                  total: detail.totalQualityLevels,
                })
              }}</span>
            </div>
            <div class="quality-task-basic-item">
              <span class="quality-task-basic-label">{{
                t("qualityTask.detail.checkScope")
              }}</span>
              <span class="quality-task-basic-value">{{
                t("qualityTask.detail.scopeSummary", {
                  scope: getCheckScopeText(detail.checkScope),
                  count: detail.sampleCount,
                })
              }}</span>
            </div>
          </div>
        </div>
      </a-card>

      <a-card :bordered="false" class="quality-task-sample-card">
        <template #title>
          <div class="quality-task-section-heading">
            <div class="quality-task-section-title">
              {{ t("qualityTask.detail.samples") }}
            </div>
          </div>
        </template>
        <div v-if="samples.length" class="quality-task-sample-grid">
          <SampleCard
            v-for="sample in samples"
            :key="sample.id"
            :sample="sample"
            @open="handleOpenWorkbench"
          />
        </div>
        <a-empty v-else :description="t('qualityTask.detail.samplesEmpty')" />
        <div v-if="sampleTotal > 0" class="quality-task-pagination">
          <a-pagination
            :current="samplePage"
            :page-size="samplePageSize"
            :total="sampleTotal"
            :show-size-changer="false"
            :show-total="formatSamplePaginationTotal"
            @change="handleSamplePageChange"
          />
        </div>
      </a-card>

      <div class="quality-task-record-grid">
        <a-card
          :bordered="false"
          class="quality-task-record-card quality-task-record-card--validation"
        >
          <template #title>
            <div class="quality-task-section-head">
              <div>
                <div class="quality-task-section-title-row">
                  <div class="quality-task-section-title">
                    {{ t("qualityTask.detail.validationRecords") }}
                  </div>
                  <span class="quality-task-section-count">{{
                    t("qualityTask.detail.recordCount", {
                      count: validationCount,
                    })
                  }}</span>
                </div>
              </div>
            </div>
          </template>
          <DmAppTable
            class="quality-task-validation-table"
            row-key="id"
            :columns="validationColumns"
            :data-source="validationTableRows"
            :loading="false"
            :pagination="false"
            :column-manager="false"
            :table-title="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'createdAt'">
                {{ formatDateTime(record.createdAt) }}
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
            <template #emptyText>
              <a-empty :description="t('qualityTask.detail.noData')" />
            </template>
          </DmAppTable>
        </a-card>

        <a-card
          :bordered="false"
          class="quality-task-record-card quality-task-record-card--quality"
        >
          <template #title>
            <div class="quality-task-section-head">
              <div>
                <div class="quality-task-section-title-row">
                  <div class="quality-task-section-title">
                    {{ t("qualityTask.detail.qualityRecords") }}
                  </div>
                  <span class="quality-task-section-count">{{
                    t("qualityTask.detail.recordCount", { count: qualityCount })
                  }}</span>
                </div>
              </div>
            </div>
          </template>
          <DmAppTable
            :columns="qualityColumns"
            :data-source="qualityRecords"
            :pagination="false"
            :column-manager="false"
            :table-title="false"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'createdAt'">{{
                formatDateTime(record.createdAt)
              }}</template>
              <template v-else-if="column.key === 'result'"
                ><Tag
                  :color="
                    isQualityRecordPassed(record.result) ? 'success' : 'error'
                  "
                  >{{
                    isQualityRecordPassed(record.result)
                      ? t("qualityTask.detail.pass")
                      : t("qualityTask.detail.fail")
                  }}</Tag
                ></template
              >
            </template>
            <template #emptyText
              ><a-empty :description="t('qualityTask.detail.noData')"
            /></template>
          </DmAppTable>
        </a-card>
      </div>
    </template>
  </main>
</template>

<style scoped lang="less">
.quality-task-detail-page {
  min-width: 0;
}
.quality-task-detail-card,
.quality-task-sample-card,
.quality-task-record-card {
  border: 1px solid var(--dm-border-2);
  background: var(--dm-bg-container);
}
.quality-task-detail-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 20px 20px 0;
  border-bottom: 0;
}
.quality-task-detail-card :deep(.ant-card-head-title) {
  padding: 0;
}
.quality-task-detail-card > :deep(.ant-card-body) {
  padding: 18px;
}
.quality-task-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}
.quality-task-detail-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.quality-task-pass-button {
  background: #3fd98e !important;
  border-color: #3fd98e !important;
  color: #fff !important;
}
.quality-task-fail-button {
  background: #ff4d52 !important;
  border-color: #ff4d52 !important;
  color: #fff !important;
}
.quality-task-detail-title {
  margin: 0;
  color: var(--dm-text);
}
.quality-task-detail-body {
  padding: 8px 0 12px 0;
}
.quality-task-basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px 48px;
}
.quality-task-basic-item {
  display: flex;
  align-items: baseline;
  gap: 16px;
  min-width: 0;
}
.quality-task-basic-label {
  flex: 0 0 88px;
  color: var(--dm-text-3);
}
.quality-task-basic-value {
  flex: 1;
  min-width: 0;
  color: var(--dm-text);
}
.quality-task-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.quality-task-info-card {
  border: 1px solid var(--dm-border-2);
  background: var(--dm-bg-container);
}
.quality-task-info-card :deep(.ant-card-body) {
  min-height: 112px;
  padding: 24px 32px;
}
.quality-task-info-label {
  color: var(--dm-text-3);
  font-size: 0.14rem;
}
.quality-task-info-value {
  margin-top: 8px;
  color: var(--dm-text);
  font-size: 0.16rem;
  font-weight: 700;
}
.quality-task-info-desc {
  margin-top: 8px;
  color: var(--dm-text-2);
}
.quality-task-sample-card,
.quality-task-record-card {
  margin-top: 16px;
}
.quality-task-record-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 0 20px;
  border-bottom: 0;
}
.quality-task-record-card :deep(.ant-card-head-title) {
  padding: 20px 0 16px;
}
.quality-task-sample-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 0 20px;
  border-bottom: 0;
}
.quality-task-sample-card :deep(.ant-card-head-title) {
  padding: 20px 0 16px;
}
.quality-task-sample-card {
  font-size: 0.16rem;
  font-weight: 400;
  line-height: 1.4;
}
.quality-task-record-card :deep(.ant-card-body) {
  padding: 0px 20px;
}
.quality-task-sample-card :deep(.ant-card-body) {
  padding: 10px 20px 20px;
}
.quality-task-sample-card
  :deep(
    .annotation-sample-card:not(.annotation-sample-card--compact)
      > .ant-card-body
  ) {
  display: flex;
  min-height: 148px;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px;
}
.quality-task-section-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
}
.quality-task-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dm-text);
  font-size: 0.2rem;
  font-weight: 600;
}
.quality-task-section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.quality-task-section-desc {
  margin-top: 4px;
  color: var(--dm-text-3);
  font-size: 0.13rem;
  font-weight: 400;
}
.quality-task-section-count {
  margin-left: 10px;
  flex: 0 0 auto;
  color: var(--dm-text-3);
  font-size: 0.13rem;
}
.quality-task-sample-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.quality-task-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.quality-task-record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.quality-task-record-grid > .quality-task-record-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.quality-task-record-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
}
.quality-task-record-card--quality :deep(.ant-empty) {
  margin: auto;
}
.quality-task-quality-list {
  display: grid;
  gap: 16px;
}
.quality-task-quality-item {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dm-border-2);
}
.quality-task-quality-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.quality-task-quality-time {
  color: var(--dm-text);
  font-size: 0.12rem;
  font-weight: 600;
}
.quality-task-validation-table {
  height: auto;
}
.quality-task-validation-table :deep(.dm-table__content),
.quality-task-validation-table :deep(.ant-table-wrapper),
.quality-task-validation-table :deep(.ant-spin-nested-loading),
.quality-task-validation-table :deep(.ant-spin-container) {
  display: block;
}
.quality-task-validation-table :deep(.ant-table-body) {
  height: auto;
  overflow-y: visible !important;
}
.quality-task-quality-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  margin-top: 12px;
  color: var(--dm-text-2);
  white-space: nowrap;
}
.quality-task-quality-meta :deep(.ant-tag) {
  margin-inline-end: 0;
}
.quality-task-quality-samples {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.quality-task-quality-sample {
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  background: var(--dm-fill-4);
}
.quality-task-quality-sample-thumb {
  min-height: 88px;
  padding: 8px 12px;
  background: #eef3fb;
  color: var(--dm-text);
}
@media (width <= 992px) {
  .quality-task-detail-card :deep(.ant-card-head) {
    padding: 16px 24px;
  }
  .quality-task-detail-body {
    padding: 8px 13px 12px;
  }
  .quality-task-basic-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .quality-task-info-grid {
    grid-template-columns: 1fr;
  }
  .quality-task-record-grid {
    grid-template-columns: 1fr;
  }
}
@media (width <= 576px) {
  .quality-task-quality-meta {
    flex-wrap: wrap;
    white-space: normal;
  }
}
</style>
