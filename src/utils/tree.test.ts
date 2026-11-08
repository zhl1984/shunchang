import { describe, expect, it } from "vitest";

import {
  deepFilter,
  deepMap,
  deepMap2,
  deepSort,
  deepSort2,
  type TreeNode,
} from "@/utils/tree";

type SourceNode = {
  id: string;
  name: string;
  code: string;
};

type SimpleNode = {
  id: string;
  name: string;
};

const tree: TreeNode<SourceNode>[] = [
  {
    id: "group-1",
    name: "分组",
    code: "GROUP",
    children: [
      {
        id: "label-1",
        name: "标签",
        code: "LABEL",
        children: [],
      },
    ],
  },
];

const readonlyTree = [
  {
    id: "readonly-group",
    name: "只读分组",
    code: "READONLY_GROUP",
    tools: ["mask"],
    children: [
      {
        id: "readonly-label",
        name: "只读标签",
        code: "READONLY_LABEL",
        tools: ["bbox"],
      },
    ],
  },
] as const;

describe("readonly tree inputs", () => {
  it("accepts deeply readonly nodes in non-mutating helpers", () => {
    const mapped = deepMap(readonlyTree, (node) => ({
      id: node.id,
      name: node.name,
    }));
    const filtered = deepFilter(readonlyTree, () => true);
    const sorted = deepSort(readonlyTree, (left, right) =>
      left.name.localeCompare(right.name),
    );
    expect(mapped[0]?.children?.[0]?.id).toBe("readonly-label");
    expect(filtered[0]?.children[0]?.tools).toEqual(["bbox"]);
    expect(sorted[0]?.tools).toEqual(["mask"]);
  });
});

describe("tree filtering", () => {
  it("passes filtered children to the parent callback", () => {
    const source = [
      {
        id: "group",
        children: [
          { id: "keep", children: [] },
          { id: "remove", children: [] },
        ],
      },
    ];
    const parentChildren: string[][] = [];

    const result = deepFilter(source, (node) => {
      if (node.id === "group") {
        parentChildren.push(node.children.map((child) => child.id));
        return node.children.length > 0;
      }

      return node.id === "keep";
    });

    expect(parentChildren).toEqual([["keep"]]);
    expect(result[0]?.children.map((node) => node.id)).toEqual(["keep"]);
  });
});

describe("tree mapping", () => {
  it("allows deepMap to map nodes into a simpler result type", () => {
    const result = deepMap<
      SourceNode & { children?: SourceNode[] },
      SimpleNode
    >(tree, (node) => ({ id: node.id, name: node.name }));

    expect(result).toEqual([
      {
        id: "group-1",
        name: "分组",
        children: [{ id: "label-1", name: "标签", children: [] }],
      },
    ]);
  });

  it("allows deepMap2 to map nodes into a simpler result type", () => {
    const result = deepMap2<
      SourceNode & { children?: SourceNode[] },
      SimpleNode
    >(tree, (node) => ({ id: node.id, name: node.name }));

    expect(result).toEqual([
      {
        id: "group-1",
        name: "分组",
        children: [{ id: "label-1", name: "标签", children: [] }],
      },
    ]);
  });

  it("passes the mapped parent result to deepMap2 child callbacks", () => {
    const result = deepMap2(tree, (node, _index, parent) => ({
      id: node.id,
      name: node.name,
      path: parent ? [...parent.path, node.id] : [node.id],
    }));

    expect(result[0]?.children?.[0]?.path).toEqual(["group-1", "label-1"]);
  });
});

const sortableTree: TreeNode<SourceNode>[] = [
  {
    id: "group-2",
    name: "B 分组",
    code: "GROUP_B",
    children: [
      {
        id: "label-4",
        name: "D 标签",
        code: "LABEL_D",
        children: [],
      },
      {
        id: "label-3",
        name: "C 标签",
        code: "LABEL_C",
        children: [],
      },
    ],
  },
  {
    id: "group-1",
    name: "A 分组",
    code: "GROUP_A",
    children: [
      {
        id: "label-2",
        name: "B 标签",
        code: "LABEL_B",
        children: [],
      },
      {
        id: "label-1",
        name: "A 标签",
        code: "LABEL_A",
        children: [],
      },
    ],
  },
];

describe("tree sorting", () => {
  it.each([
    ["deepSort", deepSort],
    ["deepSort2", deepSort2],
  ])("allows %s to recursively sort a copied tree", (_, sorter) => {
    const result = sorter(sortableTree, (left, right) =>
      left.name.localeCompare(right.name),
    );

    expect(result.map((node) => node.name)).toEqual(["A 分组", "B 分组"]);
    expect(result[0]?.children.map((node) => node.name)).toEqual([
      "A 标签",
      "B 标签",
    ]);
    expect(sortableTree.map((node) => node.name)).toEqual(["B 分组", "A 分组"]);
    expect(sortableTree[1]?.children.map((node) => node.name)).toEqual([
      "B 标签",
      "A 标签",
    ]);
  });

  it("runs deepSort child comparisons before the current level", () => {
    const comparisonDepths: number[] = [];

    deepSort(sortableTree, (left, right, _parent, depth) => {
      comparisonDepths.push(depth);
      return left.name.localeCompare(right.name);
    });

    expect(comparisonDepths[0]).toBe(1);
    expect(comparisonDepths[comparisonDepths.length - 1]).toBe(0);
  });

  it("runs deepSort2 current-level comparisons before child levels", () => {
    const comparisonDepths: number[] = [];

    deepSort2(sortableTree, (left, right, _parent, depth) => {
      comparisonDepths.push(depth);
      return left.name.localeCompare(right.name);
    });

    expect(comparisonDepths[0]).toBe(0);
    expect(comparisonDepths[comparisonDepths.length - 1]).toBe(1);
  });
});
