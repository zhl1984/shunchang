<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  CheckCircleFilled,
  EditOutlined,
  FileTextFilled,
  FormOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons-vue";
import DmAppTable from "@/components/Table/index.vue";
import type { DmTableColumn, DmTableQuery } from "@/components/Table/types";

import {
  ANNOTATION_TASK_DEFAULT_PAGE,
  ANNOTATION_TASK_DEFAULT_PAGE_SIZE,
  getAnnotationTaskListApi,
} from "@/api/annotation-task";
import type {
  AnnotationTask,
  AnnotationTaskAggregateStatus,
  AnnotationTaskStatistics,
} from "./types";
import { getTaskStatusTagStyle } from "./utils";
import { formatDate } from "@/utils/format";

const { t } = useI18n();
const router = useRouter();
const tasks = ref<AnnotationTask[]>([]);
const searchInput = ref("");
const keyword = ref("");
const activeStatus = ref<AnnotationTaskAggregateStatus | "all">("all");
const currentPage = ref(ANNOTATION_TASK_DEFAULT_PAGE);
const pageSize = ref(ANNOTATION_TASK_DEFAULT_PAGE_SIZE);
const total = ref(0);
const loading = ref(false);
const loadFailed = ref(false);
const statistics = ref<AnnotationTaskStatistics>({
  total: 0,
  annotating: 0,
  qualityChecking: 0,
  reworking: 0,
  completed: 0,
});
const selectedStatus = ref<AnnotationTaskAggregateStatus>();
const deadlineSortOrder = ref<"ascend" | "descend">();
let latestRequestId = 0;

const statisticsCards = computed(() => [
  {
    key: "all",
    label: t("annotationTask.status.all"),
    value: statistics.value.total,
    icon: FileTextFilled,
    className: "annotation-task-stat-card--all",
  },
  {
    key: "annotating",
    label: t("annotationTask.status.annotating"),
    value: statistics.value.annotating,
    icon: EditOutlined,
    className: "annotation-task-stat-card--annotating",
  },
  {
    key: "qualityChecking",
    label: t("annotationTask.status.qualityChecking"),
    value: statistics.value.qualityChecking,
    icon: SyncOutlined,
    className: "annotation-task-stat-card--quality",
  },
  {
    key: "reworking",
    label: t("annotationTask.status.reworking"),
    value: statistics.value.reworking,
    icon: FormOutlined,
    className: "annotation-task-stat-card--reworking",
  },
  {
    key: "completed",
    label: t("annotationTask.status.completed"),
    value: statistics.value.completed,
    icon: CheckCircleFilled,
    className: "annotation-task-stat-card--completed",
  },
]);

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ["10", "20", "50"],
  showTotal: formatPaginationTotal,
}));

const statusOptions = computed(() => [
  { label: t("annotationTask.status.annotating"), value: "annotating" },
  {
    label: t("annotationTask.status.qualityChecking"),
    value: "qualityChecking",
  },
  { label: t("annotationTask.status.reworking"), value: "reworking" },
  { label: t("annotationTask.status.completed"), value: "completed" },
]);

const columns = computed<DmTableColumn<AnnotationTask>[]>(() => [
  {
    title: t("annotationTask.table.taskName"),
    dataIndex: "displayName",
    key: "displayName",
    className: "table-bold-cell",
    fixed: "left",
    width: 300,
  },
  {
    title: t("annotationTask.table.status"),
    dataIndex: "status",
    key: "status",
    width: 150,
    dmFilter: { type: "enum", multiple: false, options: statusOptions.value },
  },
  {
    title: t("annotationTask.table.assignee"),
    dataIndex: "assigneeName",
    key: "assigneeName",
    width: 150,
  },
  {
    title: t("annotationTask.table.sampleCount"),
    dataIndex: "sampleCount",
    key: "sampleCount",
    width: 96,
    align: "right",
    customCell: () => ({ class: "annotation-task-number-cell" }),
    customHeaderCell: () => ({ class: "annotation-task-number-header" }),
  },
  {
    title: t("annotationTask.table.deadline"),
    dataIndex: "deadlineAt",
    key: "deadlineAt",
    sorter: true,
    width: 180,
  },
  {
    title: t("annotationTask.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    fixed: "right",
    width: 120,
  },
]);

/** 加载当前筛选条件的任务列表，使用请求序号避免旧响应覆盖新查询*/
async function loadTasks() {
  const requestId = ++latestRequestId;
  loading.value = true;
  loadFailed.value = false;
  try {
    const result = await getAnnotationTaskListApi({
      keyword: keyword.value,
      page: currentPage.value,
      pageSize: pageSize.value,
      status: activeStatus.value,
      ...(deadlineSortOrder.value
        ? {
            sortField: "deadline" as const,
            ascSort: deadlineSortOrder.value === "ascend",
          }
        : {}),
    });
    if (requestId !== latestRequestId) return;
    tasks.value = result.list;
    total.value = result.total;
    statistics.value = result.statistics;
  } catch {
    if (requestId === latestRequestId) {
      tasks.value = [];
      total.value = 0;
      loadFailed.value = true;
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false;
  }
}

/** 提交搜索词并回到第一页。 */
function handleSearch() {
  const nextKeyword = searchInput.value.trim();
  if (nextKeyword === keyword.value) return;
  keyword.value = nextKeyword;
  currentPage.value = ANNOTATION_TASK_DEFAULT_PAGE;
  void loadTasks();
}

/** 响应封装表格的状态筛选、截止时间排序和分页事件。 */
function handleTableFilter(query: DmTableQuery) {
  const nextStatus = parseStatusFilter(query.filters.status);
  const statusChanged = nextStatus !== selectedStatus.value;
  const nextPageSize = query.pagination.pageSize ?? pageSize.value;
  const pageSizeChanged = nextPageSize !== pageSize.value;
  const nextSortOrder =
    query.sorter?.field === "deadlineAt" ? query.sorter.order : undefined;
  const sortChanged = nextSortOrder !== deadlineSortOrder.value;
  selectedStatus.value = nextStatus;
  deadlineSortOrder.value = nextSortOrder;
  pageSize.value = nextPageSize;
  activeStatus.value = nextStatus ?? "all";
  // 状态筛选和截止时间排序由服务端处理，条件变化时从第一页重新查询。
  if (statusChanged || sortChanged || pageSizeChanged) {
    currentPage.value = ANNOTATION_TASK_DEFAULT_PAGE;
    void loadTasks();
    return;
  }
  const nextPage = query.pagination.current ?? ANNOTATION_TASK_DEFAULT_PAGE;
  if (nextPage !== currentPage.value) {
    currentPage.value = nextPage;
    void loadTasks();
  }
}

/** 将状态筛选值收窄为单个后端状态。 */
function parseStatusFilter(
  value: unknown,
): AnnotationTaskAggregateStatus | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "annotating" ||
    candidate === "qualityChecking" ||
    candidate === "reworking" ||
    candidate === "completed"
    ? candidate
    : undefined;
}

/** 打开任务详情。 */
function handleOpenDetail(task: AnnotationTask) {
  void router.push({
    name: "annotation-task-detail",
    params: { id: task.id },
  });
}

/** 根据任务状态返回国际化文案。 */
function getStatusText(status: AnnotationTask["status"]): string {
  return t(`annotationTask.status.${status}`);
}

/** 格式化分页总数。 */
function formatPaginationTotal(count: number, range: [number, number]) {
  return t("annotationTask.paginationTotal", {
    start: range[0],
    end: range[1],
    total: count,
  });
}

onMounted(() => {
  void loadTasks();
});
</script>

<template>
  <main class="annotation-task-page flex flex-column gap-16">
    <section class="annotation-task-overview">
      <div class="annotation-task-statistics">
        <a-card
          v-for="item in statisticsCards"
          :key="item.key"
          :bordered="false"
          class="annotation-task-stat-card"
        >
          <div class="annotation-task-stat-icon">
            <component :is="item.icon" />
          </div>
          <div class="annotation-task-stat-content">
            <div class="annotation-task-stat-label">{{ item.label }}</div>
            <div class="annotation-task-stat-value">{{ item.value }}</div>
          </div>
        </a-card>
      </div>
    </section>

    <a-card :bordered="false" class="annotation-task-content">
      <a-result
        v-if="loadFailed"
        status="error"
        :title="t('annotationTask.loadFailed.title')"
        :sub-title="t('annotationTask.loadFailed.description')"
      >
        <template #extra
          ><a-button type="primary" @click="loadTasks">{{
            t("annotationTask.actions.retry")
          }}</a-button></template
        >
      </a-result>

      <DmAppTable
        v-else
        row-key="id"
        :table-title="t('annotationTask.table.title')"
        :columns="columns"
        :data-source="tasks"
        :loading="loading"
        mode="service"
        :pagination="pagination"
        :scroll="{ x: 1040 }"
        @filter="handleTableFilter"
      >
        <template #titleTool>
          <a-input
            v-model:value="searchInput"
            allow-clear
            size="large"
            class="annotation-task-search"
            :placeholder="t('annotationTask.searchPlaceholder')"
            @press-enter="handleSearch"
            @blur="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :style="getTaskStatusTagStyle(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'sampleCount'">
            {{ record.sampleCount }}
          </template>
          <template v-else-if="column.key === 'deadlineAt'">
            {{ formatDate(record.deadlineAt) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="table-actions">
              <a-button type="link" @click="handleOpenDetail(record)">
                {{ t("annotationTask.actions.view") }}
              </a-button>
            </div>
          </template>
        </template>
        <template #emptyText>
          <a-empty
            :description="
              keyword
                ? t('annotationTask.empty.search')
                : t('annotationTask.empty.default')
            "
          />
        </template>
      </DmAppTable>
    </a-card>
  </main>
</template>

<style scoped lang="less">
.annotation-task-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.annotation-task-page :deep(.annotation-task-number-cell) {
  text-align: right !important;
}

.annotation-task-page :deep(.annotation-task-number-header) {
  text-align: right !important;
}

.annotation-task-content {
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  background: var(--dm-bg-container);
}
.annotation-task-overview {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
}
.annotation-task-content {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  box-shadow: none;
}
.annotation-task-content :deep(.ant-card-body) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  padding: 20px;
}
.annotation-task-overview :deep(.ant-card) {
  border: 0 !important;
  box-shadow: none !important;
}
.annotation-task-statistics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.annotation-task-stat-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 108px;
  border: 0;
  border-radius: 8px;
  background: var(--dm-bg-container);
}
.annotation-task-stat-icon {
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
.annotation-task-stat-content {
  min-width: 0;
}
.annotation-task-stat-card :deep(.ant-card-body) {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  padding: 16px;
}
.annotation-task-stat-label {
  color: var(--dm-text-2);
  font-size: 0.13rem;
  font-weight: 400;
}
.annotation-task-stat-value {
  margin-top: 10px;
  color: var(--dm-text);
  font-size: 0.28rem;
  font-weight: 400;
  line-height: 1;
}
.annotation-task-search {
  width: min(280px, 100%);
}
.annotation-task-content :deep(.dm-table__content) {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.annotation-task-content :deep(.dm-table),
.annotation-task-content :deep(.ant-table-wrapper),
.annotation-task-content :deep(.ant-spin-nested-loading),
.annotation-task-content :deep(.ant-spin-container) {
  min-width: 0;
  max-width: 100%;
}
.annotation-task-content :deep(.ant-table-body) {
  overflow-y: auto !important;
}

@media (max-width: 1024px) {
  .annotation-task-statistics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .annotation-task-content :deep(.dm-table__header) {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .annotation-task-content :deep(.dm-table__tools) {
    flex-basis: 100%;
    justify-content: flex-start;
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .annotation-task-statistics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .annotation-task-content :deep(.dm-table__tools) {
    flex-wrap: wrap;
  }

  .annotation-task-search {
    flex: 1 1 220px;
  }
}
</style>
