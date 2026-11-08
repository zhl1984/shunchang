<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons-vue";
import type { LabelAttribute } from "@/api/label";
import type { RuleLogic, RuleOperator } from "@/api/rule";
import {
  resetConditionItem,
  type ConditionFormGroup,
  type ConditionValueModel,
} from "./rule-condition-panel";

const props = defineProps<{
  modelValue: ConditionFormGroup;
  properties: LabelAttribute[];
  variant: "while" | "then";
  disabled?: boolean;
  invalid?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: ConditionFormGroup];
}>();
const { t } = useI18n();
const group = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const operators: RuleOperator[] = [
  "EQUALS",
  "NOT_EQUALS",
  "IN",
  "NOT_IN",
  "GREATER_THAN",
  "LESS_THAN",
];
const logics: RuleLogic[] = ["AND", "OR"];
const isMultiple = (operator: RuleOperator) =>
  operator === "IN" || operator === "NOT_IN";
const getProperty = (id?: string | number) =>
  props.properties.find((item) => item.id === id);
function updateGroup(next: Partial<ConditionFormGroup>): void {
  group.value = { ...group.value, ...next };
}
function addItem(): void {
  updateGroup({
    conditions: [...group.value.conditions, resetConditionItem()],
  });
}
function removeItem(index: number): void {
  updateGroup({
    conditions: group.value.conditions.filter(
      (_, itemIndex) => itemIndex !== index,
    ),
  });
}
function changeProperty(index: number, id: string | number): void {
  const conditions = [...group.value.conditions];
  const property = getProperty(id);
  conditions[index] = resetConditionItem(id, property?.config.valueType);
  updateGroup({ conditions });
}
function changeOperator(index: number, operator: RuleOperator): void {
  const conditions = [...group.value.conditions];
  const item = conditions[index]!;
  conditions[index] = {
    ...item,
    operator,
    valueModel: item.valueModel
      ? { ...item.valueModel, value: undefined }
      : undefined,
  };
  updateGroup({ conditions });
}
function changeValue(index: number, valueModel: ConditionValueModel): void {
  const conditions = [...group.value.conditions];
  conditions[index] = { ...conditions[index]!, valueModel };
  updateGroup({ conditions });
}

/** 更新文本或 JSON 条件值，保持当前属性类型不被输入事件改写。 */
function handleTextValueChange(index: number, event: Event): void {
  const item = group.value.conditions[index];
  const property = getProperty(item?.labelAttributeId);
  const value = (event.target as HTMLInputElement).value;
  changeValue(index, {
    kind: property?.config.valueType === "JSON" ? "json" : "text",
    value,
  });
}

/** 将接口枚举原始值转换为 Select 可使用的选项。 */
function getEnumOptions(id?: string | number) {
  return getProperty(id)?.config.constraint.options ?? [];
}
</script>

<template>
  <section
    :class="[
      'rule-condition-panel',
      `rcp--${variant}`,
      { 'rcp--invalid': invalid },
    ]"
  >
    <div class="rcp-header flex-between items-center">
      <div>
        <span class="rcp-kicker font-bold">{{ variant.toUpperCase() }}</span>
        <h3>{{ t(`ruleCenter.modal.conditionPanel.titles.${variant}`) }}</h3>
      </div>
      <a-select
        :value="group.logic"
        :disabled="disabled"
        class="rcp-logic"
        @change="(value) => updateGroup({ logic: value as RuleLogic })"
      >
        <a-select-option v-for="item in logics" :key="item" :value="item">{{
          t(`ruleCenter.modal.conditionPanel.logic.${item}`)
        }}</a-select-option>
      </a-select>
    </div>
    <div class="rcp-items">
      <div
        v-for="(item, index) in group.conditions"
        :key="index"
        class="rcp-item"
      >
        <div class="rcp-item-top">
          <a-select
            :value="item.labelAttributeId"
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.property')
            "
            @change="(value) => changeProperty(index, value as string | number)"
          >
            <a-select-option
              v-for="property in properties"
              :key="property.id"
              :value="property.id"
              >{{ property.attributeName }}</a-select-option
            >
          </a-select>
          <a-select
            :value="item.operator"
            :disabled="disabled"
            @change="(value) => changeOperator(index, value as RuleOperator)"
          >
            <a-select-option
              v-for="operator in operators"
              :key="operator"
              :value="operator"
              >{{
                t(`ruleCenter.modal.conditionPanel.operators.${operator}`)
              }}</a-select-option
            >
          </a-select>
          <a-button :disabled="disabled" danger @click="removeItem(index)"
            ><template #icon><DeleteOutlined /></template
          ></a-button>
        </div>
        <template v-if="item.valueModel">
          <a-input-number
            v-if="item.valueModel.kind === 'number'"
            class="w-full"
            :value="item.valueModel.value"
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.number')
            "
            @change="
              (value) =>
                changeValue(index, {
                  kind: 'number',
                  value: typeof value === 'number' ? value : undefined,
                })
            "
          />
          <a-date-picker
            v-else-if="item.valueModel.kind === 'date'"
            class="w-full"
            value-format="YYYY-MM-DD"
            :value="item.valueModel.value"
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.date')
            "
            @change="
              (value) =>
                changeValue(index, {
                  kind: 'date',
                  value: value as string | undefined,
                })
            "
          />
          <a-select
            v-else-if="item.valueModel.kind === 'boolean'"
            class="w-full"
            :mode="isMultiple(item.operator) ? 'multiple' : undefined"
            :value="item.valueModel.value"
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.select')
            "
            @change="
              (value) =>
                changeValue(index, {
                  kind: 'boolean',
                  value: value as
                    | 'true'
                    | 'false'
                    | Array<'true' | 'false'>
                    | undefined,
                })
            "
          >
            <a-select-option value="true">{{
              t("ruleCenter.modal.conditionPanel.boolean.true")
            }}</a-select-option
            ><a-select-option value="false">{{
              t("ruleCenter.modal.conditionPanel.boolean.false")
            }}</a-select-option>
          </a-select>
          <a-select
            v-else-if="item.valueModel.kind === 'enum'"
            class="w-full"
            :mode="isMultiple(item.operator) ? 'multiple' : undefined"
            :value="item.valueModel.value"
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.select')
            "
            @change="
              (value) =>
                changeValue(index, {
                  kind: 'enum',
                  value: value as
                    | string
                    | number
                    | Array<string | number>
                    | undefined,
                })
            "
          >
            <a-select-option
              v-for="option in getEnumOptions(item.labelAttributeId)"
              :key="String(option.value)"
              :value="option.value"
              >{{ option.label || option.value }}</a-select-option
            >
          </a-select>
          <a-select
            v-else-if="isMultiple(item.operator)"
            mode="tags"
            class="w-full"
            :value="
              item.valueModel.kind === 'text' &&
              Array.isArray(item.valueModel.value)
                ? item.valueModel.value
                : undefined
            "
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.input')
            "
            @change="
              (value) =>
                changeValue(index, { kind: 'text', value: value as string[] })
            "
          ></a-select>
          <a-input
            v-else
            :value="
              (item.valueModel.kind === 'text' ||
                item.valueModel.kind === 'json') &&
              !Array.isArray(item.valueModel.value)
                ? item.valueModel.value
                : undefined
            "
            :disabled="disabled"
            :placeholder="
              t('ruleCenter.modal.conditionPanel.placeholders.input')
            "
            @change="handleTextValueChange(index, $event)"
          />
        </template>
        <a-select
          v-else
          class="w-full"
          disabled
          :placeholder="
            t('ruleCenter.modal.conditionPanel.placeholders.propertyRequired')
          "
        />
      </div>
    </div>
    <a-button v-if="!disabled" class="rcp-add" @click="addItem"
      ><PlusOutlined />{{
        t(`ruleCenter.modal.conditionPanel.actions.${variant}`)
      }}</a-button
    >
  </section>
</template>

<style scoped lang="less">
.rule-condition-panel {
  min-height: 240px;
  padding: 20px;
  border: 1px solid var(--dm-primary-border);
  border-radius: 12px;
  background: var(--dm-primary-bg);
}
.rcp--then {
  border-color: var(--dm-success-border);
  background: var(--dm-success-bg);
}
.rcp--invalid {
  border-color: var(--dm-error);
}
.rcp-kicker {
  color: var(--dm-text-3);
  font-size: 12px;
  letter-spacing: 3px;
}
.rcp-header h3 {
  margin: 8px 0 0;
}
.rcp-logic {
  width: 170px;
}
.rcp-items {
  margin-top: 18px;
}
.rcp-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: var(--dm-bg-container);
}
.rcp-item-top {
  display: grid;
  grid-template-columns: 1.4fr 1fr 36px;
  gap: 10px;
  margin-bottom: 8px;
}
.rcp-add {
  margin-top: 4px;
}
</style>
