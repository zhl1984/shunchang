<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance } from "ant-design-vue";
import {
  getMemberListApi,
  type MemberRecordDto,
} from "@/api/member-management";
import type { WorkGroup } from "../data";

type GroupUsage = "annotation" | "quality";
export interface AddGroupForm {
  description: string;
  memberIds: string[];
  name: string;
  usage: GroupUsage;
}

const props = withDefaults(
  defineProps<{ open: boolean; group?: WorkGroup | null }>(),
  { group: null },
);
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "submit", value: AddGroupForm): void;
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const availableMembers = ref<MemberRecordDto[]>([]);
const form = reactive<AddGroupForm>({
  name: "",
  description: "",
  usage: "annotation",
  memberIds: [],
});
const isEdit = computed(() => Boolean(props.group));
const usageOptions: {
  descriptionKey: string;
  titleKey: string;
  value: GroupUsage;
}[] = [
  {
    value: "annotation",
    titleKey: "annotationTitle",
    descriptionKey: "annotationDescription",
  },
  {
    value: "quality",
    titleKey: "qualityTitle",
    descriptionKey: "qualityDescription",
  },
];
const candidateMembers = computed(() =>
  availableMembers.value.filter(
    (member) => member.roleId === (form.usage === "annotation" ? 3 : 4),
  ),
);

/** 加载当前用途可选成员，成员来源于后端而非页面静态数据。 */
async function loadCandidateMembers(): Promise<void> {
  try {
    const result = await getMemberListApi({ pageNo: 1, pageSize: 100 });
    availableMembers.value = result.list;
    if (props.open && props.group) {
      form.memberIds = availableMembers.value
        .filter((member) =>
          props.group?.memberIds?.length
            ? props.group.memberIds.includes(String(member.id))
            : props.group.members.includes(member.userName),
        )
        .map((member) => String(member.id));
    }
  } catch {
    availableMembers.value = [];
  }
}

/** 每次打开弹窗恢复默认的空白标注分组表单。 */
watch(
  () => [props.open, props.group] as const,
  ([open, group]) => {
    if (!open) return;
    Object.assign(
      form,
      group
        ? {
            name: group.name,
            description: group.description,
            usage: group.usage,
            memberIds: availableMembers.value
              .filter((member) =>
                group.memberIds?.length
                  ? group.memberIds.includes(String(member.id))
                  : group.members.includes(member.userName),
              )
              .map((member) => String(member.id)),
          }
        : { name: "", description: "", usage: "annotation", memberIds: [] },
    );
  },
  { immediate: true },
);

watch(
  () => props.open,
  (open) => {
    if (open) void loadCandidateMembers();
  },
);

/** 切换用途并清除旧用途成员，避免提交角色不匹配的数据。 */
function handleUsageChange(usage: GroupUsage): void {
  form.usage = usage;
  form.memberIds = [];
}

/** 根据复选框状态维护成员 ID 集合，保证编辑回显与新增选择一致。 */
function handleMemberChange(memberId: string, checked: boolean): void {
  form.memberIds = checked
    ? Array.from(new Set([...form.memberIds, memberId]))
    : form.memberIds.filter((id) => id !== memberId);
}

/** 校验表单并交由父组件提交；弹窗仅在接口成功后关闭。 */
async function handleSubmit(): Promise<void> {
  await formRef.value?.validate();
  emit("submit", { ...form, memberIds: [...form.memberIds] });
}

/** 关闭弹窗且不保留当前输入。 */
function handleCancel(): void {
  emit("update:open", false);
}
</script>

<template>
  <a-modal
    :open="props.open"
    width="620px"
    centered
    destroy-on-close
    wrap-class-name="form-modal add-group-modal"
    @cancel="handleCancel"
  >
    <template #title>
      <DmAppFormHeader :mode="isEdit ? 'update' : 'create'">
        <template #title>{{
          isEdit
            ? t("memberManagement.groupModal.editTitle")
            : t("memberManagement.groupModal.title")
        }}</template>
        <template #subtitle>{{
          t("memberManagement.groupModal.description")
        }}</template>
      </DmAppFormHeader>
    </template>
    <a-form ref="formRef" :model="form" layout="vertical" class="group-form">
      <a-form-item
        :label="t('memberManagement.groupModal.name')"
        name="name"
        :rules="[
          {
            required: true,
            message: t('memberManagement.groupModal.requiredName'),
          },
        ]"
        ><a-input
          v-model:value="form.name"
          :placeholder="t('memberManagement.groupModal.namePlaceholder')"
      /></a-form-item>
      <a-form-item :label="t('memberManagement.groupModal.descriptionLabel')"
        ><a-textarea
          v-model:value="form.description"
          :rows="4"
          :placeholder="
            t('memberManagement.groupModal.descriptionPlaceholder')
          "
      /></a-form-item>
      <a-form-item
        :label="t('memberManagement.groupModal.usage')"
        name="usage"
        :rules="[
          {
            required: true,
            message: t('memberManagement.groupModal.requiredUsage'),
          },
        ]"
      >
        <div class="usage-grid">
          <button
            v-for="option in usageOptions"
            :key="option.value"
            type="button"
            :class="['usage-option', { active: form.usage === option.value }]"
            @click="handleUsageChange(option.value)"
          >
            <strong>{{
              t(`memberManagement.groupModal.${option.titleKey}`)
            }}</strong
            ><span>{{
              t(`memberManagement.groupModal.${option.descriptionKey}`)
            }}</span>
          </button>
        </div>
      </a-form-item>
      <a-form-item :label="t('memberManagement.groupModal.members')"
        ><div class="member-picker">
          <label
            v-for="member in candidateMembers"
            :key="member.id"
            class="member-option"
            ><a-checkbox
              :checked="form.memberIds.includes(String(member.id))"
              @change="
                handleMemberChange(String(member.id), $event.target.checked)
              "
            /><span
              ><strong>{{ member.userName }}</strong
              ><em>{{ member.roleName }}</em></span
            ></label
          >
        </div></a-form-item
      >
    </a-form>
    <template #footer>
      <a-button @click="handleCancel">
        {{ t("memberManagement.groupModal.cancel") }}
      </a-button>
      <a-button type="primary" @click="handleSubmit">
        {{
          isEdit
            ? t("memberManagement.groupModal.save")
            : t("memberManagement.groupModal.confirm")
        }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.group-form :deep(.ant-form-item-label > label) {
  font-weight: 500;
}
.usage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.usage-option {
  min-height: 76px;
  padding: 14px 16px;
  border: 1px solid var(--dm-border);
  border-radius: 6px;
  background: var(--dm-bg-container);
  color: var(--dm-text-2);
  text-align: left;
  cursor: pointer;
}
.usage-option strong,
.usage-option span {
  display: block;
}
.usage-option strong {
  margin-bottom: 3px;
  color: var(--dm-text);
  font-size: 0.14rem;
}
.usage-option span {
  font-size: 0.12rem;
}
.usage-option.active {
  border-color: var(--dm-primary-border);
  background: var(--dm-primary-bg);
  box-shadow: 0 0 0 1px var(--dm-outline);
}
.usage-option.active strong,
.usage-option.active span {
  color: var(--dm-link);
}
.member-picker {
  display: grid;
  width: 100%;
  max-height: 156px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--dm-border);
  border-radius: 6px;
  gap: 4px;
}
.member-option {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 4px;
  cursor: pointer;
}
.member-option:hover {
  background: var(--dm-item-hover-bg);
}
.member-option > span {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-left: 8px;
}
.member-option strong {
  color: var(--dm-link);
}
.member-option em {
  color: var(--dm-text-2);
  font-style: normal;
  font-size: 0.12rem;
}
@media (max-width: 720px) {
  .usage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
