export type TreeIdentifier = number | string;

export type TreeNode<T> = T & {
  children: TreeNode<T>[];
};

export type TreeVisitCallback<T> = (
  node: T,
  index: number,
  parent: T | null,
  depth: number,
) => boolean | void;

export type TreeMapCallback<T, Result extends object = T & object> = (
  node: T,
  index: number,
  parent: T | null,
  depth: number,
) => Result;

export type TreeMap2Callback<T, Result extends object = T & object> = (
  node: T,
  index: number,
  parent: Result | null,
  depth: number,
) => Result;

export type TreeMapResult<T extends object> = Omit<T, "children"> & {
  children?: TreeMapResult<T>[];
};

export type TreeFilterCallback<T> = (
  node: T,
  index: number,
  parent: T | null,
  depth: number,
) => boolean;

export type TreeSortCallback<T> = (
  left: T,
  right: T,
  parent: T | null,
  depth: number,
) => number;

/** 判断当前父子关系是否会形成直接或间接循环引用。 */
function createsCycle<T extends Record<PropertyKey, unknown>>(
  nodeId: unknown,
  parentId: unknown,
  sourceMap: ReadonlyMap<unknown, T>,
  parentIdKey: keyof T,
): boolean {
  const visited = new Set<unknown>([nodeId]);
  let currentId: unknown = parentId;

  while (currentId !== null && currentId !== undefined) {
    if (visited.has(currentId)) {
      return true;
    }

    visited.add(currentId);
    const parent = sourceMap.get(currentId);

    if (!parent) {
      return false;
    }

    currentId = parent[parentIdKey];
  }

  return false;
}

/**
 * 按指定 id 和父 id 字段把平铺数据转换为树，不修改输入数据。
 * 父节点不存在或存在循环引用的节点会保留为根节点。
 */
export function flatToTree<
  IdKey extends PropertyKey,
  ParentIdKey extends PropertyKey,
  T extends Record<IdKey, TreeIdentifier> &
    Record<ParentIdKey, TreeIdentifier | null | undefined>,
>(items: readonly T[], idKey: IdKey, parentIdKey: ParentIdKey): TreeNode<T>[] {
  const sourceMap = new Map<TreeIdentifier, T>();
  const nodeMap = new Map<TreeIdentifier, TreeNode<T>>();

  items.forEach((item) => {
    const id = item[idKey];

    if (sourceMap.has(id)) {
      throw new Error(`Duplicate tree node id: ${String(id)}`);
    }

    sourceMap.set(id, item);
    nodeMap.set(id, { ...item, children: [] });
  });

  const roots: TreeNode<T>[] = [];

  items.forEach((item) => {
    const id = item[idKey];
    const parentId = item[parentIdKey];
    const node = nodeMap.get(id);
    const parent =
      parentId === null || parentId === undefined
        ? null
        : nodeMap.get(parentId);

    if (!node) {
      return;
    }

    // 无父节点、孤儿节点和循环节点均保留在根级，避免数据静默丢失。
    if (!parent || createsCycle(id, parentId, sourceMap, parentIdKey)) {
      roots.push(node);
      return;
    }

    parent.children.push(node);
  });

  return roots;
}

/**
 * 后序深度优先遍历树，先处理叶子节点再处理分支节点。
 * 回调接收原始节点引用，因此可以直接修改树数据；显式返回 false 时立即中断全部执行。
 */
export function deepEach<T extends { children?: T[] }>(
  tree: readonly T[],
  callback: TreeVisitCallback<T>,
  parent: T | null = null,
  depth = 0,
): boolean {
  for (let index = 0; index < tree.length; index += 1) {
    const node = tree[index];

    const children = node.children;

    if (children && !deepEach(children, callback, node, depth + 1)) {
      // 子树中断时向所有父级传递 false，确保整个遍历立即结束。
      return false;
    }

    // 子节点全部完成后再处理当前节点，确保叶子节点优先于分支节点。
    if (callback(node, index, parent, depth) === false) {
      return false;
    }
  }

  return true;
}

/** 前序深度优先遍历树，先处理分支节点再处理叶子节点。 */
export function deepEach2<T extends { children?: T[] }>(
  tree: readonly T[],
  callback: TreeVisitCallback<T>,
  parent: T | null = null,
  depth = 0,
): boolean {
  for (let index = 0; index < tree.length; index += 1) {
    const node = tree[index];

    if (callback(node, index, parent, depth) === false) {
      return false;
    }

    if (node.children && !deepEach2(node.children, callback, node, depth + 1)) {
      return false;
    }
  }

  return true;
}

/** 后序深度映射树节点，返回新树并保留原树数据不变。 */
export function deepMap<
  T extends { readonly children?: readonly T[] },
  Result extends object = T,
>(
  tree: readonly T[],
  callback: TreeMapCallback<T, Result>,
  parent: T | null = null,
  depth = 0,
): TreeMapResult<Result>[] {
  return tree.map<TreeMapResult<Result>>((node, index) => {
    const children = node.children;
    const mappedChildren = children
      ? deepMap<T, Result>(children, callback, node, depth + 1)
      : undefined;
    const mappedNode = callback(node, index, parent, depth);

    // 回调结果只负责映射当前节点，子节点统一由遍历结果覆盖。
    return mappedChildren
      ? { ...mappedNode, children: mappedChildren }
      : { ...mappedNode };
  });
}

/** 前序深度映射树节点，先映射分支节点再映射叶子节点。 */
export function deepMap2<
  T extends { readonly children?: readonly T[] },
  Result extends object = T,
>(
  tree: readonly T[],
  callback: TreeMap2Callback<T, Result>,
  parent: Result | null = null,
  depth = 0,
): TreeMapResult<Result>[] {
  return tree.map<TreeMapResult<Result>>((node, index) => {
    const mappedNode = callback(node, index, parent, depth);
    const children = node.children;

    if (!children) {
      return { ...mappedNode };
    }

    return {
      ...mappedNode,
      children: deepMap2<T, Result>(children, callback, mappedNode, depth + 1),
    };
  });
}

/** 后序深度排序树节点，先排序子节点再排序当前层，并保持原树不变。 */
export function deepSort<T extends { readonly children?: readonly T[] }>(
  tree: readonly T[],
  callback: TreeSortCallback<T>,
  parent: T | null = null,
  depth = 0,
): T[] {
  const sortedTree = tree.map((node) => {
    const children = node.children;
    const sortedChildren = children
      ? deepSort(children, callback, node, depth + 1)
      : undefined;

    return sortedChildren ? { ...node, children: sortedChildren } : { ...node };
  });

  return sortedTree.sort((left, right) => callback(left, right, parent, depth));
}

/** 前序深度排序树节点，先排序当前层再排序子节点，并保持原树不变。 */
export function deepSort2<T extends { readonly children?: readonly T[] }>(
  tree: readonly T[],
  callback: TreeSortCallback<T>,
  parent: T | null = null,
  depth = 0,
): T[] {
  const sortedTree = tree
    .map((node) => ({ ...node }))
    .sort((left, right) => callback(left, right, parent, depth));

  return sortedTree.map((node) => {
    const children = node.children;

    return children
      ? {
          ...node,
          children: deepSort2(children, callback, node, depth + 1),
        }
      : { ...node };
  });
}

/** 后序过滤树节点，移除回调不通过或不包含叶子节点的分支。 */
export function deepFilter<T extends { readonly children?: readonly T[] }>(
  tree: readonly T[],
  callback: TreeFilterCallback<T>,
  parent: T | null = null,
  depth = 0,
): T[] {
  return tree.reduce<T[]>((result, node, index) => {
    const children = node.children;
    const filteredChildren = children
      ? deepFilter(children, callback, node, depth + 1)
      : [];
    const filteredNode = children
      ? { ...node, children: filteredChildren }
      : { ...node };

    // 后序过滤将已处理的子树交给回调，使分支可依据剩余后代决定是否保留。
    if (!callback(filteredNode, index, parent, depth)) {
      return result;
    }

    result.push(filteredNode);
    return result;
  }, []);
}

/** 前序过滤树节点，先判断分支节点再处理其子节点。 */
export function deepFilter2<T extends { readonly children?: readonly T[] }>(
  tree: readonly T[],
  callback: TreeFilterCallback<T>,
  parent: T | null = null,
  depth = 0,
): T[] {
  return tree.reduce<T[]>((result, node, index) => {
    if (!callback(node, index, parent, depth)) {
      return result;
    }

    const children = node.children;

    if (!children) {
      result.push({ ...node });
      return result;
    }

    const filteredChildren = deepFilter2(children, callback, node, depth + 1);

    result.push({ ...node, children: filteredChildren });

    return result;
  }, []);
}

export const treeUtils = {
  deepFilter,
  deepFilter2,
  deepEach,
  deepEach2,
  deepMap,
  deepMap2,
  deepSort,
  deepSort2,
  flatToTree,
};

export type TreeUtils = typeof treeUtils;
