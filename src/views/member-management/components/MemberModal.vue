<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance } from "ant-design-vue";
import {
  getRoleListApi,
  getWorkGroupListApi,
  type RoleDto,
  type WorkGroupDto,
} from "@/api/member-management";
import type { MemberRecord, RoleKey } from "../data";

export interface MemberForm {
  account: string;
  email: string;
  group: string;
  groupId?: number;
  name: string;
  password: string;
  phone: string;
  role: RoleKey;
  responsibility: string;
}

type MemberModalMode = "create" | "edit" | "detail";

const props = withDefaults(
  defineProps<{
    defaultRole?: RoleKey;
    member?: MemberRecord | null;
    mode?: MemberModalMode;
    open: boolean;
  }>(),
  { defaultRole: "admin", member: null, mode: "create" },
);
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "submit", value: MemberForm): void;
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const roleList = ref<RoleDto[]>([]);
const groupList = ref<WorkGroupDto[]>([]);
const form = reactive<MemberForm>({
  name: "",
  account: "",
  phone: "",
  email: "",
  password: "",
  group: "",
  role: props.defaultRole,
  responsibility: "",
  groupId: undefined,
});
const isDetail = computed(() => props.mode === "detail");
const isEdit = computed(() => props.mode === "edit");
/** 创建和编辑模式允许修改表单字段，详情模式只读。 */
const isEditable = computed(() => props.mode !== "detail");
/** 密码仅在创建时必填，编辑时留空表示沿用原密码。 */
const isPasswordEditable = computed(() => props.mode === "create");
const formHeaderMode = computed(() => {
  if (isDetail.value) return "read";
  if (isEdit.value) return "update";
  return "create";
});
const roleOptions = computed(() =>
  roleList.value.map((role) => ({
    value:
      ({ 1: "admin", 2: "manager", 3: "annotator", 4: "reviewer" } as const)[
        role.id
      ] ?? "admin",
    label: role.roleName,
  })),
);
const groupOptions = computed(() =>
  groupList.value.map((group) => ({
    value: group.id,
    label: group.groupName,
  })),
);
const selectedGroup = computed<number | undefined>(() => form.groupId);
/** 系统管理员和项目经理不能归属工作分组，其余角色可以选择。 */
const groupDisabled = computed(
  () => !isEditable.value || form.role === "admin" || form.role === "manager",
);

/** 将成员数据映射为表单展示值，详情模式使用接口职责说明和掩码密码。 */
function fillForm(member: MemberRecord | null): void {
  Object.assign(
    form,
    member
      ? {
          ...member,
          // 详情页不返回真实密码，用固定掩码表示账号已设置密码。
          password: "********",
          responsibility: member.responsibility?.trim() || "-",
          groupId: undefined,
        }
      : {
          name: "",
          account: "",
          phone: "",
          email: "",
          password: "",
          group: "",
          role: props.defaultRole,
          responsibility: "",
          groupId: undefined,
        },
  );
}

/** 打开新增弹窗时加载角色和工作分组下拉选项。 */
async function loadLookups(): Promise<void> {
  try {
    const [roles, groups] = await Promise.all([
      getRoleListApi(),
      getWorkGroupListApi(),
    ]);
    roleList.value = roles;
    groupList.value = groups;
  } catch {
    roleList.value = [];
    groupList.value = [];
  }
}

/** 打开弹窗时初始化新增表单或回显当前成员详情。 */
watch(
  () => [props.open, props.member, props.defaultRole] as const,
  ([open, member]) => {
    if (open) {
      fillForm(isDetail.value || isEdit.value ? member : null);
      void loadLookups();
    }
  },
  { immediate: true },
);

/** 角色变化后清除管理角色不允许使用的工作分组。 */
watch(
  () => form.role,
  () => {
    if (isEditable.value && groupDisabled.value) form.group = "";
  },
);

/** 校验新增成员表单并交由页面提交；弹窗仅在接口成功后由页面关闭。 */
async function handleSubmit(): Promise<void> {
  if (isDetail.value) return;
  await formRef.value?.validate();
  emit("submit", { ...form });
}

/** 关闭弹窗，不修改成员或当前列表状态。 */
function handleClose(): void {
  emit("update:open", false);
}

/** 将下拉框清空状态转换为空字符串，保持提交参数类型稳定。 */
function handleGroupChange(value: number | undefined): void {
  form.groupId = value;
  form.group = groupList.value.find((group) => group.id === value)?.groupName ?? "";
}
</script>

<template>
  <a-modal
    :open="props.open"
    width="760px"
    centered
    destroy-on-close
    :wrap-class-name="
      isDetail
        ? 'form-modal member-detail-modal'
        : 'form-modal add-member-modal'
    "
    @cancel="handleClose"
  >
    <template #title>
      <DmAppFormHeader :mode="formHeaderMode">
        <template #title>{{
          t(
            isDetail
              ? "memberManagement.detailModal.title"
              : isEdit
                ? "memberManagement.modal.editTitle"
                : "memberManagement.modal.title",
          )
        }}</template>
        <template #subtitle>{{
          t(
            isDetail
              ? "memberManagement.detailModal.description"
              : isEdit
                ? "memberManagement.modal.editDescription"
                : "memberManagement.modal.description",
          )
        }}</template>
      </DmAppFormHeader>
    </template>

    <a-form ref="formRef" layout="vertical" :model="form" class="member-form">
      <a-form-item
        :label="t('memberManagement.modal.name')"
        name="name"
        :rules="
          !isEditable
            ? undefined
            : [
                {
                  required: true,
                  message: t('memberManagement.modal.requiredName'),
                },
              ]
        "
      >
        <a-input
          v-model:value="form.name"
          :disabled="!isEditable"
          :placeholder="t('memberManagement.modal.namePlaceholder')"
        />
      </a-form-item>
      <a-form-item
        :label="t('memberManagement.modal.account')"
        name="account"
        :rules="
          !isEditable
            ? undefined
            : [
                {
                  required: true,
                  message: t('memberManagement.modal.requiredAccount'),
                },
              ]
        "
      >
        <a-input
          v-model:value="form.account"
          :disabled="!isEditable"
          :placeholder="t('memberManagement.modal.accountPlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="t('memberManagement.modal.phone')" name="phone">
        <a-input
          v-model:value="form.phone"
          :disabled="!isEditable"
          :placeholder="t('memberManagement.modal.phonePlaceholder')"
        />
      </a-form-item>
      <a-form-item
        :label="t('memberManagement.modal.email')"
        name="email"
        :rules="
          !isEditable
            ? undefined
            : [
                {
                  type: 'email',
                  message: t('memberManagement.modal.requiredEmail'),
                },
              ]
        "
      >
        <a-input
          v-model:value="form.email"
          :disabled="!isEditable"
          placeholder="name@example.com"
        />
      </a-form-item>
      <a-form-item
        :label="t('memberManagement.modal.password')"
        name="password"
        :rules="
          isPasswordEditable
            ? [
                {
                  required: true,
                  min: 8,
                  message: t('memberManagement.modal.requiredPassword'),
                },
              ]
            : undefined
        "
      >
        <a-input-password
          v-model:value="form.password"
          :disabled="!isPasswordEditable"
          autocomplete="new-password"
          :placeholder="t('memberManagement.modal.passwordPlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="t('memberManagement.modal.group')">
        <a-select
          :value="selectedGroup"
          allow-clear
          :placeholder="
            t(
              groupDisabled
                ? 'memberManagement.modal.groupUnavailable'
                : 'memberManagement.modal.groupPlaceholder',
            )
          "
          :disabled="groupDisabled"
          :options="groupOptions"
          class="full-width"
          @change="handleGroupChange"
        />
      </a-form-item>
      <a-form-item
        :label="t('memberManagement.modal.role')"
        name="role"
        class="form-full"
        :rules="
          !isEditable
            ? undefined
            : [
                {
                  required: true,
                  message: t('memberManagement.modal.requiredRole'),
                },
              ]
        "
      >
        <a-select
          v-model:value="form.role"
          :disabled="!isEditable"
          :options="roleOptions"
          class="full-width"
        />
      </a-form-item>
      <a-form-item
        :label="t('memberManagement.modal.responsibility')"
        class="form-full"
      >
        <a-textarea
          v-model:value="form.responsibility"
          :rows="4"
          :disabled="!isEditable"
          :placeholder="t('memberManagement.modal.responsibilityPlaceholder')"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button v-if="isDetail" type="primary" @click="handleClose">
        {{ t("memberManagement.detailModal.close") }}
      </a-button>
      <template v-else>
        <a-button @click="handleClose">{{
          t("memberManagement.modal.cancel")
        }}</a-button>
        <a-button type="primary" @click="handleSubmit">{{
          t(
            isEdit
              ? "memberManagement.modal.save"
              : "memberManagement.modal.confirm",
          )
        }}</a-button>
      </template>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.member-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.form-full {
  grid-column: 1 / -1;
}
.full-width {
  width: 100%;
}
.member-form :deep(.ant-form-item-label > label) {
  font-weight: 500;
}
.member-form :deep(.ant-input[disabled]),
.member-form :deep(.ant-input-affix-wrapper-disabled),
.member-form :deep(.ant-select-disabled .ant-select-selector),
.member-form :deep(.ant-input-textarea textarea[disabled]) {
  color: var(--dm-text-2);
  background: var(--dm-bg-elevated);
}
.member-form :deep(.ant-select-disabled .ant-select-selection-placeholder) {
  color: var(--dm-text-3);
  opacity: 1;
}
@media (max-width: 720px) {
  .member-form {
    grid-template-columns: 1fr;
  }
  .form-full {
    grid-column: auto;
  }
}
</style>
