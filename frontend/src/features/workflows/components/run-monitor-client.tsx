"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "@/services/socket.service";
import {
  getWorkflowRunDetail,
  listWorkflowRuns,
  StepRun,
} from "@/services/workflow.service";

type EventPayload = {
  workflowRunId: string;
  tenantId: string;
  stepId?: string;
  status?: string;
  message?: string;
  error?: string;
  aiHint?: string;
};

export function RunMonitorClient({
  workflowId,
  runId,
}: {
  workflowId: string;
  runId: string;
}) {
  const [liveEvents, setLiveEvents] = useState<EventPayload[]>([]);
  const [resolvedRunId, setResolvedRunId] = useState<string | null>(
    runId === "latest" ? null : runId,
  );

  const runsQuery = useQuery({
    queryKey: ["workflow-runs", workflowId],
    queryFn: () => listWorkflowRuns(workflowId),
    enabled: runId === "latest",
  });

  useEffect(() => {
    if (runId !== "latest") return;
    if (!runsQuery.data?.length) return;
    setResolvedRunId(runsQuery.data[0].id);
  }, [runId, runsQuery.data]);

  const detailQuery = useQuery({
    queryKey: ["workflow-run-detail", workflowId, resolvedRunId],
    queryFn: () => getWorkflowRunDetail(workflowId, resolvedRunId as string),
    enabled: Boolean(resolvedRunId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const tenantId =
      typeof window === "undefined"
        ? null
        : localStorage.getItem("flowforge_tenant_id");
    if (!tenantId) return;

    const socket = connectSocket(tenantId);
    const onEvent = (payload: EventPayload) => {
      setLiveEvents((prev) => [payload, ...prev].slice(0, 50));
    };

    socket.on("workflow.started", onEvent);
    socket.on("workflow.completed", onEvent);
    socket.on("step.started", onEvent);
    socket.on("step.success", onEvent);
    socket.on("step.failed", onEvent);

    return () => {
      socket.off("workflow.started", onEvent);
      socket.off("workflow.completed", onEvent);
      socket.off("step.started", onEvent);
      socket.off("step.success", onEvent);
      socket.off("step.failed", onEvent);
      if (getSocket()) {
        disconnectSocket();
      }
    };
  }, []);

  const visibleEvents = useMemo(() => {
    if (!resolvedRunId) return [];

    const baselineEvents = detailQuery.data?.stepRuns
      ? detailQuery.data.stepRuns.map((step) => ({
          workflowRunId: detailQuery.data?.id ?? resolvedRunId,
          tenantId: detailQuery.data?.tenantId ?? "",
          stepId: step.stepId,
          status: step.status,
          message:
            step.status === "FAILED"
              ? `Langkah ${step.stepId} gagal`
              : step.status === "SUCCESS"
                ? `Langkah ${step.stepId} berhasil`
                : `Langkah ${step.stepId} ${step.status?.toLowerCase()}`,
          error:
            step.error ??
            (typeof step.logs === "object" && step.logs
              ? (step.logs as any).error
              : undefined),
          aiHint:
            typeof step.logs === "object" && step.logs
              ? (step.logs as any).aiHint
              : undefined,
        }))
      : [];

    const mergedEvents = [...liveEvents, ...baselineEvents].filter(
      (event) => event.workflowRunId === resolvedRunId && Boolean(event.stepId),
    );

    const lastEventIndex = new Map<string, number>();

    mergedEvents.forEach((event, index) => {
      const key = event.stepId
        ? `step:${event.stepId}`
        : `workflow:${event.status ?? event.message ?? index}`;
      lastEventIndex.set(key, index);
    });

    const filteredEvents = mergedEvents.filter((event, index) => {
      const key = event.stepId
        ? `step:${event.stepId}`
        : `workflow:${event.status ?? event.message ?? index}`;
      return lastEventIndex.get(key) === index;
    });

    return filteredEvents.slice().reverse();
  }, [detailQuery.data, liveEvents, resolvedRunId]);

  const latestStatus =
    detailQuery.data?.status ?? runsQuery.data?.[0]?.status ?? "-";

  const statusVariant =
    latestStatus === "SUCCESS"
      ? "success"
      : latestStatus === "FAILED"
        ? "danger"
        : "warning";

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-[28px] border border-white/60 bg-white/80 px-6 py-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Monitoring
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Workflow run realtime
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Baseline data diambil dari REST, lalu event realtime menempel di
              timeline supaya status tetap terbaca saat refresh.
            </p>
          </div>
          <Badge variant={statusVariant}>{latestStatus}</Badge>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Ringkasan Run
            </h2>
            {detailQuery.isLoading ? (
              <p className="mt-3 text-sm text-slate-600">
                Memuat detail run...
              </p>
            ) : null}
            {detailQuery.isError ? (
              <p className="mt-3 text-sm text-rose-600">
                Gagal memuat detail run
              </p>
            ) : null}
            {detailQuery.data ? (
              <dl className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Workflow
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {detailQuery.data.workflow?.name ?? "-"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    ID Run
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {detailQuery.data.id}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <Badge variant={statusVariant}>
                      {detailQuery.data.status}
                    </Badge>
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Mulai
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {detailQuery.data.startedAt ?? "-"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Selesai
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {detailQuery.data.finishedAt ?? "-"}
                  </dd>
                </div>
              </dl>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Step Runs (REST)
            </h2>
            <div className="mt-4 space-y-3">
              {(detailQuery.data?.stepRuns ?? []).map((step: StepRun) => {
                const logs = step.logs
                  ? JSON.stringify(step.logs, null, 2)
                  : "-";
                const stepVariant =
                  step.status === "SUCCESS"
                    ? "success"
                    : step.status === "FAILED"
                      ? "danger"
                      : "warning";
                return (
                  <article
                    key={step.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {step.stepId}
                        </p>
                        <p className="text-xs text-slate-500">Step ID</p>
                      </div>
                      <Badge variant={stepVariant}>{step.status}</Badge>
                    </div>
                    {step.error ? (
                      <p className="mt-3 text-sm text-rose-700">{step.error}</p>
                    ) : null}
                    <pre className="mt-3 max-w-full overflow-x-auto rounded-xl bg-white p-3 text-xs leading-6 text-slate-700 shadow-inner whitespace-pre-wrap break-words">
                      {logs}
                    </pre>
                  </article>
                );
              })}
              {(detailQuery.data?.stepRuns?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada step run untuk run ini.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Timeline realtime
              </h2>
              <p className="text-sm text-slate-600">
                Event terbaru berada di atas agar mudah dipindai.
              </p>
            </div>
            <Badge variant="brand">WebSocket</Badge>
          </div>

          {detailQuery.data ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                    Status akhir workflow
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {detailQuery.data.status === "FAILED"
                      ? "Workflow selesai: Gagal"
                      : detailQuery.data.status === "SUCCESS"
                        ? "Workflow selesai: Berhasil"
                        : `Workflow ${detailQuery.data.status?.toLowerCase()}`}
                  </p>
                </div>
                <Badge
                  variant={
                    detailQuery.data.status === "SUCCESS"
                      ? "success"
                      : detailQuery.data.status === "FAILED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {detailQuery.data.status}
                </Badge>
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {visibleEvents.map((event, index) => {
              const variant =
                event.status === "SUCCESS"
                  ? "success"
                  : event.status === "FAILED"
                    ? "danger"
                    : "warning";
              return (
                <article
                  key={`${event.workflowRunId}-${index}`}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
                  <div className="flex items-start justify-between gap-3 pl-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={variant}>
                          {event.status ?? "Update"}
                        </Badge>
                        {event.stepId ? (
                          <span className="text-xs text-slate-500">
                            {event.stepId}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {event.message ?? "Update realtime"}
                      </p>
                      {event.error ? (
                        <p className="text-sm text-rose-700">{event.error}</p>
                      ) : null}
                      {event.aiHint ? (
                        <p className="text-sm text-emerald-700">
                          AI Hint: {event.aiHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
            {visibleEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Belum ada event realtime untuk run ini.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
