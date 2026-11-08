import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QualityPlanListItem } from "@/api/quality-plan";
import { getQualityPlanListApi } from "@/api/quality-plan";
import { useQualityPlanStore } from "@/stores/quality-plan";

vi.mock("@/api/quality-plan", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/quality-plan")>(
      "@/api/quality-plan",
    );
  return { ...actual, getQualityPlanListApi: vi.fn() };
});

const mockedGetQualityPlanListApi = vi.mocked(getQualityPlanListApi);
const qualityPlans: QualityPlanListItem[] = [
  { id: 1, name: "肺部 CT 质检", description: "全量检查", levelCount: 1 },
  { id: 2, name: "腹部 CT 质检", description: "抽样检查", levelCount: 2 },
];

describe("quality plan store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedGetQualityPlanListApi.mockReset();
  });

  it("懒加载不分页的完整质量方案集合，并复用并发请求", async () => {
    let resolveRequest: (value: {
      list: QualityPlanListItem[];
      total: number;
      page: number;
      pageSize: number;
    }) => void = () => undefined;
    mockedGetQualityPlanListApi.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const store = useQualityPlanStore();
    const first = store.initialize();
    const second = store.initialize();

    expect(mockedGetQualityPlanListApi).toHaveBeenCalledTimes(1);
    expect(mockedGetQualityPlanListApi).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10000,
    });

    resolveRequest({
      list: qualityPlans,
      total: qualityPlans.length,
      page: 1,
      pageSize: 10000,
    });
    await Promise.all([first, second]);

    expect(store.status).toBe("initialized");
    expect(store.qualityPlans).toEqual(qualityPlans);
  });

  it("加载失败后恢复未初始化状态，并允许 refresh 重试", async () => {
    mockedGetQualityPlanListApi
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce({
        list: qualityPlans,
        total: qualityPlans.length,
        page: 1,
        pageSize: 10000,
      });

    const store = useQualityPlanStore();
    await expect(store.initialize()).rejects.toThrow("failed");
    expect(store.status).toBe("uninitialized");

    await store.refresh();
    expect(store.status).toBe("initialized");
    expect(store.qualityPlans).toEqual(qualityPlans);
    expect(mockedGetQualityPlanListApi).toHaveBeenCalledTimes(2);
  });

  it("刷新时等待进行中的懒加载完成后重新获取最新列表", async () => {
    let resolveInitialRequest: (value: {
      list: QualityPlanListItem[];
      total: number;
      page: number;
      pageSize: number;
    }) => void = () => undefined;
    mockedGetQualityPlanListApi
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveInitialRequest = resolve;
        }),
      )
      .mockResolvedValueOnce({
        list: qualityPlans,
        total: qualityPlans.length,
        page: 1,
        pageSize: 10000,
      });

    const store = useQualityPlanStore();
    const initialLoad = store.initialize();
    const refresh = store.refresh();

    expect(mockedGetQualityPlanListApi).toHaveBeenCalledTimes(1);
    resolveInitialRequest({
      list: [],
      total: 0,
      page: 1,
      pageSize: 10000,
    });
    await Promise.all([initialLoad, refresh]);

    expect(mockedGetQualityPlanListApi).toHaveBeenCalledTimes(2);
    expect(store.qualityPlans).toEqual(qualityPlans);
  });
});
