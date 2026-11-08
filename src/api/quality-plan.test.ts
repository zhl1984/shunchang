import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@/api/http", () => ({ default: httpMock }));

import {
  createQualityPlanApi,
  deleteQualityPlanApi,
  getQualityPlanDetailApi,
  getQualityPlanErrorMessage,
  getQualityPlanListApi,
  QUALITY_PLAN_DEFAULT_PAGE_SIZE,
  updateQualityPlanApi,
  type QualityPlanInput,
} from "./quality-plan";

const createInput = (): QualityPlanInput => ({
  name: "肺部 CT 质检方案",
  description: "用于肺部 CT 标注结果的分层质量检查。",
  levels: [
    {
      draftKey: "draft-level-1",
      name: "初检",
      levelOrder: 1,
      scope: "full",
      sampleRate: 100,
      executionMode: "single",
      assignmentMode: "automatic",
    },
    {
      draftKey: "draft-level-2",
      name: "复检",
      levelOrder: 2,
      scope: "sample",
      sampleRate: 20,
      executionMode: "single",
      assignmentMode: "automatic",
    },
  ],
});

const success = <T>(data: T) => ({
  data: { code: "0", message: "success", data },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("quality plan dictionary options", () => {
  it("keeps dictionary options outside the component", async () => {
    const api = await import("./quality-plan");

    expect(api.QUALITY_PLAN_SCOPE_OPTIONS).toEqual([
      { value: "full", labelKey: "qualityPlan.scope.full" },
      { value: "sample", labelKey: "qualityPlan.scope.sample" },
    ]);
  });
});

describe("quality plan HTTP API", () => {
  it("requests pageNo/pageSize and maps list DTOs", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        pageNo: 2,
        pageSize: QUALITY_PLAN_DEFAULT_PAGE_SIZE,
        total: 21,
        list: [
          {
            id: 9,
            schemeName: "肺部 CT 质检方案",
            schemeDescription: null,
            levelCount: 2,
          },
        ],
      }),
    );

    const result = await getQualityPlanListApi({ keyword: "肺部", page: 2 });

    expect(httpMock.get).toHaveBeenCalledWith("/quality-schemes", {
      params: { keyword: "肺部", pageNo: 2, pageSize: 20 },
    });
    expect(result).toEqual({
      list: [
        {
          id: 9,
          name: "肺部 CT 质检方案",
          description: "",
          levelCount: 2,
        },
      ],
      total: 21,
      page: 2,
      pageSize: 20,
    });
  });

  it("maps detail DTOs and sorts levels", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        id: 9,
        schemeName: "肺部 CT 质检方案",
        schemeDescription: "描述",
        levels: [
          {
            id: 12,
            levelName: "复检",
            levelOrder: 2,
            checkScope: "SAMPLED",
            samplingRatio: 20,
            executionType: "SINGLE",
            assignmentType: "AUTO",
          },
          {
            id: 11,
            levelName: "初检",
            levelOrder: 1,
            checkScope: "FULL",
            samplingRatio: 100,
            executionType: "SINGLE",
            assignmentType: "AUTO",
          },
        ],
      }),
    );

    const result = await getQualityPlanDetailApi(9);

    expect(httpMock.get).toHaveBeenCalledWith("/quality-schemes/9");
    expect(result.levels.map((level) => level.name)).toEqual(["初检", "复检"]);
    expect(result.levels[0]).toMatchObject({
      id: 11,
      scope: "full",
      executionMode: "single",
      assignmentMode: "automatic",
    });
  });

  it("converts create and update inputs to the formal DTO", async () => {
    const detail = {
      id: 9,
      schemeName: "肺部 CT 质检方案",
      schemeDescription: "用于联调",
      levels: [
        {
          id: 11,
          levelName: "初检",
          levelOrder: 1,
          checkScope: "FULL" as const,
          samplingRatio: 100,
          executionType: "SINGLE",
          assignmentType: "AUTO",
        },
      ],
    };
    httpMock.post.mockResolvedValueOnce(success(detail));
    httpMock.put.mockResolvedValueOnce(success(detail));

    await createQualityPlanApi(createInput());
    await updateQualityPlanApi(9, createInput());

    const expectedBody = {
      schemeName: "肺部 CT 质检方案",
      schemeDescription: "用于肺部 CT 标注结果的分层质量检查。",
      levels: [
        {
          levelName: "初检",
          levelOrder: 1,
          checkScope: "FULL",
          samplingRatio: 100,
          executionType: "SINGLE",
          assignmentType: "AUTO",
        },
        {
          levelName: "复检",
          levelOrder: 2,
          checkScope: "SAMPLED",
          samplingRatio: 20,
          executionType: "SINGLE",
          assignmentType: "AUTO",
        },
      ],
    };
    expect(httpMock.post).toHaveBeenCalledWith(
      "/quality-schemes",
      expectedBody,
    );
    expect(httpMock.put).toHaveBeenCalledWith(
      "/quality-schemes/9",
      expectedBody,
    );
  });

  it("preserves future dictionary values and rejects invalid sample rates", async () => {
    httpMock.post.mockResolvedValueOnce(
      success({
        id: 10,
        schemeName: "未来字典方案",
        schemeDescription: null,
        levels: [],
      }),
    );

    const input = createInput();
    input.levels = [
      {
        ...input.levels[0]!,
        executionMode: "future-cross-check",
        assignmentMode: "future-group",
      },
    ];
    await createQualityPlanApi(input);

    expect(httpMock.post.mock.calls[0]?.[1]).toMatchObject({
      levels: [
        {
          executionType: "future-cross-check",
          assignmentType: "future-group",
        },
      ],
    });

    await expect(
      createQualityPlanApi({
        ...createInput(),
        levels: [{ ...createInput().levels[1]!, sampleRate: 1.5 }],
      }),
    ).rejects.toMatchObject({ code: "160025" });
  });

  it("throws business messages for non-zero responses and deletes logically", async () => {
    httpMock.get.mockResolvedValueOnce({
      data: { code: "169999", message: "后端原始错误", data: null },
    });
    await expect(getQualityPlanListApi()).rejects.toMatchObject({
      code: "169999",
      message: "后端原始错误",
    });

    httpMock.delete.mockResolvedValueOnce({
      data: { code: "0", message: "success", data: null },
    });
    await deleteQualityPlanApi(9);
    expect(httpMock.delete).toHaveBeenCalledWith("/quality-schemes/9");
  });
});

describe("quality plan error display", () => {
  it("shows backend messages from module and HTTP errors", async () => {
    const api = await import("./quality-plan");

    expect(
      getQualityPlanErrorMessage(
        new api.QualityPlanApiError("169999", "后端原始错误"),
        "页面兜底错误",
      ),
    ).toBe("后端原始错误");
    expect(
      getQualityPlanErrorMessage(new Error("HTTP 联调失败"), "页面兜底错误"),
    ).toBe("HTTP 联调失败");
  });
});
