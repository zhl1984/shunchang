<template>
  <ConfigProvider :theme="themeConfig">
    <main
      class="dynamic-form-panel"
      :class="`dynamic-form-panel--${themeMode}`"
    >
      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <section v-if="props.schema.length > 0" class="form-panel">
        <div v-for="field in visibleFields" :key="field.id" class="form-field">
          <div class="field-label">
            <span>{{ field.label || field.name }}</span>
            <span v-if="field.unit" class="field-unit"
              >（{{ field.unit }}）</span
            >
            <span v-if="field.required" class="required-mark">*</span>
            <a-tooltip v-if="field.description" :title="field.description">
              <QuestionCircleOutlined class="description-icon" />
            </a-tooltip>
          </div>

          <RadioGroup
            v-if="field.type === 'RADIO'"
            :value="getValue(field.id)"
            :disabled="isDisabled(field)"
            :options="field.options || []"
            @change="handleValueChange(field.id, $event.target.value)"
          />
          <CheckboxGroup
            v-else-if="field.type === 'MULTI_SELECTION'"
            :value="asArray(getValue(field.id))"
            :disabled="isDisabled(field)"
            :options="field.options || []"
            @change="handleValueChange(field.id, $event)"
          />
          <Select
            v-else-if="field.type === 'DROPDOWN'"
            :value="getValue(field.id)"
            :disabled="isDisabled(field)"
            :options="field.options || []"
            allow-clear
            @change="handleValueChange(field.id, $event)"
          />
          <Input
            v-else-if="field.type === 'TEXT'"
            :value="asString(getValue(field.id))"
            :disabled="isDisabled(field)"
            @update:value="handleValueChange(field.id, $event)"
          />
          <InputNumber
            v-else-if="field.type === 'NUMBER'"
            :value="asNumber(getValue(field.id))"
            :disabled="isDisabled(field)"
            :min="toNumber(field.minValue)"
            :max="toNumber(field.maxValue)"
            @change="handleValueChange(field.id, $event)"
          />
          <LegacyDateTimePicker
            v-else-if="field.type === 'DATE'"
            :value="asString(getValue(field.id))"
            :disabled="isDisabled(field)"
            @change="handleValueChange(field.id, $event)"
            @open-change="handleDatePickerOpenChange"
          />
          <Select
            v-else-if="field.type === 'BOOLEAN'"
            :value="asBooleanSelectValue(getValue(field.id))"
            :disabled="isDisabled(field)"
            allow-clear
            :options="booleanOptions"
            @change="handleBooleanChange(field.id, $event)"
          />
          <div v-if="validationErrors[field.id]" class="field-error">
            {{ formatError(validationErrors[field.id]) }}
          </div>
        </div>
      </section>
      <a-empty v-else description="等待宿主页面发送动态表单 schema" />
    </main>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  ConfigProvider,
  Empty as AEmpty,
  theme as antTheme,
} from "ant-design-vue";
import {
  CheckboxGroup,
  Input,
  InputNumber,
  RadioGroup,
  Select,
} from "ant-design-vue";
import { QuestionCircleOutlined } from "@ant-design/icons-vue";

import LegacyDateTimePicker from "@/dynamic-form/LegacyDateTimePicker.vue";
import type {
  DynamicFormField,
  DynamicFormTheme,
  DynamicFormValidationError,
  DynamicFormValidationErrors,
  DynamicFormValues,
} from "@/dynamic-form/types";
import { validateDynamicForm } from "@/dynamic-form/validation";

interface DynamicFormPanelProps {
  schema: DynamicFormField[];
  values: DynamicFormValues;
  disabled?: boolean;
  /** 主题由宿主上下文显式传入，组件不读取管理端 theme store。 */
  theme?: DynamicFormTheme;
}

const props = withDefaults(defineProps<DynamicFormPanelProps>(), {
  disabled: false,
  theme: "dark",
});
const emit = defineEmits<{
  (event: "change", name: string, value: unknown): void;
  (
    event: "validation",
    valid: boolean,
    errors: DynamicFormValidationErrors,
  ): void;
  (event: "resize", height: number): void;
}>();

const booleanOptions = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];
const formValues = ref<DynamicFormValues>({});
const validationErrors = ref<DynamicFormValidationErrors>({});
const errorMessage = ref("");
const themeMode = computed<DynamicFormTheme>(() =>
  props.theme === "light" ? "light" : "dark",
);
const themeConfig = computed(() => ({
  algorithm:
    themeMode.value === "dark"
      ? antTheme.darkAlgorithm
      : antTheme.defaultAlgorithm,
  token: { colorPrimary: "#1677ff" },
}));

const visibleFields = computed(() =>
  props.schema.filter((field) => {
    if (!field.parent) return true;
    const parentValue = formValues.value[field.parent];
    return Array.isArray(parentValue)
      ? parentValue.includes(field.parentValue)
      : parentValue === field.parentValue;
  }),
);

/** 宿主上下文变化时替换本地编辑快照，避免沿用上一个对象的输入值。 */
watch(
  () => [props.schema, props.values, props.disabled, props.theme],
  () => {
    formValues.value = { ...props.values };
    validationErrors.value = {};
    errorMessage.value = "";
    notifyResize();
  },
  { deep: true, immediate: true },
);

/** 更新本地值并通知宿主，宿主随后把值写回其唯一业务状态。 */
function handleValueChange(name: string, value: unknown) {
  const plainValue = toPlainData(value);
  formValues.value[name] = plainValue;
  const field = props.schema.find((item) => item.id === name);
  console.info("[dynamic-form] 表单项变更", {
    title: field?.label || field?.name || name,
    value: plainValue,
  });
  validationErrors.value = {};
  emit("change", name, plainValue);
  notifyResize();
}

/** Ant Select 使用字符串承载布尔选项，向宿主回传时恢复原生布尔类型。 */
function handleBooleanChange(name: string, value: unknown) {
  handleValueChange(
    name,
    value === "true" ? true : value === "false" ? false : undefined,
  );
}

/** 日期浮层打开或关闭时重新测量内容高度，交给父级 iframe 调整尺寸。 */
function handleDatePickerOpenChange() {
  notifyResize();
}

/** 执行字段级校验，同时保留错误供组件内展示并通知 iframe 适配层。 */
function validate() {
  const errors = validateDynamicForm(props.schema, formValues.value);
  validationErrors.value = errors;
  console.info("[dynamic-form] 校验当前表单数据", {
    values: toPlainData(formValues.value),
  });
  emit("validation", Object.keys(errors).length === 0, { ...errors });
  notifyResize();
}

/** 通知宿主当前可见内容高度，避免 iframe 内外形成重复滚动容器。 */
function notifyResize() {
  nextTick(() => {
    const popupBottom = Array.from(
      document.querySelectorAll<HTMLElement>(".legacy-date-picker__popup"),
    ).reduce(
      (max, element) => Math.max(max, element.getBoundingClientRect().bottom),
      0,
    );
    emit(
      "resize",
      Math.max(document.body.scrollHeight, Math.ceil(popupBottom)),
    );
  });
}

function getValue(name: string) {
  return formValues.value[name];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown) {
  return typeof value === "number"
    ? value
    : value == null || value === "" || typeof value === "boolean"
      ? undefined
      : Number(value);
}

function toNumber(value: unknown) {
  // 未配置边界可能以 null、空字符串或空白字符串返回；这些值不能被 Number() 转成 0。
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const result = Number(value.trim());
  return Number.isFinite(result) ? result : undefined;
}

function asBooleanSelectValue(value: unknown) {
  return typeof value === "boolean" ? String(value) : undefined;
}

function isDisabled(field: DynamicFormField) {
  return Boolean(props.disabled || field.readOnly);
}

function formatError(error?: DynamicFormValidationError) {
  if (!error) return "";
  const labels: Record<DynamicFormValidationError["code"], string> = {
    required: "该字段不能为空",
    type: "字段值格式不正确",
    min: `不能小于 ${error.bound ?? ""}`,
    max: `不能大于 ${error.bound ?? ""}`,
    option: "枚举值已失效",
    schema: "字段规则配置无效",
  };
  return labels[error.code];
}

/** 将响应式对象转换为可安全跨 iframe 传输的普通数据。 */
function toPlainData<T>(value: T): T {
  if (value === undefined) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

defineExpose({ validate });
</script>

<style scoped lang="less">
.dynamic-form-panel {
  box-sizing: border-box;
  min-height: 0;
  padding: 0;
  background: #111827;
  color: var(--dm-text);
  font-size: 14px;
}

.error-banner {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--dm-error);
  background: var(--dm-error-bg);
  font-size: 12px;
}

.form-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field {
  min-width: 0;
}

.field-label {
  margin-bottom: 5px;
  color: var(--dm-text-2);
  font-size: 13px;
}

.field-unit {
  color: var(--dm-text-3);
}

.required-mark,
.field-error,
.invalid {
  color: var(--dm-error);
}

.required-mark {
  margin-left: 3px;
}

.description-icon {
  margin-left: 5px;
  color: var(--dm-text-3);
}

.field-error {
  margin-top: 4px;
  font-size: 12px;
}

:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-picker),
:deep(.ant-select),
:deep(.ant-checkbox-group),
:deep(.ant-radio-group) {
  width: 100%;
}

:deep(.ant-radio-group),
:deep(.ant-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
