import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api/http", () => ({ default: httpMock }));

import {
  assignAnnotationTaskApi,
  completeIterativeAnnotationTaskApi,
  getAnnotationTaskDetailApi,
  getAnnotationTaskLabelConfigApi,
  getAnnotationTaskListApi,
  getAnnotationTaskOhifStudyInstanceUidApi,
  getAnnotationTaskQualityRecordsApi,
  getAnnotationTaskValidationRecordsApi,
  submitAnnotationTaskQualityApi,
} from "@/api/annotation-task";

describe("annotation task API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("completes iterative pre-annotation tasks", async () => {
    httpMock.post.mockResolvedValueOnce({
      data: { code: "0", message: "success", data: true },
    });
    await expect(completeIterativeAnnotationTaskApi("9001")).resolves.toBe(
      true,
    );
    expect(httpMock.post).toHaveBeenCalledWith(
      "/annotation-tasks/9001/complete-iterative",
    );
  });

  it("maps list query and backend fields", async () => {
    httpMock.get.mockResolvedValueOnce({
      data: {
        code: "0",
        data: {
          summary: {
            total: 1,
            annotating: 1,
            qualityChecking: 0,
            reworking: 0,
            completed: 0,
          },
          pageNo: 2,
          pageSize: 10,
          total: 1,
          list: [
            {
              id: 9001,
              taskName: "AAA·第1批常规任务",
              status: "ANNOTATING",
              annotatorId: 3001,
              annotatorName: "许安",
              sampleCount: 6,
              startedAt: "2026-08-01T09:00:00.000+08:00",
              dueAt: null,
            },
          ],
        },
      },
    });
    const result = await getAnnotationTaskListApi({
      ascSort: false,
      status: "qualityChecking",
      keyword: " AAA ",
      page: 2,
      sortField: "deadline",
    });
    expect(httpMock.get).toHaveBeenCalledWith("/annotation-tasks", {
      params: {
        pageNo: 2,
        pageSize: 10,
        statusFilter: "QUALITY_CHECKING",
        keyword: "AAA",
        sortField: "deadline",
        ascSort: false,
      },
    });
    expect(result.list[0]).toMatchObject({
      id: "9001",
      displayName: "AAA·第1批常规任务",
      status: "annotating",
      deadlineAt: null,
    });
  });

  it("maps detail samples and rule-check records", async () => {
    httpMock.get
      .mockResolvedValueOnce({
        data: {
          code: "0",
          data: {
            id: 9001,
            projectCode: "DEMO_PROJECT",
            taskType: "NORMAL_ANNOTATION",
            batchNo: 1,
            taskName: "AAA·第1批常规任务",
            annotatorId: 3001,
            annotatorName: "许安",
            status: "REWORKING",
            sampleCount: 1,
            samples: [
              {
                itemId: 5003,
                itemName: "样本 003",
                itemOrder: 3,
                itemStatus: "REWORKING",
                latestCheckIssueCount: 1,
                latestCheckIssues: [
                  {
                    issueSource: "RULE",
                    issueLevel: "MUST_FIX",
                    annotationObjectId: 7103,
                    annotationObjectName: "肺部结构 1",
                    description: "规则命中问题描述。",
                  },
                ],
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: "0",
          data: {
            pageNo: 1,
            pageSize: 100,
            total: 1,
            list: [
              {
                id: 8001,
                result: "FAIL",
                createdAt: "2026-08-04T14:08:31.000+08:00",
                rules: [
                  {
                    ruleId: 6001,
                    ruleName: "实性模糊结节分级约束",
                    description: "规则描述",
                    samples: [],
                  },
                ],
              },
            ],
          },
        },
      });
    const detail = await getAnnotationTaskDetailApi("9001");
    const records = await getAnnotationTaskValidationRecordsApi("9001");
    expect(detail.samples[0]).toMatchObject({
      id: "5003",
      status: "reworking",
      issueLevel: "mustFix",
      issueCount: 1,
    });
    expect(records[0]).toMatchObject({
      id: "8001",
      result: "failed",
      rules: [{ id: "6001", name: "实性模糊结节分级约束" }],
    });
  });

  it("posts quality submission and unwraps the result", async () => {
    httpMock.post.mockResolvedValueOnce({
      data: {
        code: "0",
        data: {
          ruleCheckRecordId: 8001,
          ruleCheckResult: "PASS",
          annotationTaskId: 9001,
          qualityTaskId: 9101,
        },
      },
    });
    await expect(submitAnnotationTaskQualityApi("9001")).resolves.toEqual({
      ruleCheckRecordId: 8001,
      ruleCheckResult: "PASS",
      annotationTaskId: 9001,
      qualityTaskId: 9101,
    });
    expect(httpMock.post).toHaveBeenCalledWith(
      "/annotation-tasks/9001/submit-quality",
    );
  });

  it("maps quality records and forwards their filters", async () => {
    httpMock.get.mockResolvedValueOnce({
      data: {
        code: "0",
        data: {
          pageNo: 2,
          pageSize: 10,
          total: 1,
          list: [
            {
              id: 8201,
              result: "FAIL",
              createdAt: "2026-08-04T18:30:26.000+08:00",
              submitterName: "许安",
              inspectorName: "韩真",
              samples: [
                {
                  itemId: 5003,
                  itemName: "样本 003",
                  itemOrder: 3,
                  issues: [
                    {
                      issueSource: "MANUAL",
                      issueLevel: "MUST_FIX",
                      annotationObjectId: 7103,
                      annotationObjectName: "肺部结节 1",
                      description: "属性缺少必要字段。",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    const result = await getAnnotationTaskQualityRecordsApi("9001", {
      submissionId: 8201,
      itemId: 5003,
      issueLevel: "MUST_FIX",
      page: 2,
    });
    expect(httpMock.get).toHaveBeenCalledWith(
      "/annotation-tasks/9001/quality-records",
      {
        params: {
          submissionId: 8201,
          itemId: 5003,
          issueLevel: "MUST_FIX",
          pageNo: 2,
          pageSize: 10,
        },
      },
    );
    expect(result.list[0]).toMatchObject({
      id: "8201",
      result: "failed",
      inspectorName: "韩真",
      samples: [{ id: "5003", issueLevel: "mustFix" }],
    });
  });

  it("supports task reassignment and label configuration queries", async () => {
    httpMock.post.mockResolvedValueOnce({ data: { code: "0", data: null } });
    await expect(
      assignAnnotationTaskApi("9001", 3002),
    ).resolves.toBeUndefined();
    expect(httpMock.post).toHaveBeenCalledWith(
      "/annotation-tasks/9001/assign",
      { annotatorId: 3002 },
    );

    httpMock.get.mockResolvedValueOnce({
      data: {
        code: "0",
        data: {
          annotationTaskId: 9001,
          qualityTaskId: null,
          projectCode: "DEMO_PROJECT",
          sceneId: 940001,
          labels: [
            {
              labelId: 1001,
              labelName: "肺部结节",
              labelDescription: null,
              attributes: [],
            },
          ],
        },
      },
    });
    await expect(
      getAnnotationTaskLabelConfigApi("9001"),
    ).resolves.toMatchObject({
      annotationTaskId: 9001,
      labels: [{ labelId: 1001, labelName: "肺部结节" }],
    });
    expect(httpMock.get).toHaveBeenCalledWith(
      "/annotation-tasks/9001/label-config",
    );
  });

  it("returns OHIF studyInstanceUID by itemId", async () => {
    httpMock.get.mockResolvedValueOnce({
      data: {
        code: "0",
        data: { studyInstanceUID: "1.2.840.113820.106.2616.120260611113313667" },
      },
    });
    await expect(
      getAnnotationTaskOhifStudyInstanceUidApi("5003"),
    ).resolves.toBe("1.2.840.113820.106.2616.120260611113313667");
    expect(httpMock.get).toHaveBeenCalledWith("/annotation-tasks/ohif/5003");
  });
});
