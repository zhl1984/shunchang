import { createApp, defineComponent, h, nextTick, ref, type Ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EChartsOption } from "echarts";

import { getOrCreateChart } from "./echarts";
import { useEcharts } from "./useEcharts";
import type { ChartEventHandlers } from "./types";

type MockChart = {
  setOption: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  isDisposed: () => boolean;
  disposed: boolean;
};

const { init, getInstanceByDom } = vi.hoisted(() => {
  const instances = new WeakMap<HTMLElement, MockChart>();
  const initChart = vi.fn((el: HTMLElement) => {
    const chart: MockChart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(function dispose(this: MockChart) {
        this.disposed = true;
      }),
      on: vi.fn(),
      off: vi.fn(),
      isDisposed() {
        return this.disposed;
      },
      disposed: false,
    };
    instances.set(el, chart);
    return chart;
  });
  const getChartByDom = vi.fn(
    (el: HTMLElement) => instances.get(el) as MockChart | undefined,
  );
  return { init: initChart, getInstanceByDom: getChartByDom };
});

vi.mock("echarts", () => ({
  init,
  getInstanceByDom,
}));

const observerStores: {
  resize: Array<{ callback: () => void; el: Element }>;
  intersection: Array<{
    callback: IntersectionObserverCallback;
    el: Element;
  }>;
} = { resize: [], intersection: [] };

const mountedApps: Array<() => void> = [];

/** 挂载使用 useEcharts 的最小宿主，便于断言生命周期副作用。 */
function mountChartHost(
  option: Ref<EChartsOption>,
  events?: Ref<ChartEventHandlers | undefined>,
) {
  const host = defineComponent({
    setup() {
      const { containerRef, getInstance, resize } = useEcharts(option, events);
      return { containerRef, getInstance, resize };
    },
    render() {
      return h("div", {
        ref: "containerRef",
        class: "charts-host",
        style: "width: 320px; height: 200px;",
      });
    },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(host);
  const vm = app.mount(root) as InstanceType<typeof host> & {
    getInstance: () => MockChart | undefined;
    resize: () => void;
  };
  const el = root.querySelector(".charts-host") as HTMLElement;
  Object.defineProperties(el, {
    clientWidth: { configurable: true, get: () => 320 },
    clientHeight: { configurable: true, get: () => 200 },
  });
  mountedApps.push(() => {
    app.unmount();
    root.remove();
  });
  return { vm, el };
}

beforeEach(() => {
  init.mockClear();
  getInstanceByDom.mockClear();
  observerStores.resize = [];
  observerStores.intersection = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      observe(el: Element) {
        observerStores.resize.push({ callback: this.callback, el });
      }
      disconnect() {
        observerStores.resize = observerStores.resize.filter(
          (item) => item.callback !== this.callback,
        );
      }
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(el: Element) {
        observerStores.intersection.push({ callback: this.callback, el });
      }
      disconnect() {
        observerStores.intersection = observerStores.intersection.filter(
          (item) => item.callback !== this.callback,
        );
      }
      unobserve() {}
    },
  );
});

afterEach(() => {
  mountedApps.splice(0).forEach((unmount) => unmount());
  vi.unstubAllGlobals();
});

describe("getOrCreateChart", () => {
  it("reuses the living instance on the same element", () => {
    const el = document.createElement("div");
    const first = getOrCreateChart(el);
    const second = getOrCreateChart(el);
    expect(init).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });
});

describe("useEcharts", () => {
  it("replaces option by reference and binds events", async () => {
    const option = ref<EChartsOption>({
      series: [{ type: "bar", data: [1] }],
    });
    const click = vi.fn();
    const events = ref<ChartEventHandlers>({ click });
    const { vm } = mountChartHost(option, events);
    await nextTick();

    const chart = vm.getInstance();
    expect(init).toHaveBeenCalledTimes(1);
    expect(chart?.setOption).toHaveBeenCalledWith(option.value, {
      notMerge: true,
    });
    expect(chart?.on).toHaveBeenCalledWith("click", click);

    const nextOption: EChartsOption = {
      series: [{ type: "pie", data: [{ value: 1 }] }],
    };
    option.value = nextOption;
    await nextTick();
    expect(chart?.setOption).toHaveBeenLastCalledWith(nextOption, {
      notMerge: true,
    });
  });

  it("does not setOption when nested fields mutate in place", async () => {
    const option = ref<EChartsOption>({
      series: [{ type: "line", data: [1] }],
    });
    const { vm } = mountChartHost(option);
    await nextTick();
    const chart = vm.getInstance();
    const calls = chart?.setOption.mock.calls.length ?? 0;
    const series = option.value.series;
    if (Array.isArray(series) && series[0] && "data" in series[0]) {
      series[0].data = [2];
    }
    await nextTick();
    expect(chart?.setOption.mock.calls.length).toBe(calls);
  });

  it("resizes when the container observer fires with a valid size", async () => {
    const option = ref<EChartsOption>({ series: [] });
    const { vm } = mountChartHost(option);
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const chart = vm.getInstance();
    chart?.resize.mockClear();
    observerStores.resize[0]?.callback();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(chart?.resize).toHaveBeenCalled();
  });

  it("removes events and disposes the instance on unmount", async () => {
    const click = vi.fn();
    const option = ref<EChartsOption>({ series: [] });
    const events = ref<ChartEventHandlers>({ click });
    const { vm } = mountChartHost(option, events);
    await nextTick();
    const chart = vm.getInstance();
    mountedApps.splice(0).forEach((unmount) => unmount());
    expect(chart?.off).toHaveBeenCalledWith("click", click);
    expect(chart?.dispose).toHaveBeenCalled();
  });
});
