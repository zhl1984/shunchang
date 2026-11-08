import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { i18n } from "@/locales";
import ImagePreview from "./index.vue";

const mountedApps: Array<() => void> = [];

/** 等待弹窗传送到 body 并完成一次响应式更新。 */
async function flushModal(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

/** 构造带 pointerId 的指针事件，兼容测试环境未实现 PointerEvent 的情况。 */
function createPointerEvent(
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX,
    clientY,
    cancelable: true,
  });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  return event;
}

afterEach(() => {
  mountedApps.splice(0).forEach((unmount) => unmount());
  document.body.innerHTML = "";
});

describe("ImagePreview", () => {
  it("allows bounded dragging above 100% and resets the position when fitted", async () => {
    const open = ref(true);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(ImagePreview, {
              open: open.value,
              imageUrl: "https://example.com/sample.png",
            });
        },
      }),
    );
    app.use(i18n);
    app.mount(host);
    mountedApps.push(() => app.unmount());
    await flushModal();

    const image = document.body.querySelector<HTMLImageElement>(".ip-image");
    const wrap = document.body.querySelector<HTMLDivElement>(".ip-image-wrap");
    const actions =
      document.body.querySelectorAll<HTMLButtonElement>(".ip-action");
    const zoomIn = actions[0];
    const fit = actions[2];
    expect(image).not.toBeNull();
    expect(wrap).not.toBeNull();
    expect(actions).toHaveLength(3);
    expect(actions[0]?.getAttribute("aria-label")).toBe("放大图片");
    expect(actions[1]?.getAttribute("aria-label")).toBe("缩小图片");

    Object.defineProperties(image as HTMLImageElement, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 600 },
    });
    Object.defineProperties(wrap as HTMLDivElement, {
      clientWidth: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 500 },
    });

    zoomIn?.click();
    await nextTick();
    expect(image?.classList.contains("ip-image--draggable")).toBe(true);

    image?.dispatchEvent(createPointerEvent("pointerdown", 1, 100, 100));
    image?.dispatchEvent(createPointerEvent("pointermove", 1, 180, 160));
    await nextTick();
    expect(image?.style.transform).toContain("translate3d(80px, 60px, 0)");

    image?.dispatchEvent(createPointerEvent("pointerup", 1, 180, 160));
    fit?.click();
    await nextTick();
    expect(image?.style.transform).toContain("translate3d(0px, 0px, 0)");
    expect(image?.style.transform).toContain("scale(1)");
    expect(image?.classList.contains("ip-image--draggable")).toBe(false);
  });
});
