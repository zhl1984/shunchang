<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { ProfileOutlined, PlusOutlined } from "@ant-design/icons-vue";
import { message, type FormInstance } from "ant-design-vue";
import type { RuleObject } from "ant-design-vue/es/form/interface";
import { useI18n } from "vue-i18n";

import {
  createLabelPropertyApi,
  type LabelAttribute,
  type LabelDetail,
  updateLabelPropertyApi,
} from "@/api/label";

import {
  buildLabelPropertyInput,
  buildLabelPropertyUpdate,
  changePropertyType,
  createPropertyForm,
  type LabelPropertyForm,
  type LabelPropertyFormOption,
  type LabelPropertyFormType,
  type LabelPropertyModalMode,
} from "./label-property-modal";

const props = defineProps<{
  open: boolean;
  mode: LabelPropertyModalMode;
  labelId: string | number;
  property?: LabelAttribute;
}>();
const emit = defineEmits<{
  saved: [detail: LabelDetail];
  "update:open": [open: boolean];
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const submitting = ref(false);

/** 优先提取接口返回的业务错误文案，缺失时回退到模块提示。 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
const formModel = ref<LabelPropertyForm>(createPropertyForm());
const defaultOptions = ref<LabelPropertyFormOption[]>([]);
const copyKey = computed(() =>
  props.mode === "edit" ? "editProperty" : "createProperty",
);
const propertyTypes: LabelPropertyFormType[] = [
  "number",
  "text",
  "date",
  "boolean",
  "enum",
  "json",
];
const rules: Record<string, RuleObject[]> = {
  name: [
    {
      required: true,
      whitespace: true,
      trigger: "blur",
      message: t("labelManagement.property.validation.name"),
    },
  ],
};

/** 判断下拉值是否属于受支持的属性类型，并为后续逻辑提供类型收窄。 */
function isLabelPropertyType(value: unknown): value is LabelPropertyFormType {
  return (
    value === "number" ||
    value === "text" ||
    value === "date" ||
    value === "boolean" ||
    value === "enum" ||
    value === "json"
  );
}

/** 复制初始化数据到响应式表单，避免取消编辑时污染详情列表。 */
function resetForm(): void {
  formModel.value = createPropertyForm(props.property);
  formRef.value?.clearValidate();
}

/** 切换类型时清除全部旧类型专属值，防止隐藏字段再次提交。 */
function handleTypeChange(value: unknown): void {
  if (!isLabelPropertyType(value)) return;

  formModel.value = changePropertyType(formModel.value, value);
}

/** 将布尔默认值转换为 Select 可接受的字符串值。 */
function getBooleanDefaultValue(): "true" | "false" | undefined {
  if (formModel.value.type !== "boolean") return undefined;
  return formModel.value.defaultValue === undefined
    ? undefined
    : (String(formModel.value.defaultValue) as "true" | "false");
}

/** 将 Select 的字符串值回写为业务布尔值。 */
function handleBooleanDefaultChange(value: unknown): void {
  if (formModel.value.type !== "boolean") return;
  formModel.value.defaultValue =
    value === "true" ? true : value === "false" ? false : undefined;
}

/** 添加一个空枚举行，保存时由 API 过滤或补齐无效字段。 */
function handleAddOption(): void {
  if (formModel.value.type === "enum")
    formModel.value.options.push({ label: "", value: "", description: "" });
}

/** 删除指定枚举行，并保留其余行的当前编辑顺序。 */
function handleDeleteOption(index: number): void {
  if (formModel.value.type === "enum") formModel.value.options.splice(index, 1);
}

/** 校验枚举项名称和值均已填写，避免保存不完整选项。 */
function getValidEnumOptionsMessage(): string | undefined {
  if (formModel.value.type !== "enum") return undefined;

  const hasCompleteOptions =
    formModel.value.options.length > 0 &&
    formModel.value.options.every(
      (option) =>
        String(option.label ?? "").trim().length > 0 &&
        String(option.value ?? "").trim().length > 0,
    );
  if (!hasCompleteOptions) {
    return t("labelManagement.property.validation.enumOption");
  }

  const values = formModel.value.options.map((option) =>
    String(option.value ?? "").trim(),
  );
  if (new Set(values).size !== values.length) {
    return t("labelManagement.property.validation.enumOptionDuplicate");
  }

  return undefined;
}

/** 关闭弹窗并丢弃当前草稿。 */
function handleCancel(): void {
  if (submitting.value) return;
  emit("update:open", false);
  resetForm();
}

/** 校验属性编码后按模式调用新增或编辑 API。 */
async function handleSubmit(): Promise<void> {
  if (submitting.value) return;

  try {
    await formRef.value?.validate();
    const enumOptionsMessage = getValidEnumOptionsMessage();
    if (enumOptionsMessage) {
      message.error(enumOptionsMessage);
      return;
    }
    submitting.value = true;
    const saved =
      props.mode === "edit" && props.property
        ? await updateLabelPropertyApi(
            Number(props.labelId),
            props.property.id,
            buildLabelPropertyUpdate(formModel.value),
          )
        : await createLabelPropertyApi(
            Number(props.labelId),
            buildLabelPropertyInput(formModel.value),
          );
    message.success(t(`labelManagement.property.${copyKey.value}.success`));
    emit("saved", saved);
    emit("update:open", false);
  } catch (error: unknown) {
    // 表单校验错误由字段自身展示，仅请求错误使用全局反馈。
    if (!(error && typeof error === "object" && "errorFields" in error)) {
      message.error(
        getErrorMessage(error, t("labelManagement.property.feedback.error")),
      );
    }
  } finally {
    submitting.value = false;
  }
}

watch(
  [() => props.open, () => props.property, () => props.mode],
  ([open]) => {
    if (open) resetForm();
  },
  { immediate: true },
);

watch(
  () => [formModel.value.options, formModel.value.optionsMultiple],
  () => {
    const mapping = new Map<unknown, number>();
    defaultOptions.value = formModel.value.options
      .filter((option) => {
        return option.value || option.label;
      })
      .map((option) => {
        const value = option.value || option.label || "";
        const label = String(option.label || option.value || "");
        mapping.set(value, 1);
        return { value, label };
      });
    if (formModel.value.optionsMultiple) {
      if (!Array.isArray(formModel.value.defaultValue)) {
        formModel.value.defaultValue = [];
      } else {
        formModel.value.defaultValue = formModel.value.defaultValue.filter(
          (value) => mapping.get(value),
        );
      }
    } else {
      if (!mapping.get(formModel.value.defaultValue)) {
        formModel.value.defaultValue = undefined;
      }
    }
  },
  { deep: true },
);
</script>

<template>
  <a-modal
    :open="open"
    :width="720"
    :confirm-loading="submitting"
    :mask-closable="!submitting"
    :cancel-text="t('labelManagement.property.actions.cancel')"
    :ok-text="t('labelManagement.property.actions.save')"
    wrap-class-name="label-property-modal"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <template #title>
      <div class="lpm-heading">
        <span class="lpm-heading-icon"><ProfileOutlined /></span>
        <span>
          <span class="lpm-title font-lg">{{
            t(`labelManagement.property.${copyKey}.title`)
          }}</span>
          <span class="lpm-subtitle font-sm">{{
            t("labelManagement.property.description")
          }}</span>
        </span>
      </div>
    </template>

    <a-form ref="formRef" :model="formModel" :rules="rules" layout="vertical">
      <a-form-item
        :label="t('labelManagement.property.fields.name')"
        name="name"
      >
        <a-input
          v-model:value="formModel.name"
          :placeholder="t('labelManagement.property.placeholders.name')"
        />
      </a-form-item>

      <a-form-item :label="t('labelManagement.property.fields.description')">
        <a-textarea
          v-model:value="formModel.description"
          :rows="2"
          :placeholder="t('labelManagement.property.placeholders.description')"
        />
      </a-form-item>

      <div class="lpm-grid">
        <a-form-item :label="t('labelManagement.property.fields.type')">
          <a-select
            :value="formModel.type"
            :placeholder="t('labelManagement.property.placeholders.type')"
            @change="handleTypeChange"
          >
            <a-select-option
              v-for="type in propertyTypes"
              :key="type"
              :value="type"
            >
              {{ t(`labelManagement.detail.property.types.${type}`) }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="formModel.type !== 'json'"
          :label="t('labelManagement.property.fields.defaultValue')"
        >
          <a-input-number
            v-if="formModel.type === 'number'"
            v-model:value="formModel.defaultValue"
            class="w-full"
            :placeholder="
              t('labelManagement.property.placeholders.defaultValue')
            "
          />
          <a-input
            v-else-if="formModel.type === 'text'"
            v-model:value="formModel.defaultValue"
            :placeholder="
              t('labelManagement.property.placeholders.defaultValue')
            "
          />
          <a-date-picker
            v-else-if="formModel.type === 'date'"
            v-model:value="formModel.defaultValue"
            class="w-full"
            value-format="YYYY-MM-DD"
            :placeholder="
              t('labelManagement.property.placeholders.defaultDate')
            "
          />
          <a-select
            v-else-if="formModel.type === 'boolean'"
            :value="getBooleanDefaultValue()"
            allow-clear
            :placeholder="
              t('labelManagement.property.placeholders.defaultBoolean')
            "
            @change="handleBooleanDefaultChange"
          >
            <a-select-option value="true">{{
              t("labelManagement.property.boolean.yes")
            }}</a-select-option>
            <a-select-option value="false">{{
              t("labelManagement.property.boolean.no")
            }}</a-select-option>
          </a-select>
          <a-select
            v-else-if="formModel.type === 'enum'"
            v-model:value="formModel.defaultValue"
            :mode="formModel.optionsMultiple ? 'multiple' : undefined"
            :max-tag-count="3"
            allow-clear
            :placeholder="
              t('labelManagement.property.placeholders.defaultEnum')
            "
          >
            <a-select-option
              v-for="(option, index) in defaultOptions"
              :key="index"
              :value="option.value ?? option.label"
            >
              {{ option.label || option.value }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <div v-if="formModel.type === 'number'" class="lpm-number-grid">
        <a-form-item :label="t('labelManagement.property.fields.min')"
          ><a-input-number
            v-model:value="formModel.min"
            class="w-full"
            :placeholder="t('labelManagement.property.placeholders.min')"
        /></a-form-item>
        <a-form-item :label="t('labelManagement.property.fields.max')"
          ><a-input-number
            v-model:value="formModel.max"
            class="w-full"
            :placeholder="t('labelManagement.property.placeholders.max')"
        /></a-form-item>
      </div>

      <section v-if="formModel.type === 'enum'" class="lpm-enum-section">
        <div class="lpm-enum-header flex-between items-center">
          <a-button @click="handleAddOption">
            <template #icon><PlusOutlined /></template>
            {{ t("labelManagement.property.actions.addOption") }}
          </a-button>
          <label class="lpm-switch-field"
            ><span class="m-r-10">{{
              t("labelManagement.property.fields.multiple")
            }}</span
            ><a-switch v-model:checked="formModel.optionsMultiple"
          /></label>
        </div>
        <div class="lpm-option-header">
          <span
            ><b class="lpm-required-mark" aria-hidden="true">*</b
            >{{ t("labelManagement.property.fields.optionLabel") }}</span
          >
          <span
            ><b class="lpm-required-mark" aria-hidden="true">*</b
            >{{ t("labelManagement.property.fields.optionValue") }}</span
          >
          <span>{{
            t("labelManagement.property.fields.optionDescription")
          }}</span>
          <span />
        </div>
        <div class="lpm-options">
          <div
            v-for="(option, index) in formModel.options"
            :key="index"
            class="lpm-option-row"
          >
            <a-input
              v-model:value="option.label"
              :placeholder="
                t('labelManagement.property.placeholders.optionLabel')
              "
            />
            <a-input
              v-model:value="option.value"
              :placeholder="
                t('labelManagement.property.placeholders.optionValue')
              "
            />
            <a-input
              v-model:value="option.description"
              :placeholder="
                t('labelManagement.property.placeholders.optionDescription')
              "
            />
            <a-button
              class="lpm-delete-option"
              type="link"
              size="small"
              @click="handleDeleteOption(index)"
            >
              {{ t("labelManagement.property.actions.deleteOption") }}
            </a-button>
          </div>
        </div>
      </section>

      <div
        class="lpm-footer-grid"
        :class="{
          'lpm-footer-grid--number': formModel.type === 'number',
        }"
      >
        <a-form-item
          v-if="formModel.type === 'number'"
          :label="t('labelManagement.property.fields.unit')"
        >
          <a-input
            v-model:value="formModel.unit"
            :placeholder="t('labelManagement.property.placeholders.unit')"
          />
        </a-form-item>
        <a-form-item
          v-if="formModel.type !== 'json'"
          :label="t('labelManagement.property.fields.readonly')"
        >
          <a-switch v-model:checked="formModel.readonly" />
        </a-form-item>
        <a-form-item :label="t('labelManagement.property.fields.required')">
          <a-switch v-model:checked="formModel.required" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
.lpm-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lpm-heading-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
  color: var(--dm-primary);
  background: var(--dm-primary-bg);
}
.lpm-title,
.lpm-subtitle {
  display: block;
}
.lpm-subtitle {
  margin-top: 3px;
  color: var(--dm-text-3);
}
.lpm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.lpm-number-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.lpm-enum-section {
  padding: 12px;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  background: var(--dm-bg-2);
}
.lpm-enum-header {
  margin-bottom: 10px;
}
.lpm-option-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr 34px;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--dm-text-2);
  font-size: 12px;
  .lpm-required-mark {
    color: var(--dm-error);
    margin-right: 4px;
    vertical-align: middle;
  }
  span {
    margin-left: 12px;
  }
}
.lpm-options {
  max-height: 148px;
  overflow-y: auto;
}
.lpm-option-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr 34px;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.lpm-delete-option {
  width: 34px;
  padding: 0;
  color: var(--dm-error);
}
.lpm-footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}
.lpm-footer-grid--number {
  grid-template-columns: 1fr 1fr 1fr;
}
.lpm-switch-field {
  color: var(--dm-text-2);
}
:global(.label-property-modal .ant-modal-content) {
  overflow: hidden;
}
:global(.label-property-modal .ant-modal-body) {
  max-height: none;
  overflow: hidden;
}
:global(.label-property-modal .ant-form-item) {
  margin-bottom: 12px;
}
</style>
