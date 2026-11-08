import "axios";
import type { InternalAxiosRequestConfig } from "axios";

export type AutoCancelKeyFactory = (
  config: InternalAxiosRequestConfig,
) => string;
export type AutoCancelOption = boolean | string | AutoCancelKeyFactory;

declare module "axios" {
  interface AxiosRequestConfig {
    autoCancel?: AutoCancelOption;
    skipAuth?: boolean;
    skipError?: boolean;
  }

  interface InternalAxiosRequestConfig {
    autoCancel?: AutoCancelOption;
    autoCancelController?: AbortController;
    autoCancelKey?: string;
    skipAuth?: boolean;
    skipError?: boolean;
  }
}

export {};
