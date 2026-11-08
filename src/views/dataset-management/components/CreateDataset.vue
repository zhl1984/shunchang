<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons-vue";
import { message, type FormInstance, type UploadFile } from "ant-design-vue";
import type { RuleObject } from "ant-design-vue/es/form/interface";
import { useI18n } from "vue-i18n";
import {
  createDatasetImportApi,
  getDatasetTypesApi,
  startDatasetImportApi,
  type DatasetTypeOption,
} from "@/api/dataset";
import {
  buildDatasetImportInput,
  getDefaultDatasetFormat,
  isDatasetFileExtensionAllowed,
  uploadDatasetSource,
  type CreateDatasetFormValues,
} from "./create-dataset";

defineOptions({ name: "CreateDataset" });
type CreateDatasetModel = CreateDatasetFormValues & { files: UploadFile[] };
const emit = defineEmits<{ created: [] }>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const visible = ref(false);
const submitting = ref(false);
const loadingOptions = ref(false);
const datasetTypes = ref<DatasetTypeOption[]>([]);
const formModel = reactive<CreateDatasetModel>({
  description: "",
  files: [],
  name: "",
  dataType: undefined,
  dataFormat: undefined,
});
const typeOptions = computed(() =>
  datasetTypes.value.map(({ code, name }) => ({ label: name, value: code })),
);
const formatOptions = computed(
  () =>
    datasetTypes.value
      .find(({ code }) => code === formModel.dataType)
      ?.formats.map(({ code, name }) => ({ label: name, value: code })) ?? [],
);
const selectedFormat = computed(() =>
  datasetTypes.value
    .find(({ code }) => code === formModel.dataType)
    ?.formats.find(({ code }) => code === formModel.dataFormat),
);
const uploadAccept = computed(() => {
  const extensions = selectedFormat.value?.fileExtensions ?? [];
  return extensions.length > 0
    ? extensions.map((extension) => `.${extension}`).join(",")
    : undefined;
});
const uploadHint = computed(() => {
  const extensions = selectedFormat.value?.fileExtensions ?? [];
  return extensions.length > 0
    ? t("datasetManagement.create.upload.extensionsHint", {
        formats: extensions.join("、"),
      })
    : t("datasetManagement.create.upload.backendValidationHint");
});
const rules: Record<string, RuleObject[]> = {
  name: [
    {
      required: true,
      whitespace: true,
      message: t("datasetManagement.create.validation.name"),
      trigger: "blur",
    },
  ],
  dataType: [
    {
      required: true,
      message: t("datasetManagement.create.validation.type"),
      trigger: "change",
    },
  ],
  files: [
    {
      required: true,
      type: "array",
      message: t("datasetManagement.create.validation.file"),
      trigger: "change",
      validator: (_rule: unknown, value: unknown) => {
        const uploadFile = Array.isArray(value) ? value[0] : undefined;
        const fileName = uploadFile?.originFileObj?.name ?? uploadFile?.name;
        if (!fileName) {
          return Promise.reject(
            new Error(t("datasetManagement.create.validation.file")),
          );
        }
        const extensions = selectedFormat.value?.fileExtensions ?? [];
        return isDatasetFileExtensionAllowed(fileName, extensions)
          ? Promise.resolve()
          : Promise.reject(
              new Error(
                t("datasetManagement.create.validation.fileFormat", {
                  formats: extensions.join("、"),
                }),
              ),
            );
      },
    },
  ],
};

/** 加载后端允许的数据类型及对应导入格式。 */
async function loadDatasetTypes(): Promise<void> {
  loadingOptions.value = true;
  try {
    const response = await getDatasetTypesApi();
    if (response.code !== "0") throw new Error(response.message);
    datasetTypes.value = response.data ?? [];
  } catch {
    message.error(t("datasetManagement.create.feedback.optionsError"));
  } finally {
    loadingOptions.value = false;
  }
}
/** 打开创建弹窗并获取最新选项。 */
function handleOpen(): void {
  visible.value = true;
  void loadDatasetTypes();
}
/** 重置弹窗内所有临时状态。 */
function resetForm(): void {
  Object.assign(formModel, {
    description: "",
    files: [],
    name: "",
    dataType: undefined,
    dataFormat: undefined,
  });
  formRef.value?.clearValidate();
}
/** 非提交期间关闭并清理弹窗。 */
function handleCancel(): void {
  if (!submitting.value) {
    visible.value = false;
    resetForm();
  }
}
/** 阻止 Upload 自动上传，统一由提交流程直传。 */
function handleBeforeUpload(): boolean {
  return false;
}
/** 校验并依次创建导入、直传源文件、启动异步导入。 */
async function handleSubmit(): Promise<void> {
  if (submitting.value) return;
  try {
    await formRef.value?.validate();
    const file = formModel.files[0]?.originFileObj;
    if (!formModel.dataType || !file) return;
    // 所选数据类型必须包含后端允许的导入格式，否则不能创建导入记录。
    if (!formModel.dataFormat) {
      message.error(t("datasetManagement.create.validation.format"));
      return;
    }
    submitting.value = true;
    const response = await createDatasetImportApi(
      buildDatasetImportInput(
        {
          ...formModel,
          dataType: formModel.dataType,
          dataFormat: formModel.dataFormat,
        },
        file,
      ),
    );
    if (response.code !== "0") throw new Error(response.message);
    if (!response.data?.uploadTarget || response.data.importId == null)
      throw new Error(t("datasetManagement.create.feedback.error"));
    await uploadDatasetSource(response.data.uploadTarget, file);
    const startResponse = await startDatasetImportApi(response.data.importId);
    if (startResponse.code !== "0") throw new Error(startResponse.message);
    message.success(t("datasetManagement.create.feedback.success"));
    visible.value = false;
    resetForm();
    emit("created");
  } catch (error: unknown) {
    if (!(error && typeof error === "object" && "errorFields" in error))
      message.error(t("datasetManagement.create.feedback.error"));
  } finally {
    submitting.value = false;
  }
}

watch(
  () => formModel.dataType,
  () => {
    formModel.dataFormat = getDefaultDatasetFormat(formatOptions.value);
    // 类型变化后重新校验现有文件，防止沿用不兼容的源文件。
    if (formModel.files.length > 0) {
      void formRef.value?.validateFields(["files"]).catch(() => undefined);
    }
  },
);
</script>

<template>
  <a-button type="primary" size="large" @click="handleOpen"
    ><template #icon> <PlusOutlined /> </template
    >{{ t("datasetManagement.actions.create") }}</a-button
  >
  <a-modal
    v-model:open="visible"
    :cancel-text="t('datasetManagement.create.actions.cancel')"
    :confirm-loading="submitting"
    :mask-closable="!submitting"
    :ok-text="t('datasetManagement.create.actions.submit')"
    :width="632"
    wrap-class-name="form-modal create-dataset-modal"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <template #title>
      <DmAppFormHeader mode="create">
        <template #title>{{ t("datasetManagement.create.title") }}</template>
        <template #subtitle>
          {{ t("datasetManagement.create.description") }}
        </template>
      </DmAppFormHeader>
    </template>
    <a-form
      ref="formRef"
      :label-col="{ span: 24 }"
      :model="formModel"
      :rules="rules"
      :wrapper-col="{ span: 24 }"
      layout="vertical"
    >
      <a-form-item
        :label="t('datasetManagement.create.fields.name')"
        name="name"
        ><a-input
          v-model:value="formModel.name"
          :maxlength="255"
          :placeholder="t('datasetManagement.create.placeholders.name')"
      /></a-form-item>
      <a-form-item
        :label="t('datasetManagement.create.fields.description')"
        name="description"
        ><a-textarea
          v-model:value="formModel.description"
          :auto-size="{ minRows: 1, maxRows: 3 }"
          :maxlength="2000"
          :placeholder="t('datasetManagement.create.placeholders.description')"
      /></a-form-item>
      <a-form-item
        :label="t('datasetManagement.create.fields.type')"
        name="dataType"
        ><a-select
          v-model:value="formModel.dataType"
          :loading="loadingOptions"
          :options="typeOptions"
          :placeholder="t('datasetManagement.create.placeholders.type')"
      /></a-form-item>
      <a-form-item
        :label="t('datasetManagement.create.fields.file')"
        name="files"
        ><a-upload
          v-model:file-list="formModel.files"
          :accept="uploadAccept"
          :before-upload="handleBeforeUpload"
          :max-count="1"
          ><a-button
            ><template #icon> <UploadOutlined /> </template
            >{{ t("datasetManagement.create.upload.select") }}</a-button
          ></a-upload
        >
        <div class="create-dataset__hint font-xs m-t-8">
          {{ uploadHint }}
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
.create-dataset__hint {
  color: var(--dm-text-3);
}
</style>
