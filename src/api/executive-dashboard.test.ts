import axios, { type AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "@/locales";
import type {
  DashboardPeriod,
  TrendPeriod,
} from "@/views/executive-dashboard/types";

const httpMock = vi.hoisted(() => ({ get: vi.fn() }));

// 隔离路由初始化，保留真实错误消息提取器，避免测试复制实现。
vi.mock("@/router", () => ({ toLogin: vi.fn() }));
vi.mock("@/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/http")>()),
  default: httpMock,
}));

import {
  getDashboardErrorMessage,
  getDashboardOverviewApi,
  getDashboardProductionApi,
  getDashboardProjectsApi,
  getDashboardRisksApi,
  getDashboardTrendApi,
} from "./executive-dashboard";

/** 构造 Axios fulfilled 响应，业务数据仍位于 code/data 包装内。 */
function success(data: unknown, code: string | number = "0") {
  return { status: 200, data: { code, message: "success", data } };
}

beforeEach(() => {
  httpMock.get.mockReset();
});

describe("数据总览请求参数", () => {
  // 五个页面周期均必须遵守文档枚举，不能将展示用值直接发给后端。
  it.each<[DashboardPeriod, string]>([
    ["7d", "LAST_WEEK"],
    ["30d", "LAST_MONTH"],
    ["3m", "LAST_3_MONTHS"],
    ["6m", "LAST_HALF_YEAR"],
    ["1y", "LAST_YEAR"],
  ])("将周期 %s 转换为 %s，并省略全部项目和类型", async (period, expected) => {
    httpMock.get.mockResolvedValueOnce(success({}));

    await getDashboardOverviewApi({ period, projectCodes: [] });

    expect(httpMock.get).toHaveBeenCalledWith("/executive-dashboard", {
      params: { period: expected },
      paramsSerializer: { indexes: null },
      skipError: true,
    });
  });

  // 使用真实 Axios 序列化验证重复 query key，避免只验证配置外形。
  it("以重复 key 发送项目 code 数组，并将标注类型 ID 转为字符串", async () => {
    httpMock.get.mockResolvedValueOnce(success({}));

    await getDashboardOverviewApi({
      period: "7d",
      projectCodes: ["PJ001", "PJ002"],
      annotationTypeId: 25,
    });

    const [url, config] = httpMock.get.mock.calls[0] as [
      string,
      AxiosRequestConfig,
    ];
    expect(config.params).toEqual({
      period: "LAST_WEEK",
      projectCodes: ["PJ001", "PJ002"],
      annotationTypeId: "25",
    });
    const uri = axios.getUri({ ...config, url });
    const params = new URL(uri, "https://dashboard.test").searchParams;
    expect(params.getAll("projectCodes")).toEqual(["PJ001", "PJ002"]);
    expect(params.has("projectCodes[]")).toBe(false);
    expect(params.get("annotationTypeId")).toBe("25");
  });

  // 趋势窗口独立于统计周期，日/周/月切换必须保留公共筛选。
  it.each<[TrendPeriod, string]>([
    ["day", "DAY"],
    ["week", "WEEK"],
    ["month", "MONTH"],
  ])("将趋势窗口 %s 转换为 %s", async (window, expected) => {
    httpMock.get.mockResolvedValueOnce(success({ points: [] }));

    await getDashboardTrendApi(
      { period: "30d", projectCodes: ["PJ001"] },
      window,
    );

    expect(httpMock.get).toHaveBeenCalledWith(
      "/executive-dashboard/production/trend",
      expect.objectContaining({
        params: {
          period: "LAST_MONTH",
          projectCodes: ["PJ001"],
          window: expected,
        },
      }),
    );
  });
});

describe("数据总览业务字段转换", () => {
  // 比率由后端计算；转换后必须保留百分号、零值和小数精度。
  it("映射经营概览六项指标，并接受数值业务成功码", async () => {
    httpMock.get.mockResolvedValueOnce(
      success(
        {
          projectTotal: 12,
          runningProjectTotal: 4,
          dataTotal: 320,
          completedDataTotal: 240,
          completionRate: "75.00%",
          modelAnnotationRate: "0.00%",
        },
        0,
      ),
    );

    expect(await getDashboardOverviewApi({ period: "7d" })).toEqual({
      projectTotal: 12,
      runningProjectTotal: 4,
      dataTotal: 320,
      completedDataTotal: 240,
      completionRate: "75.00%",
      modelLabelRate: "0.00%",
    });
  });

  // 框数与样本数是不同口径，生产接口仅提供人工/模型最终框数。
  it("映射 SALT 比率和人工、模型框数", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        laborSavingRate: "12.345%",
        cycleReductionRate: "-2.50%",
        modelQualifiedProjectRate: "80.00%",
        humanBoxTotal: 45,
        modelBoxTotal: 0,
      }),
    );

    expect(await getDashboardProductionApi({ period: "7d" })).toEqual({
      manualSavingRate: "12.345%",
      cycleReductionRate: "-2.50%",
      modelTargetRate: "80.00%",
      manual: 45,
      model: 0,
    });
    expect(httpMock.get.mock.calls[0]?.[0]).toBe(
      "/executive-dashboard/production",
    );
  });

  // 图表名称来自后端；新分桶不会被旧前端枚举静默过滤。
  it("映射项目健康计数并保留后端分桶名称与精度", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        normalProjectTotal: 3,
        attentionProjectTotal: 2,
        riskProjectTotal: 1,
        statusDistribution: [
          {
            code: "FUTURE_STATUS",
            label: "后端新状态",
            count: 3,
            percentage: "50.00%",
          },
        ],
        progressDistribution: [
          { code: "RANGE", label: "80%-100%", count: 0, percentage: "0.000%" },
        ],
      }),
    );

    expect(await getDashboardProjectsApi({ period: "7d" })).toEqual({
      normal: 3,
      attention: 2,
      risk: 1,
      statuses: [
        {
          key: "FUTURE_STATUS",
          label: "后端新状态",
          count: 3,
          percentage: "50.00%",
        },
      ],
      progress: [
        { key: "RANGE", label: "80%-100%", count: 0, percentage: "0.000%" },
      ],
    });
    expect(httpMock.get.mock.calls[0]?.[0]).toBe(
      "/executive-dashboard/projects",
    );
  });

  // 风险数独立于图表分桶，不能从状态数组推算。
  it("映射风险待办四项计数", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        riskProjectTotal: 9,
        overdueProjectTotal: 3,
        dueSoonProjectTotal: 4,
        nonConvergentProjectTotal: 2,
      }),
    );

    expect(await getDashboardRisksApi({ period: "7d" })).toEqual({
      risk: 9,
      overdue: 3,
      dueSoon: 4,
      stale: 2,
    });
    expect(httpMock.get.mock.calls[0]?.[0]).toBe("/executive-dashboard/risks");
  });

  // 缺失和非法数字保留缺失态，真实零值仍然能够显示。
  it("不将缺失、负数或非有限计数伪造为零", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        projectTotal: null,
        runningProjectTotal: -1,
        dataTotal: Infinity,
        completedDataTotal: 0,
        completionRate: 20,
        modelAnnotationRate: "无数据",
      }),
    );

    expect(await getDashboardOverviewApi({ period: "7d" })).toEqual({
      projectTotal: null,
      runningProjectTotal: null,
      dataTotal: null,
      completedDataTotal: 0,
      completionRate: null,
      modelLabelRate: null,
    });
    httpMock.get.mockResolvedValueOnce(success({}));
    expect(await getDashboardProductionApi({ period: "7d" })).toEqual({
      manualSavingRate: null,
      cycleReductionRate: null,
      modelTargetRate: null,
      manual: null,
      model: null,
    });
  });

  // 接口集合允许为空；错误结构不应导致页面遍历崩溃。
  it.each([null, undefined, {}, "invalid", []])(
    "安全处理空或异常图表集合 %j",
    async (items) => {
      httpMock.get.mockResolvedValueOnce(
        success({ statusDistribution: items, progressDistribution: items }),
      );
      expect(await getDashboardProjectsApi({ period: "7d" })).toEqual({
        normal: null,
        attention: null,
        risk: null,
        statuses: [],
        progress: [],
      });
      httpMock.get.mockResolvedValueOnce(success({ points: items }));
      expect(await getDashboardTrendApi({ period: "7d" }, "day")).toEqual([]);
    },
  );

  // 仅跳过不可绘制的桶，不丢失有效的零计数桶。
  it("跳过缺少 code、名称或合法计数的分桶", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        statusDistribution: [
          null,
          {},
          { code: "A", label: "缺失计数" },
          { code: "B", label: "负数", count: -2 },
          { code: "C", label: "字符串数字", count: "5" },
          { code: "VALID", label: "有效零值", count: 0, percentage: null },
        ],
      }),
    );
    expect((await getDashboardProjectsApi({ period: "7d" })).statuses).toEqual([
      { key: "VALID", label: "有效零值", count: 0, percentage: null },
    ]);
  });

  // 缺日期无法定位横轴；缺计数的有效日期仍保留断点。
  it("保留趋势顺序、真实零值及缺失点，不补造日期和数量", async () => {
    httpMock.get.mockResolvedValueOnce(
      success({
        points: [
          null,
          {},
          { date: "", humanBoxCount: 2 },
          { date: "2026-09-20", humanBoxCount: 12, modelBoxCount: 0 },
          { date: "2026-09-21", humanBoxCount: null, modelBoxCount: NaN },
        ],
      }),
    );
    expect(await getDashboardTrendApi({ period: "7d" }, "day")).toEqual([
      { date: "2026-09-20", manual: 12, model: 0 },
      { date: "2026-09-21", manual: null, model: null },
    ]);
  });
});

describe("数据总览失败响应", () => {
  // HTTP 200/400 都可能 fulfilled，业务码才决定读取数据还是报错。
  it.each([200, 400])("HTTP %i 业务失败优先显示内层消息", async (status) => {
    httpMock.get.mockResolvedValueOnce({
      status,
      message: "外层消息",
      data: {
        code: "160001",
        message: "内层业务消息",
        data: { projectTotal: 9 },
      },
    });
    await expect(getDashboardOverviewApi({ period: "7d" })).rejects.toThrow(
      "内层业务消息",
    );
  });

  // 外层消息只在业务包装未提供消息时使用。
  it("缺少内层消息时读取外层，再回退模块通用提示", async () => {
    httpMock.get.mockResolvedValueOnce({
      message: "外层消息",
      data: { code: "1" },
    });
    await expect(getDashboardOverviewApi({ period: "7d" })).rejects.toThrow(
      "外层消息",
    );
    httpMock.get.mockResolvedValueOnce({ data: { code: "1" } });
    await expect(getDashboardOverviewApi({ period: "7d" })).rejects.toThrow(
      i18n.global.t("executiveDashboard.feedback.loadFailed"),
    );
  });

  // 成功码不能将缺失快照伪装成全零数据。
  it.each([undefined, null, [], "invalid", 0])(
    "成功但根数据异常 %j 时明确失败",
    async (data) => {
      httpMock.get.mockResolvedValueOnce(success(data));
      await expect(getDashboardOverviewApi({ period: "7d" })).rejects.toThrow(
        i18n.global.t("executiveDashboard.feedback.loadFailed"),
      );
    },
  );

  // HTTP 封装的 originalError 与原始 Axios response 均应保留业务消息。
  it.each(["response", "originalError"])(
    "读取 rejected 场景 %s 中的内层消息",
    async (kind) => {
      const response = {
        status: 500,
        message: "外层消息",
        data: { message: "服务端错误详情" },
      };
      httpMock.get.mockRejectedValueOnce({
        message: "通用请求错误",
        ...(kind === "response"
          ? { response }
          : { originalError: { response } }),
      });
      await expect(getDashboardOverviewApi({ period: "7d" })).rejects.toThrow(
        "服务端错误详情",
      );
    },
  );

  // rejected 缺少 response 时仍需安全回退，不让读取错误覆盖原始异常。
  it("缺少 rejected 响应时保留异常消息或使用模块提示", async () => {
    httpMock.get.mockRejectedValueOnce(new Error("连接断开"));
    await expect(getDashboardOverviewApi({ period: "7d" })).rejects.toThrow(
      "连接断开",
    );
    expect(getDashboardErrorMessage(null)).toBe(
      i18n.global.t("executiveDashboard.feedback.loadFailed"),
    );
    expect(
      getDashboardErrorMessage({ response: { message: "外层失败" } }),
    ).toBe("外层失败");
  });
});
