/// <reference types="vite/client" />

declare const __ASSET_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_PC_TOOL_URL?: string;
  readonly VITE_TUS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
