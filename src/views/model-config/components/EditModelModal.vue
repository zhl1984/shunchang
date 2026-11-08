<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons-vue";
import type { ModelRecord } from "@/views/model-config/types";
import {
  getLabelTreeNodeListApi,
  type LabelTreeNode as BackendLabelTreeNode,
} from "@/api/label";
import { getAssociatedModelLabelIdsApi } from "@/api/model-config";

type LabelTreeNode = {
  children?: LabelTreeNode[];
  disabled?: boolean;
  key: number;
  selectable?: boolean;
  title: string;
};

export interface EditOutputLabel {
  code: string;
  locked: boolean;
  platformLabelId?: number;
  related: string;
}

export interface EditModelForm {
  apiKey: string;
  endpoint: string;
  labels: EditOutputLabel[];
  name: string;
  purpose: string;
  supportsIteration: boolean;
}

const props = defineProps<{
  model: ModelRecord | null;
  open: boolean;
  submitting?: boolean;
  readonly?: boolean;
}>();
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "submit", value: EditModelForm): void;
}>();
const { t } = useI18n();
const form = reactive<EditModelForm>({
  apiKey: "",
  endpoint: "",
  labels: [],
  name: "",
  purpose: "",
  supportsIteration: false,
});
const modalBodyStyle = {
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
  paddingRight: "8px",
} as const;
const expandedLabelIndex = ref<number | null>(null);
const labelTreeData = ref<LabelTreeNode[]>([]);
const rawLabelTreeData = ref<BackendLabelTreeNode[]>([]);
const labelTreeLoading = ref(false);
const associatedLabelIds = ref<number[]>([]);
const modalTitle = computed(() =>
  props.readonly ? t("modelConfig.editModal.viewTitle") : t("modelConfig.editModal.title"),
);
const modalDescription = computed(() =>
  props.readonly
    ? t("modelConfig.editModal.viewDescription")
    : t("modelConfig.editModal.description"),
);

function mapLabelTreeNode(node: BackendLabelTreeNode): LabelTreeNode {
  return {
    children: node.children?.map(mapLabelTreeNode),
    disabled:
      node.nodeType === "LABEL" &&
      (associatedLabelIds.value.includes(node.id) ||
        form.labels.some((label) => label.platformLabelId === node.id)),
    key: node.id,
    selectable: node.nodeType === "LABEL",
    title: node.nodeName,
  };
}

async function loadLabelTree(): Promise<void> {
  labelTreeLoading.value = true;
  try {
    const [response, usedLabelIds] = await Promise.all([
      getLabelTreeNodeListApi(),
      getAssociatedModelLabelIdsApi(),
    ]);
    associatedLabelIds.value = Array.isArray(usedLabelIds) ? usedLabelIds : [];
    rawLabelTreeData.value = response ?? [];
    labelTreeData.value = rawLabelTreeData.value.map(mapLabelTreeNode);
  } catch (error: unknown) {
    labelTreeData.value = [];
    const errorMessage = error instanceof Error ? error.message : "";
    message.error(errorMessage || t("modelConfig.feedback.labelTreeFailed"));
  } finally {
    labelTreeLoading.value = false;
  }
}

/** 打开弹窗时根据模型卡片数据初始化表单，API 密钥始终保持空白。 */
function handleOpenChange(open: boolean): void {
  if (open && props.model) {
    Object.assign(form, {
      apiKey: props.model.apiKey,
      endpoint: props.model.endpoint,
      labels: props.model.labels.map((label) => ({
        code: label.outputLabelName,
        locked: true,
        platformLabelId: label.platformLabelId,
        related: label.platformLabelName,
      })),
      name: props.model.name,
      purpose: props.model.description,
      supportsIteration: props.model.selfIterationEnabled,
    });
    expandedLabelIndex.value = null;
    void loadLabelTree();
  }
}

watch(() => props.open, handleOpenChange);

/** 新增一行允许填写编码的模型输出标签。 */
function handleAddLabel(): void {
  form.labels.push({ code: "", locked: false, related: "" });
}

/** 删除当前模型输出标签行。 */
function handleRemoveLabel(index: number): void {
  form.labels.splice(index, 1);
}

/** 切换编辑模型的自迭代开启状态。 */
function handleToggleIteration(): void {
  form.supportsIteration = !form.supportsIteration;
}

function handleToggleLabelTree(index: number): void {
  expandedLabelIndex.value = expandedLabelIndex.value === index ? null : index;
}

function handleSelectLabel(
  index: number,
  _keys: (number | string)[],
  info: { node: LabelTreeNode },
): void {
  if (
    info.node.disabled ||
    info.node.children?.length ||
    info.node.selectable === false
  )
    return;
  form.labels[index].related = info.node.title;
  form.labels[index].platformLabelId = info.node.key;
  labelTreeData.value = rawLabelTreeData.value.map(mapLabelTreeNode);
  expandedLabelIndex.value = null;
}

/** 提交表单副本，避免父组件持有可被继续修改的响应式对象。 */
function handleSubmit(): void {
  emit("submit", {
    ...form,
    labels: form.labels.map((label) => ({ ...label })),
  });
}

/** 关闭弹窗且不提交本次修改。 */
function handleCancel(): void {
  emit("update:open", false);
}
</script>

<template>
  <a-modal
    :open="props.open"
    :confirm-loading="props.submitting"
    :body-style="modalBodyStyle"
    width="800px"
    centered
    destroy-on-close
    @update:open="handleOpenChange"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <template #title>
      <div class="modal-heading">
        <span class="modal-heading__icon"><EditOutlined /></span>
        <div class="modal-heading__copy">
          <div class="modal-heading__title">
            {{ modalTitle }}
          </div>
          <div class="modal-heading__description">
            {{ modalDescription }}
          </div>
        </div>
      </div>
    </template>
    <a-form :model="form" layout="vertical" class="edit-form">
      <a-form-item
        :label="t('modelConfig.connectModal.name')"
        class="form-half"
        required
      >
        <a-input :value="form.name" size="large" disabled />
      </a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.protocol')"
        class="form-half"
        required
      >
        <a-select
          size="large"
          disabled
          :value="t('modelConfig.connectModal.protocolValue')"
          :options="[
            {
              label: t('modelConfig.connectModal.protocolValue'),
              value: 'HTTP JSON',
            },
          ]"
        />
      </a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.purpose')"
        class="form-full"
      >
        <a-textarea
          v-model:value="form.purpose"
          :rows="3"
          :disabled="props.readonly"
        />
      </a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.endpoint')"
        class="form-full"
        required
      >
        <a-input :value="form.endpoint" size="large" disabled />
      </a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.apiKey')"
        class="form-full"
      >
        <a-input-password
          v-model:value="form.apiKey"
          size="large"
          :placeholder="t('modelConfig.connectModal.apiKeyPlaceholder')"
          autocomplete="new-password"
        />
      </a-form-item>

      <div class="iteration-grid form-full">
        <div class="iteration-option">
          <strong>{{ t("modelConfig.connectModal.supportsIteration") }}</strong>
          <span class="iteration-status">
            {{ t("modelConfig.connectModal.support") }}
          </span>
        </div>
        <div class="iteration-option">
          <strong>{{ t("modelConfig.connectModal.enableIteration") }}</strong>
          <a-switch
            :checked="form.supportsIteration"
            :disabled="props.readonly"
            @change="handleToggleIteration"
          />
        </div>
      </div>

      <div class="labels-section form-full">
        <div class="labels-heading">
          <div>
            <strong>{{ t("modelConfig.connectModal.outputLabels") }}</strong>
            <span>{{
              t("modelConfig.connectModal.outputLabelsDescription")
            }}</span>
          </div>
          <a-button :disabled="props.readonly" @click="handleAddLabel">
            <template #icon><PlusOutlined /></template>
            {{ t("modelConfig.connectModal.addLabel") }}
          </a-button>
        </div>

        <div
          v-for="(label, index) in form.labels"
          :key="index"
          class="label-entry"
        >
          <div class="label-row">
            <a-input
              v-model:value="label.code"
              size="large"
              :disabled="props.readonly || label.locked"
              :placeholder="t('modelConfig.connectModal.labelCode')"
            />
            <a-input
              v-model:value="label.related"
              size="large"
              :disabled="props.readonly || label.locked"
              readonly
              :placeholder="t('modelConfig.connectModal.relatedLabel')"
            />
            <a-button
              :aria-label="t('modelConfig.connectModal.relatedLabel')"
              :disabled="props.readonly || label.locked"
              @click="handleToggleLabelTree(index)"
            >
              <RightOutlined
                :class="{ expanded: expandedLabelIndex === index }"
              />
            </a-button>
            <a-button
              type="text"
              danger
              :aria-label="t('modelConfig.connectModal.deleteLabel')"
              :disabled="props.readonly"
              @click="handleRemoveLabel(index)"
            >
              <DeleteOutlined />
            </a-button>
          </div>
          <div v-if="expandedLabelIndex === index && !props.readonly" class="label-tree-panel">
            <a-spin :spinning="labelTreeLoading">
              <a-tree
                :tree-data="labelTreeData"
                default-expand-all
                block-node
                :selected-keys="
                  label.platformLabelId ? [label.platformLabelId] : []
                "
                @select="
                  (keys, info) =>
                    handleSelectLabel(
                      index,
                      keys,
                      info as { node: LabelTreeNode },
                    )
                "
              />
            </a-spin>
          </div>
        </div>
      </div>
    </a-form>
    <template #footer>
      <div class="modal-footer">
        <a-button size="large" @click="handleCancel">{{
          t("modelConfig.connectModal.cancel")
        }}</a-button>
        <a-button
          v-if="!props.readonly"
          type="primary"
          size="large"
          :loading="props.submitting"
          @click="handleSubmit"
          >{{ t("modelConfig.editModal.save") }}</a-button
        >
      </div>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-modal-header) {
  padding: 22px 24px 16px;
}
:deep(.ant-modal-content) {
  overflow: hidden;
  border-radius: 12px;
}
:deep(.ant-modal-body) {
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  padding: 0 24px 20px;
}
:deep(.ant-modal-footer) {
  padding: 14px 24px 20px;
}
:deep(.ant-form-item-label) {
  padding: 0 0 7px;
}
:deep(.ant-form-item-label > label) {
  height: auto;
  color: var(--dm-text);
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}
:deep(.ant-form-item-required::before) {
  color: var(--dm-error) !important;
  font-size: 14px;
}
.modal-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.modal-heading__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--dm-link);
  background: var(--dm-primary-bg);
  font-size: 18px;
  flex: 0 0 auto;
}
.modal-heading__copy {
  min-width: 0;
}
.modal-heading__title {
  color: var(--dm-text);
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}
.modal-heading__description {
  margin-top: 4px;
  color: var(--dm-text-2);
  font-size: 13px;
  line-height: 20px;
  font-weight: 400;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.edit-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.form-half,
.form-full {
  min-width: 0;
}
.form-full {
  grid-column: 1 / -1;
}
.iteration-grid {
  display: flex;
  gap: 16px;
  margin: 2px 0 18px;
}
.iteration-option {
  display: grid;
  gap: 8px;
  align-content: start;
  width: 180px;
}
.iteration-option .ant-btn {
  width: 100%;
}
.iteration-status {
  color: var(--dm-text-2);
  line-height: 22px;
}
.iteration-option :deep(.ant-switch) {
  width: 52px;
  min-width: 52px;
  height: 22px;
  margin-top: 2px;
  padding: 0;
  background: #b8bec8;
}
.iteration-option :deep(.ant-switch-handle) {
  top: 2px;
  inset-inline-start: 2px;
  width: 18px;
  height: 18px;
}
.iteration-option :deep(.ant-switch-handle::before) {
  border-radius: 50%;
}
.iteration-option :deep(.ant-switch-checked) {
  background: var(--dm-link);
}
.iteration-option :deep(.ant-switch-checked .ant-switch-handle) {
  inset-inline-start: calc(100% - 20px);
}
.iteration-option strong,
.labels-heading strong {
  color: var(--dm-text);
}
.labels-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.labels-heading > div {
  display: grid;
  gap: 5px;
}
.labels-heading span,
.label-tree-heading span {
  color: var(--dm-text-3);
  font-size: 0.12rem;
}
.label-entry + .label-entry {
  margin-top: 8px;
}
.label-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 36px 36px;
  gap: 8px;
  align-items: center;
}
.label-row .ant-btn {
  height: 40px;
  padding: 0;
}
.label-row .ant-btn:not(:last-child):not(:disabled) {
  border: 1px solid var(--dm-primary-border);
  color: var(--dm-link);
}
.label-row .ant-btn-dangerous {
  border-color: var(--dm-error-border);
  color: var(--dm-error);
}
.label-row .anticon.expanded {
  transform: rotate(90deg);
}
.label-tree-panel {
  margin-top: 8px;
  padding: 14px 16px;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  background: var(--dm-fill-4);
}
.label-tree-panel :deep(.ant-tree) {
  max-height: 260px;
  overflow-y: auto;
  background: transparent;
}
@media (max-width: 720px) {
  .edit-form {
    grid-template-columns: 1fr;
  }
  .form-full {
    grid-column: auto;
  }
  .iteration-grid {
    flex-wrap: wrap;
  }
  .label-row {
    grid-template-columns: 1fr 1fr 32px 32px;
  }
}
</style>
