<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import {
  createRuleApi,
  updateRuleApi,
  type Rule,
  type RuleInput,
  type RuleType,
} from "@/api/rule";
import { getLabelDetailApi, type LabelAttribute } from "@/api/label";
import { useLabelStore } from "@/stores/label";
import { deepMap } from "@/utils/tree";
import RuleConditionPanel from "./RuleConditionPanel.vue";
import {
  createConditionGroup,
  createConditionGroupFromRule,
  isConditionGroupValid,
  type ConditionFormGroup,
} from "./rule-condition-panel";

export type RuleModalMode = "create" | "view" | "edit";
const props = defineProps<{
  open: boolean;
  mode: RuleModalMode;
  rule?: Rule;
  loading?: boolean;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
}>();
const { t } = useI18n();
const labelStore = useLabelStore();
const properties = ref<LabelAttribute[]>([]);
const whileGroup = ref<ConditionFormGroup>(createConditionGroup());
const thenGroup = ref<ConditionFormGroup>(createConditionGroup());
const whileInvalid = ref(false);
const thenInvalid = ref(false);
const submitting = ref(false);
const formRef = ref();
const labelTreeRenderKey = ref(0);
const defaultExpandedLabelKeys = ref<Array<string | number>>([]);
const form = reactive({
  ruleName: "",
  ruleType: "WHILE_THEN" as RuleType,
  ruleDescription: "",
  labelId: undefined as string | number | undefined,
});
const readonly = computed(() => props.mode === "view");
const title = computed(() => t(`ruleCenter.modal.${props.mode}.title`));
const selectedLabelKeys = computed<(string | number)[]>({
  get: () => (form.labelId === undefined ? [] : [form.labelId]),
  set: (keys) => {
    void handleLabelChange(keys[0]);
  },
});
const selectLabelNode = computed(() => {
  return form.labelId ? labelStore.mapping.get(form.labelId) : null;
});

const treeData = computed(() =>
  deepMap(labelStore.tree, (node) => ({
    ...node,
    key: node.id,
    title: node.nodeName,
    selectable: node.nodeType === "LABEL",
    disabled: node.nodeType === "GROUP",
    // 查看模式下用样式来实现选中
    class:
      readonly.value && node.id === form.labelId
        ? "rcm-label-tree-node--selected"
        : "",
  })),
);

async function resetForm(): Promise<void> {
  form.ruleName = props.rule?.ruleName ?? "";
  form.ruleType = props.rule?.ruleType ?? "WHILE_THEN";
  form.ruleDescription = props.rule?.ruleDescription ?? "";
  form.labelId = props.rule?.labelId;
  labelTreeRenderKey.value += 1;
  whileInvalid.value = false;
  thenInvalid.value = false;

  if (!props.rule) {
    defaultExpandedLabelKeys.value = [];
    properties.value = [];
    whileGroup.value = createConditionGroup();
    thenGroup.value = createConditionGroup();
    return;
  }

  const labelPath = labelStore.mapping.get(props.rule.labelId)?.path ?? [];
  defaultExpandedLabelKeys.value = labelPath.slice(0, -1);
  properties.value = (await getLabelDetailApi(props.rule.labelId)).attributes;
  thenGroup.value = createConditionGroupFromRule(
    props.rule.ruleContent.then,
    properties.value,
  );
  whileGroup.value =
    props.rule.ruleType === "WHILE_THEN" && props.rule.ruleContent.while
      ? createConditionGroupFromRule(
          props.rule.ruleContent.while,
          properties.value,
        )
      : createConditionGroup();
}

function handleCancel(): void {
  emit("update:open", false);
}

/** 切换标签后重新加载属性并重置条件与约束。 */
async function handleLabelChange(labelId?: string | number): Promise<void> {
  form.labelId = labelId;
  whileGroup.value = createConditionGroup();
  thenGroup.value = createConditionGroup();
  if (labelId === undefined) {
    properties.value = [];
    return;
  }
  properties.value = (await getLabelDetailApi(Number(labelId))).attributes;
}

/** 保存前校验可见面板至少存在一条完整条件。 */
function toApiConditionGroup(group: ConditionFormGroup) {
  return {
    logic: group.logic,
    conditions: group.conditions.map((item) => ({
      labelAttributeId: Number(item.labelAttributeId),
      operator: item.operator,
      value: normalizeSubmitValue(item.valueModel?.value),
    })),
  };
}

/** 将表单控件值还原为后端条件值，布尔字符串必须转换为布尔类型。 */
function normalizeSubmitValue(
  value: unknown,
): string | number | boolean | Array<string | number | boolean> {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === "true" ? true : item === "false" ? false : item,
    );
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value as string | number | boolean;
}

/** 校验并提交新增或编辑规则，成功后通知页面刷新列表。 */
async function handleSubmit(): Promise<void> {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  whileInvalid.value =
    form.ruleType === "WHILE_THEN" && !isConditionGroupValid(whileGroup.value);
  thenInvalid.value = !isConditionGroupValid(thenGroup.value);
  if (whileInvalid.value || thenInvalid.value || form.labelId === undefined)
    return;

  const input: RuleInput = {
    ruleName: form.ruleName.trim(),
    ruleType: form.ruleType,
    labelId: Number(form.labelId),
    ruleDescription: form.ruleDescription.trim() || null,
    ruleContent: {
      then: toApiConditionGroup(thenGroup.value),
      ...(form.ruleType === "WHILE_THEN"
        ? { while: toApiConditionGroup(whileGroup.value) }
        : {}),
    },
  };
  submitting.value = true;
  try {
    if (props.mode === "edit" && props.rule) {
      const response = await updateRuleApi(props.rule.id, input);
      if (response.code !== "0") throw new Error(response.message);
    } else {
      const response = await createRuleApi(input);
      if (response.code !== "0") throw new Error(response.message);
    }
    emit("saved");
    emit("update:open", false);
  } catch (error: unknown) {
    message.error(
      error instanceof Error
        ? error.message
        : t("ruleCenter.feedback.saveFailed"),
    );
  } finally {
    submitting.value = false;
  }
}

watch(
  [() => props.open, () => props.rule],
  ([open]) => {
    if (open) void resetForm();
  },
  { immediate: true },
);
</script>

<template>
  <a-modal
    :open="open"
    :width="1040"
    :footer="readonly ? null : undefined"
    :confirm-loading="submitting"
    :cancel-text="t('ruleCenter.modal.actions.cancel')"
    :ok-text="t('ruleCenter.modal.actions.save')"
    wrap-class-name="rule-center-modal"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <template #title>
      <div class="rcm-title">{{ title }}</div>
    </template>
    <a-spin :spinning="loading">
      <p class="rcm-description">{{ t("ruleCenter.modal.description") }}</p>

      <div class="rcm-top-grid">
        <a-card class="rcm-basic-card" :bordered="false">
          <a-form ref="formRef" :model="form" layout="vertical">
            <a-form-item :label="t('ruleCenter.modal.fields.name')" name="ruleName" :rules="[{ required: true, whitespace: true, message: t('ruleCenter.modal.validation.name') }]">
              <a-input
                v-model:value="form.ruleName"
                :disabled="readonly"
                :placeholder="t('ruleCenter.modal.placeholders.name')"
              />
            </a-form-item>
            <a-form-item :label="t('ruleCenter.modal.fields.type')">
              <a-select
                v-model:value="form.ruleType"
                :disabled="readonly"
                :placeholder="t('ruleCenter.modal.placeholders.type')"
              >
                <a-select-option value="WHILE_THEN">{{
                  t("ruleCenter.modal.types.while")
                }}</a-select-option>
                <a-select-option value="THEN">{{
                  t("ruleCenter.modal.types.then")
                }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="t('ruleCenter.modal.fields.description')">
              <a-textarea
                v-model:value="form.ruleDescription"
                :disabled="readonly"
                :rows="4"
                :placeholder="t('ruleCenter.modal.placeholders.description')"
              />
            </a-form-item>
          </a-form>
        </a-card>

        <a-card class="rcm-label-card" :bordered="false">
          <div class="rcm-label-heading flex-between">
            <div>
              <strong>{{ t("ruleCenter.modal.label.title") }}</strong>
              <p>{{ t("ruleCenter.modal.label.description") }}</p>
            </div>
            <a-tag v-if="form.labelId !== undefined" color="blue">{{
              selectLabelNode?.nodeName
            }}</a-tag>
          </div>
          <a-tree
            :key="labelTreeRenderKey"
            v-model:selected-keys="selectedLabelKeys"
            class="rcm-label-tree"
            :default-expanded-keys="defaultExpandedLabelKeys"
            :tree-data="treeData"
            :show-line="false"
            :selectable="true"
            :disabled="readonly"
            block-node
            @select="
              (keys) => {
                if (!readonly)
                  handleLabelChange(keys[0] as string | number | undefined);
              }
            "
          />
        </a-card>
      </div>

      <div
        class="rcm-rule-placeholder"
        :class="{ 'rcm-rule-placeholder--then': form.ruleType === 'THEN' }"
      >
        <RuleConditionPanel
          v-show="form.ruleType === 'WHILE_THEN'"
          v-model="whileGroup"
          variant="while"
          :properties="properties"
          :disabled="readonly"
          :invalid="whileInvalid"
        />
        <span class="rcm-arrow">→</span>
        <RuleConditionPanel
          v-model="thenGroup"
          variant="then"
          :properties="properties"
          :disabled="readonly"
          :invalid="thenInvalid"
        />
      </div>
    </a-spin>
  </a-modal>
</template>

<style scoped lang="less">
.rcm-title {
  color: var(--dm-text);
  font-size: 20px;
  font-weight: 600;
}
.rcm-description {
  color: var(--dm-text-3);
}
.rcm-top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.rcm-basic-card,
.rcm-label-card {
  min-height: 360px;
  border: 1px solid var(--dm-border-2);
  background: var(--dm-bg-container);
}
.rcm-label-heading p {
  margin: 6px 0 14px;
  color: var(--dm-text-3);
}
:deep(.rcm-label-tree) .ant-tree-treenode {
  height: 32px;
  .ant-tree-switcher {
    line-height: 32px;
  }
  .ant-tree-title {
    color: var(--dm-text-2);
    line-height: 32px;
  }
  .ant-tree-node-content-wrapper-normal .ant-tree-title {
    padding-left: 10px;
  }
}
:global(
  .rule-center-modal
    .rcm-label-tree-node--selected
    .ant-tree-node-content-wrapper
) {
  // color: var(--dm-primary);
  background: var(--dm-primary-bg) !important;
}
.rcm-rule-placeholder {
  display: grid;
  grid-template-columns: 1fr 36px 1fr;
  gap: 12px;
  align-items: center;
  margin-top: 18px;
}
.rcm-rule-placeholder--then {
  grid-template-columns: 1fr;
  .rcm-arrow {
    display: none;
  }
}
.rcm-arrow {
  color: var(--dm-primary);
  font-size: 28px;
  text-align: center;
}
:global(.rule-center-modal .ant-modal-body) {
  max-height: calc(100vh - 158px);
  overflow-y: auto;
}
:global(.rule-center-modal .ant-modal) {
  top: 24px;
  padding-bottom: 24px;
}
@media (width <= 48rem) {
  .rcm-top-grid,
  .rcm-rule-placeholder {
    grid-template-columns: 1fr;
  }
  .rcm-arrow {
    transform: rotate(90deg);
  }
}
</style>
