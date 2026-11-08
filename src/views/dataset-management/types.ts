import type { Dataset } from "@/api/dataset";

/** 页面列表行保留接口原始字段，并补充仅用于空说明展示的字段。 */
export type DatasetDisplayRow = Dataset & {
  descriptionDisplay: string;
};
