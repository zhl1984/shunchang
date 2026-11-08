<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { ApartmentOutlined } from "@ant-design/icons-vue";
import type { FormInstance } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import type { AnnotationDesigner } from "@/api/development-config";

export type DesignerValue = number;
export type DataTypeValue = string;

interface CreateAnnotationTypeDraft {
  name: string;
  designer?: DesignerValue;
  dataType?: DataTypeValue;
  description: string;
}

export interface CreateAnnotationTypeForm {
  name: string;
  designer: DesignerValue;
  dataType: DataTypeValue;
  description: string;
}

export interface EditableAnnotationType {
  key: number;
  name: string;
  designer: DesignerValue;
  dataType: DataTypeValue;
  description: string;
}

interface SelectOption<T extends string | number> {
  label: string;
  value: T;
}

const props = withDefaults(
  defineProps<{
    designers: AnnotationDesigner[];
    open: boolean;
    record?: EditableAnnotationType | null;
    submitting?: boolean;
  }>(),
  { record: null, submitting: false },
);
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "submit", value: CreateAnnotationTypeForm): void;
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<CreateAnnotationTypeDraft>({
  name: "",
  designer: undefined,
  dataType: undefined,
  description: "",
});

// 设计器选项直接来自接口，保证表单只提交后端当前可用的设计器 ID。
const designerOptions = computed<SelectOption<DesignerValue>[]>(() =>
  props.designers.map((designer) => ({
    label: designer.designerName,
    value: designer.designerId,
  })),
);

// 数据类型严格跟随当前设计器，避免提交不支持的组合。
const dataTypeOptions = computed<SelectOption<DataTypeValue>[]>(() => {
  const formats = props.designers
    .find((designer) => designer.designerId === form.designer)
    ?.inputFormats.split(",")
    .map((format) => format.trim())
    .filter(Boolean);
  return (formats ?? []).map((format) => ({ label: format, value: format }));
});

const isEdit = computed(() => Boolean(props.record));

// 每次打开回填编辑记录或恢复空白表单，避免上一次输入残留。
watch(
  () => [props.open, props.record] as const,
  ([open, record]) => {
    if (!open) return;
    Object.assign(form, {
      name: record?.name ?? "",
      designer: record?.designer,
      dataType: record?.dataType,
      description: record?.description ?? "",
    });
    void nextTick(() => formRef.value?.clearValidate());
  },
);

/** 切换设计器时清空旧数据类型，防止保留不兼容的数据格式。 */
function handleDesignerChange(): void {
  form.dataType = undefined;
  formRef.value?.clearValidate("dataType");
}

/** 关闭弹窗且不提交当前草稿。 */
function handleCancel(): void {
  emit("update:open", false);
}

/** 校验必填字段并向页面提交完整的新建或编辑数据。 */
async function handleSubmit(): Promise<void> {
  await formRef.value?.validate();
  // 校验已保证两个选择值非空，此判断同时收窄提交事件的字段类型。
  if (!form.designer || !form.dataType) return;
  emit("submit", {
    name: form.name,
    designer: form.designer,
    dataType: form.dataType,
    description: form.description,
  });
}
</script>

<template>
  <a-modal
    :open="props.open"
    :confirm-loading="props.submitting"
    :ok-text="t('developmentConfig.annotationType.createModal.save')"
    :cancel-text="t('developmentConfig.annotationType.createModal.cancel')"
    width="720px"
    centered
    destroy-on-close
    class="create-annotation-type-modal"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <template #title>
      <!-- 弹窗标题同时说明标注类型与设计器、数据类型的绑定关系。 -->
      <div class="create-modal-title">
        <span class="create-modal-title__icon" aria-hidden="true">
          <ApartmentOutlined />
        </span>
        <div>
          <strong>{{
            t(
              isEdit
                ? "developmentConfig.annotationType.editModal.title"
                : "developmentConfig.annotationType.createModal.title",
            )
          }}</strong>
          <span>{{
            t("developmentConfig.annotationType.createModal.description")
          }}</span>
        </div>
      </div>
    </template>

    <a-form
      ref="formRef"
      :model="form"
      class="create-annotation-type-form"
      layout="vertical"
    >
      <a-form-item
        :label="t('developmentConfig.annotationType.createModal.name')"
        :rules="[
          {
            required: true,
            message: t(
              'developmentConfig.annotationType.createModal.requiredName',
            ),
          },
        ]"
        name="name"
      >
        <a-input
          v-model:value="form.name"
          :disabled="props.submitting"
          :placeholder="
            t('developmentConfig.annotationType.createModal.namePlaceholder')
          "
          size="large"
        />
      </a-form-item>

      <a-form-item
        :label="t('developmentConfig.annotationType.createModal.designer')"
        :rules="[
          {
            required: true,
            message: t(
              'developmentConfig.annotationType.createModal.requiredDesigner',
            ),
          },
        ]"
        name="designer"
      >
        <a-select
          v-model:value="form.designer"
          :disabled="props.submitting"
          :options="designerOptions"
          :placeholder="
            t(
              'developmentConfig.annotationType.createModal.designerPlaceholder',
            )
          "
          size="large"
          @change="handleDesignerChange"
        />
      </a-form-item>

      <a-form-item
        :label="t('developmentConfig.annotationType.createModal.dataType')"
        :rules="[
          {
            required: true,
            message: t(
              'developmentConfig.annotationType.createModal.requiredDataType',
            ),
          },
        ]"
        name="dataType"
      >
        <a-select
          v-model:value="form.dataType"
          :disabled="!form.designer || props.submitting"
          :options="dataTypeOptions"
          :placeholder="
            form.designer
              ? t(
                  'developmentConfig.annotationType.createModal.dataTypePlaceholder',
                )
              : t(
                  'developmentConfig.annotationType.createModal.selectDesignerFirst',
                )
          "
          size="large"
        />
      </a-form-item>

      <a-form-item
        :label="
          t('developmentConfig.annotationType.createModal.descriptionLabel')
        "
        name="description"
      >
        <a-textarea
          v-model:value="form.description"
          :disabled="props.submitting"
          :placeholder="
            t(
              'developmentConfig.annotationType.createModal.descriptionPlaceholder',
            )
          "
          :rows="4"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
/* 唯一弹窗类限定全局覆盖，确保传送到 body 后样式仍然生效。 */
:global(.create-annotation-type-modal .ant-modal-content) {
  overflow: hidden;
  padding: 0;
  border-radius: 0.12rem;
}

:global(.create-annotation-type-modal .ant-modal-header) {
  margin: 0;
  padding: 28px 40px 22px;
  border-bottom: 1px solid var(--dm-border-2);
}

:global(.create-annotation-type-modal .ant-modal-body) {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding: 26px 40px 8px;
}

:global(.create-annotation-type-modal .ant-modal-footer) {
  margin: 0;
  padding: 16px 40px 26px;
  border-top: 1px solid var(--dm-border-2);
}

.create-modal-title {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding-right: 24px;
}

.create-modal-title__icon {
  display: inline-grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 0.08rem;
  background: var(--dm-info-bg);
  color: var(--dm-link);
  font-size: 0.2rem;
  line-height: 1;
}

/* Ant Design 图标默认按文字基线布局，重置后 SVG 才能精确居中。 */
.create-modal-title__icon :deep(.anticon) {
  display: inline-grid;
  width: 1em;
  height: 1em;
  place-items: center;
  line-height: 1;
}

.create-modal-title__icon :deep(svg) {
  display: block;
  width: 1em;
  height: 1em;
}

.create-modal-title > div > strong,
.create-modal-title > div > span {
  display: block;
}

.create-modal-title > div > strong {
  color: var(--dm-text);
  font-size: 0.22rem;
  line-height: 1.4;
}

.create-modal-title > div > span {
  margin-top: 4px;
  color: var(--dm-text-3);
  font-size: 0.13rem;
  font-weight: 400;
  line-height: 1.5;
}

.create-annotation-type-form :deep(.ant-form-item) {
  margin-bottom: 20px;
}

.create-annotation-type-form :deep(.ant-form-item-label > label) {
  font-weight: 600;
}

/* 窄屏压缩弹窗内边距，为表单字段保留可用宽度。 */
@media (max-width: 720px) {
  :global(.create-annotation-type-modal .ant-modal-header),
  :global(.create-annotation-type-modal .ant-modal-body),
  :global(.create-annotation-type-modal .ant-modal-footer) {
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>
