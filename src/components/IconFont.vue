<script setup lang="ts">
import { computed } from "vue";

import "@/assets/iconfont/iconfont.js";

defineOptions({ name: "IconFont" });

type IconFontName = "sun" | "moon";

type IconFontProps = {
  name: IconFontName;
  size?: number | string;
};

const props = withDefaults(defineProps<IconFontProps>(), {
  size: "1em",
});

const iconId = computed(() => `dm-${props.name}`);
const iconSize = computed(() =>
  typeof props.size === "number" ? `${props.size}px` : props.size,
);
</script>

<template>
  <svg
    aria-hidden="true"
    class="icon-font"
    :style="{ width: iconSize, height: iconSize }"
  >
    <use :href="`#${iconId}`" />
  </svg>
</template>

<style scoped lang="less">
.icon-font {
  display: block;
  fill: currentColor;
  flex: 0 0 auto;
  overflow: hidden;
  vertical-align: middle;
}
</style>
