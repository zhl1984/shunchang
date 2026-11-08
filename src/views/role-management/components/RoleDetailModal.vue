<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { RoleRow } from "../data";

const props = withDefaults(
  defineProps<{ open: boolean; role?: RoleRow | null }>(),
  { role: null },
);
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
}>();
const { t } = useI18n();

/** 关闭弹窗不保留任何状态。 */
function handleClose(): void {
  emit("update:open", false);
}
</script>

<template>
  <a-modal
    :open="props.open"
    width="620px"
    centered
    destroy-on-close
    wrap-class-name="form-modal role-detail-modal"
    @cancel="handleClose"
  >
    <template #title>
      <DmAppFormHeader mode="read">
        <template #title>{{ t("roleManagement.detailModal.title") }}</template>
        <template #subtitle>{{
          t("roleManagement.detailModal.description")
        }}</template>
      </DmAppFormHeader>
    </template>
    <a-form layout="vertical" class="role-form">
      <a-form-item :label="t('roleManagement.columns.name')">
        <a-input :value="props.role?.name ?? ''" disabled />
      </a-form-item>
      <a-form-item :label="t('roleManagement.columns.accountCount')">
        <a-input :value="String(props.role?.accountCount ?? 0)" disabled />
      </a-form-item>
      <a-form-item :label="t('roleManagement.columns.remark')">
        <a-input :value="props.role?.remark || '-'" disabled />
      </a-form-item>
      <a-form-item :label="t('roleManagement.columns.createTime')">
        <a-input :value="props.role?.createTime || '-'" disabled />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button type="primary" @click="handleClose">
        {{ t("roleManagement.detailModal.close") }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.role-form :deep(.ant-form-item-label > label) {
  font-weight: 500;
}
.role-form :deep(.ant-input[disabled]) {
  color: var(--dm-text-2);
  background: var(--dm-bg-elevated);
}
</style>
