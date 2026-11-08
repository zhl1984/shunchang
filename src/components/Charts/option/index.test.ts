import { describe, expect, it } from "vitest";
import type { EChartsOption } from "echarts";

import { mergeChartOption } from "./index";

describe("mergeChartOption", () => {
  it("merges bar axis defaults and keeps business overrides", () => {
    const option: EChartsOption = {
      grid: { top: 28 },
      series: [{ type: "bar", data: [1] }],
    };
    const merged = mergeChartOption(option);

    expect(merged.animation).toBe(false);
    expect(merged.grid).toMatchObject({
      left: 8,
      right: 8,
      top: 28,
      bottom: 8,
      containLabel: true,
    });
    expect(merged.xAxis).toMatchObject({
      type: "category",
      axisTick: { show: false },
    });
    expect(merged.series).toEqual([{ type: "bar", data: [1], barWidth: 28 }]);
  });

  it("applies cartesian defaults for the first series type in mixed charts", () => {
    const merged = mergeChartOption({
      series: [
        { type: "line", data: [1] },
        { type: "bar", data: [2] },
      ],
    });

    expect(merged.yAxis).toMatchObject({
      type: "value",
      axisLine: { show: false },
    });
  });

  it("overrides axis tooltip for pie charts", () => {
    const merged = mergeChartOption({
      series: [{ type: "pie", data: [{ value: 1, name: "a" }] }],
    });

    expect(merged.tooltip).toMatchObject({
      trigger: "item",
      backgroundColor: "rgb(0 0 0 / 65%)",
    });
    expect(merged.xAxis).toBeUndefined();
    expect(merged.series).toEqual([
      {
        type: "pie",
        data: [{ value: 1, name: "a" }],
        radius: ["60%", "80%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        silent: false,
        labelLine: { show: false },
        emphasis: {
          scale: false,
          label: { show: true },
        },
        label: {
          show: true,
          position: "center",
          rich: {
            total: {
              fontSize: 24,
              fontWeight: 600,
              color: "rgb(0 0 0 / 88%)",
              lineHeight: 32,
            },
            caption: {
              fontSize: 12,
              color: "#98a2b3",
              lineHeight: 20,
            },
          },
        },
      },
    ]);
  });

  it("lets business pie label formatter merge onto default label styles", () => {
    const merged = mergeChartOption({
      series: [
        {
          type: "pie",
          data: [{ value: 1, name: "a" }],
          label: { formatter: "{b}" },
        },
      ],
    });
    const series = merged.series;
    const item = Array.isArray(series) ? series[0] : series;

    expect(item).toMatchObject({
      label: {
        show: true,
        position: "center",
        formatter: "{b}",
      },
    });
  });

  it("lets business tooltip override pie defaults", () => {
    const merged = mergeChartOption({
      tooltip: { trigger: "none" },
      series: [{ type: "pie", data: [{ value: 1, name: "a" }] }],
    });

    expect(merged.tooltip).toMatchObject({ trigger: "none" });
  });

  it("skips chart-specific option when series is missing", () => {
    const merged = mergeChartOption({
      legend: { left: 0 },
    });

    expect(merged.legend).toMatchObject({ left: 0, icon: "circle" });
    expect(merged.xAxis).toBeUndefined();
    expect(merged.tooltip).toMatchObject({
      backgroundColor: "rgb(0 0 0 / 65%)",
    });
  });

  it("skips chart-specific option for unregistered series types", () => {
    const merged = mergeChartOption({
      series: [{ type: "scatter", data: [[0, 1]] }],
    });

    expect(merged.xAxis).toBeUndefined();
    expect(merged.animation).toBe(false);
    expect(merged.series).toEqual([{ type: "scatter", data: [[0, 1]] }]);
  });

  it("applies barWidth to every bar series so stacked columns share the default", () => {
    const merged = mergeChartOption({
      series: [
        { type: "bar", data: [1] },
        { type: "bar", data: [2] },
      ],
    });

    expect(merged.series).toEqual([
      { type: "bar", data: [1], barWidth: 28 },
      { type: "bar", data: [2], barWidth: 28 },
    ]);
  });

  it("applies line series defaults and keeps business lineStyle color", () => {
    const merged = mergeChartOption({
      series: [{ type: "line", data: [1], lineStyle: { color: "#1677ff" } }],
    });

    expect(merged.series).toEqual([
      {
        type: "line",
        data: [1],
        symbolSize: 8,
        lineStyle: { color: "#1677ff", width: 2 },
        itemStyle: { color: "#2f66d8" },
      },
    ]);
  });

  it("lets business series fields override chart-specific series defaults", () => {
    const merged = mergeChartOption({
      series: [{ type: "bar", data: [1], barWidth: 16 }],
    });

    expect(merged.series).toEqual([{ type: "bar", data: [1], barWidth: 16 }]);
  });

  it("does not mutate the source business option", () => {
    const option: EChartsOption = {
      grid: { top: 12 },
      series: [{ type: "line", data: [1] }],
    };
    const merged = mergeChartOption(option);

    expect(option.grid).toEqual({ top: 12 });
    expect(option.xAxis).toBeUndefined();
    expect(merged.xAxis).toBeDefined();
    expect(merged).not.toBe(option);
  });
});
