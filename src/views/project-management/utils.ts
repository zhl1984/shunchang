import type { CreateProjectParams, ProjectDetail } from "@/api/project";
import type { ProjectFormDraft } from "./types";

/** 将后端项目详情拆分为四个步骤使用的前端表单模型。 */
export function fromProjectDetail(detail: ProjectDetail): ProjectFormDraft {
  return {
    basic: {
      projectName: detail.projectName ?? "",
      projectDesc: detail.projectDesc ?? "",
      ownerUserId: detail.ownerUserId ?? undefined,
      deadline: detail.deadline ?? "",
    },
    scene: {
      annotationTypeId: detail.annotationTypeId ?? undefined,
      sceneId: detail.sceneId ?? undefined,
    },
    members: {
      annotatorUserIds: detail.annotatorUserIds ?? [],
      qualityUserIds: detail.qualityUserIds ?? {},
    },
    dataSource: {
      datasetId: detail.datasetId ?? undefined,
      dataType: detail.dataType ?? "",
      batchSize: detail.batchSize ?? undefined,
      iterationEnabled: detail.iterationEnabled ?? false,
      iterationConfig: {
        targetAccuracy: detail.iterationConfig?.targetAccuracy ?? undefined,
        maxRounds: detail.iterationConfig?.maxRounds ?? undefined,
      },
    },
  };
}

/** 将四个步骤表单模型汇总为后端创建项目参数。 */
export function toCreateProjectParams(
  draft: ProjectFormDraft,
): CreateProjectParams {
  return {
    ...draft.basic,
    ...draft.scene,
    ...draft.members,
    ...draft.dataSource,
  } as CreateProjectParams;
}
