export interface ProjectEnvelope<TProjectData = unknown> {
  schemaVersion: 1;
  appVersion: string;
  projectId: string;
  projectName: string;
  updatedAt: string;
  data: TProjectData;
}

export const GHG_PROJECT_EXTENSION = ".ghgproj";

export function createProjectEnvelope<TProjectData>(params: {
  appVersion: string;
  projectId: string;
  projectName: string;
  data: TProjectData;
}): ProjectEnvelope<TProjectData> {
  return {
    schemaVersion: 1,
    appVersion: params.appVersion,
    projectId: params.projectId,
    projectName: params.projectName,
    updatedAt: new Date().toISOString(),
    data: params.data
  };
}
