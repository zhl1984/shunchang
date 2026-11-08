<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import {
  UserSwitchOutlined,
  SearchOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons-vue";
import { assignAnnotationTaskApi } from "@/api/annotation-task";
import type { AnnotationTask } from "@/views/annotation-task/types";
import {
  getWorkGroupListApi,
  type WorkGroupDto,
} from "@/api/member-management";

const props = defineProps<{
  open: boolean;
  task?: AnnotationTask;
}>();
const emit = defineEmits<{ "update:open": [value: boolean]; assigned: [] }>();
const { t } = useI18n();
const groups = ref<WorkGroupDto[]>([]);
type TreeKey = string | number;
const selectedKeys = ref<TreeKey[]>([]);
const selectedId = computed(() => {
  const key = selectedKeys.value[0];
  return typeof key === "number" ? key : undefined;
});
const search = ref("");
const loading = ref(false);
const submitting = ref(false);
const membersLoaded = ref(false);
const filteredGroups = computed(() => {
  const keyword = search.value.trim();
  if (!keyword) return groups.value;
  return groups.value
    .map((group) => {
      if (group.groupName.includes(keyword)) return group;
      return {
        ...group,
        members: group.members.filter((member) =>
          member.userName.includes(keyword),
        ),
      };
    })
    .filter((group) => group.members.length);
});
const treeData = computed(() =>
  filteredGroups.value.map((group) => ({
    key: `group-${group.id}`,
    title: group.groupName,
    selectable: false,
    children: group.members.map((member) => ({
      key: member.id,
      title: member.userName,
    })),
  })),
);
const expandedKeys = ref<TreeKey[]>([]);
watch(
  treeData,
  (data) => {
    expandedKeys.value = data.map((group) => group.key);
  },
  { immediate: true },
);
const selectedName = computed(
  () =>
    groups.value
      .flatMap((group) => group.members)
      .find((member) => member.id === selectedId.value)?.userName ?? "--",
);

/** 加载标注分组成员，重新指派仅允许选择标注组成员。 */
async function loadMembers() {
  loading.value = true;
  try {
    groups.value = await getWorkGroupListApi({ groupType: "ANNOTATION" });
    membersLoaded.value = true;
  } catch (error) {
    message.error(
      error instanceof Error
        ? error.message
        : t("projectManagement.detail.feedback.memberLoadFailed"),
    );
  } finally {
    loading.value = false;
  }
}
/** 提交任务负责人变更并关闭弹窗。 */
async function handleSubmit() {
  if (!props.task?.id || !selectedId.value) {
    message.warning(t("projectManagement.detail.feedback.selectMember"));
    return;
  }
  if (props.task.annotatorId === selectedId.value) {
    message.warning(t("projectManagement.detail.feedback.sameAssignee"));
    return;
  }
  submitting.value = true;
  try {
    await assignAnnotationTaskApi(props.task.id, selectedId.value);
    message.success(
      t("projectManagement.detail.feedback.reassignSuccess", {
        name: selectedName.value,
      }),
    );
    emit("assigned");
    emit("update:open", false);
  } catch (error) {
    message.error(
      error instanceof Error
        ? error.message
        : t("projectManagement.detail.feedback.reassignFailed"),
    );
  } finally {
    submitting.value = false;
  }
}
function handleClose() {
  emit("update:open", false);
}
watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedKeys.value = [];
      search.value = "";
      if (!membersLoaded.value) {
        void loadMembers();
      }
    }
  },
);
</script>
<template>
  <a-modal
    :open="open"
    :width="640"
    wrap-class-name="form-modal"
    @cancel="handleClose"
  >
    <template #title>
      <DmAppFormHeader class="pm-header" mode="create">
        <template #icon><UserSwitchOutlined /></template>
        <template #title>{{
          t("projectManagement.detail.reassign.title")
        }}</template>
        <template #subtitle>{{
          t("projectManagement.detail.reassign.subtitle")
        }}</template>
      </DmAppFormHeader>
    </template>
    <div class="reassign-modal-body">
      <a-input
        v-model:value="search"
        :placeholder="t('projectManagement.detail.reassign.searchPlaceholder')"
        allow-clear
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-spin :spinning="loading">
        <a-tree
          v-model:selected-keys="selectedKeys"
          block-node
          :tree-data="treeData"
          :expanded-keys="expandedKeys"
        />
      </a-spin>
      <div class="reassign-selected">
        <div class="reassign-user dm-tag-6">
          {{ t("projectManagement.detail.reassign.currentAssignee") }}
          <span class="font-bold">{{ props.task?.assigneeName || "--" }}</span>
        </div>
        <ArrowRightOutlined class="m-x-12" />
        <div class="reassign-user dm-tag-5">
          {{ t("projectManagement.detail.reassign.newAssignee") }}
          <span class="font-bold">{{ selectedName }}</span>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button @click="handleClose">
        {{ t("projectManagement.detail.actions.cancel") }}
      </a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit"
        >{{ t("projectManagement.detail.actions.confirmReassign") }}
      </a-button>
    </template>
  </a-modal>
</template>
<style scoped>
.reassign-modal-header {
  display: flex;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid var(--dm-border-2);
  color: var(--dm-primary);
}
.reassign-modal-header h2 {
  margin: 0;
  color: var(--dm-text);
  font-size: 18px;
}
.reassign-modal-header p {
  margin: 6px 0 0;
  color: var(--dm-text-3);
  font-size: 13px;
}
.reassign-modal-body :deep(.ant-tree) {
  margin-top: 16px;
  height: 300px;
  overflow: auto;
}
.reassign-selected {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  font-size: 0.13rem;
}
.reassign-user {
  padding: 6px 12px;
  border-radius: 6px;
}
</style>
