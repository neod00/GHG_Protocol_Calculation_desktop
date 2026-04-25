import { invoke } from "@tauri-apps/api/core";
import type { BoundaryApproach, EmissionSource, Facility } from "@ghg/core";
import { APP_VERSION } from "./config";

export interface DesktopProjectData {
  companyName: string;
  reportingYear: string;
  boundaryApproach: BoundaryApproach;
  facilities: Facility[];
  sources: EmissionSource[];
  reportDraft?: DesktopReportDraft;
}

export interface DesktopReportDraft {
  reportingPeriod: string;
  organizationalBoundarySummary: string;
  operationalBoundarySummary: string;
  excludedActivitiesText: string;
  methodologySummary: string;
  emissionFactorSourcesText: string;
  dataQualityNotesText: string;
  uncertaintyNotesText: string;
  recalculationPolicy: string;
  baseYearSelectionReason: string;
  verificationStatus: "not_performed" | "internal_review" | "external_verification";
  verifierName: string;
  verificationStandard: string;
  verificationOpinion: string;
  contactDepartment: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  optionalIntensityMetricsText: string;
  optionalReductionInitiativesText: string;
  optionalEnergyProgramsText: string;
  optionalOtherDisclosuresText: string;
}

export interface DesktopProjectEnvelope {
  schemaVersion: 1;
  appVersion: string;
  projectId: string;
  projectName: string;
  updatedAt: string;
  data: DesktopProjectData;
}

export interface DesktopProjectListItem {
  projectId: string;
  projectName: string;
  updatedAt: string;
}

export interface DesktopProjectBundleFile {
  fileName: string;
  filePath: string;
  updatedAt: string;
}

export function createProjectEnvelope(params: {
  projectId: string;
  projectName: string;
  data: DesktopProjectData;
}): DesktopProjectEnvelope {
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    projectId: params.projectId,
    projectName: params.projectName,
    updatedAt: new Date().toISOString(),
    data: params.data
  };
}

export async function saveDesktopProject(project: DesktopProjectEnvelope): Promise<void> {
  await invoke("save_project", { project });
}

export async function loadLastDesktopProject(): Promise<DesktopProjectEnvelope | null> {
  return invoke<DesktopProjectEnvelope | null>("load_last_project");
}

export async function loadDesktopProject(projectId: string): Promise<DesktopProjectEnvelope | null> {
  return invoke<DesktopProjectEnvelope | null>("load_project", { projectId });
}

export async function listDesktopProjects(): Promise<DesktopProjectListItem[]> {
  return invoke<DesktopProjectListItem[]>("list_projects");
}

export async function exportDesktopProjectBundle(project: DesktopProjectEnvelope): Promise<string> {
  return invoke<string>("export_project_bundle", { project });
}

export async function listDesktopProjectBundles(): Promise<DesktopProjectBundleFile[]> {
  return invoke<DesktopProjectBundleFile[]>("list_project_bundle_files");
}

export async function importDesktopProjectBundle(fileName: string): Promise<DesktopProjectEnvelope> {
  return invoke<DesktopProjectEnvelope>("import_project_bundle", { fileName });
}
