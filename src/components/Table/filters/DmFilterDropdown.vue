<script setup lang="ts">
import { computed, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { DATE_FORMAT } from "@/constants/date";
import type { DmFilterConfig, FilterForm } from "../types";

const props = defineProps<{
  config: DmFilterConfig;
  selectedKeys?: unknown[];
  setSelectedKeys?: (keys: unknown[]) => void;
  confirm?: () => void;
  clearFilters?: () => void;
}>();
const { t } = useI18n();
const multiple = computed(() => props.config.multiple ?? true);
const defaultStrict = computed(() => props.config.strict ?? true);

/** 将已提交的筛选值转换为面板表单，空值时回退到筛选配置默认值。 */
function createForm(selectedKeys = props.selectedKeys): FilterForm {
  const selected = selectedKeys?.[0];
  const saved =
    selected && typeof selected === "object"
      ? (selected as Record<string, unknown>)
      : { value: selected };
  const numberValue = (value: unknown): number | undefined =>
    typeof value === "number" && !Number.isNaN(value) ? value : undefined;

  return {
    text: props.config.type === "text" ? String(saved.value ?? "") : undefined,
    enum:
      props.config.type === "enum"
        ? (saved.value as FilterForm["enum"])
        : undefined,
    date: props.config.type === "date" ? String(saved.value ?? "") : undefined,
    numberMin:
      props.config.type === "number" ? numberValue(saved.min) : undefined,
    numberMax:
      props.config.type === "number" ? numberValue(saved.max) : undefined,
    dateStart:
      props.config.type === "dateRange" ? String(saved.start ?? "") : undefined,
    dateEnd:
      props.config.type === "dateRange" ? String(saved.end ?? "") : undefined,
    strict:
      props.config.type === "number" || props.config.type === "dateRange"
        ? typeof saved.strict === "boolean"
          ? saved.strict
          : defaultStrict.value
        : undefined,
  };
}

const form = reactive<FilterForm>(createForm());

/** 在 RangePicker 数组值与筛选表单的起止字段之间同步。 */
const dateRange = computed<[string, string] | undefined>({
  get: () =>
    form.dateStart || form.dateEnd
      ? ([form.dateStart ?? "", form.dateEnd ?? ""] as [string, string])
      : undefined,
  set: (value) => {
    form.dateStart = value?.[0] || undefined;
    form.dateEnd = value?.[1] || undefined;
  },
});

/** 确认当前面板值并触发 a-table 原生过滤流程。 */
function getFilterValue(): unknown {
  if (props.config.type === "number") {
    if (form.numberMin === undefined && form.numberMax === undefined)
      return undefined;
    return {
      min: form.numberMin,
      max: form.numberMax,
      strict: form.strict ?? defaultStrict.value,
    };
  }
  if (props.config.type === "dateRange") {
    if (!form.dateStart && !form.dateEnd) return undefined;
    return {
      start: form.dateStart,
      end: form.dateEnd,
      strict: form.strict ?? defaultStrict.value,
    };
  }
  if (props.config.type === "text") return form.text;
  if (props.config.type === "enum") return form.enum;
  return form.date;
}

/** 将面板值写入 a-table 的 selectedKeys 并确认过滤。 */
function handleConfirm() {
  const filterValue = getFilterValue();
  props.setSelectedKeys?.(
    filterValue === undefined || filterValue === "" ? [] : [filterValue],
  );
  props.confirm?.();
}
/** 清空当前列过滤条件。 */
function handleReset() {
  Object.assign(form, createForm([]));
  props.clearFilters?.();
  props.setSelectedKeys?.([]);
  props.confirm?.();
}
</script>

<template>
  <div class="dm-filter-dropdown">
    <a-input
      v-if="config.type === 'text'"
      v-model:value="form.text"
      class="dfd-control"
      :placeholder="t('components.table.filter.textPlaceholder')"
      allow-clear
    />
    <div v-else-if="config.type === 'number'" class="dm-filter-dropdown__range">
      <div class="items-center">
        <a-input-number
          v-model:value="form.numberMin"
          class="dfd-range-control"
          :placeholder="t('components.table.filter.numberMinPlaceholder')"
        />
        <span class="m-x-8">~</span>
        <a-input-number
          v-model:value="form.numberMax"
          class="dfd-range-control"
          :placeholder="t('components.table.filter.numberMaxPlaceholder')"
        />
      </div>
      <div class="items-center m-t-10">
        <a-checkbox v-model:checked="form.strict">{{
          t("components.table.filter.includeBoundary")
        }}</a-checkbox>
      </div>
    </div>
    <a-select
      v-else-if="config.type === 'enum'"
      v-model:value="form.enum"
      class="dfd-control"
      :mode="multiple ? 'multiple' : undefined"
      :placeholder="t('components.table.filter.enumPlaceholder')"
      allow-clear
    >
      <a-select-option
        v-for="option in config.options ?? []"
        :key="String(option.value)"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </a-select-option>
    </a-select>
    <a-date-picker
      v-else-if="config.type === 'date'"
      v-model:value="form.date"
      class="dfd-date-control"
      :value-format="DATE_FORMAT"
      :placeholder="t('components.table.filter.datePlaceholder')"
    />
    <div v-else class="dm-filter-dropdown__range">
      <div class="items-center">
        <a-range-picker
          v-model:value="dateRange"
          class="dfd-date-range-control"
          :value-format="DATE_FORMAT"
          :placeholder="[
            t('components.table.filter.dateStartPlaceholder'),
            t('components.table.filter.dateEndPlaceholder'),
          ]"
        />
      </div>
      <div class="items-center m-t-10">
        <a-checkbox v-model:checked="form.strict">{{
          t("components.table.filter.includeBoundary")
        }}</a-checkbox>
      </div>
    </div>
    <div class="dm-filter-dropdown__actions">
      <a-button size="small" @click="handleReset">{{
        t("common.reset")
      }}</a-button>
      <a-button type="primary" size="small" @click="handleConfirm">{{
        t("common.confirm")
      }}</a-button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.dm-filter-dropdown {
  padding: 16px 10px 10px 10px;
}
.dm-filter-dropdown__actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.dfd-control {
  width: 200px;
}
.dfd-range-control {
  width: 100px;
}
.dfd-date-control {
  width: 120px;
}
.dfd-date-range-control {
  width: 240px;
}
</style>
