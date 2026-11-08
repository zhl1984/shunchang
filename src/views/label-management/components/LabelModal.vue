<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { TagOutlined } from "@ant-design/icons-vue";
import { message, type FormInstance } from "ant-design-vue";
import type { RuleObject } from "ant-design-vue/es/form/interface";
import { useI18n } from "vue-i18n";

import {
  createLabelTreeNodeApi,
  type LabelTreeNode,
  type LabelTreeLeafNode,
  updateLabelTreeNodeApi,
} from "@/api/label";
import { useLabelStore } from "@/stores/label";

import {
  buildCreateLabelInput,
  buildGroupCascaderOptions,
  buildLabelUpdate,
  type CreateLabelFormValues,
  type LabelModalMode,
  resolveLabelGroupPath,
  resolveNodeParentPath,
} from "./create-label-group";

defineOptions({ name: "LabelModal" });

const props = defineProps<{
  labelVisible: boolean;
  mode: LabelModalMode;
  nodeId: string | number | null;
}>();

const emit = defineEmits<{
  saved: [node: LabelTreeLeafNode];
  "update:labelVisible": [visible: boolean];
}>();

const { t } = useI18n();
const labelStore = useLabelStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);

/** 优先提取接口返回的业务错误文案，缺失时回退到模块提示。 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 确认接口返回节点为标签节点后再触发 saved 事件。 */
function isLabelNode(node: LabelTreeNode): node is LabelTreeLeafNode {
  return node.nodeType === "LABEL";
}
const isEditMode = computed(() => props.mode === "edit");
const copyKey = computed(() =>
  isEditMode.value
    ? "labelManagement.editLabel"
    : "labelManagement.createLabel",
);
const formModel = reactive<CreateLabelFormValues>({
  description: "",
  name: "",
  parentPath: [],
});
const groupOptions = computed(() =>
  buildGroupCascaderOptions(
    labelStore.tree,
    t("labelManagement.createLabel.noParent"),
  ),
);

const rules: Record<keyof CreateLabelFormValues, RuleObject[]> = {
  description: [],
  name: [
    {
      message: t("labelManagement.createLabel.validation.name"),
      required: true,
      trigger: "blur",
      whitespace: true,
    },
  ],
  parentPath: [
    {
      message: t("labelManagement.createLabel.validation.parent"),
      required: true,
      trigger: "change",
      type: "array",
    },
  ],
};

/** 重置标签表单，并根据当前树节点恢复默认所属分组。 */
function resetForm(): void {
  const currentNode =
    props.nodeId === null ? undefined : labelStore.mapping.get(props.nodeId);

  // 编辑模式只回填标签字段，避免分组节点被错误转换为标签。
  if (isEditMode.value && currentNode?.nodeType === "LABEL") {
    formModel.description = currentNode.nodeDescription ?? "";
    formModel.name = currentNode.nodeName;
    formModel.parentPath = resolveNodeParentPath(
      currentNode,
      labelStore.mapping,
    );
    formRef.value?.clearValidate();
    return;
  }

  formModel.description = "";
  formModel.name = "";
  formModel.parentPath = resolveLabelGroupPath(
    props.nodeId,
    labelStore.mapping,
  );
  formRef.value?.clearValidate();
}

/** 提交期间禁止关闭弹窗，避免请求完成后状态落入已关闭表单。 */
function handleCancel(): void {
  if (submitting.value) {
    return;
  }

  emit("update:labelVisible", false);
  resetForm();
}

/** 校验并创建标签，刷新共享树后通知面板选中新标签。 */
async function handleSubmit(): Promise<void> {
  if (submitting.value) {
    return;
  }

  try {
    await formRef.value?.validate();
    submitting.value = true;
    const saved =
      isEditMode.value && props.nodeId !== null
        ? await updateLabelTreeNodeApi(
            Number(props.nodeId),
            buildLabelUpdate(formModel),
          )
        : await createLabelTreeNodeApi(buildCreateLabelInput(formModel));

    // 标签弹窗只接受标签返回值，防止接口类型或实现意外偏移。
    if (!isLabelNode(saved)) {
      throw new Error("Expected saved label");
    }

    await labelStore.refresh();
    message.success(t(`${copyKey.value}.feedback.success`));
    emit("saved", saved);
    emit("update:labelVisible", false);
    resetForm();
  } catch (error: unknown) {
    // 字段错误由表单展示，接口或返回类型异常使用全局反馈。
    if (!(error && typeof error === "object" && "errorFields" in error)) {
      message.error(
        getErrorMessage(error, t(`${copyKey.value}.feedback.error`)),
      );
    }
  } finally {
    submitting.value = false;
  }
}

watch(
  [() => props.labelVisible, () => labelStore.mapping, () => props.mode],
  ([visible]) => {
    // 弹窗可能早于 store 初始化完成，映射更新后需重新计算默认路径。
    if (visible) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <a-modal
    :cancel-text="t('labelManagement.createLabel.actions.cancel')"
    :confirm-loading="submitting"
    :mask-closable="!submitting"
    :ok-text="t(`${copyKey}.actions.submit`)"
    :open="labelVisible"
    :width="720"
    wrap-class-name="label-modal"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <template #title>
      <div class="clm-heading">
        <span class="clm-icon" aria-hidden="true">
          <TagOutlined />
        </span>
        <span>
          <span class="clm-title font-lg">
            {{ t(`${copyKey}.title`) }}
          </span>
          <span class="clm-subtitle font-sm">
            {{ t(`${copyKey}.description`) }}
          </span>
        </span>
      </div>
    </template>

    <a-form
      ref="formRef"
      :label-col="{ span: 24 }"
      :model="formModel"
      :rules="rules"
      :wrapper-col="{ span: 24 }"
      layout="vertical"
    >
      <a-form-item
        :label="t('labelManagement.createLabel.fields.name')"
        name="name"
      >
        <a-input
          v-model:value="formModel.name"
          :maxlength="100"
          :placeholder="t('labelManagement.createLabel.placeholders.name')"
        />
      </a-form-item>

      <a-form-item
        class="hidden"
        :label="t('labelManagement.createLabel.fields.parent')"
        name="parentPath"
      >
        <a-cascader
          v-model:value="formModel.parentPath"
          :allow-clear="false"
          change-on-select
          disabled
          :options="groupOptions"
          :placeholder="t('labelManagement.createLabel.placeholders.parent')"
          show-search
        />
      </a-form-item>

      <a-form-item
        :label="t('labelManagement.createLabel.fields.description')"
        name="description"
      >
        <a-textarea
          v-model:value="formModel.description"
          :auto-size="{ minRows: 4, maxRows: 6 }"
          :maxlength="500"
          :placeholder="
            t('labelManagement.createLabel.placeholders.description')
          "
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
.clm-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.clm-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  flex-shrink: 0;
  border-radius: 10px;
  color: var(--dm-primary);
  background: var(--dm-primary-bg);
  font-size: 20px;
}

.clm-title,
.clm-subtitle {
  display: block;
}

.clm-title {
  color: var(--dm-text);
  font-weight: 600;
}

.clm-subtitle {
  margin-top: 4px;
  color: var(--dm-text-3);
  font-weight: 400;
}

:global(.label-modal .ant-modal-content) {
  overflow: hidden;
  border-radius: 16px;
}

:global(.label-modal .ant-modal-header) {
  margin: 0;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--dm-border-2);
}

:global(.label-modal .ant-modal-body) {
  padding-top: 24px;
}
</style>
