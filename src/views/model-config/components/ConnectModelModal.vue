<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { message, type FormInstance } from "ant-design-vue";
import {
  DeleteOutlined,
  ApiOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons-vue";
import {
  getLabelTreeNodeListApi,
  type LabelTreeNode as BackendLabelTreeNode,
} from "@/api/label";
import { getAssociatedModelLabelIdsApi } from "@/api/model-config";

export interface OutputLabel {
  code: string;
  related: string;
  relatedKey?: number;
}
type LabelTreeNode = {
  children?: LabelTreeNode[];
  key: number;
  selectable?: boolean;
  disabled?: boolean;
  title: string;
};
export interface ConnectModelForm {
  apiKey: string;
  endpoint: string;
  labels: OutputLabel[];
  name: string;
  purpose: string;
  supportsIteration: boolean;
}

const props = withDefaults(
  defineProps<{ open: boolean; submitting?: boolean }>(),
  { submitting: false },
);
const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "submit", value: ConnectModelForm): void;
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<ConnectModelForm>({
  name: "",
  purpose: "",
  endpoint: "",
  apiKey: "",
  supportsIteration: false,
  labels: [{ code: "", related: "" }],
});
const expandedLabelIndex = ref<number | null>(null);
const labelTreeData = ref<LabelTreeNode[]>([]);
const rawLabelTreeData = ref<BackendLabelTreeNode[]>([]);
const labelTreeLoading = ref(false);
const associatedLabelIds = ref<number[]>([]);
const modalBodyStyle = {
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
  paddingRight: "8px",
} as const;

/** 将标签接口节点转换为 Ant Design 树结构，仅标签节点允许选择。 */
function mapLabelTreeNode(node: BackendLabelTreeNode): LabelTreeNode {
  return {
    children: node.children?.map(mapLabelTreeNode),
    key: node.id,
    selectable: node.nodeType === "LABEL",
    disabled:
      node.nodeType === "LABEL" &&
      (associatedLabelIds.value.includes(node.id) ||
        form.labels.some((label) => label.relatedKey === node.id)),
    title: node.nodeName,
  };
}

/** 加载关联标签树，失败时保留空树并提示接口返回信息。 */
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

/** 每次打开弹窗重置为一行空标签，避免残留上次编辑内容。 */
function handleOpenChange(open: boolean): void {
  if (open) {
    Object.assign(form, {
      name: "",
      purpose: "",
      endpoint: "",
      apiKey: "",
      supportsIteration: false,
      labels: [{ code: "", related: "" }],
    });
    void loadLabelTree();
  }
  expandedLabelIndex.value = null;
}

watch(() => props.open, handleOpenChange);

/** 新增一行模型输出标签配置。 */
function handleAddLabel(): void {
  form.labels.push({ code: "", related: "" });
}

/** 删除标签配置行，并始终保留至少一行输入区域。 */
function handleRemoveLabel(index: number): void {
  if (form.labels.length > 1) form.labels.splice(index, 1);
  if (expandedLabelIndex.value === index) expandedLabelIndex.value = null;
}

/** 展开或关闭当前输出标签行的关联标签树。 */
function handleToggleLabelTree(index: number): void {
  expandedLabelIndex.value = expandedLabelIndex.value === index ? null : index;
}

/** 切换当前接入模型是否开启自迭代。 */
function handleToggleIteration(): void {
  form.supportsIteration = !form.supportsIteration;
}

/** 选择叶子标签后回填标题并自动收起树面板。 */
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
  form.labels[index].relatedKey = info.node.key;
  labelTreeData.value = rawLabelTreeData.value.map(mapLabelTreeNode);
  expandedLabelIndex.value = null;
}

/** 校验模型接入表单并发出提交事件。 */
async function handleSubmit(): Promise<void> {
  await formRef.value?.validate();
  emit("submit", {
    ...form,
    labels: form.labels.map((label) => ({ ...label })),
  });
}
function handleCancel(): void {
  emit("update:open", false);
}
</script>

<template>
  <a-modal
    :open="props.open"
    :confirm-loading="props.submitting"
    width="800px"
    centered
    destroy-on-close
    class="connect-model-modal"
    :body-style="modalBodyStyle"
    @update:open="handleOpenChange"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <template #title>
      <div class="modal-heading">
        <span class="modal-heading__icon"><ApiOutlined /></span>
        <div class="modal-heading__copy">
          <div class="modal-heading__title">
            {{ t("modelConfig.connectModal.title") }}
          </div>
          <div class="modal-heading__description">
            {{ t("modelConfig.connectModal.description") }}
          </div>
        </div>
      </div>
    </template>
    <a-form ref="formRef" :model="form" layout="vertical" class="connect-form">
      <a-form-item
        :label="t('modelConfig.connectModal.name')"
        name="name"
        :rules="[
          {
            required: true,
            message: t('modelConfig.connectModal.requiredName'),
          },
        ]"
        class="form-half"
        ><a-input
          v-model:value="form.name"
          size="large"
          :placeholder="t('modelConfig.connectModal.namePlaceholder')"
      /></a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.protocol')"
        class="form-half"
        ><a-select
          size="large"
          disabled
          :value="t('modelConfig.connectModal.protocolValue')"
          :options="[
            {
              label: t('modelConfig.connectModal.protocolValue'),
              value: 'HTTP JSON',
            },
          ]"
      /></a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.purpose')"
        class="form-full"
        ><a-textarea
          v-model:value="form.purpose"
          :rows="3"
          :placeholder="t('modelConfig.connectModal.purposePlaceholder')"
      /></a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.endpoint')"
        name="endpoint"
        :rules="[
          {
            required: true,
            message: t('modelConfig.connectModal.requiredEndpoint'),
          },
        ]"
        class="form-full"
        ><a-input
          v-model:value="form.endpoint"
          size="large"
          :placeholder="t('modelConfig.connectModal.endpointPlaceholder')"
      /></a-form-item>
      <a-form-item
        :label="t('modelConfig.connectModal.apiKey')"
        class="form-full"
        ><a-input-password
          v-model:value="form.apiKey"
          size="large"
          :placeholder="t('modelConfig.connectModal.apiKeyPlaceholder')"
          autocomplete="new-password"
      /></a-form-item>
      <div class="iteration-grid form-full">
        <div class="iteration-option">
          <strong>{{ t("modelConfig.connectModal.supportsIteration") }}</strong
          ><span class="iteration-status">{{
            t("modelConfig.connectModal.support")
          }}</span>
        </div>
        <div class="iteration-option">
          <strong>{{ t("modelConfig.connectModal.enableIteration") }}</strong
          ><a-switch
            :checked="form.supportsIteration"
            @change="handleToggleIteration"
          />
        </div>
      </div>
      <div class="labels-section form-full">
        <div class="labels-heading">
          <div>
            <strong>{{ t("modelConfig.connectModal.outputLabels") }}</strong
            ><span>{{
              t("modelConfig.connectModal.outputLabelsDescription")
            }}</span>
          </div>
          <a-button @click="handleAddLabel"
            ><template #icon><PlusOutlined /></template
            >{{ t("modelConfig.connectModal.addLabel") }}</a-button
          >
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
              :placeholder="t('modelConfig.connectModal.labelCode')"
            /><a-input
              v-model:value="label.related"
              size="large"
              readonly
              :placeholder="t('modelConfig.connectModal.relatedLabel')"
            /><a-button
              aria-label="关联标签"
              @click="handleToggleLabelTree(index)"
              ><RightOutlined
                :class="{ expanded: expandedLabelIndex === index }" /></a-button
            ><a-button
              danger
              aria-label="删除标签"
              @click="handleRemoveLabel(index)"
              ><DeleteOutlined
            /></a-button>
          </div>
          <div v-if="expandedLabelIndex === index" class="label-tree-panel">
            <div class="label-tree-heading">
              <div>
                <strong>{{ t("modelConfig.connectModal.selectLabel") }}</strong
                ><span>{{
                  t("modelConfig.connectModal.selectLabelDescription")
                }}</span>
              </div>
              <a-tag v-if="label.related" color="blue">{{
                label.related
              }}</a-tag>
            </div>
            <a-spin :spinning="labelTreeLoading">
              <a-tree
                :tree-data="labelTreeData"
                default-expand-all
                block-node
                :selected-keys="label.relatedKey ? [label.relatedKey] : []"
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
          type="primary"
          size="large"
          :loading="props.submitting"
          @click="handleSubmit"
          >{{ t("modelConfig.connectModal.submit") }}</a-button
        >
      </div>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-modal-body) {
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  padding: 0 24px 20px;
}
:deep(.ant-modal-header) {
  padding: 22px 24px 16px;
}
:deep(.ant-modal-content) {
  overflow: hidden;
  border-radius: 12px;
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
.connect-form {
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
.iteration-grid strong,
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
.labels-heading span {
  color: var(--dm-text-2);
  font-size: 0.12rem;
}
.label-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 36px 36px;
  gap: 8px;
  align-items: center;
}
.label-entry + .label-entry {
  margin-top: 8px;
}
.label-row .ant-btn {
  height: 40px;
  padding: 0;
}
.label-row .ant-btn:not(:last-child) {
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
  border-radius: 0.1rem;
  background: var(--dm-fill-4);
}
.label-tree-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 10px;
}
.label-tree-heading > div {
  display: grid;
  gap: 4px;
}
.label-tree-heading span {
  color: var(--dm-text-3);
  font-size: 0.12rem;
}
.label-tree-heading .ant-tag {
  margin: 0;
}
.label-tree-panel :deep(.ant-tree) {
  max-height: 260px;
  overflow-y: auto;
  background: transparent;
}
.label-tree-panel :deep(.ant-tree-node-content-wrapper) {
  min-height: 34px;
  line-height: 34px;
}
.label-tree-panel :deep(.ant-tree-node-selected) {
  background: var(--dm-primary-bg) !important;
  color: var(--dm-link);
}
@media (max-width: 720px) {
  .connect-form {
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
