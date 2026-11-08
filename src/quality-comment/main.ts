import { createApp } from "vue";

import App from "./App.vue";
import "ant-design-vue/dist/reset.css";
import "../styles/theme.css";
import "./styles.less";

// 子应用先默认深色，随后由宿主显式下发 theme 再切换。
document.documentElement.classList.add("theme-dark");

createApp(App).mount("#app");
