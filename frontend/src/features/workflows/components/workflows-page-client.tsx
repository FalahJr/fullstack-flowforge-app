"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflowRuns,
  listWorkflows,
  triggerWorkflow,
  updateWorkflow,
  updateWorkflowDefinition,
  Workflow,
  WorkflowDefinition,
  WorkflowRun,
} from "@/services/workflow.service";

const DEFAULT_DEFINITION: WorkflowDefinition = {
  steps: [
    {
      id: "step-1",
      type: "delay",
      next: [],
      config: { durationMs: 1000 },
    },
  ],
};

function formatDefinition(definition?: WorkflowDefinition) {
  return JSON.stringify(definition ?? DEFAULT_DEFINITION, null, 2);
}

function parseDefinition(value: string) {
  const parsed = JSON.parse(value) as WorkflowDefinition;
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new Error("Definisi workflow harus memiliki array steps");
  }
  return parsed;
}

export function WorkflowsPageClient() {
  const queryClient = useQueryClient();
  const [createName, setCreateName] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [definitionText, setDefinitionText] = useState(formatDefinition());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [definitionError, setDefinitionError] = useState<string | null>(null);

  const workflowsQuery = useQuery({
    queryKey: ["workflows"],
    queryFn: listWorkflows,
  });

  const selectedWorkflowQuery = useQuery({
    queryKey: ["workflow", selectedWorkflowId],
    queryFn: () => getWorkflow(selectedWorkflowId as string),
    enabled: Boolean(selectedWorkflowId),
  });

  useEffect(() => {
    const firstWorkflow = workflowsQuery.data?.[0];
    if (!selectedWorkflowId && firstWorkflow) {
      setSelectedWorkflowId(firstWorkflow.id);
    }
  }, [workflowsQuery.data, selectedWorkflowId]);

  useEffect(() => {
    const workflow = selectedWorkflowQuery.data;
    if (!workflow) return;

    setEditName(workflow.name);
    setDefinitionText(formatDefinition(workflow.versions?.[0]?.definition));
    setDefinitionError(null);
  }, [selectedWorkflowQuery.data]);

  const selectedWorkflow = selectedWorkflowQuery.data;
  const workflowRunsQuery = useQuery({
    queryKey: ["workflow-runs", selectedWorkflowId],
    queryFn: () => listWorkflowRuns(selectedWorkflowId as string),
    enabled: Boolean(selectedWorkflowId),
  });

  const createMutation = useMutation({
    mutationFn: (workflowName: string) => createWorkflow(workflowName),
    onSuccess: (workflow) => {
      setCreateName("");
      setStatusMessage("Workflow berhasil dibuat");
      setSelectedWorkflowId(workflow.id);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error: any) => {
      setStatusMessage(error?.response?.data?.message ?? "Gagal membuat workflow");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (workflowId: string) => deleteWorkflow(workflowId),
    onSuccess: (_, workflowId) => {
      setStatusMessage("Workflow berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.removeQueries({ queryKey: ["workflow", workflowId] });
      queryClient.removeQueries({ queryKey: ["workflow-runs", workflowId] });
      if (selectedWorkflowId === workflowId) {
        setSelectedWorkflowId(null);
      }
    },
    onError: (error: any) => {
      setStatusMessage(error?.response?.data?.message ?? "Gagal menghapus workflow");
    },
  });

  const runMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const run = await triggerWorkflow(workflowId);
      return { workflowId, run };
    },
    onSuccess: async ({ workflowId, run }) => {
      setStatusMessage(`Run dipicu: ${run.id}`);
      const runs = await listWorkflowRuns(workflowId);
      queryClient.setQueryData<WorkflowRun[]>(["workflow-runs", workflowId], runs);
    },
    onError: (error: any) => {
      setStatusMessage(error?.response?.data?.message ?? "Gagal memicu workflow");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkflowId) {
        throw new Error("Pilih workflow terlebih dahulu");
      }

      const definition = parseDefinition(definitionText);
      const trimmedName = editName.trim();
      const workflow = selectedWorkflow;

      if (!workflow) {
        throw new Error("Workflow belum dimuat");
      }

      if (trimmedName && trimmedName !== workflow.name) {
        await updateWorkflow(selectedWorkflowId, trimmedName);
      }

      return updateWorkflowDefinition(selectedWorkflowId, definition);
    },
    onSuccess: () => {
      setStatusMessage("Workflow berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow", selectedWorkflowId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs", selectedWorkflowId] });
    },
    onError: (error: any) => {
      setDefinitionError(error?.message ?? error?.response?.data?.message ?? "Gagal menyimpan workflow");
    },
  });

  const workflows = workflowsQuery.data ?? [];
  const workflowCards = useMemo(
    () =>
      workflows.map((workflow: Workflow) => {
        const latestVersion = workflow.versions?.[0];
        const stepCount = (latestVersion?.definition?.steps ?? []).length;
        return { workflow, stepCount };
      }),
    [workflows],
  );

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!createName.trim()) return;
    createMutation.mutate(createName.trim());
  };

  const activeRun = workflowRunsQuery.data?.[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/80 px-6 py-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              FlowForge Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Kelola workflow dengan tampilan yang tenang dan rapi.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Buat workflow, ubah definition JSON, jalankan workflow, lalu pantau run history dan realtime status tanpa layar yang berantakan.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              Ganti akun
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total workflow</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{workflows.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow aktif</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedWorkflow ? "1" : "0"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Run terbaru</p>
            <p className="mt-2 truncate text-2xl font-semibold text-slate-900">{activeRun?.id ?? "-"}</p>
          </Card>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <section className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Buat workflow baru</h2>
                <p className="text-sm text-slate-600">Workflow awal dibuat dengan definition kosong, lalu bisa diedit dari panel kanan.</p>
              </div>
              <Badge variant="brand">CRUD</Badge>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onCreate}>
              <Input
                placeholder="Nama workflow"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <Button className="sm:min-w-28" disabled={createMutation.isPending} type="submit">
                Buat workflow
              </Button>
            </form>
          </Card>

          {statusMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {statusMessage}
            </div>
          ) : null}

          <div className="space-y-3">
            {workflowsQuery.isLoading ? <Card className="p-6 text-sm text-slate-600">Memuat workflows...</Card> : null}
            {workflowsQuery.isError ? <Card className="p-6 text-sm text-rose-600">Gagal memuat workflows</Card> : null}
            {workflowCards.length === 0 && !workflowsQuery.isLoading ? (
              <EmptyState
                title="Belum ada workflow"
                description="Buat workflow pertama untuk mulai menguji alur kerja dan monitoring realtime."
              />
            ) : null}
            {workflowCards.map(({ workflow, stepCount }) => {
              const isActive = workflow.id === selectedWorkflowId;
              return (
                <Card
                  key={workflow.id}
                  className={`p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${isActive ? "border-emerald-300 ring-1 ring-emerald-100" : ""}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      className="text-left"
                      onClick={() => setSelectedWorkflowId(workflow.id)}
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{workflow.name}</h3>
                        {isActive ? <Badge variant="success">Aktif</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{stepCount} langkah pada versi terbaru</p>
                      <p className="mt-1 text-xs text-slate-400">ID: {workflow.id}</p>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedWorkflowId(workflow.id)}
                        type="button"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => runMutation.mutate(workflow.id)}
                        type="button"
                      >
                        Jalankan
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteMutation.mutate(workflow.id)}
                        type="button"
                      >
                        Hapus
                      </Button>
                      <Link
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        href={`/workflows/${workflow.id}/runs/latest`}
                      >
                        Monitor
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Editor workflow</h2>
                <p className="text-sm text-slate-600">Ubah nama dan definition JSON dari workflow yang dipilih.</p>
              </div>
              <Badge variant={selectedWorkflow ? "brand" : "neutral"}>{selectedWorkflow ? "Terpilih" : "Belum pilih"}</Badge>
            </div>

            {!selectedWorkflow ? (
              <EmptyState
                title="Pilih workflow"
                description="Klik salah satu workflow di daftar sebelah kiri untuk mulai mengedit definition-nya."
              />
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setDefinitionError(null);
                  saveMutation.mutate();
                }}
              >
                <Input
                  label="Nama workflow"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama workflow"
                />

                <Textarea
                  label="Workflow definition JSON"
                  value={definitionText}
                  onChange={(e) => setDefinitionText(e.target.value)}
                  className="font-mono text-xs leading-6"
                  hint="Gunakan format steps dengan id, type, next, dan config."
                />

                {definitionError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {definitionError}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={saveMutation.isPending} type="submit">
                    Simpan perubahan
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      const latest = selectedWorkflow.versions?.[0]?.definition;
                      setDefinitionText(formatDefinition(latest));
                      setEditName(selectedWorkflow.name);
                      setDefinitionError(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Run terbaru</h2>
                <p className="text-sm text-slate-600">Riwayat terbaru untuk workflow yang dipilih.</p>
              </div>
              <Badge variant="neutral">REST</Badge>
            </div>

            {workflowRunsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Memuat run history...</p>
            ) : workflowRunsQuery.data?.length ? (
              <div className="space-y-3">
                {workflowRunsQuery.data.map((run) => (
                  <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{run.id}</p>
                        <p className="text-xs text-slate-500">{run.createdAt}</p>
                      </div>
                      <Badge variant={run.status === "SUCCESS" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>
                        {run.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">Step run: {run._count?.stepRuns ?? 0}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Belum ada run untuk workflow ini.</p>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}
