import { describe, expect, it } from "vitest";
import type { Scenario, ScenarioInput } from "./scenario";

describe("scenario api contract", () => {
  it("uses backend scene fields", () => {
    const input: ScenarioInput = { sceneName: "scene", sceneDesc: "desc", annotationTypeId: 1, qualityPlanId: 2, labelModels: [], ruleMappings: [] };
    expect(input.sceneName).toBe("scene");
  });
  it("models nullable rule mappings", () => {
    const scene = { ruleMappings: null } as Pick<Scenario, "ruleMappings">;
    expect(scene.ruleMappings).toBeNull();
  });
});
