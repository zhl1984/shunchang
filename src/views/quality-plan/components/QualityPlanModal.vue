<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { Modal } from "ant-design-vue";
import type { FormInstance, RuleObject } from "ant-design-vue";
import { DeleteOutlined } from "@ant-design/icons-vue";

import {
  QUALITY_PLAN_SCOPE_OPTIONS,
  QUALITY_EXECUTION_MODE_OPTIONS,
  QUALITY_ASSIGNMENT_MODE_OPTIONS,
  type QualityPlan,
  type QualityPlanInput,
  type QualityPlanLevel,
} from "@/api/quality-plan";
import utils from "@/utils";

type QualityPlanModalMode = "create" | "view" | "edit";

type Props = {
  open: boolean;
  mode: QualityPlanModalMode;
  plan: QualityPlan | null;
  detailLoading: boolean;
  submitting: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "submit", value: QualityPlanInput): void;
}>();

const { t } = useI18n();
const formRef = ref<FormInstance>();
let draftLevelSequence = 0;
const formModel = ref<QualityPlanInput>(createDefaultFormModel());

const isReadonly = computed(() => props.mode === "view");
const modalTitle = computed(() => {
  if (props.mode === "view") {
    return t("qualityPlan.modal.viewTitle");
  }

  return props.mode === "edit"
    ? t("qualityPlan.modal.editTitle")
    : t("qualityPlan.modal.createTitle");
});
const submitText = computed(() =>
  props.mode === "edit"
    ? t("qualityPlan.actions.save")
    : t("qualityPlan.actions.createSubmit"),
);
// 弹窗标题和底部操作保持可见，仅让超出视口的正文区域滚动。
const modalBodyStyle = {
  maxHeight: "calc(90vh - 220px)",
  overflowX: "hidden",
  overflowY: "auto",
} as const;

/** 创建表单默认层级；首级使用初检，追加层级使用当前顺序名称。 */
function createDefaultLevel(
  name = t("qualityPlan.level.defaultName"),
): QualityPlanLevel {
  draftLevelSequence += 1;

  return {
    draftKey: `quality-plan-draft-level-${Date.now()}-${draftLevelSequence}`,
    name,
    levelOrder: 1,
    scope: "full",
    sampleRate: 100,
    executionMode: "single",
    assignmentMode: "automatic",
  };
}

/** 创建新建模式的最小表单副本，不写入 API Mock 数据。 */
function createDefaultFormModel(): QualityPlanInput {
  return {
    name: "",
    description: "",
    levels: [createDefaultLevel()],
  };
}

/** 根据父组件当前模式和详情重置表单，隔离弹窗内的临时编辑状态。 */
function resetFormModel() {
  formModel.value = props.plan
    ? utils.cloneDeep<QualityPlanInput>(props.plan)
    : createDefaultFormModel();

  formRef.value?.clearValidate();
}

/** 弹窗打开或详情切换时回填表单，关闭期间不重复覆盖用户输入。 */
watch(
  () => [props.open, props.mode, props.plan] as const,
  ([open]) => {
    if (open) {
      resetFormModel();
    }
  },
  { deep: true },
);

/** 返回抽检比例校验规则；全量检查不显示比例输入，也不参与校验。 */
function getSampleRateRules(level: QualityPlanLevel): RuleObject[] {
  if (level.scope !== "sample") {
    return [];
  }

  return [
    {
      required: true,
      validator: (_rule, value) => {
        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > 100
        ) {
          return Promise.reject(t("qualityPlan.validation.sampleRate"));
        }

        return Promise.resolve();
      },
    },
  ];
}

/** 切换检查范围并同步抽样比例，避免全量模式残留旧比例。 */
function handleScopeChange(index: number, value: unknown) {
  const level = formModel.value.levels[index];

  if (!level || (value !== "full" && value !== "sample")) {
    return;
  }

  level.scope = value;
  level.sampleRate = value === "full" ? 100 : undefined;
  formRef.value?.clearValidate(["levels", index, "sampleRate"]);
}

/** 追加一个默认层级，层级顺序直接由数组位置表达。 */
function handleAddLevel() {
  if (isReadonly.value) {
    return;
  }

  const nextLevel = formModel.value.levels.length + 1;
  formModel.value.levels.push(
    createDefaultLevel(t("qualityPlan.level.title", { level: nextLevel })),
  );
  formModel.value.levels.forEach((level, index) => {
    level.levelOrder = index + 1;
  });
}

/** 删除层级前二次确认，并保证方案始终至少保留一级。 */
function handleRemoveLevel(index: number) {
  if (isReadonly.value || formModel.value.levels.length <= 1) {
    return;
  }

  Modal.confirm({
    title: t("qualityPlan.confirm.removeLevelTitle"),
    content: t("qualityPlan.confirm.removeLevelContent", {
      level: index + 1,
    }),
    okType: "danger",
    okText: t("qualityPlan.actions.confirmDelete"),
    cancelText: t("qualityPlan.actions.cancel"),
    onOk: () => {
      formModel.value.levels.splice(index, 1);
      formModel.value.levels.forEach((level, levelIndex) => {
        level.levelOrder = levelIndex + 1;
      });
    },
  });
}

/** 关闭弹窗；提交期间保留当前表单，避免误触导致数据丢失。 */
function handleCancel() {
  if (props.submitting) {
    return;
  }

  emit("update:open", false);
}

/** 校验并提交表单副本，提交失败由父组件保留并提示当前输入。 */
async function handleSubmit() {
  if (isReadonly.value || props.submitting) {
    return;
  }

  try {
    await formRef.value?.validateFields();
  } catch {
    return;
  }

  emit("submit", utils.cloneDeep(formModel.value));
}
</script>

<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    :width="920"
    :body-style="modalBodyStyle"
    :mask-closable="!submitting"
    :keyboard="!submitting"
    :closable="!submitting"
    :destroy-on-close="true"
    @cancel="handleCancel"
    @update:open="emit('update:open', $event)"
  >
    <a-spin :spinning="detailLoading">
      <div class="quality-plan-modal-description m-b-16">
        {{ $t("qualityPlan.modal.description") }}
      </div>
      <a-form
        v-if="!detailLoading"
        ref="formRef"
        :model="formModel"
        layout="vertical"
        :disabled="isReadonly"
        :scroll-to-first-error="true"
      >
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item
              :label="$t('qualityPlan.form.name')"
              name="name"
              :rules="[
                {
                  required: true,
                  whitespace: true,
                  message: $t('qualityPlan.validation.name'),
                },
              ]"
            >
              <a-input
                v-model:value="formModel.name"
                :maxlength="50"
                :placeholder="$t('qualityPlan.form.namePlaceholder')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item
              :label="$t('qualityPlan.form.description')"
              name="description"
            >
              <a-textarea
                v-model:value="formModel.description"
                :maxlength="200"
                :rows="2"
                :placeholder="$t('qualityPlan.form.descriptionPlaceholder')"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="quality-plan-level-heading flex-between gap-12 m-b-12">
          <div>
            <div class="quality-plan-section-title">
              {{ $t("qualityPlan.form.levelsTitle") }}
            </div>
            <div class="quality-plan-section-description m-t-4">
              {{ $t("qualityPlan.form.levelsDescription") }}
            </div>
          </div>
          <a-button v-if="!isReadonly" @click="handleAddLevel">
            {{ $t("qualityPlan.actions.addLevel") }}
          </a-button>
        </div>

        <a-card
          v-for="(level, index) in formModel.levels"
          :key="level.draftKey"
          size="small"
          class="quality-plan-level-card m-b-12"
        >
          <template #title>
            {{ $t("qualityPlan.level.title", { level: index + 1 }) }}
          </template>
          <template #extra>
            <a-tooltip
              v-if="!isReadonly"
              :title="$t('qualityPlan.actions.removeLevel')"
            >
              <a-button
                type="text"
                danger
                :disabled="formModel.levels.length <= 1"
                :aria-label="$t('qualityPlan.actions.removeLevel')"
                @click="handleRemoveLevel(index)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-tooltip>
          </template>

          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item
                :label="$t('qualityPlan.form.levelName')"
                :name="['levels', index, 'name']"
                :rules="[
                  {
                    required: true,
                    whitespace: true,
                    message: $t('qualityPlan.validation.levelName'),
                  },
                ]"
              >
                <a-input
                  v-model:value="level.name"
                  :maxlength="50"
                  :placeholder="$t('qualityPlan.form.levelNamePlaceholder')"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item
                :label="$t('qualityPlan.form.scope')"
                :name="['levels', index, 'scope']"
              >
                <a-select
                  v-model:value="level.scope"
                  @change="handleScopeChange(index, $event)"
                >
                  <a-select-option
                    v-for="option in QUALITY_PLAN_SCOPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ $t(option.labelKey) }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item
                :label="$t('qualityPlan.form.sampleRate')"
                :name="['levels', index, 'sampleRate']"
                :rules="getSampleRateRules(level)"
              >
                <a-input-number
                  v-model:value="level.sampleRate"
                  class="w-full"
                  :min="1"
                  :max="100"
                  :precision="0"
                  :disabled="isReadonly || level.scope === 'full'"
                >
                  <template #addonAfter>%</template>
                </a-input-number>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item
                :label="$t('qualityPlan.form.executionMode')"
                :name="['levels', index, 'executionMode']"
              >
                <a-select v-model:value="level.executionMode" disabled>
                  <a-select-option
                    v-for="option in QUALITY_EXECUTION_MODE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ $t(option.labelKey) }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item
                :label="$t('qualityPlan.form.assignmentMode')"
                :name="['levels', index, 'assignmentMode']"
              >
                <a-select v-model:value="level.assignmentMode" disabled>
                  <a-select-option
                    v-for="option in QUALITY_ASSIGNMENT_MODE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ $t(option.labelKey) }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>
      </a-form>
    </a-spin>

    <template #footer>
      <a-button v-if="!isReadonly" :disabled="submitting" @click="handleCancel">
        {{ $t("qualityPlan.actions.cancel") }}
      </a-button>
      <a-button
        type="primary"
        :loading="submitting"
        :disabled="detailLoading"
        @click="isReadonly ? handleCancel() : handleSubmit()"
      >
        {{ isReadonly ? $t("qualityPlan.actions.close") : submitText }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.quality-plan-level-heading {
  align-items: flex-start;
}

.quality-plan-modal-description {
  color: var(--dm-text-3);
  line-height: 1.5;
}

.quality-plan-section-title {
  color: var(--dm-text);
  font-size: 0.16rem;
  font-weight: 600;
}

.quality-plan-section-description {
  color: var(--dm-text-3);
  line-height: 1.5;
}

.quality-plan-level-card :deep(.ant-card-head-title) {
  color: var(--dm-text);
}

@media (width <= 48rem) {
  .quality-plan-level-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .quality-plan-level-heading :deep(.ant-btn) {
    width: 100%;
  }
}
</style>
