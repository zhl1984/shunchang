<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ReloadOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { getProjectListApi } from "@/api/project";
import { getDashboardErrorMessage } from "@/api/executive-dashboard";
import { useAnnotationTypeStore } from "@/stores/annotation-type";
import { useDashboard } from "@/views/executive-dashboard/composables/useDashboard";
import type {
  DashboardPeriod,
  DashboardQuery,
  TrendPeriod,
} from "@/views/executive-dashboard/types";
import ExecutiveDataOverview from "./components/ExecutiveDataOverview.vue";
import ExecutiveOverview from "./components/ExecutiveOverview.vue";
import ExecutiveProjectOverview from "./components/ExecutiveProjectOverview.vue";
import ExecutiveRiskOverview from "./components/ExecutiveRiskOverview.vue";

type SelectOption = { label: string; value: string };
const { t } = useI18n();
const annotationTypeStore = useAnnotationTypeStore();
const statisticScope = ref("all");
const selectedProjects = ref<string[]>([]);
const annotationTypeId = ref<number | "">("");
const statisticPeriod = ref<DashboardPeriod>("7d");
const trendPeriod = ref<TrendPeriod>("day");
const projectOptions = shallowRef<SelectOption[]>([]);
const projectLoading = ref(false);
const optionError = ref("");
let projectKeyword = "";
let projectPage = 0;
let projectTotal = 0;
let optionRequest = 0;
let active = true;

// 仅将真实筛选值交给 API；指定项目未选时停止查询，避免误展示全部项目。
const query = computed<DashboardQuery | null>(() => {
  if (statisticScope.value === "project" && !selectedProjects.value.length)
    return null;
  return {
    period: statisticPeriod.value,
    annotationTypeId:
      annotationTypeId.value === "" ? undefined : annotationTypeId.value,
    ...(statisticScope.value === "project"
      ? { projectCodes: [...selectedProjects.value] }
      : {}),
  };
});
const {
  snapshot,
  trend,
  loading,
  trendLoading,
  refreshing,
  error,
  trendError,
  refresh,
} = useDashboard(query, trendPeriod);

// 下拉标签随语言变化，业务项目和类型名称保持接口原文。
const scopeOptions = computed(() => [
  { label: t("executiveDashboard.filters.allProjects"), value: "all" },
  { label: t("executiveDashboard.filters.selectedProjects"), value: "project" },
]);
const projectTypeOptions = computed(() => [
  {
    label: t("executiveDashboard.filters.allType"),
    value: "",
  },
  ...annotationTypeStore.annotationTypes.map((item) => ({
    label: item.annotationTypeName,
    value: item.annotationTypeId,
  })),
]);
const periodOptions = computed(() =>
  (["7d", "30d", "3m", "6m", "1y"] as DashboardPeriod[]).map((value) => ({
    label: t(`executiveDashboard.filters.periods.${value}`),
    value,
  })),
);

/** 首次进入或手动刷新时检查类型选项；失败显示提示并允许下一次重试。 */
async function loadAnnotationTypes() {
  try {
    await annotationTypeStore.initialize();
  } catch (reason) {
    if (active) optionError.value = getDashboardErrorMessage(reason);
  }
}

/** 远程检索并分页追加项目选项，避免只加载首屏而无法选择后续项目。 */
async function loadProjectOptions(keyword: string, append = false) {
  if (append && projectLoading.value) return;
  const requestId = ++optionRequest;
  const page = append ? projectPage + 1 : 1;
  projectKeyword = keyword;
  projectLoading.value = true;
  optionError.value = "";
  if (!append) projectOptions.value = [];
  try {
    const result = await getProjectListApi({
      keyword: keyword || undefined,
      pageNo: page,
      pageSize: 50,
    });
    if (requestId !== optionRequest) return;
    const options = (Array.isArray(result.list) ? result.list : []).map(
      (item) => ({ label: item.projectName, value: item.projectCode }),
    );
    projectOptions.value = append
      ? [...projectOptions.value, ...options]
      : options;
    projectPage = page;
    // 空页终止追加，避免后端 total 与列表暂时不一致时重复加载。
    projectTotal = options.length ? result.total : projectOptions.value.length;
  } catch (reason) {
    if (requestId === optionRequest)
      optionError.value = getDashboardErrorMessage(reason);
  } finally {
    if (requestId === optionRequest) projectLoading.value = false;
  }
}

/** 搜索文字变化从第一页重新请求，序号隔离过期搜索响应。 */
function handleProjectSearch(keyword: string) {
  void loadProjectOptions(keyword);
}

/** 项目列表滚动到底部时追加下一页，保持当前已选择的 code。 */
function handleProjectScroll(event: Event) {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.scrollTop + target.clientHeight >= target.scrollHeight - 24 &&
    projectOptions.value.length < projectTotal
  ) {
    void loadProjectOptions(projectKeyword, true);
  }
}

/** 使用同一消息 key 提醒补选项目，防止连续刷新时堆叠提示。 */
function showProjectSelectionMessage() {
  void message.warning({
    key: "dashboard-project-required",
    content: t("executiveDashboard.filters.selectProjects"),
  });
}

/** 刷新统计并重试筛选选项；未选项目时提醒补选，统计请求仍保持阻断。 */
function handleRefresh() {
  optionError.value = "";
  void loadAnnotationTypes();
  if (statisticScope.value === "project")
    void loadProjectOptions(projectKeyword);
  if (!query.value) showProjectSelectionMessage();
  void refresh();
}

// 进入未选项目状态时提示一次；选项变化不会重复弹出，卸载时自动解除监听。
watch(
  () => query.value === null,
  (missingProject) => {
    if (missingProject) showProjectSelectionMessage();
  },
);

// 仅在选择指定项目时加载项目候选；watch 在组件卸载时自动解除。
watch(statisticScope, (scope) => {
  if (scope === "project") void loadProjectOptions("");
});
void loadAnnotationTypes();
// 卸载后作废项目请求，并禁止类型请求的迟到错误更新页面。
onScopeDispose(() => {
  active = false;
  optionRequest++;
});
</script>

<template>
  <div class="executive-dashboard">
    <header class="ed-header flex-wrap">
      <div class="ed-title-group">
        <h1 class="ed-title">{{ $t("executiveDashboard.title") }}</h1>
        <span class="ed-badge">{{ $t("executiveDashboard.badge") }}</span>
      </div>
      <div
        class="ed-filters flex-wrap"
        :aria-label="$t('executiveDashboard.filters.ariaLabel')"
      >
        <label class="ed-filter">
          <span>{{ $t("executiveDashboard.filters.scope") }}</span>
          <a-select v-model:value="statisticScope" :options="scopeOptions" />
        </label>
        <label v-if="statisticScope === 'project'" class="ed-filter">
          <span>{{ $t("executiveDashboard.filters.projects") }}</span>
          <a-select
            v-model:value="selectedProjects"
            class="ed-project-select"
            mode="multiple"
            show-search
            :filter-option="false"
            :options="projectOptions"
            :loading="projectLoading"
            :max-tag-count="1"
            :max-tag-text-length="8"
            :placeholder="$t('executiveDashboard.filters.selectProjects')"
            @search="handleProjectSearch"
            @popup-scroll="handleProjectScroll"
          />
        </label>
        <label class="ed-filter">
          <span>{{ $t("executiveDashboard.filters.projectType") }}</span>
          <a-select
            v-model:value="annotationTypeId"
            :options="projectTypeOptions"
            :loading="annotationTypeStore.status === 'loading'"
            :placeholder="$t('executiveDashboard.filters.allTypes')"
          />
        </label>
        <label class="ed-filter">
          <span>{{ $t("executiveDashboard.filters.period") }}</span>
          <a-select v-model:value="statisticPeriod" :options="periodOptions" />
        </label>
        <a-button type="primary" :loading="refreshing" @click="handleRefresh">
          <template #icon><ReloadOutlined /></template>
          {{ $t("executiveDashboard.filters.refresh") }}
        </a-button>
      </div>
    </header>
    <a-alert
      v-if="optionError"
      class="m-x-24 m-b-16"
      type="error"
      show-icon
      :message="optionError"
    />
    <a-alert
      v-if="error"
      class="m-x-24"
      type="error"
      show-icon
      :message="error"
    />
    <a-spin :spinning="loading">
      <ExecutiveOverview :data="snapshot?.overview ?? null" />
      <ExecutiveDataOverview
        v-model:trend-period="trendPeriod"
        :data="snapshot?.production ?? null"
        :trend="trend"
        :trend-loading="trendLoading"
        :trend-error="trendError"
      />
      <ExecutiveProjectOverview :data="snapshot?.projects ?? null" />
      <ExecutiveRiskOverview :data="snapshot?.risks ?? null" />
    </a-spin>
  </div>
</template>

<style scoped lang="less">
.executive-dashboard {
  width: 100%;
  max-width: 1520px;
  margin: 0 auto;
  min-height: 100%;
  :deep(.ant-select) {
    width: 120px;
  }
}

.ed-header {
  margin-top: 40px;
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 24px;
}

/* 项目名称与省略标签共用一行，避免多选时撑高筛选栏。 */
.executive-dashboard :deep(.ed-project-select) {
  width: 210px;
}
.ed-project-select :deep(.ant-select-selection-overflow) {
  flex-wrap: nowrap;
}

.ed-title-group,
.ed-filters,
.ed-filter {
  display: flex;
  align-items: center;
}

.ed-title-group {
  gap: 12px;
}
.ed-title {
  margin: 0;
  color: var(--dm-text);
  font-size: 24px;
  line-height: 32px;
}
.ed-badge {
  padding: 3px 8px;
  border: 1px solid var(--dm-primary);
  border-radius: 3px;
  color: var(--dm-primary);
  font-size: 12px;
}
.ed-filters {
  gap: 16px;
}
.ed-filter {
  gap: 8px;
  color: var(--dm-text-2);
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .executive-dashboard__header {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px;
  }
  .executive-dashboard__filters {
    flex-wrap: wrap;
  }
}
</style>
