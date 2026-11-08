import { describe, expect, it } from "vitest";

import {
  buildQualityCommentSubmitRequest,
  buildQualityCommentTarget,
  trimQualityCommentContent,
  validateQualityCommentContent,
} from "./validation";

describe("quality comment validation", () => {
  it("trims and validates comment content", () => {
    expect(trimQualityCommentContent("  hello  ")).toBe("hello");
    expect(validateQualityCommentContent("   ")).toEqual({ code: "required" });
    expect(validateQualityCommentContent("x".repeat(1001))).toEqual({
      code: "maxLength",
      limit: 1000,
    });
  });

  it("builds submit request from context snapshot", () => {
    const context = {
      taskId: "task-1",
      platformSource: "pc-tool",
      mode: "QUALITY" as const,
      unit: { type: "CLIP" as const, id: "clip-1" },
      revision: 1,
      capabilities: {
        canCreateComment: true,
        canViewHistory: true,
        canLocateObject: false,
      },
    };
    const request = buildQualityCommentSubmitRequest(context, "CLIP", {
      content: "  需要修改  ",
      severity: "MUST_FIX",
    });

    expect(buildQualityCommentTarget(context, "CLIP")).toMatchObject({
      taskId: "task-1",
      unitId: "clip-1",
      platformSource: "pc-tool",
    });
    expect(buildQualityCommentTarget(context, "CLIP").objectId).toBeUndefined();
    expect(request.content).toBe("需要修改");
    expect(request.target).toMatchObject({
      taskId: "task-1",
      unitId: "clip-1",
      platformSource: "pc-tool",
    });
  });
});
