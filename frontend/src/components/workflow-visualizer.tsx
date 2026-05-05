'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  MarkerType,
} from 'reactflow';
import { WorkflowDefinition } from '@/services/workflow.service';

interface WorkflowVisualizerProps {
  definition: WorkflowDefinition;
  readOnly?: boolean;
}

export function WorkflowVisualizer({
  definition,
  readOnly = true,
}: WorkflowVisualizerProps) {
  const nodes: Node[] = useMemo(() => {
    if (!definition || !definition.steps) return [];

    return definition.steps.map((step, idx) => ({
      id: step.id,
      data: {
        label: (
          <div className='flex flex-col gap-1'>
            <div className='font-semibold text-xs'>{step.id}</div>
            <div className='text-xs text-slate-600'>{step.type}</div>
          </div>
        ),
      },
      position: {
        x: (idx % 3) * 300,
        y: Math.floor(idx / 3) * 200,
      },
      style: {
        background: step.type === 'http' ? '#10b981' : '#3b82f6',
        color: '#fff',
        border: '2px solid #1e293b',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        minWidth: '100px',
        textAlign: 'center',
      },
    }));
  }, [definition]);

  const edges: Edge[] = useMemo(() => {
    if (!definition || !definition.steps) return [];

    const edgeList: Edge[] = [];
    definition.steps.forEach((step) => {
      step.next?.forEach((nextId) => {
        edgeList.push({
          id: `${step.id}-${nextId}`,
          source: step.id,
          target: nextId,
          animated: true,
          style: {
            stroke: '#64748b',
            strokeWidth: 2,
          },
          markerEnd: {
            color: '#64748b',
            type: MarkerType.ArrowClosed,
          },
        });
      });
    });
    return edgeList;
  }, [definition]);

  const [nodeList, , onNodesChange] = useNodesState(nodes);
  const [edgeList, , onEdgesChange] = useEdgesState(edges);

  return (
    <div className='w-full h-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden'>
      <ReactFlow
        nodes={nodeList}
        edges={edgeList}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        fitView
      >
        <Background color='#aaa' gap={16} />
        <Controls />
        <MiniMap
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
          }}
        />
      </ReactFlow>
    </div>
  );
}
