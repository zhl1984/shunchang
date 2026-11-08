<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import { message, Modal, type TreeProps } from "ant-design-vue";
import { ExclamationCircleOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";

import {
  deleteLabelTreeNodeApi,
  type LabelGroupTreeNode,
  type LabelTreeLeafNode,
} from "@/api/label";
import { type LabelTreeStoreNode, useLabelStore } from "@/stores/label";
import { throttle } from "@/utils/lodash";
import { deepFilter, deepMap } from "@/utils/tree";

import type { LabelModalMode } from "./create-label-group";
import LabelGroupModal from "./LabelGroupModal.vue";
import LabelModal from "./LabelModal.vue";
import LabelTreeNode from "./LabelTreeNode.vue";

type LabelNodeId = string | number;
type LabelTreeDisplayNode = LabelTreeStoreNode & { count: number };

const emit = defineEmits<{
  select: [id: LabelNodeId | null];
}>();

const { t } = useI18n();
const labelStore = useLabelStore();
const keyword = ref("");
const expandedKeys = ref<LabelNodeId[]>([]);
const selectedKeys = ref<LabelNodeId[]>([]);
const expandedKeysBeforeSearch = ref<LabelNodeId[]>([]);
const loadFailed = ref(false);
const currentTreeData = shallowRef<LabelTreeDisplayNode[]>([]);
const groupModalVisible = ref(false);
const labelModalVisible = ref(false);
const groupModalMode = ref<LabelModalMode>("create");
const labelModalMode = ref<LabelModalMode>("create");
const groupModalNodeId = ref<LabelNodeId | null>(null);
const labelModalNodeId = ref<LabelNodeId | null>(null);
const canCreateLabel = computed(() => {
  const selectedId = selectedKeys.value[0];
  return selectedId !== undefined && labelStore.mapping.has(selectedId);
});

const labelTreeData = computed(() => {
  const countMap = new Map<number, number>();
  return deepMap(labelStore.tree, (item) => {
    const parentId = item?.parentId;
    const node: LabelTreeDisplayNode = {
      ...item,
      count: item.nodeType === "GROUP" ? (countMap.get(item.id) ?? 0) : 1,
    };
    // parentId === 0 是根节点；沿递归遍历累计分组下的节点数量。
    if (parentId) {
      countMap.set(parentId, (countMap.get(parentId) ?? 0) + node.count);
    }

    return node;
  });
});

/** 节流过滤标签树，并在过滤回调中同步收集需要展开的分组。 */
const updateTreeData = throttle((value: string) => {
  const text = value.trim().toLocaleLowerCase("zh-CN");

  if (!text) {
    currentTreeData.value = labelTreeData.value;
    expandedKeys.value = [...expandedKeysBeforeSearch.value];
    return;
  }

  const nextExpandedKeys: LabelNodeId[] = [];
  currentTreeData.value = deepFilter(labelTreeData.value, (item) => {
    const matches = item.nodeName.toLocaleLowerCase("zh-CN").includes(text);
    const keepNode =
      item.nodeType === "LABEL"
        ? matches
        : (item.children?.length ?? 0) > 0 || matches;

    if (keepNode && item.nodeType === "GROUP") {
      nextExpandedKeys.push(item.id);
    }

    return keepNode;
  });
  expandedKeys.value = nextExpandedKeys;
}, 300);

/** 在输入边界提取文本，首次搜索前保存用户的分组展开状态。 */
function handleSearchInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;

  if (value.trim() && !keyword.value.trim()) {
    expandedKeysBeforeSearch.value = [...expandedKeys.value];
  }

  keyword.value = value;
  updateTreeData(value);
}

/** 初始化标签树并保留可重试的失败状态。 */
async function initializePanel(): Promise<void> {
  loadFailed.value = false;

  try {
    await labelStore.refresh();
  } catch {
    loadFailed.value = true;
  }
}

/** 同步用户展开的分组；搜索期间的自动展开不覆盖原始展开快照。 */
function handleExpand(keys: LabelNodeId[]): void {
  expandedKeys.value = keys;
}

/** 同步树选择；取消选中时通知父组件清空右侧详情。 */
const handleSelect: NonNullable<TreeProps["onSelect"]> = (keys, info) => {
  const id = keys[0];
  const node = id === undefined ? undefined : labelStore.mapping.get(id);

  if (!info.selected) {
    selectedKeys.value = [];
    emit("select", null);
    return;
  }

  if (!node) {
    return;
  }

  selectedKeys.value = [node.id];
  emit("select", node.id);
};

/** 打开新增分组弹窗，当前选中节点由弹窗用于推导默认父级。 */
function handleOpenCreateGroup(): void {
  groupModalMode.value = "create";
  groupModalNodeId.value = selectedKeys.value[0] ?? null;
  groupModalVisible.value = true;
}

/** 任意有效树节点都可作为新增标签默认所属分组的计算上下文。 */
function handleOpenCreateLabel(): void {
  if (!canCreateLabel.value) {
    return;
  }

  labelModalMode.value = "create";
  labelModalNodeId.value = selectedKeys.value[0] ?? null;
  labelModalVisible.value = true;
}

/** 打开与节点类型匹配的编辑弹窗，节点类型在编辑期间保持不变。 */
function handleEditNode(node: LabelTreeStoreNode): void {
  if (node.nodeType === "GROUP") {
    groupModalMode.value = "edit";
    groupModalNodeId.value = node.id;
    groupModalVisible.value = true;
    return;
  }

  labelModalMode.value = "edit";
  labelModalNodeId.value = node.id;
  labelModalVisible.value = true;
}

/** 弹窗刷新 store 后，同步搜索、展开和选中状态。 */
function handleGroupSaved(node: LabelGroupTreeNode): void {
  keyword.value = "";
  currentTreeData.value = labelTreeData.value;
  const savedPath = labelStore.mapping.get(node.id)?.path;
  const parentId = node.parentId;
  const parentPath = savedPath
    ? savedPath.slice(0, -1)
    : parentId === 0
      ? []
      : (labelStore.mapping.get(parentId)?.path ?? []);

  expandedKeys.value = Array.from(
    new Set([...expandedKeys.value, ...parentPath]),
  );
  selectedKeys.value = [node.id];
  emit("select", node.id);
}

/** 弹窗刷新 store 后，展开所属分组并选中保存后的标签。 */
function handleLabelSaved(node: LabelTreeLeafNode): void {
  keyword.value = "";
  currentTreeData.value = labelTreeData.value;
  const savedPath = labelStore.mapping.get(node.id)?.path;
  const parentId = node.parentId;
  const parentPath = savedPath
    ? savedPath.slice(0, -1)
    : parentId === 0
      ? []
      : (labelStore.mapping.get(parentId)?.path ?? []);

  expandedKeys.value = Array.from(
    new Set([...expandedKeys.value, ...parentPath]),
  );
  selectedKeys.value = [node.id];
  emit("select", node.id);
}

/** 判断分组任意层级后代中是否存在标签。 */
function containsDescendantLabel(node: LabelTreeStoreNode): boolean {
  return (node.children ?? []).some(
    (child) =>
      child.nodeType === "LABEL" ||
      (child.nodeType === "GROUP" && containsDescendantLabel(child)),
  );
}

/** 删除节点并刷新树；搜索状态下重新应用当前关键字。 */
async function deleteNode(node: LabelTreeStoreNode): Promise<void> {
  try {
    await deleteLabelTreeNodeApi(Number(node.id));
    await labelStore.refresh();

    if (keyword.value.trim()) {
      updateTreeData(keyword.value);
    }
  } catch (error: unknown) {
    // API 层已保留后端业务 message；缺失时使用删除节点的通用提示。
    message.error(
      error instanceof Error && error.message
        ? error.message
        : t("labelManagement.feedback.detailFailed"),
    );
    throw error;
  }
}

/** 按节点类型和分组后代内容选择警告、确认或直接级联删除。 */
function handleDeleteNode(node: LabelTreeStoreNode): void {
  if (node.nodeType === "GROUP" && containsDescendantLabel(node)) {
    message.warning(
      t("labelManagement.delete.groupContainsLabel", { name: node.nodeName }),
    );
    return;
  }

  // 纯分组子树不包含业务标签，按确认规则直接级联清理。
  if (node.nodeType === "GROUP" && (node.children?.length ?? 0) > 0) {
    void deleteNode(node).catch(() => undefined);
    return;
  }

  const isLabel = node.nodeType === "LABEL";
  Modal.confirm({
    cancelText: t("labelManagement.delete.actions.cancel"),
    centered: true,
    content: t(
      isLabel
        ? "labelManagement.delete.confirmLabel"
        : "labelManagement.delete.confirmGroup",
      { name: node.nodeName },
    ),
    icon: h(ExclamationCircleOutlined),
    okText: t("labelManagement.delete.actions.submit"),
    okType: "danger",
    onOk: () => deleteNode(node),
    title: t(
      isLabel
        ? "labelManagement.delete.deleteLabel"
        : "labelManagement.delete.deleteGroup",
    ),
  });
}

watch(
  [() => labelStore.tree, () => labelStore.mapping],
  ([_tree]) => {
    if (!keyword.value.trim()) {
      currentTreeData.value = labelTreeData.value;
    }

    const currentId = selectedKeys.value[0];
    const currentNode =
      currentId === undefined ? undefined : labelStore.mapping.get(currentId);

    // 刷新后分组和标签只要仍存在，都应保留当前树选择。
    if (currentNode) {
      return;
    }

    // 首次加载保持未选择；仅在已有选择失效时清空并通知父组件。
    if (currentId !== undefined) {
      selectedKeys.value = [];
      emit("select", null);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => updateTreeData.cancel());
</script>

<template>
  <a-card :bordered="false" class="label-tree-panel">
    <div class="ltp-header flex-between gap-12">
      <div class="ltp-heading">
        <h2 class="ltp-title font-lg">{{ t("labelManagement.tree.title") }}</h2>
      </div>

      <div class="ltp-actions flex gap-8">
        <a-button
          class="ltp-group-action"
          :title="t('labelManagement.tree.actions.createGroup')"
          @click="handleOpenCreateGroup"
        >
          <span class="ltp-action-icon" aria-hidden="true">+</span>
          {{ t("labelManagement.tree.actions.createGroup") }}
        </a-button>
        <a-button
          class="ltp-label-action"
          :disabled="!canCreateLabel"
          :title="t('labelManagement.tree.actions.createLabel')"
          @click="handleOpenCreateLabel"
        >
          <span class="ltp-action-icon" aria-hidden="true">+</span>
          {{ t("labelManagement.tree.actions.createLabel") }}
        </a-button>
      </div>
    </div>

    <div class="ltp-search-row">
      <a-input
        class="ltp-search"
        :placeholder="t('labelManagement.tree.searchPlaceholder')"
        :value="keyword"
        @input="handleSearchInput"
      >
        <template #prefix>
          <span class="ltp-search-icon" aria-hidden="true" />
        </template>
      </a-input>
    </div>

    <div class="ltp-content">
      <a-spin
        v-if="labelStore.status === 'loading'"
        class="ltp-state"
        :spinning="true"
        :tip="t('components.loading.tip')"
      />

      <div v-else-if="loadFailed" class="ltp-state">
        <p class="ltp-error font-sm">
          {{ t("labelManagement.tree.error.description") }}
        </p>
        <a-button size="small" @click="initializePanel">
          {{ t("labelManagement.tree.actions.retry") }}
        </a-button>
      </div>

      <a-empty
        v-else-if="labelStore.tree.length === 0"
        class="ltp-state"
        :description="t('labelManagement.tree.empty.default')"
      />

      <a-empty
        v-else-if="currentTreeData.length === 0"
        class="ltp-state"
        :description="t('labelManagement.tree.empty.search')"
      />

      <a-tree
        v-else
        v-model:expanded-keys="expandedKeys"
        v-model:selected-keys="selectedKeys"
        block-node
        class="ltp-tree"
        :field-names="{ key: 'id', title: 'nodeName', children: 'children' }"
        :tree-data="currentTreeData"
        @expand="handleExpand"
        @select="handleSelect"
      >
        <template #title="node">
          <LabelTreeNode
            :expanded="Boolean(node.expanded)"
            :node="node"
            :count="node.count"
            @delete="handleDeleteNode"
            @edit="handleEditNode"
          />
        </template>
      </a-tree>
    </div>

    <LabelGroupModal
      v-model:group-visible="groupModalVisible"
      :mode="groupModalMode"
      :node-id="groupModalNodeId"
      @saved="handleGroupSaved"
    />
    <LabelModal
      v-model:label-visible="labelModalVisible"
      :mode="labelModalMode"
      :node-id="labelModalNodeId"
      @saved="handleLabelSaved"
    />
  </a-card>
</template>

<style scoped lang="less">
.label-tree-panel {
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--dm-border-2);
  background: var(--dm-bg-container);

  :deep(.ant-card-body) {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
  }

  .ltp-header {
    min-height: 48px;
  }

  .ltp-heading {
    min-width: 0;
  }

  .ltp-title {
    margin: 0;
    color: var(--dm-text);
    font-weight: 600;
    line-height: 1.4;
  }

  .ltp-total {
    display: block;
    margin-top: 4px;
    color: var(--dm-text-3);
  }

  .ltp-actions {
    flex-shrink: 0;

    :deep(.ant-btn) {
      width: 42px;
      padding: 0;
    }

    :deep(.ltp-group-action) {
      width: auto;
      padding: 0 14px;
    }

    :deep(.ltp-label-action) {
      width: auto;
      padding: 0 14px;
    }
  }

  .ltp-action-icon {
    font-size: 18px;
    line-height: 1;
  }

  .ltp-search {
    width: 100%;
  }

  .ltp-search-icon {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid var(--dm-text-3);
    border-radius: 50%;
    opacity: 0.7;
    position: relative;

    &::after {
      position: absolute;
      right: -5px;
      bottom: -3px;
      width: 6px;
      height: 2px;
      border-radius: 1px;
      background: var(--dm-text-3);
      content: "";
      transform: rotate(45deg);
    }
  }

  .ltp-content {
    min-height: 0;
    flex: 1;
    margin-top: 16px;
    overflow: hidden;
  }

  .ltp-state {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }

  .ltp-error {
    max-width: 280px;
    margin: 0;
    color: var(--dm-text-2);
    text-align: center;
  }

  @node-height: 60px;
  :deep(.ltp-tree) {
    height: 100%;
    overflow-y: auto;
    background: transparent;

    .ant-tree-treenode {
      height: @node-height;
      align-items: center;
    }

    .ant-tree-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ant-tree-node-content-wrapper {
      height: @node-height;
      min-width: 0;
      padding-left: 10px;
    }
  }
}
</style>
