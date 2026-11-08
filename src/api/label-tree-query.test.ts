import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/api/http", () => ({
  default: httpMocks,
}));

import { getLabelTreeNodeListApi } from "@/api/label";

const backendTree = [
  {
    id: 1,
    parentId: 0,
    nodeType: "GROUP" as const,
    nodeName: "肺部 CT 标签组",
    nodeDescription: null,
    sortOrder: 1,
    children: [
      {
        id: 101,
        parentId: 1,
        nodeType: "LABEL" as const,
        nodeName: "肺结节",
        nodeDescription: "通用肺结节",
        sortOrder: 1,
        children: [],
      },
    ],
  },
];

beforeEach(() => {
  httpMocks.get.mockReset();
});

describe("getLabelTreeNodeListApi", () => {
  it("requests and unwraps the backend label tree without renaming fields", async () => {
    httpMocks.get.mockResolvedValue({
      data: { code: "0", message: "success", data: backendTree },
    });

    const result = await getLabelTreeNodeListApi();

    expect(httpMocks.get).toHaveBeenCalledWith("/label-nodes/tree");
    expect(result).toEqual(backendTree);
  });

  it("uses an empty list when a successful tree response has no data", async () => {
    httpMocks.get.mockResolvedValue({
      data: { code: "0", message: "success", data: null },
    });

    await expect(getLabelTreeNodeListApi()).resolves.toEqual([]);
  });

  it("throws the backend message when the business code fails", async () => {
    httpMocks.get.mockResolvedValue({
      data: { code: "400", message: "请求参数错误", data: null },
    });

    await expect(getLabelTreeNodeListApi()).rejects.toThrow("请求参数错误");
  });
});
