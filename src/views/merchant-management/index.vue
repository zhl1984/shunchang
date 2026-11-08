<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message, Modal } from "ant-design-vue";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import DmAppTable from "@/components/Table/index.vue";
import type { DmTableColumn } from "@/components/Table/types";
import {
  deleteMerchantApi,
  getMerchantListApi,
  type Merchant,
} from "@/api/merchant";
import MerchantModal from "./components/MerchantModal.vue";
const { t } = useI18n();
const loading = ref(false);
const keyword = ref("");
const data = ref<Merchant[]>([]);
const modalOpen = ref(false);
const modalMode = ref<"create" | "view" | "edit">("create");
const merchantId = ref<number>();
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const columns = computed<DmTableColumn<Merchant>[]>(() => [
  {
    title: t("merchantManagement.table.name"),
    dataIndex: "merchantName",
    key: "merchantName",
    fixed: "left",
    className: "font-bold",
    width: 200,
  },
  {
    title: t("merchantManagement.table.contact"),
    dataIndex: "contact",
    key: "contact",
    width: 200,
  },
  {
    title: t("merchantManagement.table.contactWay"),
    dataIndex: "contactWay",
    key: "contactWay",
    width: 120,
  },
  {
    title: t("merchantManagement.table.expireDate"),
    dataIndex: "expireDate",
    key: "expireDate",
    width: 120,
  },
  {
    title: t("merchantManagement.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    width: 150,
    fixed: "right",
  },
]);
/** 按搜索、排序和分页条件加载商户。 */
async function load() {
  loading.value = true;
  try {
    const result = await getMerchantListApi({
      keyword: keyword.value || undefined,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    });
    data.value = result.list;
    pagination.total = result.total;
  } catch (e) {
    message.error(
      e instanceof Error
        ? e.message
        : t("merchantManagement.feedback.loadFailed"),
    );
  } finally {
    loading.value = false;
  }
}
function search() {
  pagination.current = 1;
  void load();
}
function handleFilter(payload: {
  action?: string;
  pagination?: { current?: number; pageSize?: number };
}) {
  if (payload.pagination) {
    pagination.current = payload.pagination.current ?? 1;
    pagination.pageSize = payload.pagination.pageSize ?? 10;
    void load();
  }
}
function openModal(mode: "create" | "view" | "edit", record?: Merchant) {
  modalMode.value = mode;
  merchantId.value = record?.id;
  modalOpen.value = true;
}
function remove(record: Merchant) {
  Modal.confirm({
    title: t("merchantManagement.delete.title"),
    content: t("merchantManagement.delete.confirm", {
      name: record.merchantName,
    }),
    okType: "danger",
    onOk: async () => {
      await deleteMerchantApi(record.id);
      await load();
      message.success(t("merchantManagement.feedback.deleteSuccess"));
    },
  });
}
onMounted(load);
</script>
<template>
  <main class="merchant-management-page">
    <a-card class="merchant-management-data" :bordered="false">
      <DmAppTable
        row-key="id"
        mode="service"
        :table-title="t('merchantManagement.table.title')"
        :columns="columns"
        :data-source="data"
        :loading="loading"
        :pagination="pagination"
        @filter="handleFilter"
      >
        <template #titleTool>
          <DmInput
            v-model:value="keyword"
            class="mm-search"
            :placeholder="t('merchantManagement.searchPlaceholder')"
            allow-clear
            size="large"
            @press-enter="search"
            @clear="search"
          >
            <template #prefix> <SearchOutlined /> </template> </DmInput
          ><a-button type="primary" size="large" @click="openModal('create')">
            <PlusOutlined />
            {{ t("merchantManagement.actions.create") }}
          </a-button> </template
        ><template #bodyCell="{ column, record }"
          ><template v-if="column.key === 'actions'">
            <div class="table-actions">
              <a-button
                type="link"
                size="small"
                @click="openModal('view', record)"
                >{{ t("merchantManagement.actions.view") }}</a-button
              ><a-button
                type="link"
                size="small"
                @click="openModal('edit', record)"
                >{{ t("merchantManagement.actions.edit") }}</a-button
              ><a-button
                type="link"
                danger
                size="small"
                @click="remove(record)"
                >{{ t("merchantManagement.actions.delete") }}</a-button
              >
            </div>
          </template></template
        ></DmAppTable
      >
    </a-card>
    <MerchantModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :merchant-id="merchantId"
      @saved="load"
    />
  </main>
</template>
<style scoped>
.merchant-management-page {
  height: 100%;
  color: var(--dm-text);
}

.merchant-management-data {
  height: 100%;
  background: var(--dm-bg-container);
}

.merchant-management-data :deep(.ant-card-body) {
  height: 100%;
}

.mm-search {
  width: max(15vw, 300px);
}
</style>
