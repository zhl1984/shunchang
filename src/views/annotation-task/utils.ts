import type {
  AnnotationTaskAggregateStatus,
  AnnotationTaskSampleIssueLevel,
  AnnotationTaskStatus,
} from "./types";

/** 后端仅返回四种任务状态，聚合状态直接复用页面状态。 */
export function getAggregateStatus(
  status: AnnotationTaskStatus,
): AnnotationTaskAggregateStatus {
  return status;
}

/** 判断任务是否属于指定聚合筛选项。 */
export function matchesAggregateStatus(
  task: AnnotationTask,
  status: AnnotationTaskAggregateStatus | "all",
): boolean {
  return status === "all" || getAggregateStatus(task.status) === status;
}

/** 返回符合原型色值要求的 Ant Design 标签颜色。 */
export function getTaskStatusColor(status: AnnotationTaskStatus): string {
  return taskStatusTagStyles[status].color;
}

/** 返回状态标签的文字、背景和边框样式，避免 Ant Design 自定义色渲染为实心深色标签。 */
export function getTaskStatusTagStyle(
  status: AnnotationTaskStatus,
): TaskStatusTagStyle {
  return taskStatusTagStyles[status];
}

type TaskStatusTagStyle = {
  color: string;
  backgroundColor: string;
  borderColor: string;
};

const taskStatusTagStyles: Record<AnnotationTaskStatus, TaskStatusTagStyle> = {
  annotating: {
    color: "#2F63D9",
    backgroundColor: "#E6F4FF",
    borderColor: "transparent",
  },
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

/** 将样本问题级别转换为可读状态键。 */
export function getSampleIssueClass(
  issueLevel: AnnotationTaskSampleIssueLevel,
): string {
  if (issueLevel === "mustFix") {
    return "annotation-task-sample--must-fix";
  }

  if (issueLevel === "suggestion") {
    return "annotation-task-sample--suggestion";
  }

  return "";
}
