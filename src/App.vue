<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { theme } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import { storeToRefs } from "pinia";

import { useThemeStore } from "@/stores/theme";

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);
const route = useRoute();

const antLocale = zhCN;
const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: "#1677ff",
  },
}));

// 切换根节点主题类，使静态 CSS 变量与 Ant Design 主题算法保持一致。
watchEffect(() => {
  // 内嵌动态表单由宿主 INIT/SET_CONTEXT 显式控制主题，不能被管理端主题 store 覆盖。
  if (route.path.startsWith("/tool/dynamic-form")) return;
  document.documentElement.classList.toggle("theme-dark", isDark.value);
  document.documentElement.classList.toggle("theme-light", !isDark.value);
});

themeStore.initializeTheme();
</script>

<template>
  <AConfigProvider :locale="antLocale" :theme="themeConfig">
    <RouterView />
  </AConfigProvider>
</template>
