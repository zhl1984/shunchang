import { onBeforeUnmount, ref } from "vue";

/** 管理场景轮播索引、播放状态和定时器生命周期。 */
export function useSceneCarousel(sceneCount: number, delay = 5000) {
  const activeIndex = ref(0);
  const isPlaying = ref(false);
  let timer: number | undefined;

  /** 将索引限制在当前场景集合范围内。 */
  function normalizeIndex(index: number): number {
    if (sceneCount <= 0) return 0;
    return (index + sceneCount) % sceneCount;
  }

  /** 切换到指定场景。 */
  function select(index: number): void {
    activeIndex.value = normalizeIndex(index);
  }

  /** 按方向切换场景。 */
  function advance(direction: number): void {
    select(activeIndex.value + direction);
  }

  /** 清除自动播放定时器。 */
  function clearTimer(): void {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  /** 开始自动播放；重复调用时先清理旧定时器。 */
  function start(): void {
    clearTimer();
    if (sceneCount <= 1) {
      isPlaying.value = false;
      return;
    }
    isPlaying.value = true;
    timer = window.setInterval(() => advance(1), delay);
  }

  /** 暂停自动播放但保留当前索引。 */
  function pause(): void {
    clearTimer();
    isPlaying.value = false;
  }

  /** 组件卸载时释放定时器。 */
  function dispose(): void {
    pause();
  }

  onBeforeUnmount(dispose);

  return {
    activeIndex,
    isPlaying,
    advance,
    select,
    start,
    pause,
    dispose,
  };
}
