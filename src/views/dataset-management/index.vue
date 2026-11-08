<script setup lang="ts">
import { computed, ref } from "vue";
import { SearchOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import DmAppTable from "@/components/Table/index.vue";
import type { DmTableColumn } from "@/components/Table/types";
import { useDatasetStore } from "@/stores/dataset";
import CreateDataset from "@/views/dataset-management/components/CreateDataset.vue";
import type { DatasetDisplayRow } from "@/views/dataset-management/types";
import {
  buildDatasetDisplayRows,
  filterDatasetRows,
} from "@/views/dataset-management/utils";

const { t } = useI18n();
const router = useRouter();
const datasetStore = useDatasetStore();
const keyword = ref("");
const displayRows = computed(() =>
  buildDatasetDisplayRows(datasetStore.datasets),
);
const filteredRows = computed(() =>
  filterDatasetRows(displayRows.value, keyword.value),
);
const columns = computed<DmTableColumn<DatasetDisplayRow>[]>(() => [
  {
    title: t("datasetManagement.columns.datasetName"),
    dataIndex: "name",
    key: "name",
    width: 200,
  },
  {
    title: t("datasetManagement.columns.dataType"),
    dataIndex: "dataType",
    key: "dataType",
    width: 160,
  },
  {
    title: t("datasetManagement.columns.description"),
    dataIndex: "description",
    key: "description",
    width: 160,
  },
  {
    title: t("datasetManagement.columns.projectReference"),
    dataIndex: "projectReferenceCount",
    key: "projectReferenceCount",
    width: 100,
  },
  {
    title: t("datasetManagement.columns.actions"),
    key: "actions",
    className: "table-actions-cell",
    width: 100,
  },
]);

/** 跳转到数据集详情页，由详情页展示基本信息与样本图库。 */
function handleViewDataset(record: DatasetDisplayRow): void {
  void router.push({ name: "dataset-detail", params: { id: record.id } });
}

/** 创建完成后刷新数据集集合，确保新记录立即可见。 */
async function handleDatasetCreated(): Promise<void> {
  try {
    await datasetStore.refresh();
  } catch {
    message.error(t("datasetManagement.error.description"));
  }
}
</script>
<template>
  <section class="dataset-management">
    <DmAppTable
      :table-title="t('datasetManagement.title')"
      :columns="columns"
      :data-source="filteredRows"
      :loading="datasetStore.status === 'loading'"
      row-key="id"
    >
      <template #titleTool>
        <div class="dataset-management__tools">
          <a-input
            v-model:value="keyword"
            :placeholder="t('datasetManagement.searchPlaceholder')"
            size="large"
            allow-clear
            class="dataset-management__search"
            ><template #prefix> <SearchOutlined /> </template
          ></a-input>
          <CreateDataset @created="handleDatasetCreated" />
        </div>
      </template>
      <template #emptyText
        ><a-empty
          :description="
            t(
              keyword.trim()
                ? 'datasetManagement.empty.search'
                : 'datasetManagement.empty.default',
            )
          "
      /></template>
      <template #bodyCell="{ column, record }"
        ><template v-if="column.key === 'name'">
          <div class="dataset-management__dataset-name">
            {{ record.name }}
          </div> </template
        ><template v-else-if="column.key === 'description'">
          <div class="dataset-management__dataset-description">
            {{ record.descriptionDisplay }}
          </div> </template
        ><template v-else-if="column.key === 'actions'">
          <a-button
            type="link"
            size="small"
            :aria-label="
              t('datasetManagement.actions.viewName', { name: record.name })
            "
            @click="handleViewDataset(record)"
          >
            {{ t("datasetManagement.actions.view") }}
          </a-button> </template
        ><template v-else-if="column.key === 'projectReferenceCount'">{{
          t("datasetManagement.projectReferenceCount", {
            count: record.projectReferenceCount,
          })
        }}</template></template
      >
    </DmAppTable>
  </section>
</template>
<style scoped lang="less">
.dataset-management {
  min-width: 0;
  height: 100%;
  padding: 20px;
  background-color: var(--dm-bg-container);
  border-radius: 8px;
}

.dataset-management__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dataset-management__search {
  width: min(384px, 100%);
}

.dataset-management__dataset-name {
  color: var(--dm-text);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.dataset-management__dataset-description {
  color: var(--dm-text-3);
  overflow-wrap: anywhere;
}

@media (width <=768px) {
  .dataset-management__tools {
    align-items: stretch;
    flex-direction: column;
  }

  .dataset-management__search {
    width: 100%;
  }
}
</style>
