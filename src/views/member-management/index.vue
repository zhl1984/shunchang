<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons-vue";
import DmAppTable from "@/components/Table/index.vue";
import type { DmFilterOption, DmTableColumn } from "@/components/Table/types";
import MemberModal from "./components/MemberModal.vue";
import { formatDateTime } from "@/utils/format";
import { DATE_TIME_MINUTE_FORMAT } from "@/constants/date";
import { createMemberApi, type MemberRecordDto } from "@/api/member-management";
import type { MemberForm } from "./components/MemberModal.vue";
import { type MemberRecord, type RoleKey } from "./data";
import { useMemberStore } from "@/stores/member";

const { t } = useI18n();
const store = useMemberStore();
const loading = computed(() => store.status === "loading");
const keyword = ref("");
const data = computed(() => store.members);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const memberModalOpen = ref(false);
const selectedMember = ref<MemberRecord | null>(null);
/** 成员弹窗模式：新增或查看详情。 */
const memberModalMode = ref<"create" | "detail">("create");

/** 将接口角色 ID 映射为页面角色键，用于角色标签配色和详情回显。 */
const roleKeyMap: Record<number, RoleKey> = {
  1: "admin",
  2: "manager",
  3: "annotator",
  4: "reviewer",
};

function roleKey(roleId: number): RoleKey {
  return roleKeyMap[roleId] ?? "admin";
}

/** 「角色」列筛选选项：值为后端 roleId，标签取角色中英文。 */
const roleFilterOptions = computed<DmFilterOption[]>(() => [
  { label: t("memberManagement.roles.admin.name"), value: 1 },
  { label: t("memberManagement.roles.manager.name"), value: 2 },
  { label: t("memberManagement.roles.annotator.name"), value: 3 },
  { label: t("memberManagement.roles.reviewer.name"), value: 4 },
]);

/** 「所属分组」列筛选选项，动态加载自工作分组接口。 */

/** 当前生效的角色 / 分组筛选值，和服务端排序一样由后端处理。 */

const columns = computed<DmTableColumn<MemberRecordDto>[]>(() => [
  {
    title: t("memberManagement.columns.name"),
    dataIndex: "userName",
    key: "name",
    width: 140,
  },
  {
    title: t("memberManagement.columns.account"),
    dataIndex: "loginName",
    key: "account",
    width: 160,
  },
  {
    title: t("memberManagement.columns.role"),
    dataIndex: "roleId",
    key: "role",
    width: 120,
    dmFilter: {
      type: "enum",
      multiple: false,
      options: roleFilterOptions.value,
    },
  },
  {
    title: t("memberManagement.columns.group"),
    dataIndex: "workGroupId",
    key: "group",
    width: 160,
    dmFilter: {
      type: "enum",
      multiple: false,
      options: groupFilterOptions.value,
    },
  },
  {
    title: t("memberManagement.columns.lastLogin"),
    dataIndex: "lastLoginAt",
    key: "lastLogin",
    width: 160,
  },
  {
    title: t("memberManagement.columns.createTime"),
    dataIndex: "createdAt",
    key: "createTime",
    width: 180,
    sorter: (a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  },
  {
    title: t("memberManagement.columns.actions"),
    key: "actions",
    className: "table-actions-cell",
    width: 100,
    fixed: "right",
  },
]);

/** 确保成员和分组集合已由共享 Store 加载。 */
async function load(): Promise<void> {
  await store.initialize();
}

onMounted(() => {
  void load();
});

/** 从共享 Store 生成分组筛选项，避免重复请求分组接口。 */
const groupFilterOptions = computed<DmFilterOption[]>(() =>
  store.groups.map((group) => ({ value: group.id, label: group.groupName })),
);

/** 搜索条件变化时回到第一页，由表格在前端完成分页。 */
function search(): void {
  pagination.current = 1;
}

/** 打开新增成员弹窗。 */
function handleOpenMemberModal(): void {
  memberModalMode.value = "create";
  selectedMember.value = null;
  memberModalOpen.value = true;
}

/** 将页面表单转换为 OpenAPI 参数并创建或更新成员。 */
async function handleSubmitMember(form: MemberForm): Promise<void> {
  const phone = form.phone.trim();
  const base = {
    email: form.email,
    jobDescription: form.responsibility || undefined,
    loginName: form.account,
    roleId: { admin: 1, manager: 2, annotator: 3, reviewer: 4 }[form.role],
    userName: form.name,
    ...(form.groupId !== undefined ? { workGroupId: form.groupId } : {}),
  };
  try {
    await createMemberApi({
      ...base,
      loginPassword: form.password,
      // 手机号不是必填项，留空时省略请求字段，避免触发后端手机号格式校验。
      ...(phone ? { phone } : {}),
    });
    // initialize 不会重复加载已初始化的 Store；创建后必须强制刷新才能立即显示新成员。
    await store.refresh();
    pagination.current = 1;
    message.success(t("memberManagement.feedback.memberCreated"));
    memberModalOpen.value = false;
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("memberManagement.feedback.operationFailed"),
    );
  }
}

/** 打开成员详情弹窗并回显完整信息，仅供查看。 */
function handleViewMember(record: MemberRecordDto): void {
  memberModalMode.value = "detail";
  selectedMember.value = {
    id: String(record.id),
    name: record.userName,
    account: record.loginName,
    email: record.email,
    phone: record.phone,
    group: record.workGroupName ?? t("memberManagement.unassignedGroup"),
    role: roleKey(record.roleId),
    responsibility: record.jobDescription ?? "-",
    status: "active",
  };
  memberModalOpen.value = true;
}
</script>

<template>
  <section class="member-management">
    <DmAppTable
      mode="client"
      :table-title="t('memberManagement.title')"
      :columns="columns"
      :data-source="data"
      :loading="loading"
      row-key="id"
      :pagination="pagination"
      :scroll="{ x: 1200 }"
      :column-manager="false"
    >
      <template #titleTool>
        <div class="member-management__tools">
          <a-input
            v-model:value="keyword"
            :placeholder="t('memberManagement.searchPlaceholder')"
            size="large"
            allow-clear
            class="member-management__search"
            @press-enter="search"
            @clear="search"
            ><template #prefix> <SearchOutlined /> </template
          ></a-input>
          <a-button type="primary" size="large" @click="handleOpenMemberModal">
            <template #icon><PlusOutlined /></template>
            {{ t("memberManagement.addMember") }}
          </a-button>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :class="['member-role-tag', roleKey(record.roleId)]">{{
            record.roleName
          }}</a-tag>
        </template>
        <template v-else-if="column.key === 'group'">
          <a-tag v-if="record.workGroupName" class="member-group-tag">
            {{ record.workGroupName }}
          </a-tag>
          <span v-else class="member-muted">-</span>
        </template>
        <template v-else-if="column.key === 'lastLogin'">
          <span class="member-muted">{{
            record.lastLoginAt
              ? formatDateTime(record.lastLoginAt, DATE_TIME_MINUTE_FORMAT)
              : "-"
          }}</span>
        </template>
        <template v-else-if="column.key === 'createTime'">
          <span class="member-muted">{{
            record.createdAt
              ? formatDateTime(record.createdAt, DATE_TIME_MINUTE_FORMAT)
              : "-"
          }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="table-actions">
            <a-button
              type="link"
              size="small"
              @click="handleViewMember(record)"
              >{{ t("memberManagement.viewDetail") }}</a-button
            >
          </div>
        </template>
      </template>
    </DmAppTable>
    <MemberModal
      v-model:open="memberModalOpen"
      :mode="memberModalMode"
      :member="selectedMember"
      @submit="handleSubmitMember"
    />
  </section>
</template>

<style scoped lang="less">
.member-management {
  min-width: 0;
  height: 100%;
  padding: 20px;
  background-color: var(--dm-bg-container);
  border-radius: 8px;
}

.member-management__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-management__search {
  width: min(384px, 100%);
}

.member-muted {
  color: var(--dm-text-3);
  overflow-wrap: anywhere;
}

.member-role-tag {
  margin: 0;
  border: 0;
}
.member-group-tag {
  margin: 0;
  border: 0;
  background: #edf3ff;
  color: #4f6fe2;
}

.member-role-tag.admin {
  background: #edf3ff;
  color: #4f6fe2;
}

.member-role-tag.manager {
  background: #fff5e7;
  color: #d88a2d;
}

.member-role-tag.annotator {
  background: #edf8f1;
  color: #2f8f67;
}

.member-role-tag.reviewer {
  background: #fff0f1;
  color: #d66574;
}

@media (width <=768px) {
  .member-management__tools {
    align-items: stretch;
    flex-direction: column;
  }

  .member-management__search {
    width: 100%;
  }
}
</style>
