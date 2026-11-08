import { createApp } from "vue";

import { createPinia } from "pinia";

import App from "@/App.vue";
import { registerGlobalComponents } from "@/components";
import { i18n } from "@/locales";
import { router } from "@/router";
import utils from "@/utils";

import "@/styles/index.less";

// 内嵌动态表单在 Vue 挂载前先声明属性窗口同款底色，避免 iframe 文档默认绘制黑色。
if (window.location.pathname.startsWith("/tool/dynamic-form")) {
  document.documentElement.classList.add("dynamic-form-embedded-page");
  document.documentElement.style.setProperty(
    "background-color",
    "#111827",
    "important",
  );
  document.body.style.setProperty("background-color", "#111827", "important");
  document
    .getElementById("app")
    ?.style.setProperty("background-color", "#111827", "important");
}

const app = createApp(App);

app.config.globalProperties.$utils = utils;

registerGlobalComponents(app);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount("#app");
