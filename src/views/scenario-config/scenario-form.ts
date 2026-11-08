import type {
  Scenario,
  ScenarioInput,
  ScenarioLabelModelInput,
} from "@/api/scenario";

export type ScenarioModalMode = "create" | "view" | "edit" | "copy";
export type ScenarioLabelModelDraft = ScenarioLabelModelInput & {
  labelName?: string;
};
export type ScenarioDraft = Omit<
  ScenarioInput,
  "annotationTypeId" | "qualityPlanId" | "labelModels"
> & {
  annotationTypeId: number | undefined;
  qualityPlanId: number | undefined;
  labelModels: ScenarioLabelModelDraft[];
};

/** 创建场景表单草稿，字段严格对应后端请求契约。 */
export function createScenarioDraft(source?: Scenario): ScenarioDraft {
  if (source) {
    return {
      sceneName: source.sceneName,
      sceneDesc: source.sceneDesc,
      annotationTypeId: source.annotationTypeId,
      qualityPlanId: source.qualityPlanId,
      labelModels: source.labelModelMappings.map(
        ({ labelId, labelName, annotationType, modelId, modelVersionId }) => ({
          labelId,
          labelName,
          annotationType,
          modelId,
          modelVersionId,
        }),
      ),
      ruleMappings: (source.ruleMappings ?? []).map(({ ruleId, status }) => ({
        ruleId,
        status,
      })),
    };
  }
  return {
    sceneName: "",
    sceneDesc: "",
    annotationTypeId: undefined,
    qualityPlanId: undefined,
    labelModels: [],
    ruleMappings: [],
  };
}

/** 创建复制草稿。 */
export function createCopyScenarioDraft(
  source: Scenario,
  copySuffix: string,
): ScenarioDraft {
  return {
    ...createScenarioDraft(source),
    sceneName: `${source.sceneName}-${copySuffix}`,
  };
}

/** 返回必填字段校验错误。 */
export function validateScenarioDraft(draft: ScenarioDraft): string[] {
  const errors: string[] = [];
  if (!draft.sceneName.trim()) errors.push("sceneName");
  // if (!draft.sceneDesc.trim()) errors.push("sceneDesc");
  if (!draft.annotationTypeId) errors.push("annotationTypeId");
  if (!draft.qualityPlanId) errors.push("qualityPlanId");
  if (!draft.labelModels.length) errors.push("labelModels");
  return errors;
}

/** 将已通过校验的草稿转换为后端请求模型。 */
export function toScenarioInput(draft: ScenarioDraft): ScenarioInput {
  if (
    draft.annotationTypeId === undefined ||
    draft.qualityPlanId === undefined
  ) {
    throw new Error("Scenario type and quality plan are required");
  }
  return {
    ...draft,
    annotationTypeId: draft.annotationTypeId,
    qualityPlanId: draft.qualityPlanId,
    labelModels: draft.labelModels.map(
      ({ labelId, annotationType, modelId, modelVersionId }) => ({
        labelId,
        annotationType,
        modelId,
        modelVersionId,
      }),
    ),
  };
}
