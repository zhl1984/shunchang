<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
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
import { getProjectDetailApi, type ProjectDetail } from "@/api/project";
import { formatDate } from "@/utils/format";
import { getAnnotationTaskListApi } from "@/api/annotation-task";
import { getProjectIterationsApi, type ProjectIteration } from "@/api/project";
import type {
  AnnotationTask,
  AnnotationTaskStatus,
} from "@/views/annotation-task/types";
import ReassignModal from "./components/ReassignModal.vue";
import ModelIterationPanel from "./components/ModelIterationPanel.vue";
type ProjectTask = AnnotationTask;
type ProjectTaskDisplay = ProjectTask & { startedAtDisplay: string };
type ProjectTaskStatus = AnnotationTaskStatus;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const projectCode = computed(() => String(route.params.id ?? ""));
const detail = ref<ProjectDetail | null>(null);
const tasks = ref<ProjectTaskDisplay[]>([]);
const keyword = ref("");
const loading = ref(true);
const failed = ref(false);
const iterations = ref<ProjectIteration[]>([]);
const reassignOpen = ref(false);
const reassignTask = ref<ProjectTask>();
const selectedStatus = ref<ProjectTaskStatus>();
const deadlineSortOrder = ref<"ascend" | "descend">();
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const statusMap: Record<
  ProjectTaskStatus,
  { label: string; className: string }
> = {
  annotating: {
    label: t("projectManagement.detail.status.annotating"),
    className: "dm-tag-2",
  },
  qualityChecking: {
    label: t("projectManagement.detail.status.qualityChecking"),
    className: "dm-tag-1",
  },
  reworking: {
    label: t("projectManagement.detail.status.reworking"),
    className: "dm-tag-5",
  },
  completed: {
    label: t("projectManagement.detail.status.completed"),
    className: "dm-tag-3",
  },
};
/** 返回任务状态展示配置，兼容表格插槽的宽泛记录类型。 */
function getTaskStatus(status: unknown) {
  if (typeof status === "string" && status in statusMap) {
    return statusMap[status as ProjectTaskStatus];
  }
  return { label: "--", className: "" };
}
/** 任务状态筛选选项与顶部状态卡片使用同一套文案。 */
const statusFilterOptions = computed(() =>
  (Object.keys(statusMap) as ProjectTaskStatus[]).map((value) => ({
    value,
    label: statusMap[value].label,
  })),
);
const columns = computed<DmTableColumn<ProjectTaskDisplay>[]>(() => [
  {
    title: t("projectManagement.detail.table.name"),
    dataIndex: "displayName",
    key: "displayName",
    className: "font-bold",
    width: 300,
    fixed: "left",
  },
  {
    title: t("projectManagement.detail.table.status"),
    dataIndex: "status",
    key: "status",
    width: 140,
    dmFilter: {
      type: "enum",
      multiple: false,
      options: statusFilterOptions.value,
    },
  },
  {
    title: t("projectManagement.detail.table.assignee"),
    dataIndex: "assigneeName",
    key: "assigneeName",
    width: 140,
  },
  {
    title: t("projectManagement.detail.table.sampleCount"),
    dataIndex: "sampleCount",
    key: "sampleCount",
    width: 140,
    align: "right",
  },
  {
    title: t("projectManagement.detail.table.startedAt"),
    dataIndex: "startedAt",
    key: "startedAt",
    width: 160,
    customRender: ({ record }) => record.startedAtDisplay,
  },
  {
    title: t("projectManagement.detail.table.deadlineAt"),
    dataIndex: "deadlineAt",
    key: "deadlineAt",
    sorter: true,
    width: 160,
  },
  {
    title: t("projectManagement.detail.table.actions"),
    key: "actions",
    width: 120,
    fixed: "right",
  },
]);
const cards = computed(() => [
  {
    label: t("projectManagement.detail.status.annotating"),
    value: tasks.value.filter((item) => item.status === "annotating").length,
    icon: FileTextFilled,
    className: "dm-card-3",
  },
  {
    label: t("projectManagement.detail.status.qualityChecking"),
    value: tasks.value.filter((item) => item.status === "qualityChecking")
      .length,
    icon: SyncOutlined,
    className: "dm-card-2",
  },
  {
    label: t("projectManagement.detail.status.reworking"),
    value: tasks.value.filter((item) => item.status === "reworking").length,
    icon: FormOutlined,
    className: "dm-card-5",
  },
  {
    label: t("projectManagement.detail.status.completed"),
    value: tasks.value.filter((item) => item.status === "completed").length,
    icon: CheckCircleFilled,
    className: "dm-card-4",
  },
]);

/** 加载项目详情及其任务列表。 */
async function loadPage() {
  loading.value = true;
  failed.value = false;
  try {
    const project = await getProjectDetailApi(projectCode.value);
    const [taskResult, iterationResult] = await Promise.all([
      getAnnotationTaskListApi({
        projectCode: projectCode.value,
        keyword: keyword.value,
        page: pagination.current,
        pageSize: pagination.pageSize,
        status: selectedStatus.value ?? "all",
        ...(deadlineSortOrder.value
          ? {
              sortField: "deadline" as const,
              ascSort: deadlineSortOrder.value === "ascend",
            }
          : {}),
      }),
      // 项目关闭模型迭代时不请求无效的迭代轮次数据。
      project.iterationEnabled
        ? getProjectIterationsApi(projectCode.value)
        : Promise.resolve([] as ProjectIteration[]),
    ]);
    detail.value = project;
    tasks.value = taskResult.list.map((task) => ({
      ...task,
      startedAtDisplay: formatDate(task.startedAt),
    }));
    pagination.total = taskResult.total;
    iterations.value = iterationResult;
  } catch (error) {
    failed.value = true;
    message.error(
      error instanceof Error
        ? error.message
        : t("projectManagement.detail.feedback.loadFailed"),
    );
  } finally {
    loading.value = false;
  }
}
/** 搜索任务并回到第一页。 */
function handleSearch() {
  pagination.current = 1;
  void loadPage();
}
/** 响应任务列表的状态筛选、截止时间排序和分页。 */
function handleFilter(payload: DmTableQuery) {
  const nextStatus = parseTaskStatusFilter(payload.filters.status);
  const nextSortOrder =
    payload.sorter?.field === "deadlineAt" ? payload.sorter.order : undefined;
  const nextPageSize = payload.pagination.pageSize ?? pagination.pageSize;
  const statusChanged = nextStatus !== selectedStatus.value;
  const sortChanged = nextSortOrder !== deadlineSortOrder.value;
  const pageSizeChanged = nextPageSize !== pagination.pageSize;
  selectedStatus.value = nextStatus;
  deadlineSortOrder.value = nextSortOrder;
  pagination.pageSize = nextPageSize;
  // 筛选和排序由服务端作用于完整任务集，条件变化时从第一页重新查询。
  if (statusChanged || sortChanged || pageSizeChanged) {
    pagination.current = 1;
    void loadPage();
    return;
  }
  const nextPage = payload.pagination.current ?? 1;
  if (nextPage !== pagination.current) {
    pagination.current = nextPage;
    void loadPage();
  }
}

/** 将状态筛选值收窄为项目任务支持的单个状态。 */
function parseTaskStatusFilter(value: unknown): ProjectTaskStatus | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "annotating" ||
    candidate === "qualityChecking" ||
    candidate === "reworking" ||
    candidate === "completed"
    ? candidate
    : undefined;
}
/** 重新指派占位操作。 */
function handleReassign(task: ProjectTask) {
  reassignTask.value = task;
  reassignOpen.value = true;
}
function handleBack() {
  void router.push({ name: "project-management" });
}
watch(projectCode, () => {
  pagination.current = 1;
  selectedStatus.value = undefined;
  deadlineSortOrder.value = undefined;
  void loadPage();
});
onMounted(() => void loadPage());
</script>

<template>
  <main class="project-detail-page">
    <a-result
      v-if="failed"
      status="404"
      :title="t('projectManagement.detail.feedback.loadFailed')"
      ><template #extra
        ><a-button @click="handleBack">{{
          t("projectManagement.detail.actions.back")
        }}</a-button></template
      ></a-result
    >
    <template v-else>
      <div class="project-summary">
        <div
          v-for="card in cards"
          :key="card.label"
          class="summary-card"
          :class="card.className"
        >
          <div class="summary-card__icon"><component :is="card.icon" /></div>
          <div class="summary-card__content">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </div>
        </div>
      </div>
      <ModelIterationPanel
        v-if="detail?.iterationEnabled"
        :iterations="iterations"
      />
      <section class="project-list">
        <DmAppTable
          row-key="id"
          :table-title="t('projectManagement.detail.table.title')"
          :columns="columns"
          :data-source="tasks"
          mode="service"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1100, y: 240 }"
          @filter="handleFilter"
        >
          <template #titleTool>
            <DmInput
              v-model:value="keyword"
              class="project-list-keyword"
              :placeholder="t('projectManagement.detail.searchPlaceholder')"
              size="large"
              allow-clear
              @clear="handleSearch"
              @press-enter="handleSearch"
            >
              <template #prefix> <SearchOutlined /> </template>
            </DmInput>
          </template>
          <template #bodyCell="{ column, record }"
            ><template v-if="column.key === 'status'">
              <Tag :class="getTaskStatus(record.status).className">{{
                getTaskStatus(record.status).label
              }}</Tag>
            </template>
            <template v-else-if="column.key === 'actions'"
              ><a-button
                type="link"
                size="small"
                @click="handleReassign(record)"
                >{{ t("projectManagement.detail.actions.reassign") }}</a-button
              ></template
            ></template
          >
        </DmAppTable>
      </section>
      <ReassignModal
        v-model:open="reassignOpen"
        :task="reassignTask"
        @assigned="loadPage"
      />
    </template>
  </main>
</template>

<style scoped>
.project-detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 16px;
  background: var(--dm-bg-layout);
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.project-summary {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 108px;
  padding: 16px;
  border: 0;
  border-radius: 8px;
  background: var(--dm-bg-container);
  box-shadow: none;
}

/* 统计卡片统一使用标注任务页的白色容器，状态色仅保留在图标语义上。 */
.summary-card[class*="dm-card-"] {
  background: var(--dm-bg-container);
  border-color: transparent;
  color: inherit;
}

.summary-card__icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 50%;
  color: #1677ff !important;
  background: #edf5ff;
  font-size: 20px;
}

.summary-card__icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.summary-card__content {
  min-width: 0;
}

.summary-card span {
  display: block;
  font-size: 0.13rem;
  font-weight: 400;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  color: var(--dm-text);
  font-size: 0.28rem;
  font-weight: 400;
  line-height: 1;
}

.project-list {
  flex: 1;
  padding: 20px;
  background: var(--dm-bg-container);
  border-radius: 8px;
}

.project-list-keyword {
  width: max(20vw, 200px);
}

@media (max-width: 1024px) {
  .project-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
