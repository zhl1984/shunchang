import { describe, expect, it } from "vitest";

import { countUnfinishedTasks, projectUploadTask } from "./task";

const baseFile = {
  id: "file-1",
  name: "scan.dcm",
  size: 1000,
  type: "application/dicom",
  isPaused: false,
  isRestored: false,
  error: undefined,
  progress: {
    bytesTotal: 1000,
    bytesUploaded: 250,
    uploadComplete: false,
    uploadStarted: 100,
  },
};

describe("projectUploadTask", () => {
  it("projects upload progress as a bounded percentage", () => {
    expect(projectUploadTask(baseFile)).toMatchObject({
      id: "file-1",
      percent: 25,
      status: "uploading",
    });
  });

  it("requires the original file when Golden Retriever restores metadata", () => {
    expect(projectUploadTask({ ...baseFile, isRestored: true }).status).toBe(
      "needs-file",
    );
  });

  it("keeps a completed restored task out of the recovery queue", () => {
    expect(
      projectUploadTask({
        ...baseFile,
        isRestored: true,
        progress: { ...baseFile.progress, uploadComplete: true },
      }).status,
    ).toBe("completed");
  });

  it("projects paused, error, and completed states", () => {
    expect(projectUploadTask({ ...baseFile, isPaused: true }).status).toBe(
      "paused",
    );
    expect(projectUploadTask({ ...baseFile, error: "network" }).status).toBe(
      "error",
    );
    expect(
      projectUploadTask({
        ...baseFile,
        progress: { ...baseFile.progress, uploadComplete: true },
      }).status,
    ).toBe("completed");
  });
});

describe("countUnfinishedTasks", () => {
  it("excludes completed and cancelled tasks from the header count", () => {
    expect(
      countUnfinishedTasks([
        { ...projectUploadTask(baseFile), status: "uploading" },
        { ...projectUploadTask(baseFile), id: "2", status: "completed" },
        { ...projectUploadTask(baseFile), id: "3", status: "cancelled" },
        { ...projectUploadTask(baseFile), id: "4", status: "needs-file" },
      ]),
    ).toBe(2);
  });
});
