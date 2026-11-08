<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { FolderOutlined } from "@ant-design/icons-vue";
import { message, type FormInstance } from "ant-design-vue";
import type { RuleObject } from "ant-design-vue/es/form/interface";
import { useI18n } from "vue-i18n";

import {
  createLabelTreeNodeApi,
  type LabelGroupTreeNode,
  type LabelTreeNode,
  updateLabelTreeNodeApi,
} from "@/api/label";
import { useLabelStore } from "@/stores/label";

import {
  buildCreateLabelGroupInput,
  buildGroupCascaderOptions,
  buildLabelGroupUpdate,
  type CreateLabelGroupFormValues,
  type LabelModalMode,
  resolveLabelGroupPath,
  resolveNodeParentPath,
} from "./create-label-group";

defineOptions({ name: "LabelGroupModal" });

const props = defineProps<{
  groupVisible: boolean;
  mode: LabelModalMode;
  nodeId: string | number | null;
}>();

const emit = defineEmits<{
  saved: [node: LabelGroupTreeNode];
  "update:groupVisible": [visible: boolean];
}>();

const { t } = useI18n();
const labelStore = useLabelStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);

/** 优先提取接口返回的业务错误文案，缺失时回退到模块提示。 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 确认接口返回节点为分组节点后再触发 saved 事件。 */
function isGroupNode(node: LabelTreeNode): node is LabelGroupTreeNode {
  return node.nodeType === "GROUP";
}
const isEditMode = computed(() => props.mode === "edit");
const copyKey = computed(() =>
  isEditMode.value
    ? "labelManagement.editGroup"
    : "labelManagement.createGroup",
);
const formModel = reactive<CreateLabelGroupFormValues>({
  description: "",
  name: "",
  parentPath: [],
});
const groupOptions = computed(() =>
  buildGroupCascaderOptions(
    labelStore.tree,
    t("labelManagement.createGroup.noParent"),
  ),
);

const rules: Record<keyof CreateLabelGroupFormValues, RuleObject[]> = {
  description: [],
  name: [
    {
      message: t("labelManagement.createGroup.validation.name"),
      required: true,
      trigger: "blur",
      whitespace: true,
    },
  ],
  parentPath: [
    {
      message: t("labelManagement.createGroup.validation.parent"),
      required: true,
      trigger: "change",
      type: "array",
    },
  ],
};

/** 根据当前节点解析新增分组的默认父级，标签使用直接父分组。 */
function resolveDefaultParentPath(): Array<string | number> {
  return resolveLabelGroupPath(props.nodeId, labelStore.mapping);
}

/** 使用当前树选择初始化表单，保证每次打开都不会沿用上一次输入。 */
function resetForm(): void {
  const currentNode =
    props.nodeId === null ? undefined : labelStore.mapping.get(props.nodeId);

  // 编辑模式只回填分组；节点不存在或类型不符时保留空表单，避免误编辑其他节点。
  if (isEditMode.value && currentNode?.nodeType === "GROUP") {
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
  formModel.parentPath = resolveDefaultParentPath();
  formRef.value?.clearValidate();
}

/** 关闭弹窗；提交期间禁止取消，避免请求完成后出现状态错位。 */
function handleCancel(): void {
  if (submitting.value) {
    return;
  }

  emit("update:groupVisible", false);
  resetForm();
}

/** 校验并创建分组，刷新共享 store 后通知树面板同步自身 UI 状态。 */
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
            buildLabelGroupUpdate(formModel),
          )
        : await createLabelTreeNodeApi(buildCreateLabelGroupInput(formModel));

    // 分组弹窗只接受分组返回值，防止接口类型或实现意外偏移。
    if (!isGroupNode(saved)) {
      throw new Error("Expected saved label group");
    }

    await labelStore.refresh();
    message.success(t(`${copyKey.value}.feedback.success`));
    emit("saved", saved);
    emit("update:groupVisible", false);
    resetForm();
  } catch (error: unknown) {
    // 表单错误由字段自身展示，仅 API 或返回类型异常需要全局反馈。
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
  [() => props.groupVisible, () => labelStore.mapping, () => props.mode],
  ([visible]) => {
    // 弹窗可能早于 store 初始化完成，映射更新后需重新解析默认父级。
    if (visible) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <a-modal
    :cancel-text="t('labelManagement.createGroup.actions.cancel')"
    :confirm-loading="submitting"
    :mask-closable="!submitting"
    :ok-text="t(`${copyKey}.actions.submit`)"
    :open="groupVisible"
    :width="720"
    wrap-class-name="label-group-modal"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <template #title>
      <div class="clgm-heading">
        <span class="clgm-icon" aria-hidden="true">
          <FolderOutlined />
        </span>
        <span>
          <span class="clgm-title font-lg">
            {{ t(`${copyKey}.title`) }}
          </span>
          <span class="clgm-subtitle font-sm">
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
        :label="t('labelManagement.createGroup.fields.name')"
        name="name"
      >
        <a-input
          v-model:value="formModel.name"
          :maxlength="100"
          :placeholder="t('labelManagement.createGroup.placeholders.name')"
        />
      </a-form-item>

      <a-form-item
        class="hidden"
        :label="t('labelManagement.createGroup.fields.parent')"
        name="parentPath"
      >
        <a-cascader
          v-model:value="formModel.parentPath"
          :allow-clear="false"
          change-on-select
          disabled
          :options="groupOptions"
          :placeholder="t('labelManagement.createGroup.placeholders.parent')"
          show-search
        />
      </a-form-item>

      <a-form-item
        :label="t('labelManagement.createGroup.fields.description')"
        name="description"
      >
        <a-textarea
          v-model:value="formModel.description"
          :auto-size="{ minRows: 4, maxRows: 6 }"
          :maxlength="500"
          :placeholder="
            t('labelManagement.createGroup.placeholders.description')
          "
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
.clgm-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.clgm-icon {
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

.clgm-title,
.clgm-subtitle {
  display: block;
}

.clgm-title {
  color: var(--dm-text);
  font-weight: 600;
}

.clgm-subtitle {
  margin-top: 4px;
  color: var(--dm-text-3);
  font-weight: 400;
}

:global(.label-group-modal .ant-modal-content) {
  overflow: hidden;
  border-radius: 16px;
}

:global(.label-group-modal .ant-modal-header) {
  margin: 0;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--dm-border-2);
}

:global(.label-group-modal .ant-modal-body) {
  padding-top: 24px;
}
</style>
