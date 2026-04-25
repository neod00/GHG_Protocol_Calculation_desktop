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

const browserProjectStoreKey = "ghg-desktop-browser-projects";
const browserLastProjectKey = "ghg-desktop-browser-last-project";
const browserBundleStoreKey = "ghg-desktop-browser-bundles";

type BrowserBundleStore = Record<string, DesktopProjectEnvelope>;

function isTauriAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined";
}

function readJson<T>(storageKey: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(storageKey: string, value: T) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(value));
}

function readBrowserProjects(): DesktopProjectEnvelope[] {
  return readJson<DesktopProjectEnvelope[]>(browserProjectStoreKey, []);
}

function writeBrowserProjects(projects: DesktopProjectEnvelope[]) {
  writeJson(browserProjectStoreKey, projects);
}

function readBrowserBundles(): BrowserBundleStore {
  return readJson<BrowserBundleStore>(browserBundleStoreKey, {});
}

function writeBrowserBundles(bundles: BrowserBundleStore) {
  writeJson(browserBundleStoreKey, bundles);
}

function setBrowserLastProject(projectId: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(browserLastProjectKey, projectId);
}

function getBrowserLastProjectId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(browserLastProjectKey);
}

function browserBundleFileName(project: DesktopProjectEnvelope): string {
  const safeProjectName = project.projectName.trim().replace(/[\\/:*?"<>|]/g, "_") || "GHG_Project";
  return `${safeProjectName}_${project.updatedAt.slice(0, 10).replace(/-/g, "")}.ghgproj`;
}

function listBrowserProjectItems(): DesktopProjectListItem[] {
  return readBrowserProjects()
    .map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      updatedAt: project.updatedAt
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function listBrowserBundleFiles(): DesktopProjectBundleFile[] {
  return Object.entries(readBrowserBundles())
    .map(([fileName, project]) => ({
      fileName,
      filePath: `browser-storage://${fileName}`,
      updatedAt: project.updatedAt
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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
  if (isTauriAvailable()) {
    await invoke("save_project", { project });
    return;
  }

  const projects = readBrowserProjects();
  const nextProjects = [project, ...projects.filter((item) => item.projectId !== project.projectId)];
  writeBrowserProjects(nextProjects);
  setBrowserLastProject(project.projectId);
}

export async function loadLastDesktopProject(): Promise<DesktopProjectEnvelope | null> {
  if (isTauriAvailable()) {
    return invoke<DesktopProjectEnvelope | null>("load_last_project");
  }

  const projectId = getBrowserLastProjectId();
  if (!projectId) return null;
  return readBrowserProjects().find((item) => item.projectId === projectId) || null;
}

export async function loadDesktopProject(projectId: string): Promise<DesktopProjectEnvelope | null> {
  if (isTauriAvailable()) {
    return invoke<DesktopProjectEnvelope | null>("load_project", { projectId });
  }

  return readBrowserProjects().find((item) => item.projectId === projectId) || null;
}

export async function listDesktopProjects(): Promise<DesktopProjectListItem[]> {
  if (isTauriAvailable()) {
    return invoke<DesktopProjectListItem[]>("list_projects");
  }

  return listBrowserProjectItems();
}

export async function exportDesktopProjectBundle(project: DesktopProjectEnvelope): Promise<string> {
  if (isTauriAvailable()) {
    return invoke<string>("export_project_bundle", { project });
  }

  const fileName = browserBundleFileName(project);
  const bundles = readBrowserBundles();
  bundles[fileName] = project;
  writeBrowserBundles(bundles);
  return `browser-storage://${fileName}`;
}

export async function listDesktopProjectBundles(): Promise<DesktopProjectBundleFile[]> {
  if (isTauriAvailable()) {
    return invoke<DesktopProjectBundleFile[]>("list_project_bundle_files");
  }

  return listBrowserBundleFiles();
}

export async function importDesktopProjectBundle(fileName: string): Promise<DesktopProjectEnvelope> {
  if (isTauriAvailable()) {
    return invoke<DesktopProjectEnvelope>("import_project_bundle", { fileName });
  }

  const bundles = readBrowserBundles();
  const project = bundles[fileName];

  if (!project) {
    throw new Error(`브라우저 저장소에서 ${fileName} 파일을 찾지 못했습니다.`);
  }

  await saveDesktopProject(project);
  return project;
}
