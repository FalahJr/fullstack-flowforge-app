import { RunMonitorClient } from "@/features/workflows/components/run-monitor-client";

export default function RunMonitorPage({
  params,
}: {
  params: { id: string; runId: string };
}) {
  return <RunMonitorClient workflowId={params.id} runId={params.runId} />;
}
