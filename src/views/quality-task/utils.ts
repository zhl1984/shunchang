import type {
  QualityTaskIssueLevel,
  QualityTaskStatus,
  QualityTaskSubmitResult,
} from "./types";

type TagStyle = {
  color: string;
  backgroundColor: string;
  borderColor: string;
};

const qualityTaskStatusTagStyles: Record<QualityTaskStatus, TagStyle> = {
  qualityChecking: {
    color: "#7B4AD8",
    backgroundColor: "#F9F0FF",
    borderColor: "transparent",
  },
  reworking: {
    color: "#D66A21",
    backgroundColor: "#FFF7E6",
    borderColor: "transparent",
  },
  completed: {
    color: "#2F8F67",
    backgroundColor: "#F6FFED",
    borderColor: "transparent",
  },
};

const qualityTaskResultTagStyles: Record<QualityTaskSubmitResult, TagStyle> = {
  pass: {
    color: "#2F8F67",
    backgroundColor: "#F6FFED",
    borderColor: "transparent",
  },
  fail: {
    color: "#D94A4A",
    backgroundColor: "#FFF1F0",
    borderColor: "transparent",
  },
};

/** 返回质检任务状态对应的标签样式，保持列表和详情页视觉一致。 */
export function getQualityTaskStatusTagStyle(
  status: QualityTaskStatus,
): TagStyle {
  return qualityTaskStatusTagStyles[status];
}

/** 返回质检提交结果对应的标签样式，用于人工质检记录和确认反馈。 */
export function getQualityTaskResultTagStyle(
  result: QualityTaskSubmitResult,
): TagStyle {
  return qualityTaskResultTagStyles[result];
}

/** 将问题级别映射为可读的样式类名，供样本和问题列表统一渲染。 */
export function getQualityTaskIssueClass(
  issueLevel: QualityTaskIssueLevel,
): string {
  if (issueLevel === "mustFix") {
    return "quality-task-issue--must-fix";
  }

  return "quality-task-issue--suggestion";
}
