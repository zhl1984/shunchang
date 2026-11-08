import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import vue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // 生成内容、依赖和静态资源不参与代码质量检查。
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "backup/**",
      ".vscode/**",
      "public/**",
      "src/assets/iconfont/iconfont.js",
      "**/vite-env.d.ts",
      "auto-imports.d.ts",
      "auto-imports-components.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    // 应用源码只开放浏览器环境，避免误用仅在 Node 中存在的全局变量。
    files: ["src/**/*.{js,mjs,cjs,ts,vue}", "env.d.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // 工程配置文件运行于 Node 环境。
    files: [
      "**/*.config.{js,mjs,cjs,ts}",
      "eslint.config.js",
      ".prettierrc.cjs",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Vue 单文件组件中的 script 使用 TypeScript 解析器。
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    rules: {
      // 基础规则不理解 TypeScript 类型，统一交给 TypeScript 版本检查。
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // 页面入口统一命名为 index.vue，不强制使用多单词组件名。
      "vue/multi-word-component-names": "off",
    },
  },
  // 必须放在最后，确保所有与 Prettier 重叠的格式规则均被关闭。
  prettier,
);
