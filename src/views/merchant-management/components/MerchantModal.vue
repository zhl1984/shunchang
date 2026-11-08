<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import type { FormInstance } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import {
  createMerchantApi,
  getMerchantDetailApi,
  updateMerchantApi,
  type MerchantForm,
} from "@/api/merchant";
const props = defineProps<{
  open: boolean;
  mode: "create" | "view" | "edit";
  merchantId?: number;
}>();
const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved"): void;
}>();
const { t } = useI18n();
const loading = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const formHeaderMode = computed(() => {
  if (props.mode === "view") return "read" as const;
  if (props.mode === "edit") return "update" as const;
  return "create" as const;
});
const subTitle = computed(() =>
  t(`merchantManagement.modal.subtitle.${props.mode}`),
);
const form = reactive<MerchantForm>({
  merchantName: "",
  expireDate: "",
  contact: "",
  contactWay: "",
  loginName: "",
  loginPassword: "",
});
const rules = computed(() => ({
  merchantName: [
    {
      required: true,
      message: t("merchantManagement.validation.merchantName"),
    },
  ],
  expireDate: [
    { required: true, message: t("merchantManagement.validation.expireDate") },
  ],
  loginName: [
    { required: true, message: t("merchantManagement.validation.loginName") },
  ],
  loginPassword: [
    {
      required: true,
      message: t("merchantManagement.validation.loginPassword"),
    },
    {
      min: 8,
      max: 32,
      message: t("merchantManagement.validation.passwordLength"),
    },
  ],
  contact: [
    { required: true, message: t("merchantManagement.validation.contact") },
  ],
  contactWay: [
    { required: true, message: t("merchantManagement.validation.contactWay") },
    {
      pattern: /^1\d{10}$/,
      message: t("merchantManagement.validation.mobile"),
    },
  ],
}));
const reset = () =>
  Object.assign(form, {
    merchantName: "",
    expireDate: "",
    contact: "",
    contactWay: "",
    loginName: "",
    loginPassword: "",
  });
async function load() {
  if (!props.merchantId || props.mode === "create") return;
  loading.value = true;
  try {
    Object.assign(form, await getMerchantDetailApi(props.merchantId));
  } catch (e) {
    message.error(
      e instanceof Error
        ? e.message
        : t("merchantManagement.feedback.detailFailed"),
    );
  } finally {
    loading.value = false;
  }
}
function close() {
  emit("update:open", false);
  reset();
}
async function submit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    if (props.mode === "edit" && props.merchantId)
      await updateMerchantApi(props.merchantId, form);
    else await createMerchantApi(form);
    message.success(t("merchantManagement.feedback.saveSuccess"));
    emit("saved");
    close();
  } catch (e) {
    message.error(
      e instanceof Error
        ? e.message
        : t("merchantManagement.feedback.saveFailed"),
    );
  } finally {
    submitting.value = false;
  }
}
watch(
  () => props.open,
  (open) => {
    if (open) {
      reset();
      void load();
    }
  },
);
</script>
<template>
  <a-modal
    class="form-modal"
    :open="open"
    :confirm-loading="submitting"
    @cancel="close"
    @ok="mode === 'view' ? close() : submit()"
  >
    <template #title>
      <DmAppFormHeader :mode="formHeaderMode">
        <template #title>{{
          t(`merchantManagement.modal.title.${mode}`)
        }}</template>
        <template #subtitle>{{ subTitle }}</template>
      </DmAppFormHeader>
    </template>
    <a-spin :spinning="loading">
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        layout="vertical"
        autocomplete="off"
      >
        <a-form-item
          name="merchantName"
          :label="t('merchantManagement.fields.merchantName')"
          required
        >
          <a-input
            v-model:value="form.merchantName"
            :disabled="mode === 'view'"
          />
        </a-form-item>
        <a-form-item
          name="expireDate"
          :label="t('merchantManagement.fields.expireDate')"
          required
        >
          <a-date-picker
            v-model:value="form.expireDate"
            value-format="YYYY-MM-DD"
            :disabled="mode === 'view'"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item
          name="loginName"
          :label="t('merchantManagement.fields.loginName')"
          required
        >
          <a-input
            v-model:value="form.loginName"
            autocomplete="new-password"
            :disabled="mode !== 'create'"
          />
        </a-form-item>
        <a-form-item
          name="loginPassword"
          :label="t('merchantManagement.fields.loginPassword')"
          required
        >
          <a-input-password
            v-model:value="form.loginPassword"
            autocomplete="new-password"
            :disabled="mode !== 'create'"
          />
        </a-form-item>
        <a-form-item
          name="contact"
          :label="t('merchantManagement.fields.contact')"
          required
        >
          <a-input v-model:value="form.contact" :disabled="mode === 'view'"
        /></a-form-item>
        <a-form-item
          name="contactWay"
          :label="t('merchantManagement.fields.contactWay')"
          required
        >
          <a-input v-model:value="form.contactWay" :disabled="mode === 'view'"
        /></a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>
