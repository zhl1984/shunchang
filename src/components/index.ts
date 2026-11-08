import type { App, Component } from "vue";

import FormHeader from "./Form/FormHeader.vue";

type NamedComponent = Component & {
  name?: string;
};

const rootComponentModules = import.meta.glob<{ default: NamedComponent }>(
  "./*.vue",
  { eager: true },
);
const directoryIndexModules = import.meta.glob<{
  default: NamedComponent;
}>("./*/index.vue", { eager: true });

// 非根目录 index.vue 的组件需要在这里显式加入，避免无关组件被自动注册。
const manuallyRegisteredComponents: NamedComponent[] = [FormHeader];

/** 将 components 目录下带有 name 的 Vue 组件注册为 Dm 前缀全局组件。 */
export function registerGlobalComponents(app: App) {
  const components = [
    ...Object.values(rootComponentModules).map((module) => module.default),
    ...Object.values(directoryIndexModules).map((module) => module.default),
    ...manuallyRegisteredComponents,
  ];

  components.forEach((component) => {
    const componentName = component.name;

    // 未声明组件 name 时跳过注册，避免生成不可预测的全局组件名称。
    if (!componentName) {
      return;
    }

    app.component(
      componentName.startsWith("Dm") ? componentName : `Dm${componentName}`,
      component,
    );
  });
}
