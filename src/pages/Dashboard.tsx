import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  Boxes,
  Clock3,
  GitBranch,
  Github,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { StatCard } from '@/components/pos';
import { ProjectSourceHealthPanel } from '@/components/projects/ProjectSourceHealthPanel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ProjectService,
  type ProjectDashboardSnapshot,
  type ProjectHealth,
} from '@/services/projects';

const throughputChartConfig = {
  issuesTouched: { label: 'Issues Updated', color: 'hsl(var(--primary))' },
  prsTouched: { label: 'PRs Updated', color: 'hsl(var(--success))' },
  runsTouched: { label: 'Runs Touched', color: 'hsl(var(--warning))' },
} satisfies ChartConfig;

const ownershipChartConfig = {
  onTrack: { label: 'On Track', color: 'hsl(var(--success))' },
  atRisk: { label: 'At Risk', color: 'hsl(var(--warning))' },
  blocked: { label: 'Blocked', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig;

type AgentFilter = 'all' | 'Codex' | 'Claude' | 'Codex + Claude';

export default function Dashboard() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ProjectDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all');
  const [showSourceHealth, setShowSourceHealth] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await ProjectService.getActiveProjectDashboard();
        setSnapshot(response);
      } catch (error) {
        console.error('Project dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const visibleProjects = useMemo(() => {
    if (!snapshot) return [];
    if (agentFilter === 'all') return snapshot.projects;
    return snapshot.projects.filter((project) => project.agent === agentFilter);
  }, [agentFilter, snapshot]);

  const filteredKpis = useMemo(() => {
    if (visibleProjects.length === 0) {
      return { activeProjects: 0, openWorkItems: 0, blockedProjects: 0, updatedThisWeek: 0 };
    }

    return {
      activeProjects: visibleProjects.length,
      openWorkItems: visibleProjects.reduce(
        (total, project) => total + project.openIssues + project.openPullRequests,
        0
      ),
      blockedProjects: visibleProjects.filter((project) => project.health === 'Blocked').length,
      updatedThisWeek: visibleProjects.filter((project) =>
        Date.now() - new Date(project.updatedAt).getTime() <= 7 * 24 * 60 * 60 * 1000
      ).length,
    };
  }, [visibleProjects]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-5 flex flex-col gap-4 pos-desktop:flex-row pos-desktop:items-start pos-desktop:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />
            Active Project Command Center
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Codex + Claude delivery dashboard
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Simplest valid shell for monitoring active projects, throughput, and risks across the
              repos currently being worked on.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pos-tablet:flex-row">
          <Select
            value={agentFilter}
            onValueChange={(value) => setAgentFilter(value as AgentFilter)}
          >
            <SelectTrigger className="w-full pos-tablet:w-[180px]">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="Codex">Codex</SelectItem>
              <SelectItem value="Claude">Claude</SelectItem>
              <SelectItem value="Codex + Claude">Codex + Claude</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="justify-between gap-2"
            onClick={() => setShowSourceHealth((current) => !current)}
          >
            Wiring Points
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {snapshot && (
            <Alert className="mb-5 border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>Assumptions and TODO wiring</AlertTitle>
              <AlertDescription className="space-y-1">
                {snapshot.assumptions.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {showSourceHealth && snapshot && (
            <ProjectSourceHealthPanel
              sources={snapshot.sources}
              onOpenSettings={() => navigate('/settings?section=project-sources')}
            />
          )}

          <div className="mb-5 grid grid-cols-2 gap-3 pos-desktop:grid-cols-4">
            <StatCard
              icon={<Boxes className="h-4 w-4" />}
              label="Active Projects"
              value={filteredKpis.activeProjects}
              accent="primary"
            />
            <StatCard
              icon={<Github className="h-4 w-4" />}
              label="Open Work Items"
              value={filteredKpis.openWorkItems}
              accent="primary"
            />
            <StatCard
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Blocked"
              value={filteredKpis.blockedProjects}
              accent="warning"
            />
            <StatCard
              icon={<RefreshCcw className="h-4 w-4" />}
              label="Updated This Week"
              value={filteredKpis.updatedThisWeek}
              accent="success"
            />
          </div>

          <div className="mb-5 grid gap-4 pos-desktop:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Delivery Signal Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={throughputChartConfig} className="h-[280px] w-full">
                  <LineChart data={snapshot?.trends || []}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="issuesTouched"
                      stroke="var(--color-issuesTouched)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="prsTouched"
                      stroke="var(--color-prsTouched)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="runsTouched"
                      stroke="var(--color-runsTouched)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Ownership Health Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={ownershipChartConfig} className="h-[280px] w-full">
                  <BarChart data={snapshot?.breakdown || []}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="onTrack" stackId="health" fill="var(--color-onTrack)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atRisk" stackId="health" fill="var(--color-atRisk)" />
                    <Bar dataKey="blocked" stackId="health" fill="var(--color-blocked)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 pos-tablet:flex-row pos-tablet:items-center pos-tablet:justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Active Project Breakdown</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Headline view of current work, health, milestones, and next wiring targets.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {visibleProjects.length} visible
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead>Next Milestone</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="min-w-[220px]">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground">{project.name}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {project.workspace}
                            </span>
                            <span>{project.stage}</span>
                            {project.currentVersion && <span>{project.currentVersion}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{project.agent}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <HealthBadge health={project.health} />
                          <div className="text-xs text-muted-foreground">
                            {project.blockers} blocker{project.blockers === 1 ? '' : 's'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="space-y-1 text-sm">
                          <div className="font-medium text-foreground">
                            {project.openIssues} issues / {project.openPullRequests} PRs
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {project.labels.length > 0 ? (
                              project.labels.map((label) => (
                                <Badge key={label} variant="outline" className="text-[10px]">
                                  {label}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No issue labels</span>
                            )}
                          </div>
                          {project.runSummary && (
                            <div className="text-xs text-muted-foreground">{project.runSummary}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[240px]">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{project.nextMilestone}</div>
                          <div className="text-xs text-muted-foreground">{project.notes}</div>
                          {project.nextPhase && (
                            <div className="text-xs text-muted-foreground">Next: {project.nextPhase}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 pos-desktop:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[88px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 pos-desktop:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
    </div>
  );
}

function HealthBadge({ health }: { health: ProjectHealth }) {
  const className =
    health === 'On Track'
      ? 'border-success/20 bg-success-tint text-success'
      : health === 'At Risk'
        ? 'border-warning/20 bg-warning-tint text-warning'
        : 'border-destructive/20 bg-destructive-tint text-destructive';

  return <Badge className={className}>{health}</Badge>;
}
