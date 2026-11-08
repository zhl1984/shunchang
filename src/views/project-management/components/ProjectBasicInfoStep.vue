<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import dayjs, { type Dayjs } from "dayjs";
import { useI18n } from "vue-i18n";
import {
  getMemberListApi,
  type MemberRecordDto,
} from "@/api/member-management";
import type {
  ProjectBasicInfoForm,
  ProjectModalMode,
  ProjectStepExpose,
} from "../types";

const props = defineProps<{
  mode: ProjectModalMode;
  modelValue: ProjectBasicInfoForm;
  draft: import("../types").ProjectFormDraft;
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const ownerLoading = ref(false);
const ownerMembers = ref<MemberRecordDto[]>([]);
const form = reactive({ ...props.modelValue });
watch(
  () => props.modelValue,
  (value) => Object.assign(form, value),
  { deep: true },
);

const rules: Record<string, Rule[]> = {
  projectName: [
    {
      required: true,
      whitespace: true,
      message: t("projectManagement.modal.basic.nameRequired"),
    },
  ],
  ownerUserId: [
    {
      required: true,
      message: t("projectManagement.modal.basic.ownerRequired"),
    },
  ],
  deadline: [
    {
      required: true,
      message: t("projectManagement.modal.basic.deadlineRequired"),
    },
  ],
};
const ownerOptions = computed(() =>
  ownerMembers.value.map((member) => ({
    label: member.userName,
    value: member.id,
  })),
);
/** 新建项目时禁止选择今天之前的日期；查看模式保留详情中的原始截止日期。 */
function disablePastDates(currentDate: Dayjs): boolean {
  return props.mode === "create" && currentDate.isBefore(dayjs(), "day");
}
/** 加载项目经理成员，作为项目负责人候选项。 */
async function loadOwnerOptions(): Promise<void> {
  ownerLoading.value = true;
  try {
    const result = await getMemberListApi({
      roleId: 2,
      pageNo: 1,
      pageSize: 1000,
    });
    ownerMembers.value = result.list ?? [];
  } catch {
    ownerMembers.value = [];
    message.error(t("projectManagement.modal.basic.ownerLoadFailed"));
  } finally {
    ownerLoading.value = false;
  }
}
/** 校验基础信息必填字段，查看模式由外层跳过该方法。 */
async function validate(): Promise<void> {
  await formRef.value?.validate();
}
/** 返回基础信息快照，避免外层直接修改内部状态。 */
function getForm(): ProjectBasicInfoForm {
  return { ...form };
}
defineExpose<ProjectStepExpose<ProjectBasicInfoForm>>({ validate, getForm });
onMounted(loadOwnerOptions);
</script>
<template>
  <a-form
    ref="formRef"
    :model="form"
    :rules="rules"
    layout="vertical"
    :disabled="mode === 'view'"
  >
    <a-form-item
      :label="t('projectManagement.modal.basic.name')"
      name="projectName"
      required
    >
      <a-input
        v-model:value="form.projectName"
        :placeholder="t('projectManagement.modal.basic.namePlaceholder')"
      />
    </a-form-item>
    <a-form-item
      :label="t('projectManagement.modal.basic.owner')"
      name="ownerUserId"
      required
    >
      <a-select
        v-model:value="form.ownerUserId"
        :placeholder="t('projectManagement.modal.basic.ownerPlaceholder')"
        :options="ownerOptions"
        :loading="ownerLoading"
        show-search
        option-filter-prop="label"
      />
    </a-form-item>
    <a-form-item
      :label="t('projectManagement.modal.basic.deadline')"
      name="deadline"
      required
    >
      <a-date-picker
        v-model:value="form.deadline"
        value-format="YYYY-MM-DD"
        class="basic-info-full"
        :disabled-date="disablePastDates"
        :placeholder="t('projectManagement.modal.basic.deadlinePlaceholder')"
      />
    </a-form-item>
    <a-form-item
      :label="t('projectManagement.modal.basic.description')"
      name="projectDesc"
    >
      <a-textarea
        v-model:value="form.projectDesc"
        :placeholder="t('projectManagement.modal.basic.descriptionPlaceholder')"
        :auto-size="{ minRows: 1, maxRows: 3 }"
      />
    </a-form-item>
  </a-form>
</template>
<style scoped>
.basic-info-full {
  width: 100%;
}
</style>
