import { beforeEach, describe, expect, it, vi } from "vitest";
import { getQualityTaskListApi } from "@/api/quality-task";

const { httpMock } = vi.hoisted(() => ({
  httpMock: { get: vi.fn() },
}));

vi.mock("@/api/http", () => ({ default: httpMock }));

describe("quality task API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards server-side deadline sorting", async () => {
    httpMock.get.mockResolvedValueOnce({
      data: {
        code: "0",
        data: {
          summary: {
            total: 0,
            qualityChecking: 0,
            reworking: 0,
            completed: 0,
          },
          pageNo: 1,
          pageSize: 10,
          total: 0,
          list: [],
        },
      },
    });

    await getQualityTaskListApi({
      ascSort: true,
      page: 1,
      pageSize: 10,
      sortField: "deadline",
    });

    expect(httpMock.get).toHaveBeenCalledWith("/quality-tasks", {
      params: {
        pageNo: 1,
        pageSize: 10,
        statusFilter: undefined,
        keyword: undefined,
        sortField: "deadline",
        ascSort: true,
      },
    });
  });
});
