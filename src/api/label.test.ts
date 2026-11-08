import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMocks = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@/api/http", () => ({ default: httpMocks }));

import {
  createLabelPropertyApi,
  createLabelTreeNodeApi,
  deleteLabelPropertyApi,
  deleteLabelTreeNodeApi,
  getLabelDetailApi,
  saveLabelPropertyToolBindingsApi,
  updateLabelPropertyApi,
  updateLabelTreeNodeApi,
  type LabelAttributeInput,
  type LabelTreeNodeInput,
} from "@/api/label";

const backendNode = {
  id: 12,
  parentId: 0,
  nodeType: "LABEL" as const,
  nodeName: "肺结节",
  nodeDescription: null,
  sortOrder: 1,
  children: [],
};

const backendDetail = {
  id: 12,
  labelName: "肺结节",
  labelDescription: null,
  attributes: [
    {
      id: 101,
      attributeName: "长径",
      config: {
        valueType: "NUMBER" as const,
        defaultValue: 10,
        readOnly: false,
        required: true,
        constraint: { min: 0, max: null, unit: "mm" },
      },
      attributeDescription: "最长径",
      sortOrder: 1,
      toolBindings: [
        {
          toolCode: "bbox",
          toolName: "BBox",
          toolDescription: null,
          toolPropertyCode: "long_diameter",
          toolPropertyName: "长径",
        },
      ],
    },
  ],
};

beforeEach(() => {
  Object.values(httpMocks).forEach((mock) => mock.mockReset());
});

describe("label node API", () => {
  it("creates a node with the documented request body", async () => {
    httpMocks.post.mockResolvedValue({
      data: { code: "0", message: "success", data: backendNode },
    });
    const input: LabelTreeNodeInput = {
      parentId: 0,
      nodeType: "LABEL",
      nodeName: "肺结节",
      nodeDescription: null,
    };

    const result = await createLabelTreeNodeApi(input);

    expect(httpMocks.post).toHaveBeenCalledWith("/label-nodes", input);
    expect(result).toEqual(backendNode);
  });

  it("updates a node with all required fields", async () => {
    httpMocks.put.mockResolvedValue({
      data: { code: "0", message: "success", data: backendNode },
    });
    const input: LabelTreeNodeInput = {
      parentId: 0,
      nodeType: "LABEL",
      nodeName: "肺结节",
      nodeDescription: null,
    };

    await updateLabelTreeNodeApi(12, input);

    expect(httpMocks.put).toHaveBeenCalledWith("/label-nodes/12", input);
  });

  it("deletes a node and validates the business code", async () => {
    httpMocks.delete.mockResolvedValue({
      data: { code: "0", message: "success", data: null },
    });

    await deleteLabelTreeNodeApi(12);

    expect(httpMocks.delete).toHaveBeenCalledWith("/label-nodes/12");
  });
});

describe("label property API", () => {
  it("returns the documented label detail without renaming attribute fields", async () => {
    httpMocks.get.mockResolvedValue({
      data: { code: "0", message: "success", data: backendDetail },
    });

    const result = await getLabelDetailApi(12);

    expect(httpMocks.get).toHaveBeenCalledWith("/labels/12");
    expect(result).toEqual(backendDetail);
  });

  it("creates an attribute by converting the frontend input", async () => {
    httpMocks.post.mockResolvedValue({
      data: { code: "0", message: "success", data: backendDetail },
    });
    const input: LabelAttributeInput = {
      attributeName: "长径",
      attributeDescription: "最长径",
      config: {
        valueType: "NUMBER",
        defaultValue: 10,
        readOnly: false,
        required: true,
        constraint: { min: 0, max: null, unit: "mm" },
      },
    };

    const result = await createLabelPropertyApi(12, input);

    expect(httpMocks.post).toHaveBeenCalledWith("/labels/12/attributes", {
      attributeName: "长径",
      attributeDescription: "最长径",
      config: {
        valueType: "NUMBER",
        defaultValue: 10,
        readOnly: false,
        required: true,
        constraint: { min: 0, max: null, unit: "mm" },
      },
    });
    expect(result).toEqual(backendDetail);
  });

  it("updates and deletes an attribute using both documented path IDs", async () => {
    httpMocks.put.mockResolvedValue({
      data: { code: "0", message: "success", data: backendDetail },
    });
    httpMocks.delete.mockResolvedValue({
      data: { code: "0", message: "success", data: null },
    });
    const input: LabelAttributeInput = {
      attributeName: "长径",
      attributeDescription: null,
      config: {
        valueType: "NUMBER",
        defaultValue: null,
        readOnly: false,
        required: false,
        constraint: { min: null, max: null, unit: null },
      },
    };

    await updateLabelPropertyApi(12, 101, input);
    await deleteLabelPropertyApi(12, 101);

    expect(httpMocks.put).toHaveBeenCalledWith(
      "/labels/12/attributes/101",
      expect.objectContaining({ attributeName: "长径" }),
    );
    expect(httpMocks.delete).toHaveBeenCalledWith("/labels/12/attributes/101");
  });

  it("replaces tool bindings with the documented snapshot fields", async () => {
    httpMocks.put.mockResolvedValue({
      data: { code: "0", message: "success", data: backendDetail },
    });
    const bindings = backendDetail.attributes[0].toolBindings;

    const result = await saveLabelPropertyToolBindingsApi(12, 101, bindings);

    expect(httpMocks.put).toHaveBeenCalledWith(
      "/labels/12/attributes/101/tool-bindings",
      { bindings },
    );
    expect(result).toEqual(backendDetail);
  });

  it("rejects non-zero business codes and missing success data", async () => {
    httpMocks.get
      .mockResolvedValueOnce({
        data: { code: "409", message: "标签不存在", data: null },
      })
      .mockResolvedValueOnce({
        data: { code: "0", message: "success", data: null },
      });

    await expect(getLabelDetailApi(12)).rejects.toThrow("标签不存在");
    await expect(getLabelDetailApi(12)).rejects.toThrow("标签详情数据为空");
  });
});
