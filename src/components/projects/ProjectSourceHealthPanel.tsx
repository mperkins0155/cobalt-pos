import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, FileText, Github, ShieldAlert, ShieldCheck, ShieldX, TerminalSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ProjectSourceHealth } from '@/services/projects';

export function ProjectSourceHealthPanel({
  sources,
  onOpenSettings,
}: {
  sources: ProjectSourceHealth[];
  onOpenSettings: () => void;
}) {
  return (
    <Card className="mb-5 border-primary/20">
      <CardHeader className="flex flex-col gap-2 pos-tablet:flex-row pos-tablet:items-center pos-tablet:justify-between">
        <div>
          <CardTitle className="text-sm font-bold">Source Health</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard metrics are combined from GitHub repo metadata, issue labels, local run
            snapshots, and project docs where available.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          Settings
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Use `VITE_GITHUB_TOKEN` if you need authenticated GitHub API access for private repos or
          to avoid rate limits. The current mapping is workspace-specific and baked into the
          frontend service.
        </div>

        <div className="grid gap-3 pos-desktop:grid-cols-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <SourceIcon sourceType={source.sourceType} />
                    <span className="font-semibold text-foreground">{source.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{source.workspace}</p>
                </div>
                <StatusBadge status={source.status} />
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-foreground">{source.detail}</p>
                <p className="text-muted-foreground">
                  Visibility: <span className="text-foreground">{source.visibility}</span>
                </p>
                {source.lastSyncAt && (
                  <p className="text-muted-foreground">
                    Synced {formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })}
                  </p>
                )}
              </div>

              {source.repoUrl && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" asChild className="px-0">
                    <a href={source.repoUrl} target="_blank" rel="noreferrer">
                      Open repo
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceIcon({ sourceType }: { sourceType: ProjectSourceHealth['sourceType'] }) {
  if (sourceType === 'run-log') return <TerminalSquare className="h-4 w-4 text-primary" />;
  if (sourceType === 'doc') return <FileText className="h-4 w-4 text-primary" />;
  return <Github className="h-4 w-4 text-primary" />;
}

function StatusBadge({ status }: { status: ProjectSourceHealth['status'] }) {
  if (status === 'Connected') {
    return (
      <Badge className="border-success/20 bg-success-tint text-success">
        <ShieldCheck className="mr-1 h-3 w-3" />
        Connected
      </Badge>
    );
  }

  if (status === 'Warning') {
    return (
      <Badge className="border-warning/20 bg-warning-tint text-warning">
        <ShieldAlert className="mr-1 h-3 w-3" />
        Warning
      </Badge>
    );
  }

  return (
    <Badge className="border-destructive/20 bg-destructive-tint text-destructive">
      <ShieldX className="mr-1 h-3 w-3" />
      Error
    </Badge>
  );
}
