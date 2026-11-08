import { describe, expect, it } from "vitest";

import type { AnnotationTask } from "./types";
import {
  getAggregateStatus,
  getSampleIssueClass,
  getTaskStatusColor,
  getTaskStatusTagStyle,
  matchesAggregateStatus,
} from "./utils";

const annotatingTask: AnnotationTask = {
  id: "task-1",
  projectCode: "PROJECT",
  displayName: "任务",
  taskType: "normal",
  status: "annotating",
  annotatorId: 1,
  batchNo: 1,
  sampleCount: 1,
};

describe("annotation task utils", () => {
  it("uses backend status directly for filtering", () => {
    expect(getAggregateStatus("annotating")).toBe("annotating");
    expect(matchesAggregateStatus(annotatingTask, "annotating")).toBe(true);
    expect(matchesAggregateStatus(annotatingTask, "qualityChecking")).toBe(
      false,
    );
  });

  it("returns sample issue classes", () => {
    expect(getSampleIssueClass("mustFix")).toBe(
      "annotation-task-sample--must-fix",
    );
    expect(getSampleIssueClass("suggestion")).toBe(
      "annotation-task-sample--suggestion",
    );
    expect(getSampleIssueClass("none")).toBe("");
  });

  it("returns the prototype task status colors", () => {
    expect(getTaskStatusColor("annotating")).toBe("#2F63D9");
    expect(getTaskStatusColor("qualityChecking")).toBe("#7B4AD8");
    expect(getTaskStatusColor("reworking")).toBe("#D66A21");
    expect(getTaskStatusColor("completed")).toBe("#2F8F67");
    expect(getTaskStatusTagStyle("reworking")).toEqual({
      color: "#D66A21",
      backgroundColor: "#FFF7E6",
      borderColor: "transparent",
    });
  });
});
