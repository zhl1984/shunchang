import { createI18n } from "vue-i18n";

import zhCN from "@/locales/messages/zh-CN";

export type AppLocale = "zh-CN";

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
  },
});
