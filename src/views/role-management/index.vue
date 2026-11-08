<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { SearchOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import DmAppTable from "@/components/Table/index.vue";
import type { DmTableColumn } from "@/components/Table/types";
import RoleDetailModal from "./components/RoleDetailModal.vue";
import type { RoleRow } from "./data";
import { formatDateTime } from "@/utils/format";
import { DATE_TIME_MINUTE_FORMAT } from "@/constants/date";
import { getRoleListApi, type RoleDto } from "@/api/member-management";

const { t } = useI18n();

/** 将接口角色映射为表格行，缺失字段使用空值回退展示。 */
function mapRole(role: RoleDto): RoleRow {
  return {
    id: role.id,
    name: role.roleName,
    accountCount: role.userCount ?? 0,
    remark: role.description ?? "",
    createTime: role.createdAt
      ? formatDateTime(role.createdAt, DATE_TIME_MINUTE_FORMAT)
      : "",
  };
}

const keyword = ref("");
const loading = ref(false);
const roles = ref<RoleRow[]>([]);
const detailOpen = ref(false);
const viewingRole = ref<RoleRow | null>(null);
const pagination = { current: 1, pageSize: 10 };

/** 按角色名称或备注对角色做客户端过滤，角色数量较少，与分组管理保持一致。 */
const filteredRoles = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) return roles.value;
  return roles.value.filter(
    (role) =>
      role.name.toLowerCase().includes(word) ||
      role.remark.toLowerCase().includes(word),
  );
});

const columns = computed<DmTableColumn<RoleRow>[]>(() => [
  {
    title: t("roleManagement.columns.name"),
    dataIndex: "name",
    key: "name",
    width: 180,
  },
  {
    title: t("roleManagement.columns.accountCount"),
    dataIndex: "accountCount",
    key: "accountCount",
    width: 140,
    sorter: (a, b) => a.accountCount - b.accountCount,
  },
  {
    title: t("roleManagement.columns.createTime"),
    dataIndex: "createTime",
    key: "createTime",
    width: 200,
    sorter: (a, b) => a.createTime.localeCompare(b.createTime),
  },
  {
    title: t("roleManagement.columns.actions"),
    dataIndex: "actions",
    key: "actions",
    className: "table-actions-cell",
    width: 100,
  },
]);

/** 加载角色列表。 */
async function loadRoles(): Promise<void> {
  loading.value = true;
  try {
    roles.value = (await getRoleListApi()).map(mapRole);
  } finally {
    loading.value = false;
  }
}

onMounted(loadRoles);

/** 打开角色详情弹窗，仅查看角色数据。 */
function handleView(role: RoleRow): void {
  viewingRole.value = role;
  detailOpen.value = true;
}
</script>

<template>
  <section class="role-management">
    <DmAppTable
      :table-title="t('roleManagement.title')"
      :columns="columns"
      :data-source="filteredRoles"
      :loading="loading"
      row-key="id"
      :pagination="pagination"
      :scroll="{ x: 860 }"
    >
      <template #titleTool>
        <div class="role-management__tools">
          <a-input
            v-model:value="keyword"
            :placeholder="t('roleManagement.searchPlaceholder')"
            size="large"
            allow-clear
            class="role-management__search"
            ><template #prefix> <SearchOutlined /> </template
          ></a-input>
        </div>
      </template>
      <template #emptyText>
        <a-empty
          :description="
            t(
              keyword.trim()
                ? 'roleManagement.empty.search'
                : 'roleManagement.empty.default',
            )
          "
        />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'createTime'">
          <span class="role-create-time">{{ record.createTime || "-" }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="table-actions">
            <a-button type="link" size="small" @click="handleView(record)">{{
              t("roleManagement.viewDetail")
            }}</a-button>
          </div>
        </template>
      </template>
    </DmAppTable>
    <RoleDetailModal v-model:open="detailOpen" :role="viewingRole" />
  </section>
</template>

<style scoped lang="less">
.role-management {
  min-width: 0;
  height: 100%;
  padding: 20px;
  background-color: var(--dm-bg-container);
  border-radius: 8px;
}

.role-management__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-management__search {
  width: min(384px, 100%);
}

.role-create-time {
  color: var(--dm-text-3);
  overflow-wrap: anywhere;
}

@media (width <=768px) {
  .role-management__tools {
    align-items: stretch;
    flex-direction: column;
  }

  .role-management__search {
    width: 100%;
  }
}
</style>
