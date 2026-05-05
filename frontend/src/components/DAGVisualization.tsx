"use client";
import React from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";

export type StepStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface WorkflowStep {
  id: string;
  type: string;
  next: string[];
  config?: Record<string, any>;
}

export interface WorkflowDefinition {
  steps: WorkflowStep[];
}

export default function DAGVisualization({
  definition,
  statuses = {},
}: {
  definition: WorkflowDefinition;
  statuses?: Record<string, StepStatus>;
}) {
  const nodes = definition.steps.map((step, i) => ({
    id: step.id,
    data: { label: `${step.id} (${step.type})` },
    position: { x: i * 220, y: 0 },
    style: {
      border: "1px solid #222",
      padding: 10,
      background:
        statuses[step.id] === "RUNNING"
          ? "#cfe3ff"
          : statuses[step.id] === "SUCCESS"
          ? "#d1fae5"
          : statuses[step.id] === "FAILED"
          ? "#fee2e2"
          : "#f3f4f6",
    },
  }));

  const edges = definition.steps.flatMap((step) =>
    step.next.map((to) => ({
      id: `${step.id}-${to}`,
      source: step.id,
      target: to,
      markerEnd: { type: MarkerType.Arrow },
    })),
  );

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
