import {
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import type { ECharts, EChartsOption } from "echarts";

import { getOrCreateChart } from "./echarts";
import type {
  BoundChartEventHandler,
  ChartEventHandlers,
  ChartEventName,
} from "./types";

/**
 * 将 ECharts 实例的创建、配置替换、事件绑定、Observer 自适应和销毁集中处理，
 * 避免各业务页重复编写生命周期逻辑。
 *
 * @param optionSource 图表配置。仅监听引用变化，默认 `notMerge` 整份替换。
 * @param eventsSource 可选事件表，引用变化时重新绑定。
 */
export function useEcharts(
  optionSource: MaybeRefOrGetter<EChartsOption>,
  eventsSource?: MaybeRefOrGetter<ChartEventHandlers | undefined>,
) {
  const containerRef = ref<HTMLElement>();
  let chart: ECharts | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let resizeFrame = 0;
  const boundHandlers = new Map<ChartEventName, BoundChartEventHandler>();

  /** 判断实例是否仍可用于 setOption / resize。 */
  function isChartAlive(): boolean {
    return Boolean(chart && !chart.isDisposed());
  }

  /** 容器无宽高时（隐藏 Tab、尚未布局）跳过 resize，避免把画布写成 0。 */
  function hasValidSize(el: HTMLElement): boolean {
    return el.clientWidth > 0 && el.clientHeight > 0;
  }

  /** 解绑当前实例上由本 composable 登记的全部事件。 */
  function unbindEvents(): void {
    if (!isChartAlive()) {
      boundHandlers.clear();
      return;
    }
    boundHandlers.forEach((handler, eventName) => {
      // ECharts off 的 handler 形参宽于业务回调，这里按同一引用解绑。
      chart?.off(eventName, handler as (...args: unknown[]) => void);
    });
    boundHandlers.clear();
  }

  /** 按最新 events 表绑定回调；非函数项忽略，避免空配置误注册。 */
  function bindEvents(): void {
    unbindEvents();
    if (!isChartAlive()) return;
    const events = eventsSource ? toValue(eventsSource) : undefined;
    if (!events) return;
    (Object.keys(events) as ChartEventName[]).forEach((eventName) => {
      const handler = events[eventName];
      if (typeof handler !== "function") return;
      // on 的声明含 index signature，与收窄后的回调需断言才能成对绑定。
      chart?.on(eventName, handler as (...args: unknown[]) => void);
      boundHandlers.set(eventName, handler);
    });
  }

  /** 用整份 option 替换当前图表，不合并旧 series / legend。 */
  function applyOption(): void {
    if (!isChartAlive()) return;
    chart?.setOption(toValue(optionSource), { notMerge: true });
  }

  /** 在下一帧按容器当前尺寸重绘，合并同一帧内多次 Observer 回调。 */
  function resize(): void {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      const el = containerRef.value;
      if (!el || !hasValidSize(el) || !isChartAlive()) return;
      chart?.resize();
    });
  }

  /** 断开尺寸与可见性观察，keep-alive 停用时保留实例。 */
  function unbindObservers(): void {
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    resizeObserver = undefined;
    intersectionObserver = undefined;
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }
  }

  /**
   * 监听容器尺寸和是否进入视口。
   * Tab 从 `display:none` 切回、侧栏折叠导致宽度变化时都能补一次 resize。
   */
  function bindObservers(): void {
    unbindObservers();
    const el = containerRef.value;
    if (!el) return;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(el);
    }

    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver((entries) => {
        // 仅在重新可见时 resize；持续不可见时尺寸通常为 0，无需绘制。
        if (entries.some((entry) => entry.isIntersecting)) {
          resize();
        }
      });
      intersectionObserver.observe(el);
    }
  }

  /** 为当前容器创建或复用实例，并写入初始 option / events。 */
  function initChart(): void {
    const el = containerRef.value;
    if (!el) return;
    chart = getOrCreateChart(el);
    bindEvents();
    applyOption();
    resize();
  }

  /** 卸载时释放实例，避免泄漏 canvas 与事件监听。 */
  function disposeChart(): void {
    unbindEvents();
    unbindObservers();
    if (isChartAlive()) {
      chart?.dispose();
    }
    chart = undefined;
  }

  onMounted(() => {
    initChart();
    bindObservers();
  });

  // keep-alive 首次挂载也会触发 activated，init 已在 mounted 完成，这里只恢复观察并补尺寸。
  onActivated(() => {
    if (!isChartAlive()) {
      initChart();
    }
    bindObservers();
    void nextTick(() => {
      resize();
    });
  });

  onDeactivated(() => {
    unbindObservers();
  });

  onBeforeUnmount(() => {
    disposeChart();
  });

  watch(
    () => toValue(optionSource),
    () => {
      applyOption();
    },
    { deep: false },
  );

  watch(
    () => (eventsSource ? toValue(eventsSource) : undefined),
    () => {
      bindEvents();
    },
    { deep: false },
  );

  return {
    containerRef,
    /** 返回当前图表实例，供少数需要命令式 API 的场景使用。 */
    getInstance: () => chart,
    resize,
  };
}
