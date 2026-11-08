<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { message, Modal } from "ant-design-vue";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons-vue";
import type { DmTableColumn, DmTableQuery } from "@/components/Table/types";

import {
  createQualityPlanApi,
  deleteQualityPlanApi,
  getQualityPlanErrorMessage,
  getQualityPlanDetailApi,
  getQualityPlanListApi,
  QUALITY_PLAN_DEFAULT_PAGE,
  QUALITY_PLAN_DEFAULT_PAGE_SIZE,
  updateQualityPlanApi,
  type QualityPlan,
  type QualityPlanInput,
  type QualityPlanListItem,
} from "@/api/quality-plan";
import { useQualityPlanStore } from "@/stores/quality-plan";
import QualityPlanModal from "./components/QualityPlanModal.vue";

type QualityPlanModalMode = "create" | "view" | "edit";

const { t } = useI18n();
const qualityPlanStore = useQualityPlanStore();

const qualityPlans = ref<QualityPlanListItem[]>([]);
const searchInput = ref("");
const submittedKeyword = ref("");
const currentPage = ref(QUALITY_PLAN_DEFAULT_PAGE);
const pageSize = ref(QUALITY_PLAN_DEFAULT_PAGE_SIZE);
const total = ref(0);
const loading = ref(false);
const loadFailed = ref(false);
const loadErrorMessage = ref("");
const modalOpen = ref(false);
const modalMode = ref<QualityPlanModalMode>("create");
const modalPlan = ref<QualityPlan | null>(null);
const detailLoading = ref(false);
const submitting = ref(false);
const deletingPlanId = ref<number | null>(null);
const levelFilter = ref<LevelFilter>();
let latestRequestId = 0;

type LevelFilter = {
  min?: number;
  max?: number;
  strict?: boolean;
};

const tableData = computed(() =>
  qualityPlans.value.filter((plan) => matchesLevelFilter(plan.levelCount)),
);

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ["10", "20", "50"],
  showTotal: formatPaginationTotal,
}));

const columns = computed<DmTableColumn<QualityPlanListItem>[]>(() => [
  {
    title: t("qualityPlan.table.name"),
    dataIndex: "name",
    key: "name",
    className: "table-bold-cell",
    fixed: "left",
    width: 280,
  },
  {
    title: t("qualityPlan.table.description"),
    dataIndex: "description",
    key: "description",
    minWidth: 320,
  },
  {
    title: t("qualityPlan.table.levels"),
    dataIndex: "levelCount",
    key: "levels",
    width: 160,
    dmFilter: { type: "number" },
  },
  {
    title: t("qualityPlan.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    fixed: "right",
    width: 148,
  },
]);

/** 按表格内置数字筛选项过滤当前已加载页的层级数量。 */
function matchesLevelFilter(levelCount: number): boolean {
  const filter = levelFilter.value;
  if (!filter || (filter.min === undefined && filter.max === undefined)) {
    return true;
  }

  const strict = filter.strict ?? true;
  return (
    (filter.min === undefined ||
      (strict ? levelCount >= filter.min : levelCount > filter.min)) &&
    (filter.max === undefined ||
      (strict ? levelCount <= filter.max : levelCount < filter.max))
  );
}

const emptyDescription = computed(() =>
  submittedKeyword.value
    ? t("qualityPlan.empty.search")
    : t("qualityPlan.empty.default"),
);

/** CRUD 成功后刷新全局质量方案集合，供场景等其他模块使用。 */
async function refreshQualityPlanStore(): Promise<void> {
  try {
    await qualityPlanStore.refresh();
  } catch (error) {
    message.error(
      getQualityPlanErrorMessage(
        error,
        t("qualityPlan.loadFailed.description"),
      ),
    );
  }
}

/** 查询当前关键词和页码对应的质量方案，并忽略已过期请求的结果。 */
async function loadQualityPlans() {
  const requestId = ++latestRequestId;
  loading.value = true;
  loadFailed.value = false;
  loadErrorMessage.value = "";

  try {
    const result = await getQualityPlanListApi({
      keyword: submittedKeyword.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    });

    // 搜索或翻页可能产生并发请求，只允许最后一次请求更新页面。
    if (requestId !== latestRequestId) {
      return;
    }

    qualityPlans.value = result.list;
    total.value = result.total;
  } catch (error) {
    // 请求失败时清空旧列表，避免用户把过期结果误认为当前查询结果。
    if (requestId === latestRequestId) {
      qualityPlans.value = [];
      total.value = 0;
      loadFailed.value = true;
      loadErrorMessage.value = getQualityPlanErrorMessage(
        error,
        t("qualityPlan.loadFailed.description"),
      );
    }
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false;
    }
  }
}

/** 提交搜索；相同关键词不重复请求，避免 Enter 后失焦触发两次查询。 */
function handleSearch() {
  const keyword = searchInput.value.trim();

  if (keyword === submittedKeyword.value) {
    return;
  }

  submittedKeyword.value = keyword;
  currentPage.value = QUALITY_PLAN_DEFAULT_PAGE;
  void loadQualityPlans();
}

/** 清空搜索框时立即恢复第一页全量数据。 */
function handleSearchInputChange(event: Event) {
  const value = (event.target as HTMLInputElement).value;

  if (!value && submittedKeyword.value) {
    searchInput.value = "";
    handleSearch();
  }
}

/** 响应 DmAppTable 的分页和内置筛选，分页仍由真实接口处理。 */
function handleTableFilter(query: DmTableQuery) {
  const nextLevelFilter = parseLevelFilter(query.filters.levels);
  const filterChanged =
    JSON.stringify(nextLevelFilter) !== JSON.stringify(levelFilter.value);
  const nextPageSize = query.pagination.pageSize ?? pageSize.value;
  const pageSizeChanged = nextPageSize !== pageSize.value;

  levelFilter.value = nextLevelFilter;
  pageSize.value = nextPageSize;
  if (filterChanged || pageSizeChanged) {
    const shouldReloadFirstPage =
      pageSizeChanged || currentPage.value !== QUALITY_PLAN_DEFAULT_PAGE;
    currentPage.value = QUALITY_PLAN_DEFAULT_PAGE;
    if (shouldReloadFirstPage) {
      void loadQualityPlans();
    }
    return;
  }

  const nextPage = query.pagination.current ?? QUALITY_PLAN_DEFAULT_PAGE;
  if (nextPage !== currentPage.value) {
    currentPage.value = nextPage;
    void loadQualityPlans();
  }
}

/** 将 DmAppTable 数字筛选值收窄为页面可消费的范围对象。 */
function parseLevelFilter(value: unknown): LevelFilter | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const filter = candidate as Record<string, unknown>;
  const min = typeof filter.min === "number" ? filter.min : undefined;
  const max = typeof filter.max === "number" ? filter.max : undefined;
  const strict = typeof filter.strict === "boolean" ? filter.strict : true;
  return min === undefined && max === undefined
    ? undefined
    : { min, max, strict };
}

/** 失败状态下按当前查询条件重新请求。 */
function handleRetry() {
  void loadQualityPlans();
}

/** 格式化分页范围和总数，保持与数据集管理列表一致。 */
function formatPaginationTotal(totalCount: number, range: [number, number]) {
  return t("qualityPlan.paginationTotal", {
    end: range[1],
    start: range[0],
    total: totalCount,
  });
}

/** 打开新建弹窗，表单由弹窗组件生成默认层级。 */
function handleCreate() {
  modalMode.value = "create";
  modalPlan.value = null;
  modalOpen.value = true;
}

/** 加载详情后打开查看或编辑弹窗，避免先展示旧方案内容。 */
async function handleOpenPlan(
  plan: QualityPlanListItem,
  mode: Exclude<QualityPlanModalMode, "create">,
) {
  modalMode.value = mode;
  modalPlan.value = null;
  modalOpen.value = true;
  detailLoading.value = true;

  try {
    modalPlan.value = await getQualityPlanDetailApi(plan.id);
  } catch (error) {
    modalOpen.value = false;
    message.error(
      getQualityPlanErrorMessage(error, t("qualityPlan.feedback.detailFailed")),
    );
  } finally {
    detailLoading.value = false;
  }
}

/** 接收弹窗表单并调用对应的创建或更新真实 API。 */
async function handlePlanSubmit(input: QualityPlanInput) {
  if (submitting.value) {
    return;
  }

  submitting.value = true;

  try {
    if (modalMode.value === "edit" && modalPlan.value) {
      await updateQualityPlanApi(modalPlan.value.id, input);
      message.success(t("qualityPlan.feedback.updateSuccess"));
    } else {
      await createQualityPlanApi(input);
      currentPage.value = QUALITY_PLAN_DEFAULT_PAGE;
      message.success(t("qualityPlan.feedback.createSuccess"));
    }

    modalOpen.value = false;
    await loadQualityPlans();
    await refreshQualityPlanStore();
  } catch (error) {
    message.error(
      getQualityPlanErrorMessage(error, t("qualityPlan.feedback.submitFailed")),
    );
  } finally {
    submitting.value = false;
  }
}

/** 删除方案前二次确认，并在删除当前页最后一条时回退上一页。 */
function handleDelete(plan: QualityPlanListItem) {
  Modal.confirm({
    title: t("qualityPlan.confirm.removePlanTitle"),
    content: t("qualityPlan.confirm.removePlanContent", { name: plan.name }),
    okType: "danger",
    okText: t("qualityPlan.actions.confirmDelete"),
    cancelText: t("qualityPlan.actions.cancel"),
    onOk: async () => {
      deletingPlanId.value = plan.id;
      const shouldGoPreviousPage =
        currentPage.value > QUALITY_PLAN_DEFAULT_PAGE &&
        qualityPlans.value.length === 1;

      try {
        await deleteQualityPlanApi(plan.id);

        if (shouldGoPreviousPage) {
          currentPage.value -= 1;
        }

        message.success(t("qualityPlan.feedback.deleteSuccess"));
        await loadQualityPlans();
        await refreshQualityPlanStore();
      } catch (error) {
        message.error(
          getQualityPlanErrorMessage(
            error,
            t("qualityPlan.feedback.deleteFailed"),
          ),
        );
      } finally {
        deletingPlanId.value = null;
      }
    },
  });
}

onMounted(() => {
  void loadQualityPlans();
});
</script>

<template>
  <main class="quality-plan-page">
    <a-card class="quality-plan-data-card" :bordered="false">
      <a-result
        v-if="loadFailed"
        status="error"
        :title="$t('qualityPlan.loadFailed.title')"
        :sub-title="loadErrorMessage"
      >
        <template #extra>
          <a-button type="primary" @click="handleRetry">
            {{ $t("qualityPlan.actions.retry") }}
          </a-button>
        </template>
      </a-result>

      <template v-else>
        <DmAppTable
          row-key="id"
          :table-title="t('qualityPlan.title')"
          :columns="columns"
          :data-source="tableData"
          :loading="loading"
          mode="service"
          :pagination="pagination"
          :scroll="{ x: 1040 }"
          @filter="handleTableFilter"
        >
          <template #titleTool>
            <a-input
              v-model:value="searchInput"
              class="quality-plan-search"
              :placeholder="$t('qualityPlan.search.placeholder')"
              :maxlength="100"
              size="large"
              allow-clear
              @press-enter="handleSearch"
              @blur="handleSearch"
              @change="handleSearchInputChange"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
            <a-button type="primary" size="large" @click="handleCreate">
              <template #icon><PlusOutlined /></template>
              {{ t("qualityPlan.actions.create") }}
            </a-button>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'description'">
              <span class="quality-plan-row-description">
                {{ record.description || $t("qualityPlan.descriptionEmpty") }}
              </span>
            </template>
            <template v-else-if="column.key === 'levels'">
              {{ $t("qualityPlan.levelCount", { count: record.levelCount }) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="table-actions">
                <a-button type="link" @click="handleOpenPlan(record, 'view')">
                  {{ t("qualityPlan.actions.view") }}
                </a-button>
                <a-button type="link" @click="handleOpenPlan(record, 'edit')">
                  {{ t("qualityPlan.actions.edit") }}
                </a-button>
                <a-button
                  type="link"
                  danger
                  :loading="deletingPlanId === record.id"
                  @click="handleDelete(record)"
                >
                  {{ t("qualityPlan.actions.delete") }}
                </a-button>
              </div>
            </template>
          </template>
          <template #emptyText>
            <a-empty :description="emptyDescription" />
          </template>
        </DmAppTable>
      </template>
    </a-card>

    <QualityPlanModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :plan="modalPlan"
      :detail-loading="detailLoading"
      :submitting="submitting"
      @submit="handlePlanSubmit"
    />
  </main>
</template>

<style scoped lang="less">
.quality-plan-page {
  height: 100%;
  color: var(--dm-text);
}

.quality-plan-data-card {
  height: 100%;
  background: var(--dm-bg-container);
}

.quality-plan-data-card :deep(.ant-card-body) {
  height: 100%;
}

.quality-plan-row-description {
  color: var(--dm-text-3);
  line-height: 1.5;
}

.quality-plan-search {
  width: max(15vw, 300px);
}

@media (width <= 48rem) {
  .quality-plan-search {
    width: 100%;
  }

  .quality-plan-data-card :deep(.dm-table__tools) {
    flex-wrap: wrap;
  }
}
</style>
