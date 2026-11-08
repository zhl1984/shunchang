import type { CreateProjectParams, ProjectDetail } from "@/api/project";

export type ProjectModalMode = "create" | "view";
export type ProjectStepKey = "basic" | "scene" | "members" | "dataSource";

export interface ProjectBasicInfoForm {
  projectName: string;
  projectDesc: string;
  ownerUserId: number | undefined;
  deadline: string;
}
export interface ProjectSceneForm {
  annotationTypeId: number | undefined;
  sceneId: number | undefined;
}
export interface ProjectMemberForm {
  annotatorUserIds: number[];
  qualityUserIds: Record<string, number[]>;
}
export interface ProjectIterationConfigForm {
  targetAccuracy: number | undefined;
  maxRounds: number | undefined;
}
export interface ProjectDataSourceForm {
  datasetId: number | undefined;
  dataType: string;
  batchSize: number | undefined;
  iterationEnabled: boolean;
  iterationConfig: ProjectIterationConfigForm;
}
export interface ProjectFormDraft {
  basic: ProjectBasicInfoForm;
  scene: ProjectSceneForm;
  members: ProjectMemberForm;
  dataSource: ProjectDataSourceForm;
}
export interface ProjectStepExpose<TForm> {
  validate: () => Promise<void>;
  getForm: () => TForm;
}
export type ProjectDetailForForm = ProjectDetail;
export type ProjectCreateFormParams = CreateProjectParams;
