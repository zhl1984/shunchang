<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { /* deepEach2,  */ deepMap2, deepFilter } from "@/utils/tree";
import type { DmTableColumnManagerConfig, DmTableRuntimeColumn } from "./types";
import APopover from "ant-design-vue/es/popover";
import AButton from "ant-design-vue/es/button";
import { BarsOutlined } from "@ant-design/icons-vue";

type ColumnTreeNode = {
  key: string;
  title: string;
  disabled?: boolean;
  disableCheckbox?: boolean;
  children?: ColumnTreeNode[];
  pid?: string;
  index: number;
  column: DmTableRuntimeColumn;
};
type DropInfo = {
  dragNode: { key: string | number; disabled?: boolean };
  node: { key: string | number; disabled?: boolean };
  dropPosition: number;
  dropToGap: boolean;
};

const props = withDefaults(
  defineProps<{
    columns: DmTableRuntimeColumn[];
    config?: boolean | DmTableColumnManagerConfig;
  }>(),
  { config: false },
);
const emit = defineEmits<{
  (event: "change", columns: DmTableRuntimeColumn[]): void;
  (event: "reset"): void;
}>();
const { t } = useI18n();
const visibleState = ref<Record<string, boolean>>({});
const initialColumns = ref<DmTableRuntimeColumn[]>([]);
const initialTreeData = ref<ColumnTreeNode[]>([]);
const treeData = ref<ColumnTreeNode[]>([]);
const nodeMap = new Map<string, ColumnTreeNode>();
const maxTreeDepth = ref<number>(0);
const checkedKeys = ref<string[]>([]);
const treeSections = computed(() =>
  treeData.value.reduce(
    (sections, node) => {
      const section =
        node.column.fixed === "left"
          ? sections[0]
          : node.column.fixed === "right"
            ? sections[2]
            : sections[1];
      section.data.push(node);
      return sections;
    },
    [
      { key: "left", data: [] as ColumnTreeNode[], draggable: false },
      { key: "center", data: [] as ColumnTreeNode[], draggable: true },
      { key: "right", data: [] as ColumnTreeNode[], draggable: false },
    ],
  ),
);

const columnManagerTitle = computed(() => {
  if (props.config && typeof props.config === "object") {
    return props.config.title ?? t("components.table.columnManager.title");
  }
  return t("components.table.columnManager.title");
});

function onColumnsChange(): void {
  // 三棵树按固定左、普通、固定右的区域顺序合并，确保输出列顺序稳定。
  const columns = treeSections.value.flatMap((section) =>
    deepFilter(
      section.data,
      (item) => item.column.visible !== false || Boolean(item.children?.length),
    ),
  );
  emit("change", treeToColumns(columns));
}

/** 生成稳定列 key，供树节点、勾选状态和拖拽定位共同使用。 */
function getColumnKey(column: DmTableRuntimeColumn): string {
  return String(column.key ?? column.dataIndex ?? "");
}

/** 从 client 数据源收集 enum 列选项，并与调用方显式配置的选项合并去重。 */
/** 更新列显隐，并回写完整列树。 */
function handleCheck(
  keys: Array<string | number> | { checked: Array<string | number> },
) {
  const nextKeys = (Array.isArray(keys) ? keys : keys.checked).map(String);
  checkedKeys.value = nextKeys;
  const selected = new Set(nextKeys);
  const update = (tree: ColumnTreeNode[]): ColumnTreeNode[] =>
    tree.map((node) => ({
      ...node,
      column: {
        ...node.column,
        visible: node.column.fixed
          ? (node.column.visible ?? true)
          : selected.has(node.key),
      },
      children: node.children ? update(node.children) : undefined,
    }));
  treeData.value = update(treeData.value);
  onColumnsChange();
}

/** 在同一父级数组内移动节点；跨层级或拖到节点内部的操作直接忽略。 */
function handleDrop(info: DropInfo) {
  if (info.dragNode.disabled) return;
  const sourceNode = nodeMap.get(String(info.dragNode.key));
  const targetNode = nodeMap.get(String(info.node.key));
  if (!sourceNode || !targetNode || sourceNode.pid !== targetNode.pid) return;
  if (!info.dropToGap) return;
  const nextSiblings = sourceNode.pid
    ? nodeMap.get(sourceNode.pid)?.children
    : treeData.value;
  if (!nextSiblings) return;
  const sourceIndex = nextSiblings.findIndex(
    (node) => node.key === sourceNode.key,
  );
  const targetIndex = nextSiblings.findIndex(
    (node) => node.key === targetNode.key,
  );
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const [moved] = nextSiblings.splice(sourceIndex, 1);
  // 删除源节点后，目标节点在源节点之前时索引不变，否则目标索引左移一位。
  const adjustedTargetIndex = targetIndex - (sourceIndex < targetIndex ? 1 : 0);
  const insertIndex = adjustedTargetIndex + (info.dropPosition > 0 ? 1 : 0);
  nextSiblings.splice(insertIndex, 0, moved);
  onColumnsChange();
}

/** 恢复首次载入的完整树结构、顺序和显隐状态。 */
function reset() {
  visibleState.value = {};
  treeData.value = cloneTree(initialTreeData.value);
  checkedKeys.value = collectCheckedKeys(treeData.value);
  onColumnsChange();
}

/** 递归收集恢复后的可见列，确保树组件勾选状态与表格列保持一致。 */
function collectCheckedKeys(tree: ColumnTreeNode[]): string[] {
  return tree.flatMap((node) => [
    ...((node.column.visible ?? true) ? [node.key] : []),
    ...(node.children ? collectCheckedKeys(node.children) : []),
  ]);
}

/** 将字段管理器内部树节点转换为表格使用的列配置，避免暴露节点元数据。 */
function treeToColumns(tree: ColumnTreeNode[]): DmTableRuntimeColumn[] {
  return tree.map((node) => ({
    ...node.column,
    children: node.children ? treeToColumns(node.children) : undefined,
  }));
}

watch(
  () => props.columns,
  (newValue /* , oldValue */) => {
    // 更新树结构数据
    checkedKeys.value = [];
    maxTreeDepth.value = 0;
    nodeMap.clear();
    treeData.value = deepMap2<DmTableRuntimeColumn, ColumnTreeNode>(
      newValue || [],
      (column, index, parent, depth) => {
        // 更新最大深度
        const key = getColumnKey(column);
        maxTreeDepth.value = Math.max(depth, maxTreeDepth.value);
        if (column.visible ?? true) {
          checkedKeys.value.push(key);
        }
        const treeNode = {
          key,
          title: String(column.title ?? ""),
          disabled: Boolean(column.fixed),
          disableCheckbox: Boolean(column.fixed),
          pid: parent ? getColumnKey(parent) : undefined,
          index,
          column,
        };
        if (nodeMap.has(key) && import.meta.env.DEV) {
          throw new Error(`Duplicate column key: ${key}`);
        }
        nodeMap.set(key, treeNode);
        return treeNode;
      },
    );
    // 更新初始值
    // const newKeys: string[] = [];
    // const oldKeys: string[] = [];
    // deepEach2(newValue || [], (column) => {
    //   newKeys.push(getColumnKey(column));
    // });
    // deepEach2(oldValue || [], (column) => {
    //   oldKeys.push(getColumnKey(column));
    // });
    // const isSame =
    //   newKeys.length > 0 &&
    //   newKeys.length === oldKeys.length &&
    //   newKeys.every((v, i) => v === oldKeys[i]);
    // if (!isSame) {
    if (!initialColumns.value.length) {
      // 如果列变了，就更新初始数组
      initialColumns.value = deepMap2(newValue || [], (column) => ({
        ...column,
      }));
      initialTreeData.value = cloneTree(treeData.value);
      // 初始化触发一次同步
      onColumnsChange();
    }
  },
  { immediate: true },
);

function cloneTree(tree: ColumnTreeNode[]): ColumnTreeNode[] {
  return tree.map((node) => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}
</script>

<template>
  <APopover trigger="click" placement="bottomRight">
    <template #content>
      <div
        class="dm-table-column-manager"
        :class="{ 'dm-tcm--flat': maxTreeDepth === 0 }"
      >
        <a-tree
          v-for="section in treeSections"
          :key="section.key"
          checkable
          :draggable="section.draggable"
          :tree-data="section.data"
          :checked-keys="checkedKeys"
          @check="handleCheck"
          @drop="handleDrop"
        />
        <div class="justify-end">
          <a-button
            v-if="
              props.config !== false &&
              (typeof props.config === 'boolean' ||
                props.config.resettable !== false)
            "
            type="link"
            @click="reset"
            >{{ t("components.table.columnManager.reset") }}</a-button
          >
        </div>
      </div>
    </template>
    <a-tooltip :title="columnManagerTitle">
      <AButton size="large" :aria-label="columnManagerTitle">
        <template #icon><BarsOutlined /></template>
      </AButton>
    </a-tooltip>
  </APopover>
</template>

<style scoped>
.dm-tcm--flat :deep(.ant-tree .ant-tree-switcher) {
  display: none;
}
.dm-table-column-manager :deep(.ant-tree .ant-tree-checkbox) {
  margin-block-start: 0;
}
</style>
