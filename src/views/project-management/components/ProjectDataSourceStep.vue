<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import { useI18n } from "vue-i18n";
import { useDatasetStore } from "@/stores/dataset";
import type {
  ProjectDataSourceForm,
  ProjectModalMode,
  ProjectStepExpose,
} from "../types";
const props = defineProps<{
  mode: ProjectModalMode;
  modelValue: ProjectDataSourceForm;
  draft: import("../types").ProjectFormDraft;
}>();
const { t } = useI18n();
const datasetStore = useDatasetStore();
const formRef = ref<FormInstance>();
const form = reactive({
  ...props.modelValue,
  iterationConfig: { ...props.modelValue.iterationConfig },
});
watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, value);
    form.iterationConfig = { ...value.iterationConfig };
  },
  { deep: true },
);
const datasetOptions = computed(() =>
  datasetStore.datasets.map((item) => ({ label: item.name, value: item.id })),
);
const selectedDataset = computed(() =>
  datasetStore.datasets.find((item) => item.id === form.datasetId),
);
const batchDetail = computed(() => {
  const total = selectedDataset.value?.itemCount ?? 0;
  const batchSize = form.batchSize ?? 0;
  const batches = batchSize > 0 ? Math.ceil(total / batchSize) : 0;
  return t("projectManagement.modal.dataSource.batchDetail", {
    total,
    batches,
  });
});
const rules: Record<string, Rule[]> = {
  datasetId: [
    {
      required: true,
      message: t("projectManagement.modal.dataSource.datasetRequired"),
    },
  ],
  dataType: [
    {
      required: true,
      message: t("projectManagement.modal.dataSource.dataTypeRequired"),
    },
  ],
  batchSize: [
    {
      required: true,
      type: "integer",
      min: 1,
      message: t("projectManagement.modal.dataSource.batchSizeRequired"),
    },
  ],
  targetAccuracy: [
    {
      required: true,
      type: "integer",
      min: 1,
      max: 99,
      message: t("projectManagement.modal.dataSource.accuracyRequired"),
    },
  ],
  maxRounds: [
    {
      required: true,
      type: "integer",
      min: 1,
      message: t("projectManagement.modal.dataSource.roundsRequired"),
    },
  ],
};

/** 选择数据集后同步其数据类型，避免用户提交不匹配的组合。 */
function handleDatasetChange(datasetId: unknown): void {
  if (typeof datasetId !== "number") {
    form.dataType = "";
    return;
  }
  const dataset = datasetStore.datasets.find((item) => item.id === datasetId);
  form.dataType = dataset?.dataType ?? "";
}
/** 校验数据集、拆分数量及启用状态下的迭代参数。 */
async function validate(): Promise<void> {
  const names = form.iterationEnabled
    ? undefined
    : ["datasetId", "dataType", "batchSize"];
  await formRef.value?.validate(names);
}
/** 返回数据来源步骤的独立快照。 */
function getForm(): ProjectDataSourceForm {
  return { ...form, iterationConfig: { ...form.iterationConfig } };
}
defineExpose<ProjectStepExpose<ProjectDataSourceForm>>({ validate, getForm });
</script>
<template>
  <a-form
    ref="formRef"
    :model="form"
    :rules="rules"
    layout="vertical"
    :disabled="mode === 'view'"
  >
    <div class="pds-row">
      <a-form-item
        :label="t('projectManagement.modal.dataSource.dataset')"
        name="datasetId"
        required
      >
        <a-select
          v-model:value="form.datasetId"
          :options="datasetOptions"
          :loading="datasetStore.status === 'loading'"
          show-search
          option-filter-prop="label"
          :placeholder="
            t('projectManagement.modal.dataSource.datasetPlaceholder')
          "
          @change="handleDatasetChange"
        />
      </a-form-item>
      <a-form-item
        :label="t('projectManagement.modal.dataSource.dataType')"
        name="dataType"
        required
      >
        <span class="pds-value">
          {{
            form.dataType ||
            t("projectManagement.modal.dataSource.dataTypePlaceholder")
          }}
        </span>
      </a-form-item>
    </div>
    <div class="pds-row">
      <a-form-item
        :label="t('projectManagement.modal.dataSource.batchSize')"
        name="batchSize"
        required
      >
        <a-input-number
          v-model:value="form.batchSize"
          :min="1"
          :precision="0"
          class="pds-full"
          :placeholder="
            t('projectManagement.modal.dataSource.batchSizePlaceholder')
          "
        />
      </a-form-item>
      <a-form-item
        :label="t('projectManagement.modal.dataSource.batchDetailLabel')"
      >
        <span class="pds-value">{{ batchDetail }}</span>
      </a-form-item>
    </div>
    <div class="pds-iteration">
      <div class="pds-switch">
        <span>{{ t("projectManagement.modal.dataSource.iteration") }}</span>
        <a-switch
          v-model:checked="form.iterationEnabled"
          :disabled="mode === 'view'"
        />
      </div>
      <div v-if="form.iterationEnabled" class="pds-row">
        <a-form-item
          :label="t('projectManagement.modal.dataSource.accuracy')"
          :name="['iterationConfig', 'targetAccuracy']"
          :rules="rules.targetAccuracy"
          required
        >
          <a-input-number
            v-model:value="form.iterationConfig.targetAccuracy"
            :min="1"
            :max="100"
            :precision="0"
            class="pds-full"
            addon-after="%"
          />
        </a-form-item>
        <a-form-item
          :label="t('projectManagement.modal.dataSource.rounds')"
          :name="['iterationConfig', 'maxRounds']"
          :rules="rules.maxRounds"
          required
        >
          <a-input-number
            v-model:value="form.iterationConfig.maxRounds"
            :min="1"
            :precision="0"
            class="pds-full"
          />
        </a-form-item>
      </div>
    </div>
  </a-form>
</template>
<style scoped>
.pds-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.pds-full {
  width: 100%;
}
.pds-value {
  display: flex;
  align-items: center;
  min-height: 32px;
  color: var(--dm-text-2);
}
.pds-iteration {
  padding-top: 0;
}
.pds-switch {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  font-weight: 600;
}
</style>
