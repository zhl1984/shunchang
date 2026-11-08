import { ref, shallowRef } from "vue";

import { defineStore } from "pinia";

import { getLabelTreeNodeListApi, type LabelTreeNode } from "@/api/label";
import { deepEach2, deepMap2, type TreeMapResult } from "@/utils/tree";

export type LabelLoadStatus = "uninitialized" | "loading" | "initialized";

export type SimpleLabelTreeNode = TreeMapResult<{
  value: string | number;
  label: string;
}>;

export type LabelTreeDataNode = LabelTreeNode & {
  key: string | number;
  path: Array<string | number>;
};

export type LabelTreeStoreNode = TreeMapResult<LabelTreeDataNode>;

export const useLabelStore = defineStore("label", () => {
  const list = shallowRef<LabelTreeStoreNode[]>([]);
  const tree = shallowRef<LabelTreeStoreNode[]>([]);
  const simpleTree = shallowRef<SimpleLabelTreeNode[]>([]);
  const mapping = shallowRef<Map<string | number, LabelTreeStoreNode>>(
    new Map(),
  );
  const status = ref<LabelLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** 首次使用时加载标签节点，并合并并发初始化请求。 */
  function initialize(): Promise<void> {
    if (status.value === "initialized") {
      return Promise.resolve();
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    status.value = "loading";
    loadingPromise = getLabelTreeNodeListApi()
      .then((data) => {
        const nextTree = deepMap2<LabelTreeNode, LabelTreeDataNode>(
          data,
          (node, _index, parent) => ({
            ...node,
            key: node.id,
            path: parent ? parent.path.concat(node.id) : [node.id],
          }),
        );
        const nextList: LabelTreeStoreNode[] = [];
        const nextMapping = new Map<string | number, LabelTreeStoreNode>();

        // 同一批增强节点生成列表和映射，避免不同派生结构引用不同版本的数据。
        deepEach2(nextTree, (node) => {
          nextList.push(node);
          nextMapping.set(node.id, node);
        });

        list.value = nextList;
        tree.value = nextTree;
        simpleTree.value = deepMap2(nextTree, (node) => ({
          value: node.id,
          label: node.nodeName,
        }));
        mapping.value = nextMapping;
        status.value = "initialized";
      })
      .catch((error: unknown) => {
        // 加载失败后恢复初始状态，使页面或后续调用能够重新尝试。
        status.value = "uninitialized";
        throw error;
      })
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  /** 强制重新读取标签节点，用于 CRUD 操作后同步所有调用方。 */
  async function refresh(): Promise<void> {
    status.value = "uninitialized";
    await initialize();
  }

  // 获取 store 即开始懒加载，调用方仍可通过 initialize 等待同一请求完成。
  void initialize().catch(() => undefined);

  return {
    // 铺平的节点
    list,
    // 节点id和节点信息的映射Map
    mapping,
    // 刷新数据的方法
    refresh,
    // 级联结构可用数据
    simpleTree,
    // 数据状态
    status,
    // 原始数据
    tree,
  };
});
