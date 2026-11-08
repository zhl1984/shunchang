import { describe, expect, it } from "vitest";

import {
  createQualityCommentMessage,
  isQualityCommentMessage,
  normalizeQualityCommentLocateRequest,
  normalizeQualityCommentSessionPayload,
  normalizeQualityCommentSubmitRequest,
} from "./protocol";

describe("quality comment protocol", () => {
  it("builds and recognizes envelope messages", () => {
    const message = createQualityCommentMessage(
      "READY",
      { supportedFeatures: ["history"] },
      "session-a",
      "request-a",
    );

    expect(isQualityCommentMessage(message)).toBe(true);
    expect(message.channel).toBe("quality-comment");
    expect(message.protocolVersion).toBe("1.0");
    expect(
      isQualityCommentMessage({ ...message, event: "UNKNOWN_EVENT" }),
    ).toBe(false);
    expect(isQualityCommentMessage({ ...message, revision: "stale" })).toBe(
      false,
    );
  });

  it("parses host session and request payloads", () => {
    expect(
      normalizeQualityCommentSessionPayload({
        context: {
          taskId: "task-1",
          taskName: "demo",
          platformSource: "pc-tool",
          hostAppId: "fe-management",
          mode: "QUALITY",
          unit: { type: "CLIP", id: "clip-1", name: "demo" },
          frame: { id: "frame-1", no: 8 },
          selectedObject: {
            id: "object-1",
            labelId: "label-1",
            labelCode: "L-1",
            labelName: "目标标签",
            tracingId: "trace-1",
          },
          revision: 3,
          theme: "light",
          capabilities: {
            canCreateComment: true,
            canViewHistory: true,
            canLocateObject: true,
          },
        },
        history: [],
        openScope: "OBJECT",
      }),
    ).toMatchObject({
      context: {
        taskId: "task-1",
        mode: "QUALITY",
        theme: "light",
      },
      openScope: "OBJECT",
    });

    expect(
      normalizeQualityCommentSessionPayload({
        context: {
          taskId: "task-1",
          platformSource: "pc-tool",
          mode: "QUALITY",
          unit: { type: "CLIP", id: "clip-1" },
          revision: 1,
          capabilities: {
            canCreateComment: true,
            canViewHistory: true,
            canLocateObject: true,
          },
        },
      }),
    ).toMatchObject({
      context: {
        taskId: "task-1",
        mode: "QUALITY",
        unit: {
          id: "clip-1",
          type: "CLIP",
        },
      },
    });

    expect(
      normalizeQualityCommentSessionPayload({
        context: {
          taskId: "task-1",
          platformSource: "pc-tool",
          mode: "QUALITY",
          unit: { type: "INVALID", id: "clip-1" },
          revision: 1,
          capabilities: {
            canCreateComment: true,
            canViewHistory: true,
            canLocateObject: true,
          },
        },
      }),
    ).toBeUndefined();

    expect(
      normalizeQualityCommentSubmitRequest({
        scope: "OBJECT",
        target: {
          taskId: "task-1",
          unitType: "CLIP",
          unitId: "clip-1",
          platformSource: "pc-tool",
        },
        content: "  需要修改  ",
        severity: "MUST_FIX",
      }),
    ).toMatchObject({
      content: "  需要修改  ",
      severity: "MUST_FIX",
    });

    expect(
      normalizeQualityCommentLocateRequest({
        commentId: "comment-1",
        target: {
          taskId: "task-1",
          unitType: "CLIP",
          unitId: "clip-1",
          platformSource: "pc-tool",
        },
      }),
    ).toMatchObject({
      commentId: "comment-1",
    });
  });
});
