/** 模型卡片展示及编辑弹窗共用的自迭代状态。 */
export type ModelStatus = "notReady" | "ready" | "unsupported";

/** 模型输出标签的展示名称和平台标签关联信息。 */
export interface ModelLabelRecord {
  outputLabelName: string;
  platformLabelId: number;
  platformLabelName: string;
}

/** 模型列表向编辑流程传递的基础模型信息。 */
export interface ModelRecord {
  apiKey: string;
  confidence: string;
  description: string;
  endpoint: string;
  key: number;
  labels: ModelLabelRecord[];
  name: string;
  protocol: string;
  selfIterationEnabled: boolean;
  selfIterationSupported: boolean;
  status: ModelStatus;
  updatedAt: string;
  version: string;
}
