import { beforeEach, describe, expect, it, vi } from "vitest";
import { getModelConfigPageApi } from "@/api/model-config";

const { httpMock } = vi.hoisted(() => ({
  httpMock: { get: vi.fn() },
}));

vi.mock("@/api/http", () => ({ default: httpMock }));

describe("model config API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards server-side access time sorting", async () => {
    httpMock.get.mockResolvedValueOnce({
      status: 200,
      data: {
        code: "0",
        message: "success",
        data: { list: [], pageNo: 1, pageSize: 10, total: 0 },
      },
    });

    await getModelConfigPageApi({
      ascSort: false,
      pageNo: 1,
      pageSize: 10,
      sortField: "createdAt",
    });

    expect(httpMock.get).toHaveBeenCalledWith("/models/page", {
      params: {
        ascSort: false,
        pageNo: 1,
        pageSize: 10,
        sortField: "createdAt",
      },
    });
  });
});
