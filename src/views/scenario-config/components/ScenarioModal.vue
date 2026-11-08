<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance } from "ant-design-vue";
import { message } from "ant-design-vue";
import {
  createScenarioApi,
  updateScenarioApi,
  type Scenario,
} from "@/api/scenario";
import utils from "@/utils";
import {
  createCopyScenarioDraft,
  createScenarioDraft,
  validateScenarioDraft,
  toScenarioInput,
  type ScenarioDraft,
  type ScenarioModalMode,
} from "../scenario-form";
import { useQualityPlanStore } from "@/stores/quality-plan";
import { useAnnotationTypeStore } from "@/stores/annotation-type";
import ScenarioLabelSelector from "./ScenarioLabelSelector.vue";
import ScenarioRuleSelector from "./ScenarioRuleSelector.vue";

const props = defineProps<{
  open: boolean;
  mode: ScenarioModalMode;
  scenario: Scenario | null;
}>();
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "saved"): void;
}>();
const { t } = useI18n();
const qualityPlanStore = useQualityPlanStore();
const annotationTypeStore = useAnnotationTypeStore();
const formRef = ref<FormInstance>();
const draft = ref<ScenarioDraft>(createScenarioDraft());
const submitting = ref(false);
const isReadonly = computed(() => props.mode === "view");
const selectedLabelIds = computed(() =>
  draft.value.labelModels.map((item) => item.labelId),
);
const title = computed(() => `scenarioConfig.modal.title.${props.mode}`);
const formHeaderMode = computed(() => {
  if (props.mode === "view") return "read" as const;
  if (props.mode === "edit" || props.mode === "copy") return "update" as const;
  return "create" as const;
});
const submitText = computed(() =>
  props.mode === "edit"
    ? "scenarioConfig.modal.actions.save"
    : "scenarioConfig.modal.actions.create",
);

watch(
  () => [props.open, props.mode, props.scenario] as const,
  ([open]) => {
    if (!open) return;
    draft.value =
      props.mode === "copy" && props.scenario
        ? createCopyScenarioDraft(
            props.scenario,
            t("scenarioConfig.copySuffix"),
          )
        : createScenarioDraft(props.scenario ?? undefined);
  },
  { deep: true },
);

/** 校验完整草稿并向页面提交隔离副本。 */
async function handleSubmit(): Promise<void> {
  if (isReadonly.value) {
    emit("update:open", false);
    return;
  }
  try {
    await formRef.value?.validateFields();
  } catch {
    return;
  }
  if (validateScenarioDraft(draft.value).length) return;
  submitting.value = true;
  try {
    const input = toScenarioInput(utils.cloneDeep(draft.value));
    // 编辑替换当前场景，新增和复制均创建新记录。
    if (props.mode === "edit" && props.scenario) {
      await updateScenarioApi(String(props.scenario.sceneId), input);
    } else {
      await createScenarioApi(input);
    }
    message.success(t("scenarioConfig.feedback.saved"));
    emit("saved");
    emit("update:open", false);
  } catch {
    message.error(t("scenarioConfig.feedback.saveFailed"));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :width="980"
    wrap-class-name="form-modal"
    :mask-closable="!submitting"
    :keyboard="!submitting"
    :closable="!submitting"
    :destroy-on-close="true"
    @cancel="emit('update:open', false)"
  >
    <template #title>
      <DmAppFormHeader :mode="formHeaderMode">
        <template #title>{{ $t(title) }}</template>
        <template #subtitle>{{ $t("scenarioConfig.modal.subtitle") }}</template>
      </DmAppFormHeader>
    </template>

    <a-form
      ref="formRef"
      :model="draft"
      layout="vertical"
      :disabled="isReadonly"
    >
      <section class="scm-section">
        <h3>{{ $t("scenarioConfig.modal.basic.title") }}</h3>
        <a-row :gutter="24" justify="space-between">
          <a-col :span="12"
            ><a-form-item
              name="sceneName"
              :label="$t('scenarioConfig.modal.basic.name')"
              :rules="[
                {
                  required: true,
                  whitespace: true,
                  message: $t('scenarioConfig.modal.validation.name'),
                },
              ]"
              ><a-input v-model:value="draft.sceneName" /></a-form-item
          ></a-col>
          <a-col :span="12"
            ><a-form-item
              name="annotationTypeId"
              :label="$t('scenarioConfig.modal.basic.labelingType')"
              required
              ><a-select
                v-model:value="draft.annotationTypeId"
                :loading="annotationTypeStore.status === 'loading'"
                ><a-select-option
                  v-for="item in annotationTypeStore.annotationTypes"
                  :key="item.annotationTypeId"
                  :value="item.annotationTypeId"
                  >{{ item.annotationTypeName }}</a-select-option
                ></a-select
              ></a-form-item
            ></a-col
          >
        </a-row>
        <a-form-item :label="$t('scenarioConfig.modal.basic.description')"
          ><a-textarea v-model:value="draft.sceneDesc" :rows="3"
        /></a-form-item>
      </section>
      <section class="scm-section">
        <ScenarioLabelSelector
          v-model:labels="draft.labelModels"
          :readonly="isReadonly"
        />
      </section>
      <section class="scm-section">
        <ScenarioRuleSelector
          v-model:value="draft.ruleMappings"
          :selected-label-ids="selectedLabelIds"
          :readonly="isReadonly"
        />
      </section>
      <section class="scm-section">
        <h3>{{ $t("scenarioConfig.modal.quality.title") }}</h3>
        <a-form-item
          name="qualityPlanId"
          :label="$t('scenarioConfig.modal.quality.field')"
          :rules="[
            {
              required: true,
              message: $t('scenarioConfig.modal.validation.quality'),
            },
          ]"
          ><a-select
            v-model:value="draft.qualityPlanId"
            :loading="qualityPlanStore.status === 'loading'"
            ><a-select-option
              v-for="plan in qualityPlanStore.qualityPlans"
              :key="plan.id"
              :value="plan.id"
              >{{ plan.name }}</a-select-option
            ></a-select
          ></a-form-item
        >
      </section>
    </a-form>
    <template #footer
      ><a-button
        v-if="!isReadonly"
        :disabled="submitting"
        @click="emit('update:open', false)"
        >{{ $t("scenarioConfig.modal.actions.cancel") }}</a-button
      ><a-button type="primary" :loading="submitting" @click="handleSubmit">{{
        $t(isReadonly ? "scenarioConfig.modal.actions.close" : submitText)
      }}</a-button></template
    >
  </a-modal>
</template>

<style scoped lang="less">
.scm-section {
  padding: 18px;
  margin-bottom: 14px;
  border: 1px solid var(--dm-border-2);
  border-radius: 12px;
}
.scm-section h3 {
  margin: 0 0 16px;
  color: var(--dm-text);
}
</style>
