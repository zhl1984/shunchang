<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { message, Modal, Tag } from "ant-design-vue";
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  FileTextFilled,
  PlayCircleFilled,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons-vue";
import { useRouter } from "vue-router";
import DmAppTable from "@/components/Table/index.vue";
import type {
  DmFilterOption,
  DmTableColumn,
  DmTableQuery,
} from "@/components/Table/types";
import { formatThousands } from "@/utils/format";
import {
  getProjectListApi,
  getProjectStatisticsApi,
  deleteProjectApi,
  type ProjectListItem,
  type ProjectStatus,
  type ProjectStatistics,
} from "@/api/project";
import ProjectModal from "./components/ProjectModal.vue";
import {
  MAIN_LAYOUT_BREADCRUMB,
  type MainLayoutBreadcrumbSetter,
} from "@/constants/inject";

const { t } = useI18n();
const router = useRouter();
const setLayoutPath = inject<MainLayoutBreadcrumbSetter>(
  MAIN_LAYOUT_BREADCRUMB,
);

const loading = ref(false);
const modalOpen = ref(false);
const modalMode = ref<"create" | "view">("create");
const modalProjectCode = ref<string>();
const keyword = ref("");
const tableData = ref<ProjectListItem[]>([]);
const deadlineSortOrder = ref<"ascend" | "descend">();
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const stats = ref<ProjectStatistics>({
  total: 0,
  PROCESSING: 0,
  RUNNING: 0,
  COMPLETED: 0,
  FAILED: 0,
});
const statusMap = computed<
  Record<ProjectStatus, { label: string; className: string }>
>(() => ({
  PROCESSING: {
    label: t("projectManagement.status.processing"),
    className: "dm-tag-1",
  },
  RUNNING: {
    label: t("projectManagement.status.running"),
    className: "dm-tag-2",
  },
  COMPLETED: {
    label: t("projectManagement.status.completed"),
    className: "dm-tag-3",
  },
  FAILED: {
    label: t("projectManagement.status.failed"),
    className: "dm-tag-4",
  },
}));
const statusFilterOptions = computed(() =>
  (Object.keys(statusMap.value) as ProjectStatus[]).map((value) => ({
    value,
    label: statusMap.value[value].label,
  })),
);
const iterationFilterOptions = computed<DmFilterOption[]>(() => [
  {
    value: "true",
    label: t("projectManagement.iteration.enabled"),
  },
  {
    value: "false",
    label: t("projectManagement.iteration.disabled"),
  },
]);
const cards = computed(() => [
  {
    label: t("projectManagement.summary.total"),
    value: stats.value.total,
    icon: FileTextFilled,
    tone: "all",
    className: "dm-card-1",
  },
  {
    label: t("projectManagement.status.processing"),
    value: stats.value.PROCESSING,
    icon: SyncOutlined,
    tone: "processing",
    className: "dm-card-2",
  },
  {
    label: t("projectManagement.status.running"),
    value: stats.value.RUNNING,
    icon: PlayCircleFilled,
    tone: "running",
    className: "dm-card-3",
  },
  {
    label: t("projectManagement.status.completed"),
    value: stats.value.COMPLETED,
    icon: CheckCircleFilled,
    tone: "completed",
    className: "dm-card-4",
  },
  {
    label: t("projectManagement.status.failed"),
    value: stats.value.FAILED,
    icon: ExclamationCircleFilled,
    tone: "failed",
    className: "dm-card-5",
  },
]);
const columns = computed<DmTableColumn<ProjectListItem>[]>(() => [
  {
    title: t("projectManagement.table.name"),
    dataIndex: "projectName",
    key: "projectName",
    className: "font-bold",
    width: 240,
    fixed: "left",
  },
  {
    title: t("projectManagement.table.status"),
    dataIndex: "projectStatus",
    key: "projectStatus",
    width: 140,
    dmFilter: {
      type: "enum",
      multiple: false,
      options: statusFilterOptions.value,
    },
  },
  {
    title: t("projectManagement.table.iterationStatus"),
    dataIndex: "iterationEnabled",
    key: "iterationEnabled",
    width: 120,
    dmFilter: {
      type: "enum",
      multiple: false,
      options: iterationFilterOptions.value,
    },
  },
  {
    title: t("projectManagement.table.memberCount"),
    dataIndex: "memberCount",
    key: "memberCount",
    width: 96,
    align: "right",
    customCell: () => ({ class: "project-table-number-cell" }),
    customHeaderCell: () => ({ class: "project-table-number-header" }),
  },
  {
    title: t("projectManagement.table.sampleCount"),
    dataIndex: "dataCount",
    key: "dataCount",
    width: 96,
    align: "right",
    customCell: () => ({ class: "project-table-number-cell" }),
    customHeaderCell: () => ({ class: "project-table-number-header" }),
  },
  {
    title: t("projectManagement.table.deadline"),
    dataIndex: "deadline",
    key: "deadline",
    sorter: true,
    width: 120,
  },
  {
    title: t("projectManagement.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    width: 80,
    fixed: "right",
  },
]);

/** 返回项目状态对应的国际化文案和主题类名。 */
function getProjectStatus(record: ProjectListItem) {
  return statusMap.value[record.projectStatus];
}

/** 返回自迭代状态的国际化文案和主题类名。 */
function getIterationStatus(enabled: boolean) {
  return enabled
    ? { label: t("projectManagement.iteration.enabled"), className: "dm-tag-5" }
    : {
        label: t("projectManagement.iteration.disabled"),
        className: "dm-tag-6",
      };
}

/** 将人数和样本数量格式化为无小数位的千分位文本。 */
function formatCount(value: number) {
  return formatThousands(value, 0);
}

/** 按当前搜索与分页条件刷新项目列表。 */
async function loadProjectList() {
  loading.value = true;
  try {
    const list = await getProjectListApi({
      keyword: keyword.value || undefined,
      ...(selectedStatus.value ? { status: selectedStatus.value } : {}),
      ...(selectedIterationEnabled.value === undefined
        ? {}
        : { iterationEnabled: selectedIterationEnabled.value }),
      ...(deadlineSortOrder.value
        ? {
            sortField: "deadline" as const,
            ascSort: deadlineSortOrder.value === "ascend",
          }
        : {}),
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    });
    tableData.value = list.list;
    pagination.total = list.total;
  } catch (error) {
    message.error(
      error instanceof Error
        ? error.message
        : t("projectManagement.feedback.loadFailed"),
    );
  } finally {
    loading.value = false;
  }
}

const selectedStatus = ref<ProjectStatus>();
const selectedIterationEnabled = ref<boolean>();

/** 页面初始化时加载一次项目统计信息。 */
async function loadProjectStatistics() {
  try {
    stats.value = await getProjectStatisticsApi();
  } catch (error) {
    message.error(
      error instanceof Error
        ? error.message
        : t("projectManagement.feedback.statisticsFailed"),
    );
  }
}

/** 首次进入页面时并行加载统计信息与首屏项目列表。 */
async function initializePage() {
  await Promise.all([loadProjectStatistics(), loadProjectList()]);
}
/** 创建成功后刷新列表与统计卡片。 */
async function handleProjectCreated() {
  await initializePage();
}

/** 搜索项目名称并回到第一页。 */
function handleSearch() {
  pagination.current = 1;
  void loadProjectList();
}

/** 响应服务端表格查询变化；分页信息由统一 DmTableQuery 直接提供。 */
function handleTableFilter(payload: DmTableQuery) {
  const statusValue = Array.isArray(payload.filters.projectStatus)
    ? payload.filters.projectStatus[0]
    : payload.filters.projectStatus;
  const iterationValue = Array.isArray(payload.filters.iterationEnabled)
    ? payload.filters.iterationEnabled[0]
    : payload.filters.iterationEnabled;
  const nextStatus =
    typeof statusValue === "string" && statusValue in statusMap.value
      ? (statusValue as ProjectStatus)
      : undefined;
  // 枚举筛选项只能使用 SelectValue，布尔条件用 "true"/"false" 往返转换。
  const nextIterationEnabled =
    iterationValue === "true"
      ? true
      : iterationValue === "false"
        ? false
        : undefined;
  const nextSortOrder =
    payload.sorter?.field === "deadline" ? payload.sorter.order : undefined;
  const filterChanged =
    nextStatus !== selectedStatus.value ||
    nextIterationEnabled !== selectedIterationEnabled.value;
  const sortChanged = nextSortOrder !== deadlineSortOrder.value;
  selectedStatus.value = nextStatus;
  selectedIterationEnabled.value = nextIterationEnabled;
  deadlineSortOrder.value = nextSortOrder;
  if (!payload.pagination) return;
  const nextPage = payload.pagination.current ?? 1;
  const nextPageSize = payload.pagination.pageSize ?? pagination.pageSize;
  const pageChanged =
    nextPage !== pagination.current || nextPageSize !== pagination.pageSize;
  pagination.current = filterChanged || sortChanged ? 1 : nextPage;
  pagination.pageSize = nextPageSize;
  // 筛选和排序均由服务端作用于完整结果集，条件变化时重新请求第一页。
  if (filterChanged || sortChanged || pageChanged) {
    void loadProjectList();
  }
}
/** 打开新建项目弹窗。 */
function handleCreateProject() {
  modalMode.value = "create";
  modalProjectCode.value = undefined;
  modalOpen.value = true;
}
/** 跳转到项目详情页，并将详情路径追加到主布局面包屑。 */
function handleViewProject(record: ProjectListItem) {
  const path = `/project-management/${record.projectCode}`;
  setLayoutPath?.((pathList) => [
    ...pathList,
    { path, title: t("navigation.pages.projectDetail") },
  ]);
  void router.push({
    name: "project-detail",
    params: { id: record.projectCode },
  });
}

/** 确认删除项目，并在删除成功后刷新列表和统计数据。 */
function handleDeleteProject(record: ProjectListItem) {
  Modal.confirm({
    title: t("projectManagement.delete.title"),
    content: t("projectManagement.delete.confirm", {
      name: record.projectName,
    }),
    okType: "danger",
    okText: t("projectManagement.delete.actions.confirm"),
    cancelText: t("projectManagement.delete.actions.cancel"),
    async onOk() {
      try {
        await deleteProjectApi(record.projectCode);
        await initializePage();
        message.success(t("projectManagement.feedback.deleteSuccess"));
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t("projectManagement.feedback.deleteFailed"),
        );
        throw error;
      }
    },
  });
}
onMounted(initializePage);
</script>

<template>
  <div class="project-management-page">
    <div class="project-summary">
      <div v-for="card in cards" :key="card.tone" class="summary-card">
        <div class="summary-card__icon"><component :is="card.icon" /></div>
        <div class="summary-card__content">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </div>
      </div>
    </div>
    <section class="project-list">
      <DmAppTable
        row-key="projectId"
        :table-title="t('projectManagement.table.title')"
        :columns="columns"
        :data-source="tableData"
        mode="service"
        :loading="loading"
        :scroll="{ x: 1220 }"
        :pagination="pagination"
        @filter="handleTableFilter"
      >
        <template #titleTool>
          <DmInput
            v-model:value="keyword"
            class="project-list-keyword"
            :placeholder="t('projectManagement.searchPlaceholder')"
            size="large"
            allow-clear
            @clear="handleSearch"
            @press-enter="handleSearch"
            ><template #prefix> <SearchOutlined /> </template
          ></DmInput>
          <a-button type="primary" size="large" @click="handleCreateProject">
            <PlusOutlined /> {{ t("projectManagement.actions.create") }}
          </a-button>
        </template>
        <template #emptyText>
          <a-empty :description="t('components.table.empty')" />
        </template>
        <template #bodyCell="{ column, record }"
          ><template v-if="column.key === 'projectStatus'">
            <Tag :class="getProjectStatus(record).className">{{
              getProjectStatus(record).label
            }}</Tag> </template
          ><template v-else-if="column.key === 'iterationEnabled'">
            <Tag
              :class="getIterationStatus(record.iterationEnabled).className"
              >{{ getIterationStatus(record.iterationEnabled).label }}</Tag
            > </template
          ><template v-else-if="column.key === 'projectId'">{{
            formatCount(record.projectId)
          }}</template
          ><template v-else-if="column.key === 'dataCount'">{{
            formatCount(record.dataCount)
          }}</template
          ><template v-else-if="column.key === 'actions'">
            <div class="table-actions">
              <a-button
                type="link"
                size="small"
                @click="handleViewProject(record)"
                >{{ t("projectManagement.actions.view") }}</a-button
              ><a-button
                type="link"
                danger
                size="small"
                @click="handleDeleteProject(record)"
                >{{ t("projectManagement.actions.delete") }}</a-button
              >
            </div>
          </template></template
        >
      </DmAppTable>
    </section>
    <ProjectModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :project-code="modalProjectCode"
      @created="handleProjectCreated"
    />
  </div>
</template>

<style scoped>
.project-management-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
  gap: 16px;
  background: var(--dm-bg-layout);
  overflow: hidden;
}

.project-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 108px;
  padding: 16px 32px;
  border: 0;
  border-radius: 8px;
  background: var(--dm-bg-container);
  box-shadow: none;
}
.summary-card[class*="dm-card-"] {
  background: var(--dm-bg-container);
  border-color: transparent;
  color: inherit;
}
.summary-card :deep(.ant-card-body) {
  padding: 16px;
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
  overflow: hidden;
  height: 100%;
  padding: 20px;
  background: var(--dm-bg-container);
  border-radius: 8px;
}

.project-list-keyword {
  width: max(20vw, 200px);
}

.table-actions {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.project-management-page :deep(.project-table-number-cell) {
  text-align: right !important;
}

.project-management-page :deep(.project-table-number-header) {
  text-align: right !important;
}
</style>
