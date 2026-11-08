import { beforeEach, describe, expect, it, vi } from "vitest";

const getOhifUidMock = vi.hoisted(() => vi.fn());
const messageMock = vi.hoisted(() => ({ warning: vi.fn() }));

vi.mock("@/api/annotation-task", () => ({
  getAnnotationTaskOhifStudyInstanceUidApi: getOhifUidMock,
}));
vi.mock("ant-design-vue", () => ({
  message: messageMock,
}));

import { goToScenarioWorkbench } from "@/utils/common";

describe("goToScenarioWorkbench", () => {
  const openMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", openMock);
  });

  it("opens CT workbench with queried studyInstanceUID", async () => {
    getOhifUidMock.mockResolvedValueOnce(
      "1.2.840.113820.106.2616.120260611113313667",
    );
    await goToScenarioWorkbench("CT_DESIGNER", {
      taskId: "9001",
      itemId: "5003",
    });
    expect(getOhifUidMock).toHaveBeenCalledWith("5003");
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "StudyInstanceUIDs=1.2.840.113820.106.2616.120260611113313667",
      ),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("does not open CT workbench when OHIF query fails", async () => {
    getOhifUidMock.mockRejectedValueOnce(new Error("OHIF 影像标识为空"));
    await goToScenarioWorkbench("CT_DESIGNER", {
      taskId: "9001",
      itemId: "5003",
    });
    expect(openMock).not.toHaveBeenCalled();
    expect(messageMock.warning).toHaveBeenCalledWith("OHIF 影像标识为空");
  });

  it("does not query OHIF for point-cloud workbench", async () => {
    await goToScenarioWorkbench("3D_DY", {
      taskId: "9001",
      itemId: "5003",
      status: "annotating",
    });
    expect(getOhifUidMock).not.toHaveBeenCalled();
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining("taskId=9001"),
      "_blank",
      "noopener,noreferrer",
    );
  });
});
