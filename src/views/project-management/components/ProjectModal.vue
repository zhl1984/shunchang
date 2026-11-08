<script setup lang="ts">
import { computed, reactive, ref, watch, type Component } from "vue";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import { createProjectApi, getProjectDetailApi } from "@/api/project";
import { fromProjectDetail, toCreateProjectParams } from "../utils";
import type {
  ProjectFormDraft,
  ProjectModalMode,
  ProjectStepKey,
  ProjectStepExpose,
} from "../types";
import ProjectBasicInfoStep from "./ProjectBasicInfoStep.vue";
import ProjectSceneStep from "./ProjectSceneStep.vue";
import ProjectMemberStep from "./ProjectMemberStep.vue";
import ProjectDataSourceStep from "./ProjectDataSourceStep.vue";

const props = defineProps<{
  open: boolean;
  mode: ProjectModalMode;
  projectCode?: string;
}>();
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "created", value: ReturnType<typeof toCreateProjectParams>): void;
}>();
const steps = [
  {
    key: "basic",
    titleKey: "projectManagement.modal.steps.basic",
    component: ProjectBasicInfoStep,
  },
  {
    key: "scene",
    titleKey: "projectManagement.modal.steps.scene",
    component: ProjectSceneStep,
  },
  {
    key: "members",
    titleKey: "projectManagement.modal.steps.members",
    component: ProjectMemberStep,
  },
  {
    key: "dataSource",
    titleKey: "projectManagement.modal.steps.dataSource",
    component: ProjectDataSourceStep,
  },
] as const;
const emptyDraft = (): ProjectFormDraft => ({
  basic: {
    projectName: "",
    projectDesc: "",
    ownerUserId: undefined,
    deadline: "",
  },
  scene: { annotationTypeId: undefined, sceneId: undefined },
  members: { annotatorUserIds: [], qualityUserIds: {} },
  dataSource: {
    datasetId: undefined,
    dataType: "",
    batchSize: undefined,
    iterationEnabled: false,
    iterationConfig: { targetAccuracy: undefined, maxRounds: undefined },
  },
});
const currentStep = ref<ProjectStepKey>("basic");
const draft = reactive<ProjectFormDraft>(emptyDraft());
const loading = ref(false);
const submitting = ref(false);
const sessionKey = ref(0);
const stepRef = ref<ProjectStepExpose<unknown> | null>(null);
const currentIndex = computed(() =>
  steps.findIndex((step) => step.key === currentStep.value),
);
const currentConfig = computed(() => steps[currentIndex.value]);
const currentComponent = computed<Component>(
  () => currentConfig.value.component,
);
const isView = computed(() => props.mode === "view");
const { t } = useI18n();

/** 将详情加载结果重置为四段草稿，并从第一步开始展示。 */
async function loadDetail() {
  if (!isView.value || !props.projectCode) return;
  loading.value = true;
  try {
    Object.assign(
      draft,
      fromProjectDetail(await getProjectDetailApi(props.projectCode)),
    );
    currentStep.value = "basic";
  } catch (error) {
    message.error(
      error instanceof Error
        ? error.message
        : t("projectManagement.feedback.detailFailed"),
    );
  } finally {
    loading.value = false;
  }
}
/** 清理弹窗会话，递增 key 使 KeepAlive 缓存失效。 */
function reset() {
  Object.assign(draft, emptyDraft());
  currentStep.value = "basic";
  sessionKey.value += 1;
  loading.value = false;
}
/** 关闭弹窗并销毁本次会话状态。 */
function handleClose() {
  emit("update:open", false);
  reset();
}
/** 查看模式允许直接跳转，新建模式只能顺序导航。 */
function handleStepClick(key: ProjectStepKey) {
  if (isView.value) currentStep.value = key;
}
/** 校验当前步骤并保存快照，校验失败时保持原步骤。 */
async function handleNext() {
  if (isView.value) {
    if (currentIndex.value < steps.length - 1)
      currentStep.value = steps[currentIndex.value + 1].key;
    return;
  }
  try {
    await stepRef.value?.validate();
  } catch {
    return;
  }
  const key = currentStep.value;
  draft[key] = stepRef.value?.getForm() as never;
  if (currentIndex.value < steps.length - 1)
    currentStep.value = steps[currentIndex.value + 1].key;
  else {
    submitting.value = true;
    try {
      await createProjectApi(toCreateProjectParams(draft));
      message.success(t("projectManagement.feedback.createSuccess"));
      emit("created", toCreateProjectParams(draft));
      handleClose();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t("projectManagement.feedback.createFailed"),
      );
    } finally {
      submitting.value = false;
    }
  }
}
/** 返回上一步，不触发校验或快照采集。 */
function handlePrevious() {
  if (currentIndex.value > 0)
    currentStep.value = steps[currentIndex.value - 1].key;
}
watch(
  () => props.open,
  (value) => {
    if (value) {
      reset();
      void loadDetail();
    }
  },
);
</script>
<template>
  <a-modal
    class="pm-dialog"
    wrap-class-name="form-modal"
    :open="open"
    :width="800"
    :mask-closable="!submitting"
    :keyboard="!submitting"
    :closable="!submitting"
    @cancel="handleClose"
  >
    <template #title>
      <DmAppFormHeader class="pm-header" mode="create">
        <template #title>{{
          mode === "create"
            ? t("projectManagement.modal.title.create")
            : t("projectManagement.modal.title.view")
        }}</template>
        <template #subtitle>{{
          t("projectManagement.modal.subtitle", {
            current: currentIndex + 1,
            total: steps.length,
            step: t(currentConfig.titleKey),
          })
        }}</template>
      </DmAppFormHeader>
    </template>
    <div class="pm-body">
      <div class="pm-steps">
        <a-steps
          :current="currentIndex"
          size="small"
          :items="steps.map((step) => ({ title: t(step.titleKey) }))"
          @change="(index) => handleStepClick(steps[index].key)"
        />
      </div>
      <a-spin :spinning="loading">
        <div class="pm-content">
          <KeepAlive :key="sessionKey">
            <component
              :is="currentComponent"
              ref="stepRef"
              v-model="draft[currentStep]"
              :mode="mode"
              :draft="draft"
            />
          </KeepAlive>
        </div>
      </a-spin>
    </div>
    <template #footer
      ><div class="pm-footer">
        <a-button
          v-if="currentIndex > 0"
          :disabled="submitting"
          @click="handlePrevious"
        >
          {{ t("projectManagement.modal.actions.previous") }}
        </a-button>
        <a-button
          v-if="currentIndex < steps.length - 1"
          type="primary"
          :disabled="submitting"
          @click="handleNext"
        >
          {{ t("projectManagement.modal.actions.next") }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="submitting"
          @click="isView ? handleClose() : handleNext()"
        >
          {{
            isView
              ? t("projectManagement.modal.actions.close")
              : t("projectManagement.modal.actions.create")
          }}
        </a-button>
      </div></template
    >
  </a-modal>
</template>
<style scoped>
.pm-body {
  position: relative;
}
.pm-steps {
  padding: 0 0 24px 0;
}
.pm-content {
  height: 400px;
  overflow: auto;
}
.pm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
