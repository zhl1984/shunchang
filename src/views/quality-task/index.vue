<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { message, Tag } from "ant-design-vue";
import {
  CheckCircleFilled,
  FileTextFilled,
  FormOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons-vue";
import DmAppTable from "@/components/Table/index.vue";
import type { DmTableColumn, DmTableQuery } from "@/components/Table/types";
import { getQualityTaskListApi } from "@/api/quality-task";
import type {
  QualityTask,
  QualityTaskStatus,
  QualityTaskStatistics,
} from "./types";
import { getQualityTaskStatusTagStyle } from "./utils";

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);
const searchInput = ref("");
const keyword = ref("");
const status = ref<QualityTaskStatus | "all">("all");
const tasks = ref<QualityTask[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const selectedStatus = ref<QualityTaskStatus>();
const deadlineSortOrder = ref<"ascend" | "descend">();
const stats = ref<QualityTaskStatistics>({
  total: 0,
  qualityChecking: 0,
  reworking: 0,
  completed: 0,
});

const cards = computed(() => [
  {
    key: "total",
    label: t("qualityTask.summary.total"),
    value: stats.value.total,
    icon: FileTextFilled,
    className: "qt-card--all",
  },
  {
    key: "qualityChecking",
    label: t("qualityTask.summary.qualityChecking"),
    value: stats.value.qualityChecking,
    icon: SyncOutlined,
    className: "qt-card--checking",
  },
  {
    key: "reworking",
    label: t("qualityTask.summary.reworking"),
    value: stats.value.reworking,
    icon: FormOutlined,
    className: "qt-card--reworking",
  },
  {
    key: "completed",
    label: t("qualityTask.summary.completed"),
    value: stats.value.completed,
    icon: CheckCircleFilled,
    className: "qt-card--completed",
  },
]);
const statusOptions = computed(() => [
  { label: t("qualityTask.status.qualityChecking"), value: "qualityChecking" },
  { label: t("qualityTask.status.reworking"), value: "reworking" },
  { label: t("qualityTask.status.completed"), value: "completed" },
]);
const columns = computed<DmTableColumn<QualityTask>[]>(() => [
  {
    title: t("qualityTask.table.name"),
    dataIndex: "displayName",
    key: "displayName",
    className: "font-bold",
    width: 320,
    fixed: "left",
  },
  {
    title: t("qualityTask.table.status"),
    dataIndex: "status",
    key: "status",
    width: 160,
    dmFilter: { type: "enum", multiple: false, options: statusOptions.value },
  },
  {
    title: t("qualityTask.table.inspector"),
    dataIndex: "inspectorName",
    key: "inspectorName",
    width: 160,
  },
  {
    title: t("qualityTask.table.sampleCount"),
    dataIndex: "sampleCount",
    key: "sampleCount",
    width: 140,
    align: "right",
    customCell: () => ({ class: "quality-task-number-cell" }),
    customHeaderCell: () => ({ class: "quality-task-number-header" }),
  },
  {
    title: t("qualityTask.table.deadline"),
    dataIndex: "deadlineAt",
    key: "deadlineAt",
    sorter: true,
    width: 180,
  },
  {
    title: t("qualityTask.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    width: 120,
    fixed: "right",
  },
]);
const statusLabels = computed<Record<QualityTaskStatus, string>>(() => ({
  qualityChecking: t("qualityTask.status.qualityChecking"),
  reworking: t("qualityTask.status.reworking"),
  completed: t("qualityTask.status.completed"),
}));

/** 根据任务状态返回当前语言的展示文案，确保模板索引使用受限的状态联合类型。 */
function getQualityTaskStatusLabel(taskStatus: QualityTaskStatus): string {
  return statusLabels.value[taskStatus];
}

/** 加载质检任务列表及统计数据。 */
async function loadList() {
  loading.value = true;
  try {
    const result = await getQualityTaskListApi({
      keyword: keyword.value,
      status: status.value,
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...(deadlineSortOrder.value
        ? {
            sortField: "deadline" as const,
            ascSort: deadlineSortOrder.value === "ascend",
          }
        : {}),
    });
    tasks.value = result.list;
    pagination.total = result.total;
    stats.value = result.statistics;
  } catch (error) {
    message.error(
      error instanceof Error
        ? error.message
        : t("qualityTask.feedback.loadFailed"),
    );
  } finally {
    loading.value = false;
  }
}
/** 搜索任务并回到第一页。 */
function handleSearch() {
  const nextKeyword = searchInput.value.trim();
  if (nextKeyword === keyword.value) return;
  keyword.value = nextKeyword;
  pagination.current = 1;
  void loadList();
}
/** 响应服务端表格的状态筛选、截止时间排序和分页。 */
function handleTableFilter(query: DmTableQuery) {
  const candidate = Array.isArray(query.filters.status)
    ? query.filters.status[0]
    : query.filters.status;
  const nextStatus: QualityTaskStatus | undefined =
    candidate === "qualityChecking" ||
    candidate === "reworking" ||
    candidate === "completed"
      ? candidate
      : undefined;
  const nextPageSize = query.pagination.pageSize ?? pagination.pageSize;
  const statusChanged = nextStatus !== selectedStatus.value;
  const pageSizeChanged = nextPageSize !== pagination.pageSize;
  const nextSortOrder =
    query.sorter?.field === "deadlineAt" ? query.sorter.order : undefined;
  const sortChanged = nextSortOrder !== deadlineSortOrder.value;
  selectedStatus.value = nextStatus;
  deadlineSortOrder.value = nextSortOrder;
  status.value = nextStatus ?? "all";
  pagination.pageSize = nextPageSize;
  // 状态筛选和截止时间排序由服务端处理，条件变化时从第一页重新查询。
  if (statusChanged || sortChanged || pageSizeChanged) {
    pagination.current = 1;
    void loadList();
    return;
  }
  if (
    query.pagination.current &&
    query.pagination.current !== pagination.current
  ) {
    pagination.current = query.pagination.current;
    void loadList();
  }
}
/** 跳转到质检任务详情页，由详情页承接查看和处理动作。 */
function handleView(task: QualityTask) {
  void router.push({ name: "quality-task-detail", params: { id: task.id } });
}
onMounted(loadList);
</script>

<template>
  <div class="quality-task-page">
    <section class="quality-task-overview">
      <div class="quality-task-statistics">
        <a-card
          v-for="card in cards"
          :key="card.key"
          :bordered="false"
          class="quality-task-stat-card"
        >
          <div class="quality-task-stat-icon">
            <component :is="card.icon" />
          </div>
          <div class="quality-task-stat-content">
            <div class="quality-task-stat-label">{{ card.label }}</div>
            <div class="quality-task-stat-value">{{ card.value }}</div>
          </div>
        </a-card>
      </div>
    </section>
    <section class="quality-task-list">
      <DmAppTable
        row-key="id"
        :table-title="t('qualityTask.table.title')"
        :columns="columns"
        :data-source="tasks"
        mode="service"
        :loading="loading"
        :scroll="{ x: 1080 }"
        :pagination="pagination"
        @filter="handleTableFilter"
      >
        <template #titleTool
          ><a-input
            v-model:value="searchInput"
            class="quality-task-search"
            :placeholder="t('qualityTask.searchPlaceholder')"
            allow-clear
            size="large"
            @press-enter="handleSearch"
            @blur="handleSearch"
            ><template #prefix><SearchOutlined /></template></a-input
        ></template>
        <template #emptyText>
          <a-empty :description="t('components.table.empty')" />
        </template>
        <template #bodyCell="{ column, record }"
          ><template v-if="column.key === 'status'"
            ><Tag :style="getQualityTaskStatusTagStyle(record.status)">{{
              getQualityTaskStatusLabel(record.status)
            }}</Tag></template
          ><template v-else-if="column.key === 'deadlineAt'">{{
            record.deadlineAt || "-"
          }}</template
          ><template v-else-if="column.key === 'actions'"
            ><a-button type="link" size="small" @click="handleView(record)">{{
              t("qualityTask.actions.view")
            }}</a-button></template
          ></template
        >
      </DmAppTable>
    </section>
  </div>
</template>

<style scoped>
.quality-task-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
  gap: 16px;
  background: var(--dm-bg-layout);
  overflow: hidden;
}
.quality-task-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px;
  background: var(--dm-bg-container);
  border-radius: 8px;
}
.quality-task-overview {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
}
.quality-task-statistics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.quality-task-stat-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 108px;
  border: 0;
  border-radius: 8px;
  background: var(--dm-bg-container);
  padding: 0;
  box-shadow: none;
}
.quality-task-stat-card.ant-card {
  box-shadow: none !important;
}
.quality-task-stat-card :deep(.ant-card-body) {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  padding: 16px;
}
.quality-task-stat-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 50%;
  color: #1677ff;
  background: #edf5ff;
  font-size: 20px;
}
.quality-task-stat-content {
  min-width: 0;
}
.quality-task-stat-label {
  display: block;
  color: var(--dm-text-2);
  font-size: 0.13rem;
  font-weight: 400;
}
.quality-task-stat-value {
  display: block;
  margin-top: 10px;
  color: var(--dm-text);
  font-size: 0.28rem;
  font-weight: 400;
  line-height: 1;
}
.quality-task-list {
  flex: 1;
  overflow: hidden;
  height: 100%;
  padding: 20px;
  background: var(--dm-bg-container);
  border-radius: 8px;
}
.quality-task-search {
  width: min(280px, 100%);
}

.quality-task-page :deep(.quality-task-number-cell),
.quality-task-page :deep(.quality-task-number-header) {
  text-align: right !important;
}

@media (max-width: 1024px) {
  .quality-task-statistics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .quality-task-statistics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
