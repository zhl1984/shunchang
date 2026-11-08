<script setup lang="ts">
import { computed, ref } from "vue";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons-vue";
import { Modal, message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import DmAppTable from "@/components/Table/index.vue";
import type { DmTableColumn } from "@/components/Table/types";
import AddGroupModal, {
  type AddGroupForm,
} from "@/views/member-management/components/AddGroupModal.vue";
import type { WorkGroup } from "@/views/member-management/data";
import { formatDateTime } from "@/utils/format";
import { DATE_TIME_MINUTE_FORMAT } from "@/constants/date";
import {
  createWorkGroupApi,
  deleteWorkGroupApi,
  updateWorkGroupApi,
  type WorkGroupDto,
} from "@/api/member-management";
import { useMemberStore } from "@/stores/member";

const { t } = useI18n();

/** 表格行在接口分组基础上补充稳定的 id 主键与列表展示字段。 */
type GroupRow = WorkGroup & {
  id: number;
  createTime: string;
  memberCount: number;
};

/** 将接口分组映射为表格行。 */
function mapGroup(group: WorkGroupDto): GroupRow {
  return {
    id: group.id,
    name: group.groupName,
    usage: group.groupType === "ANNOTATION" ? "annotation" : "quality",
    status: group.memberCount > 0 ? "inUse" : "active",
    description: group.description ?? "",
    createTime: group.createdAt
      ? formatDateTime(group.createdAt, DATE_TIME_MINUTE_FORMAT)
      : "",
    memberCount: group.memberCount,
    memberIds: group.members.map((member) => String(member.id)),
    members: group.members.map((member) => member.userName),
  };
}

const keyword = ref("");
const store = useMemberStore();
const loading = computed(() => store.status === "loading");
const groups = computed<GroupRow[]>(() => store.groups.map(mapGroup));
const pagination = ref({ current: 1, pageSize: 10 });
const modalOpen = ref(false);
const editingGroup = ref<GroupRow | null>(null);

/** 按名称或说明对分组做客户端过滤，与数据集管理保持一致。 */
const filteredGroups = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) return groups.value;
  return groups.value.filter(
    (group) =>
      group.name.toLowerCase().includes(word) ||
      group.description.toLowerCase().includes(word),
  );
});

const columns = computed<DmTableColumn<GroupRow>[]>(() => [
  {
    title: t("groupManagement.columns.name"),
    dataIndex: "name",
    key: "name",
    width: 220,
  },
  {
    title: t("groupManagement.columns.memberCount"),
    dataIndex: "memberCount",
    key: "memberCount",
    width: 140,
    sorter: (a, b) => a.memberCount - b.memberCount,
  },
  {
    title: t("groupManagement.columns.createTime"),
    dataIndex: "createTime",
    key: "createTime",
    width: 200,
    sorter: (a, b) => a.createTime.localeCompare(b.createTime),
  },
  {
    title: t("groupManagement.columns.actions"),
    dataIndex: "actions",
    key: "actions",
    className: "table-actions-cell",
    width: 130,
  },
]);

/** 加载工作分组列表。 */
async function loadGroups(): Promise<void> {
  await store.initialize();
}

void loadGroups();

/** 打开新增分组弹窗。 */
function handleCreate(): void {
  editingGroup.value = null;
  modalOpen.value = true;
}

/** 打开编辑分组弹窗并传入当前行数据用于回显。 */
function handleEdit(group: GroupRow): void {
  editingGroup.value = group;
  modalOpen.value = true;
}

/** 接收提交事件，按编辑或新增调用对应接口后刷新列表。 */
async function handleSubmit(form: AddGroupForm): Promise<void> {
  const input = {
    description: form.description || undefined,
    groupName: form.name,
    groupType: form.usage === "annotation" ? "ANNOTATION" : "QUALITY",
  } as const;
  const group = editingGroup.value;
  try {
    const saved = group
      ? await updateWorkGroupApi(group.id, {
          ...input,
          memberIds: form.memberIds.map(Number),
        })
      : await createWorkGroupApi(input);
    if (!group && form.memberIds.length) {
      await updateWorkGroupApi(saved.id, {
        ...input,
        memberIds: form.memberIds.map(Number),
      });
    }
    modalOpen.value = false;
    editingGroup.value = null;
    await store.refresh();
    message.success(t("memberManagement.feedback.groupSaved"));
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("memberManagement.feedback.operationFailed"),
    );
  }
}

/** 删除前展示不可逆影响说明，确认后调用接口并刷新。 */
function handleDelete(group: GroupRow): void {
  Modal.confirm({
    title: t("memberManagement.groupDeleteConfirm.title"),
    content: t("memberManagement.groupDeleteConfirm.content", {
      name: group.name,
    }),
    okText: t("memberManagement.groupDeleteConfirm.confirm"),
    cancelText: t("memberManagement.groupDeleteConfirm.cancel"),
    okButtonProps: { danger: true },
    centered: true,
    onOk: async () => {
      try {
        await deleteWorkGroupApi(group.id);
        await store.refresh();
        message.success(t("memberManagement.feedback.groupDeleted"));
      } catch (error: unknown) {
        message.error(
          error instanceof Error
            ? error.message
            : t("memberManagement.feedback.operationFailed"),
        );
      }
    },
  });
}
</script>

<template>
  <section class="group-management">
    <DmAppTable
      :table-title="t('groupManagement.title')"
      :columns="columns"
      :data-source="filteredGroups"
      :loading="loading"
      row-key="id"
      :pagination="pagination"
      :scroll="{ x: 930 }"
    >
      <template #titleTool>
        <div class="group-management__tools">
          <a-input
            v-model:value="keyword"
            :placeholder="t('groupManagement.searchPlaceholder')"
            size="large"
            allow-clear
            class="group-management__search"
            ><template #prefix> <SearchOutlined /> </template
          ></a-input>
          <a-button type="primary" size="large" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            {{ t("groupManagement.addGroup") }}
          </a-button>
        </div>
      </template>
      <template #emptyText>
        <a-empty
          :description="
            t(
              keyword.trim()
                ? 'groupManagement.empty.search'
                : 'groupManagement.empty.default',
            )
          "
        />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'createTime'">
          <span class="group-create-time">{{ record.createTime || "-" }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="table-actions">
            <a-button type="link" size="small" @click="handleEdit(record)">{{
              t("groupManagement.edit")
            }}</a-button>
            <a-button
              type="link"
              size="small"
              danger
              @click="handleDelete(record)"
              >{{ t("groupManagement.delete") }}</a-button
            >
          </div>
        </template>
      </template>
    </DmAppTable>
    <AddGroupModal
      v-model:open="modalOpen"
      :group="editingGroup"
      @submit="handleSubmit"
    />
  </section>
</template>

<style scoped lang="less">
.group-management {
  min-width: 0;
  height: 100%;
  padding: 20px;
  background-color: var(--dm-bg-container);
  border-radius: 8px;
}

.group-management__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-management__search {
  width: min(384px, 100%);
}

.group-description,
.group-create-time {
  color: var(--dm-text-3);
  overflow-wrap: anywhere;
}

@media (width <=768px) {
  .group-management__tools {
    align-items: stretch;
    flex-direction: column;
  }

  .group-management__search {
    width: 100%;
  }
}
</style>
