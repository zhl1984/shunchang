import createCloneProxy from "./clone-proxy";

export type SCENARIO_TYPE = "3D_DY" | "CT_DESIGNER";

export const SCENARIO_URL_MAPPING: Record<SCENARIO_TYPE, string | undefined> =
  createCloneProxy({
    "3D_DY": import.meta.env.VITE_PC_TOOL_URL,
    CT_DESIGNER: import.meta.env.VITE_HEALTH_TOOL_URL,
  });
