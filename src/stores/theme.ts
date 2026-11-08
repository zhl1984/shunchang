import { computed, ref } from "vue";

import { defineStore } from "pinia";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "shuqing-theme-mode";

/** 判断本地存储值是否为有效主题模式。 */
function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export const useThemeStore = defineStore("theme", () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const themeMode = ref<ThemeMode>(
    isThemeMode(savedTheme) ? savedTheme : "system",
  );
  const systemPrefersDark = ref(
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const isDark = computed(() =>
    themeMode.value === "system"
      ? systemPrefersDark.value
      : themeMode.value === "dark",
  );

  /** 设置并持久化用户选择的主题模式。 */
  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  /** 初始化系统主题监听，使跟随系统模式能够实时更新。 */
  function initializeTheme() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark.value = mediaQuery.matches;
    mediaQuery.addEventListener("change", (event) => {
      systemPrefersDark.value = event.matches;
    });
  }

  return {
    initializeTheme,
    isDark,
    setThemeMode,
    themeMode,
  };
});
