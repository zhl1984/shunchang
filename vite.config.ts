import { fileURLToPath, URL } from "node:url";

import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // 根据当前工作目录中的 `mode` 加载 .env 文件
  // 设置第三个参数为 '' 来加载所有环境变量，而不管是否有
  // `VITE_` 前缀。
  const env = loadEnv(mode, process.cwd(), "");
  const assetVersion = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return {
    define: {
      __ASSET_VERSION__: JSON.stringify(assetVersion),
    },
    plugins: [
      vue(),
      Components({
        dts: "src/types/components.d.ts",
        resolvers: [AntDesignVueResolver({ importStyle: false })],
      }),
      legacy({
        targets: [
          "Chrome >= 64",
          "Edge >= 79",
          "Firefox >= 67",
          "Safari >= 12",
        ],
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      target: "es2015",
      minify: "terser",
      sourcemap: true,
      emptyOutDir: true,
      terserOptions: {
        compress: {
          keep_infinity: true,
          drop_console: process.env.NODE_ENV !== "development",
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    server: {
      open: true,
      host: true,
      port: 3000,
      proxy: {
        // "/rock/mock/": {
        //   target: "http://192.168.16.38:40001",
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/rock\/mock/, "/mock/594"),
        //   ws: true,
        // },
        [env.VITE_API_BASE_URL]: {
          target: env.VITE_PROXY_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\//, ""),
          ws: true,
        },
      },
    },
    test: {
      environment: "jsdom",
    },
  };
});
