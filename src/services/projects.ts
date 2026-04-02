import { endOfWeek, format, isAfter, startOfWeek, subWeeks } from 'date-fns';
import { projectLocalSignals } from '@/lib/projectLocalSignals';

export type ProjectAgent = 'Codex' | 'Claude' | 'Codex + Claude';
export type ProjectHealth = 'On Track' | 'At Risk' | 'Blocked';
export type ProjectStage = 'Discovery' | 'Build' | 'Review' | 'Launch Prep';
export type ProjectSourceType = 'github' | 'run-log' | 'doc';

export interface ProjectTrendPoint {
  label: string;
  issuesTouched: number;
  prsTouched: number;
  runsTouched: number;
}

export interface ProjectSourceHealth {
  id: string;
  label: string;
  workspace: string;
  sourceType: ProjectSourceType;
  repoUrl?: string;
  visibility: 'public' | 'private' | 'unknown';
  status: 'Connected' | 'Warning' | 'Error';
  detail: string;
  lastSyncAt?: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  workspace: string;
  agent: ProjectAgent;
  stage: ProjectStage;
  health: ProjectHealth;
  openIssues: number;
  openPullRequests: number;
  blockers: number;
  nextMilestone: string;
  updatedAt: string;
  repoUrl?: string;
  notes: string;
  labels: string[];
  runSummary?: string;
  lastRunAt?: string;
  currentVersion?: string;
  nextPhase?: string;
}

export interface ProjectDashboardSnapshot {
  assumptions: string[];
  lastSyncedAt: string;
  kpis: {
    activeProjects: number;
    openWorkItems: number;
    blockedProjects: number;
    updatedThisWeek: number;
  };
  trends: ProjectTrendPoint[];
  breakdown: Array<{
    label: string;
    onTrack: number;
    atRisk: number;
    blocked: number;
  }>;
  projects: ProjectRecord[];
  sources: ProjectSourceHealth[];
}

interface ProjectSourceConfig {
  id: string;
  owner?: string;
  repo?: string;
  workspace: string;
  agent: ProjectAgent;
  enabled: boolean;
  fallbackName?: string;
}

interface GitHubRepoResponse {
  name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  pushed_at: string;
  updated_at: string;
}

interface GitHubIssueResponse {
  title: string;
  updated_at: string;
  pull_request?: { url: string };
  labels: Array<{ name: string }>;
}

interface GitHubPullResponse {
  title: string;
  updated_at: string;
}

interface GitHubMilestoneResponse {
  title: string;
  due_on: string | null;
}

interface LocalRunMetadata {
  logName: string;
  lastActivityAt?: string;
  summary: string;
  warnings: number;
}

interface LocalDocMetadata {
  currentVersion?: string;
  nextPhase?: string;
  summary?: string;
}

const DEFAULT_SOURCES: ProjectSourceConfig[] = [
  {
    id: 'cobalt-pos-2026-03-04',
    owner: 'mperkins0155',
    repo: 'cobalt-pos-2026-03-04',
    workspace: 'cobalt-pos-2026-03-04',
    agent: 'Codex + Claude',
    enabled: true,
  },
  {
    id: 'cobalt-master-repo',
    owner: 'mperkins0155',
    repo: 'cobalt-master-repo',
    workspace: 'cobalt-master-repo',
    agent: 'Codex',
    enabled: true,
  },
  {
    id: 'cloudpos-demo',
    owner: 'mperkins0155',
    repo: 'cloudpos-demo',
    workspace: 'cloudpos-demo',
    agent: 'Codex + Claude',
    enabled: true,
  },
  {
    id: 'cmc-website',
    owner: 'mperkins0155',
    repo: 'cmc-website',
    workspace: 'cmc-website',
    agent: 'Claude',
    enabled: true,
  },
  {
    id: 'ai-web-builder',
    owner: 'mperkins0155',
    repo: 'ai-web-builder',
    workspace: 'ai-web-builder',
    agent: 'Codex',
    enabled: true,
  },
  {
    id: 'two7-cmc-platform',
    workspace: 'two7-cmc-platform',
    agent: 'Claude',
    enabled: true,
    fallbackName: 'Two7 CMC Platform',
  },
];

export const ProjectService = {
  async getActiveProjectDashboard(): Promise<ProjectDashboardSnapshot> {
    const enabledSources = DEFAULT_SOURCES.filter((source) => source.enabled);
    const lastSyncedAt = new Date().toISOString();
    const responses = await Promise.all(enabledSources.map((source) => loadSource(source)));

    const projects = responses
      .map((response) => response.project)
      .filter((project): project is ProjectRecord => Boolean(project))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

    const sources = responses.flatMap((response) => response.sources);
    const trendBuckets = createTrendBuckets();

    for (const response of responses) {
      for (const issue of response.github?.issues || []) {
        addActivityToBuckets(trendBuckets, issue.updated_at, 'issuesTouched');
      }
      for (const pull of response.github?.pulls || []) {
        addActivityToBuckets(trendBuckets, pull.updated_at, 'prsTouched');
      }
      if (response.runMeta?.lastActivityAt) {
        addActivityToBuckets(trendBuckets, response.runMeta.lastActivityAt, 'runsTouched');
      }
    }

    return {
      assumptions: [
        'Live entities now combine GitHub repo data, GitHub issue labels, local run logs, and local project docs where available.',
        'If a repo is private or GitHub starts rate-limiting, set VITE_GITHUB_TOKEN in the frontend environment instead of pasting a token into chat.',
        'Linear is not wired yet; the current “deeper real systems” layer uses systems that already exist in this workspace without requiring new auth.',
      ],
      lastSyncedAt,
      kpis: {
        activeProjects: projects.length,
        openWorkItems: projects.reduce(
          (total, project) => total + project.openIssues + project.openPullRequests,
          0
        ),
        blockedProjects: projects.filter((project) => project.health === 'Blocked').length,
        updatedThisWeek: projects.filter((project) =>
          isAfter(new Date(project.updatedAt), subWeeks(new Date(), 1))
        ).length,
      },
      trends: trendBuckets.map(({ label, issuesTouched, prsTouched, runsTouched }) => ({
        label,
        issuesTouched,
        prsTouched,
        runsTouched,
      })),
      breakdown: [
        buildBreakdown('Codex', projects),
        buildBreakdown('Claude', projects),
        buildBreakdown('Codex + Claude', projects, 'Shared'),
      ],
      projects,
      sources,
    };
  },
};

interface LoadedSourceResult {
  project: ProjectRecord | null;
  sources: ProjectSourceHealth[];
  github?: {
    issues: GitHubIssueResponse[];
    pulls: GitHubPullResponse[];
  };
  runMeta?: LocalRunMetadata;
}

async function loadSource(source: ProjectSourceConfig): Promise<LoadedSourceResult> {
  const github = source.owner && source.repo ? await loadGitHub(source) : undefined;
  const localSignal = projectLocalSignals[source.workspace];
  const runMeta = localSignal ? loadRunMetadata(localSignal) : undefined;
  const docMeta = localSignal ? loadDocMetadata(localSignal) : undefined;

  const project = buildProjectRecord(source, github, runMeta, docMeta);

  return {
    project,
    github: github?.payload,
    runMeta,
    sources: [...(github?.sources || []), ...(runMeta ? [buildRunSourceHealth(source, runMeta)] : []), ...(docMeta ? buildDocSourceHealth(source, docMeta) : [])],
  };
}

async function loadGitHub(source: ProjectSourceConfig) {
  const repoUrl = `https://github.com/${source.owner}/${source.repo}`;

  try {
    const [repo, issues, pulls, milestones] = await Promise.all([
      githubRequest<GitHubRepoResponse>(`/repos/${source.owner}/${source.repo}`),
      githubRequest<GitHubIssueResponse[]>(
        `/repos/${source.owner}/${source.repo}/issues?state=open&per_page=100&sort=updated&direction=desc`
      ),
      githubRequest<GitHubPullResponse[]>(
        `/repos/${source.owner}/${source.repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`
      ),
      githubRequest<GitHubMilestoneResponse[]>(
        `/repos/${source.owner}/${source.repo}/milestones?state=open&per_page=10&sort=due_on&direction=asc`
      ),
    ]);

    const pureIssues = issues.filter((issue) => !issue.pull_request);
    const blockers = pureIssues.filter((issue) =>
      issue.labels.some((label) => /block|blocked/i.test(label.name))
    ).length;

    return {
      payload: { repo, issues: pureIssues, pulls, milestones, blockers },
      sources: [
        {
          id: `${source.id}-github`,
          label: `${source.owner}/${source.repo}`,
          workspace: source.workspace,
          sourceType: 'github' as const,
          repoUrl,
          visibility: repo.private ? 'private' : 'public',
          status: 'Connected' as const,
          detail: `${pureIssues.length} open issues, ${pulls.length} open PRs, ${blockers} blockers`,
          lastSyncAt: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown GitHub source failure';
    return {
      payload: undefined,
      sources: [
        {
          id: `${source.id}-github`,
          label: `${source.owner}/${source.repo}`,
          workspace: source.workspace,
          sourceType: 'github' as const,
          repoUrl,
          visibility: 'unknown' as const,
          status: 'Error' as const,
          detail,
          lastSyncAt: new Date().toISOString(),
        },
      ],
    };
  }
}

function loadRunMetadata(signal: {
  logName?: string;
  runSummary?: string;
  lastRunAt?: string;
  runWarnings?: number;
}): LocalRunMetadata | undefined {
  if (!signal.logName && !signal.runSummary) return undefined;
  return {
    logName: signal.logName || 'local-run',
    lastActivityAt: signal.lastRunAt,
    summary: signal.runSummary || 'Local run metadata available',
    warnings: signal.runWarnings || 0,
  };
}

function loadDocMetadata(signal: {
  currentVersion?: string;
  nextPhase?: string;
  docSummary?: string;
}): LocalDocMetadata | undefined {
  const result: LocalDocMetadata = {
    currentVersion: signal.currentVersion,
    nextPhase: signal.nextPhase,
    summary: signal.docSummary,
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

async function githubRequest<T>(path: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Cobalt-POS-Dashboard',
  };

  const token = import.meta.env.VITE_GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    const message =
      response.status === 403
        ? 'GitHub API rate limit hit or authentication required'
        : `GitHub request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function buildProjectRecord(
  source: ProjectSourceConfig,
  github:
    | {
        payload?: {
          repo: GitHubRepoResponse;
          issues: GitHubIssueResponse[];
          pulls: GitHubPullResponse[];
          milestones: GitHubMilestoneResponse[];
          blockers: number;
        };
      }
    | undefined,
  runMeta?: LocalRunMetadata,
  docMeta?: LocalDocMetadata
): ProjectRecord | null {
  const githubPayload = github?.payload;
  if (!githubPayload && !runMeta && !docMeta) return null;

  const issueLabels = Array.from(
    new Set((githubPayload?.issues || []).flatMap((issue) => issue.labels.map((label) => label.name)))
  )
    .filter((label) => !/block|blocked/i.test(label))
    .slice(0, 4);

  const updatedAt = latestTimestamp([
    githubPayload?.repo.pushed_at,
    githubPayload?.repo.updated_at,
    githubPayload?.issues[0]?.updated_at,
    githubPayload?.pulls[0]?.updated_at,
    runMeta?.lastActivityAt,
  ]);

  const openIssues = githubPayload?.issues.length || 0;
  const openPullRequests = githubPayload?.pulls.length || 0;
  const blockers = githubPayload?.blockers || 0;
  const nextMilestone =
    docMeta?.nextPhase ||
    githubPayload?.milestones[0]?.title ||
    githubPayload?.pulls[0]?.title ||
    githubPayload?.issues[0]?.title ||
    runMeta?.summary ||
    'No active milestone';

  return {
    id: source.id,
    name: source.fallbackName || prettifyRepoName(githubPayload?.repo.name || source.workspace),
    workspace: source.workspace,
    agent: source.agent,
    stage: inferStage(openIssues, openPullRequests, updatedAt, issueLabels),
    health: inferHealth(blockers, openIssues, openPullRequests, updatedAt, runMeta?.warnings || 0),
    openIssues,
    openPullRequests,
    blockers,
    nextMilestone,
    updatedAt,
    repoUrl: githubPayload?.repo.html_url,
    notes: buildNotes(githubPayload?.repo, openIssues, openPullRequests, blockers, runMeta, docMeta),
    labels: issueLabels,
    runSummary: runMeta?.summary,
    lastRunAt: runMeta?.lastActivityAt,
    currentVersion: docMeta?.currentVersion,
    nextPhase: docMeta?.nextPhase,
  };
}

function prettifyRepoName(name: string) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferStage(
  openIssues: number,
  openPullRequests: number,
  updatedAt: string,
  labels: string[]
): ProjectStage {
  if (openPullRequests > 0) return 'Review';
  if (labels.some((label) => /launch|release|hardening/i.test(label))) return 'Launch Prep';
  if (openIssues > 0) return 'Build';
  if (isAfter(new Date(updatedAt), subWeeks(new Date(), 1))) return 'Launch Prep';
  return 'Discovery';
}

function inferHealth(
  blockers: number,
  openIssues: number,
  openPullRequests: number,
  updatedAt: string,
  warnings: number
): ProjectHealth {
  if (blockers > 0 || warnings > 3) return 'Blocked';
  if (!isAfter(new Date(updatedAt), subWeeks(new Date(), 1))) return 'At Risk';
  if (openIssues + openPullRequests > 10) return 'At Risk';
  return 'On Track';
}

function buildNotes(
  repo: GitHubRepoResponse | undefined,
  openIssues: number,
  openPullRequests: number,
  blockers: number,
  runMeta?: LocalRunMetadata,
  docMeta?: LocalDocMetadata
) {
  const parts = [
    repo?.description || docMeta?.summary || 'Live project source',
    `${openIssues} issues`,
    `${openPullRequests} PRs`,
  ];

  if (blockers > 0) parts.push(`${blockers} blockers`);
  if (runMeta?.summary) parts.push(runMeta.summary);
  if (docMeta?.currentVersion) parts.push(docMeta.currentVersion);

  return parts.join(' • ');
}

function latestTimestamp(values: Array<string | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ||
    new Date().toISOString()
  );
}

function buildBreakdown(agent: ProjectAgent, projects: ProjectRecord[], label = agent) {
  const owned = projects.filter((project) => project.agent === agent);
  return {
    label,
    onTrack: owned.filter((project) => project.health === 'On Track').length,
    atRisk: owned.filter((project) => project.health === 'At Risk').length,
    blocked: owned.filter((project) => project.health === 'Blocked').length,
  };
}

function createTrendBuckets() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, index) => {
    const bucketStart = startOfWeek(subWeeks(today, 4 - index));
    const bucketEnd = endOfWeek(bucketStart);
    return {
      start: bucketStart,
      end: bucketEnd,
      label: format(bucketStart, 'MMM dd'),
      issuesTouched: 0,
      prsTouched: 0,
      runsTouched: 0,
    };
  });
}

function addActivityToBuckets(
  buckets: ReturnType<typeof createTrendBuckets>,
  updatedAt: string,
  key: 'issuesTouched' | 'prsTouched' | 'runsTouched'
) {
  const updated = new Date(updatedAt);
  const bucket = buckets.find((candidate) => updated >= candidate.start && updated <= candidate.end);
  if (bucket) bucket[key] += 1;
}

function buildRunSourceHealth(source: ProjectSourceConfig, runMeta: LocalRunMetadata): ProjectSourceHealth {
  return {
    id: `${source.id}-run-log`,
    label: runMeta.logName,
    workspace: source.workspace,
    sourceType: 'run-log',
    visibility: 'unknown',
    status: runMeta.warnings > 3 ? 'Warning' : 'Connected',
    detail: runMeta.summary,
    lastSyncAt: runMeta.lastActivityAt || new Date().toISOString(),
  };
}

function buildDocSourceHealth(source: ProjectSourceConfig, docMeta: LocalDocMetadata): ProjectSourceHealth[] {
  return [
    {
      id: `${source.id}-doc`,
      label: 'Project docs',
      workspace: source.workspace,
      sourceType: 'doc',
      visibility: 'unknown',
      status: 'Connected',
      detail:
        [docMeta.currentVersion, docMeta.nextPhase, docMeta.summary]
          .filter(Boolean)
          .join(' • ') || 'Project documentation loaded',
      lastSyncAt: new Date().toISOString(),
    },
  ];
}
