<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
// import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, type RouteLocationNormalizedLoaded } from "vue-router";
import {
  MAIN_LAYOUT_BREADCRUMB,
  type MainLayoutBreadcrumbCallback,
  type MainLayoutBreadcrumbPathList,
} from "@/constants/inject.ts";
import { BREADCRUMB_STORAGE_KEY } from "@/constants/storage.ts";
// import { useUserStore } from "@/stores/user.ts";

import Asider from "./asider.vue";
import Header from "./header.vue";

/** 主布局面包屑中的单个可导航路径。 */
/** 子页面基于路由变化前后快照生成完整面包屑列表。 */

const route = useRoute();
const { t } = useI18n();
// const { user } = storeToRefs(useUserStore());

/** 水印始终展示当前用户姓名，开发中页面额外附带 developing 标记。 */
const watermarkText = computed(() => {
  // const name = user.value?.userName || user.value?.loginName;
  const name = "陈瀚";
  return name ? `${name} 18610560109` : t("header.user.unknownName");
});

function getPathByRoute(route: RouteLocationNormalizedLoaded) {
  return { title: t(route.meta?.titleKey ?? ""), path: route.fullPath };
}

/** 从会话缓存恢复当前路由之前的面包屑路径，缓存异常时回退默认路径。 */
function getInitialPathList(): MainLayoutBreadcrumbPathList {
  const fallback = [getPathByRoute(route)];
  const cached = sessionStorage.getItem(BREADCRUMB_STORAGE_KEY);
  if (!cached) return fallback;

  try {
    const parsed: unknown = JSON.parse(cached);
    if (!Array.isArray(parsed)) return fallback;
    const list = parsed.filter(
      (item): item is { path: string; title: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { path?: unknown }).path === "string" &&
        typeof (item as { title?: unknown }).title === "string",
    );
    const currentIndex = list.reduce(
      (lastIndex, item, index) =>
        item.path === route.fullPath ? index : lastIndex,
      -1,
    );
    return currentIndex >= 0 ? list.slice(0, currentIndex + 1) : fallback;
  } catch {
    return fallback;
  }
}

const pathList = ref<MainLayoutBreadcrumbPathList>(getInitialPathList());

/** 路由变化时保存旧快照，并使用当前匹配记录整体重置默认面包屑。 */
function handleRouteChange(): void {
  // 子页面可能已提前追加目标路径，路由切换后保留这条定制面包屑。
  if (pathList.value[pathList.value.length - 1]?.path === route.fullPath) {
    return;
  }
  pathList.value = [getPathByRoute(route)];
}

/** 允许子页面基于导航前后的完整快照替换当前面包屑。 */
async function doSetLayoutPath(
  callback: MainLayoutBreadcrumbCallback,
): Promise<void> {
  const list = await callback([...pathList.value], route);
  pathList.value = [...list];
}

watch(() => route.fullPath, handleRouteChange);

watch(
  pathList,
  (list) => {
    sessionStorage.setItem(BREADCRUMB_STORAGE_KEY, JSON.stringify(list));
  },
  { deep: true },
);

provide(MAIN_LAYOUT_BREADCRUMB, doSetLayoutPath);
</script>

<template>
  <a-layout class="main-layout" has-sider>
    <DmWatermark :text="watermarkText"></DmWatermark>
    <Asider />
    <a-layout class="main-layout__right">
      <Header
        :path-list="pathList"
        :show-breadcrumb="route.meta?.showPath ?? true"
      />
      <a-layout-content
        class="main-layout__content"
        :class="route.meta?.contentClass ?? 'pd-24'"
      >
        <!-- <DmWatermark
          v-if="route.meta?.developing"
          text="developing···"
        ></DmWatermark> -->
        <router-view class="main-layout__page"></router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped lang="less">
.main-layout {
  --main-header-height: 56px;
  --main-layout-shadow: 0 2px 8px rgb(0 0 0 / 8%);

  height: 100vh;
  background-color: var(--dm-bg-layout);

  &__right,
  &__content {
    min-height: 0;
    background-color: var(--dm-bg-layout);
  }

  &__right {
    min-width: 0;
  }

  &__content {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &__page {
    flex: 1;
    height: 0;
    overflow: auto;
  }
}
</style>
