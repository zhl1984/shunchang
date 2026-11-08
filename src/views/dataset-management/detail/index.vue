<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import {
  DATASET_SAMPLE_DEFAULT_PAGE_SIZE,
  getDatasetSamplesApi,
  type DatasetSample,
} from "@/api/dataset";
import { useDatasetStore } from "@/stores/dataset";
import { formatDateTime } from "@/utils/format";
import {
  MAIN_LAYOUT_BREADCRUMB,
  type MainLayoutBreadcrumbSetter,
} from "@/constants/inject";
import ImagePreview from "@/components/ImagePreview/index.vue";
import DatasetSampleCard from "./components/DatasetSampleCard.vue";
import { getBalancedSampleColumnCount, resolveSampleImageUrl } from "./utils";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const datasetStore = useDatasetStore();
const setLayoutPath = inject<MainLayoutBreadcrumbSetter>(
  MAIN_LAYOUT_BREADCRUMB,
);

/** 路由参数中的数据集 ID；非法时返回 null，由页面展示失败态。 */
const datasetId = computed<number | null>(() => {
  const parsed = Number(route.params.id);
  // 只有正整数才是有效的主键，其余（空值、小数、负数、非数字）一律视为非法地址。
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
});

const detail = computed(() => {
  if (datasetId.value === null) return null;
  return (
    datasetStore.datasets.find((item) => item.id === datasetId.value) ?? null
  );
});

const samples = ref<DatasetSample[]>([]);
const samplePage = ref(0);
const sampleTotal = ref(0);
const samplesLoading = ref(false);
const samplesExhausted = ref(false);
const samplesLoadFailed = ref(false);
const loadTrigger = ref<HTMLElement | null>(null);
const loadFailed = ref(false);
const previewOpen = ref(false);
const previewImageUrl = ref("");
const previewDialogWidth = ref(0);

/** 递增的请求标识，用于丢弃快速翻页时后到的过期响应。 */
let sampleRequestId = 0;
let loadObserver: IntersectionObserver | null = null;

/** 首屏请求使用整块 loading；追加请求仅在列表底部提示，避免已有内容闪烁。 */
const initialSamplesLoading = computed(
  () => samplesLoading.value && samples.value.length === 0,
);

/** 结合接口总数与异常状态判断是否仍允许自动请求下一页。 */
const hasMoreSamples = computed(
  () =>
    !samplesExhausted.value &&
    !samplesLoadFailed.value &&
    samples.value.length < sampleTotal.value,
);

/** 桌面端选择尾行最均衡的列数；响应式断点会继续限制窄屏列数。 */
const sampleGridStyle = computed<CSSProperties>(() => ({
  "--dd-sample-columns": getBalancedSampleColumnCount(sampleTotal.value),
}));

/** 状态标签文案，兼容空值状态。 */
const statusText = computed(() => {
  const status = detail.value?.status;
  if (status === "SUCCESS") return t("datasetManagement.status.success");
  if (status === "FAILED") return t("datasetManagement.status.failed");
  return t("datasetManagement.status.unknown");
});

/** 状态标签颜色，与列表页状态语义保持一致。 */
const statusColor = computed(() => {
  const status = detail.value?.status;
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "error";
  return "default";
});

/** 基本信息字段集合，空值统一展示占位符而不是空白。 */
const basicItems = computed(() => {
  const dataset = detail.value;
  return [
    {
      key: "dataType",
      label: t("datasetManagement.detail.dataType"),
      value: dataset?.dataType || "--",
    },
    {
      key: "description",
      label: t("datasetManagement.detail.description"),
      value: dataset?.description?.trim() || "--",
    },
    {
      key: "projectReferenceCount",
      label: t("datasetManagement.detail.projectReference"),
      value:
        dataset === null || dataset === undefined
          ? "--"
          : t("datasetManagement.projectReferenceCount", {
              count: dataset.projectReferenceCount,
            }),
    },
    {
      key: "itemCount",
      label: t("datasetManagement.detail.itemCount"),
      value:
        dataset === null || dataset === undefined
          ? "--"
          : t("datasetManagement.detail.itemCountValue", {
              count: dataset.itemCount,
            }),
    },
    {
      key: "createdAt",
      label: t("datasetManagement.detail.createdAt"),
      value: formatDateTime(dataset?.createdAt),
    },
    {
      key: "updatedAt",
      label: t("datasetManagement.detail.updatedAt"),
      value: formatDateTime(dataset?.updatedAt),
    },
  ];
});

/** 加载基本信息；数据集不在 Store 集合中时保留占位，不视为整体失败。 */
async function loadBasicInfo(): Promise<void> {
  try {
    await datasetStore.initialize();
    route.meta.title =
      detail.value?.name ?? t("navigation.pages.datasetDetail");
  } catch {
    // 基本信息失败不影响样本图库，保持占位展示即可。
    route.meta.title = t("navigation.pages.datasetDetail");
  }
}

/** 请求指定页并追加样本；第一页会重置图库，后续页保留已有内容。 */
async function loadSamples(page: number): Promise<void> {
  const id = datasetId.value;
  if (id === null || samplesLoading.value) return;

  const requestId = ++sampleRequestId;
  samplesLoading.value = true;
  try {
    const result = await getDatasetSamplesApi({
      datasetId: id,
      page,
      pageSize: DATASET_SAMPLE_DEFAULT_PAGE_SIZE,
    });
    // 切换数据集时丢弃过期响应，避免旧数据追加到新图库。
    if (requestId !== sampleRequestId) return;
    samples.value =
      page === 1 ? result.list : [...samples.value, ...result.list];
    samplePage.value = page;
    sampleTotal.value = result.total;
    samplesLoadFailed.value = false;
    // 空页或累计数量达到总数时停止观察，防止异常分页数据触发连续空请求。
    samplesExhausted.value =
      result.list.length === 0 || samples.value.length >= result.total;
  } catch {
    if (requestId !== sampleRequestId) return;
    samplesLoadFailed.value = true;
    // 首屏失败时清空图库；追加失败时保留用户已经浏览到的样本。
    if (page === 1) {
      samples.value = [];
      sampleTotal.value = 0;
    }
  } finally {
    if (requestId === sampleRequestId) {
      samplesLoading.value = false;
    }
  }
}

/** 首次进入及切换数据集时加载页面数据。 */
async function loadPage(): Promise<void> {
  loadFailed.value = datasetId.value === null;
  if (loadFailed.value) return;

  samplePage.value = 1;
  samples.value = [];
  sampleTotal.value = 0;
  samplesExhausted.value = false;
  samplesLoadFailed.value = false;

  await Promise.allSettled([loadBasicInfo(), loadSamples(1)]);
}

/** 滚动触底后请求下一页；加载态与结束态共同避免重复请求。 */
function loadNextSamples(): void {
  if (!hasMoreSamples.value || samplesLoading.value) return;
  void loadSamples(samplePage.value + 1);
}

/** 样本在累计列表内的全局编号，从 1 连续递增。 */
function getSampleNo(index: number): number {
  return index + 1;
}

/** 按视口约 68% 的宽度打开大图预览，并限制弹窗不超出当前视口。 */
function handleSampleClick(sample: DatasetSample): void {
  const url = resolveSampleImageUrl(sample.imagePath);
  // 卡片组件已过滤无效图片，此处继续兜底，避免打开没有内容的弹窗。
  if (!url) return;
  previewDialogWidth.value = Math.min(
    Math.max(Math.round(window.innerWidth * 0.68), 720),
    1200,
    window.innerWidth - 32,
  );
  previewImageUrl.value = url;
  previewOpen.value = true;
}

/** 关闭图片预览并清理当前图片，避免下次打开短暂显示旧内容。 */
function handlePreviewClose(): void {
  previewOpen.value = false;
  previewImageUrl.value = "";
}

/** 返回数据集列表页。 */
function handleBack(): void {
  void router.push({ name: "dataset-management" });
}

onMounted(() => {
  setLayoutPath?.(() => [
    {
      path: "/dataset-management",
      title: t("navigation.menus.datasetManagement"),
    },
    { path: route.fullPath, title: t("navigation.pages.datasetDetail") },
  ]);
  // 提前 160px 触发下一页，让用户滚动到末尾前尽量完成加载。
  loadObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) loadNextSamples();
    },
    { rootMargin: "0px 0px 160px" },
  );
  void loadPage();
});

onBeforeUnmount(() => {
  loadObserver?.disconnect();
  sampleRequestId += 1;
  // 离开详情页时清理共享路由元数据，避免动态标题污染后续页面。
  route.meta.title = undefined;
});

watch(loadTrigger, (element, previousElement) => {
  // v-if 切换哨兵节点时同步观察目标，避免保留已经卸载的元素引用。
  if (previousElement) loadObserver?.unobserve(previousElement);
  if (element) loadObserver?.observe(element);
});

watch(datasetId, () => {
  void loadPage();
});
</script>

<template>
  <main class="dataset-detail-page">
    <a-result
      v-if="loadFailed"
      status="404"
      :title="t('datasetManagement.detail.loadFailed')"
      ><template #extra
        ><a-button @click="handleBack">{{
          t("datasetManagement.detail.back")
        }}</a-button></template
      ></a-result
    >
    <template v-else>
      <a-card :bordered="false" class="dataset-detail-card">
        <template #title>
          <div class="dataset-detail-head">
            <h1 class="dataset-detail-title font-xxl font-bold">
              {{ detail?.name || "--" }}
            </h1>
            <a-tag :color="statusColor">{{ statusText }}</a-tag>
          </div>
        </template>
        <div class="dataset-detail-body">
          <div class="dd-basic-grid">
            <div
              v-for="item in basicItems"
              :key="item.key"
              class="dd-basic-item"
            >
              <span class="dd-basic-label font-base">{{ item.label }}</span>
              <span class="dd-basic-value font-base">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </a-card>

      <a-card :bordered="false" class="dataset-detail-samples m-t-16">
        <template #title>
          <div class="dataset-detail-section-title font-xl font-bold">
            {{ t("datasetManagement.detail.samples") }}
          </div>
        </template>
        <a-spin :spinning="initialSamplesLoading">
          <div
            v-if="samples.length > 0"
            class="dd-sample-grid"
            :style="sampleGridStyle"
          >
            <div
              v-for="(sample, index) in samples"
              :key="sample.id"
              class="dd-sample-cell"
            >
              <DatasetSampleCard
                :sample="sample"
                :no="getSampleNo(index)"
                @open="handleSampleClick"
              />
            </div>
          </div>
          <a-empty
            v-else-if="!initialSamplesLoading"
            :description="t('datasetManagement.detail.samplesEmpty')"
          />
        </a-spin>
        <div
          v-if="hasMoreSamples"
          ref="loadTrigger"
          class="dd-load-trigger flex justify-center"
        >
          <a-spin v-if="samplesLoading" size="small" />
        </div>
      </a-card>

      <ImagePreview
        :open="previewOpen"
        :image-url="previewImageUrl"
        :width="previewDialogWidth"
        @close="handlePreviewClose"
      />
    </template>
  </main>
</template>

<style scoped lang="less">
/* 悬停高亮相对卡片左右各外扩的宽度，网格间距必须大于其两倍。 */
@dd-sample-bleed: 6px;

.dataset-detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.dataset-detail-card :deep(.ant-card-head) {
  min-height: 0;
  padding: 0 20px;
  border-bottom: 0;
}

.dataset-detail-card :deep(.ant-card-head-title) {
  padding: 20px 0 16px;
}

.dataset-detail-card > :deep(.ant-card-body) {
  padding: 0 20px 20px;
}

.dataset-detail-samples :deep(.ant-card-head) {
  min-height: 0;
  padding: 0 20px;
  border-bottom: 0;
}

.dataset-detail-samples :deep(.ant-card-head-title) {
  padding: 20px 0 16px;
}

.dataset-detail-samples > :deep(.ant-card-body) {
  padding: 10px 20px 20px;
}

.dataset-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.dataset-detail-title {
  margin: 0;
  color: var(--dm-text);
}

/* 基本信息每行两个字段。 */
.dd-basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px 48px;
}

.dd-basic-item {
  display: flex;
  align-items: baseline;
  gap: 16px;
  min-width: 0;
}

.dd-basic-label {
  flex: 0 0 auto;
  min-width: 88px;
  color: var(--dm-text-3);
}

.dd-basic-value {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--dm-text);
}

/* 桌面端按接口总数选择 4～6 列，让最后一行尽量保持均衡。 */
.dd-sample-grid {
  display: grid;
  grid-template-columns: repeat(var(--dd-sample-columns, 6), minmax(0, 1fr));
  /* 间距需大于高亮出血量的两倍，避免相邻高亮粘连。 */
  gap: 16px;
}

/* 哨兵保留稳定高度，进入视口后触发下一页并承载追加 loading。 */
.dd-load-trigger {
  min-height: 40px;
  padding-top: 16px;
}

/* 网格项承担悬停底色：左右各外扩 6px，使蓝色底块宽于卡片本身。 */
.dd-sample-cell {
  padding: @dd-sample-bleed @dd-sample-bleed 0;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.dd-sample-cell:hover,
.dd-sample-cell:focus-within {
  background: var(--dm-primary);
}

@media (width <= 1400px) {
  .dd-sample-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (width <= 992px) {
  .dd-basic-grid {
    grid-template-columns: 1fr;
  }

  .dd-sample-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dataset-detail-card :deep(.ant-card-head),
  .dataset-detail-samples :deep(.ant-card-head) {
    padding: 16px 16px 0;
  }

  .dataset-detail-card > :deep(.ant-card-body),
  .dataset-detail-samples > :deep(.ant-card-body) {
    padding: 0 16px 16px;
  }
}

@media (width <= 768px) {
  .dd-sample-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
