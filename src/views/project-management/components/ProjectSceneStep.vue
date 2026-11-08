<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import { useI18n } from "vue-i18n";
import { getScenarioDetailApi, type Scenario } from "@/api/scenario";
import { useAnnotationTypeStore } from "@/stores/annotation-type";
import { useScenarioStore } from "@/stores/scenario";
import type {
  ProjectModalMode,
  ProjectSceneForm,
  ProjectStepExpose,
} from "../types";
const props = defineProps<{
  mode: ProjectModalMode;
  modelValue: ProjectSceneForm;
  draft: import("../types").ProjectFormDraft;
}>();
const { t } = useI18n();
const annotationTypeStore = useAnnotationTypeStore();
const scenarioStore = useScenarioStore();
const formRef = ref<FormInstance>();
const scenarioDetail = ref<Scenario | null>(null);
const scenarioDetailLoading = ref(false);
const form = reactive({ ...props.modelValue });
watch(
  () => props.modelValue,
  (value) => Object.assign(form, value),
  { deep: true },
);
const rules: Record<string, Rule[]> = {
  annotationTypeId: [
    {
      required: true,
      message: t("projectManagement.modal.scene.typeRequired"),
    },
  ],
  sceneId: [
    {
      required: true,
      message: t("projectManagement.modal.scene.sceneRequired"),
    },
  ],
};
const annotationTypeOptions = computed(() =>
  annotationTypeStore.annotationTypes.map((item) => ({
    label: item.annotationTypeName,
    value: item.annotationTypeId,
  })),
);
const sceneOptions = computed(() =>
  scenarioStore.scenarios
    .filter((item) => item.annotationTypeId === form.annotationTypeId)
    .map((item) => ({ label: item.sceneName, value: item.sceneId })),
);

/** 切换标注类型时清空场景，防止保留不匹配的场景 ID。 */
function handleAnnotationTypeChange(): void {
  form.sceneId = undefined;
  formRef.value?.clearValidate("sceneId");
}
/** 根据当前场景加载详情，展示其标签、规则和质量方案。 */
async function loadScenarioDetail(sceneId: number | undefined): Promise<void> {
  scenarioDetail.value = null;
  if (sceneId === undefined) return;
  scenarioDetailLoading.value = true;
  try {
    scenarioDetail.value = await getScenarioDetailApi(String(sceneId));
  } catch {
    message.error(t("projectManagement.modal.scene.detailLoadFailed"));
  } finally {
    scenarioDetailLoading.value = false;
  }
}
/** 校验标注类型与标注场景必填项。 */
async function validate(): Promise<void> {
  await formRef.value?.validate();
}
/** 返回标注场景步骤的独立快照。 */
function getForm(): ProjectSceneForm {
  return { ...form };
}
defineExpose<ProjectStepExpose<ProjectSceneForm>>({ validate, getForm });
watch(() => form.sceneId, loadScenarioDetail, { immediate: true });
</script>
<template>
  <a-form
    ref="formRef"
    :model="form"
    :rules="rules"
    layout="vertical"
    :disabled="mode === 'view'"
  >
    <a-form-item
      :label="t('projectManagement.modal.scene.type')"
      name="annotationTypeId"
      required
    >
      <a-select
        v-model:value="form.annotationTypeId"
        :options="annotationTypeOptions"
        :loading="annotationTypeStore.status === 'loading'"
        show-search
        option-filter-prop="label"
        :placeholder="t('projectManagement.modal.scene.typePlaceholder')"
        @change="handleAnnotationTypeChange"
      />
    </a-form-item>
    <a-form-item
      :label="t('projectManagement.modal.scene.scene')"
      name="sceneId"
      required
    >
      <a-select
        v-model:value="form.sceneId"
        :options="sceneOptions"
        :loading="scenarioStore.status === 'loading'"
        :disabled="mode === 'view' || form.annotationTypeId === null"
        show-search
        option-filter-prop="label"
        :placeholder="t('projectManagement.modal.scene.scenePlaceholder')"
      />
    </a-form-item>
    <a-spin :spinning="scenarioDetailLoading">
      <section v-if="scenarioDetail" class="scene-detail">
        <h3 class="font-md">{{ scenarioDetail.sceneName }}</h3>
        <p class="font-sm">
          {{
            scenarioDetail.sceneDesc ||
            t("projectManagement.modal.scene.detailEmpty")
          }}
        </p>
        <div class="scene-detail-group">
          <div class="scene-detail-label">
            {{ t("projectManagement.modal.scene.labels") }}
          </div>
          <div class="scene-detail-wrap">
            <a-tag
              v-for="item in scenarioDetail.labelModelMappings"
              :key="item.labelId"
              color="blue"
            >
              {{ item.labelName }}
            </a-tag>
            <em v-if="!scenarioDetail.labelModelMappings.length">
              {{ t("projectManagement.modal.scene.detailEmpty") }}
            </em>
          </div>
        </div>
        <div class="scene-detail-group">
          <div class="scene-detail-label">
            {{ t("projectManagement.modal.scene.rules") }}
          </div>
          <div class="scene-detail-wrap">
            <a-tag
              v-for="item in scenarioDetail.ruleMappings ?? []"
              :key="item.id"
              color="green"
            >
              {{ item.ruleName }}
            </a-tag>
            <em v-if="!(scenarioDetail.ruleMappings ?? []).length">
              {{ t("projectManagement.modal.scene.detailEmpty") }}
            </em>
          </div>
        </div>
        <div class="scene-detail-group">
          <div class="scene-detail-label">
            {{ t("projectManagement.modal.scene.qualityPlan") }}
          </div>
          <div class="scene-detail-wrap">
            <a-tag color="orange">{{ scenarioDetail.qualityPlanName }}</a-tag>
          </div>
        </div>
      </section>
    </a-spin>
  </a-form>
</template>
<style scoped>
.scene-detail {
  min-height: 3em;
  padding: 16px;
  border-radius: 8px;
  background: var(--dm-bg-layout);
}
.scene-detail h3 {
  margin-bottom: 4px;
  font-weight: bold;
}
.scene-detail p {
  margin-bottom: 10px;
  color: var(--dm-text-3);
}
.scene-detail-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
}
.scene-detail-group .scene-detail-label {
  flex-basis: 80px;
  font-size: 0.14rem;
  line-height: 22px;
  color: var(--dm-text-2);
}
.scene-detail-group .scene-detail-wrap {
  flex: 1;
}
.scene-detail-group .scene-detail-wrap > :deep(.ant-tag) {
  margin: 2px 4px;
  border-radius: 4px;
}
.scene-detail-group em {
  color: var(--dm-text-3);
  font-size: 12px;
  font-style: normal;
}
</style>
