"use client";

import { useCallback, useMemo } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import type { Task } from '@/lib/types';

function CustomNode({ data }: any) {
  const isDone = data.column === 'done';
  const isBlocked = data.isBlocked;
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl border bg-white/95 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[200px] max-w-[250px]
      ${isDone ? 'border-emerald-400 ring-1 ring-emerald-100' : isBlocked ? 'border-amber-400 ring-1 ring-amber-100' : 'border-indigo-400 ring-1 ring-indigo-100'}`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 rounded-full bg-slate-400 border-none" />
      <div className="text-sm font-semibold text-slate-800 leading-tight mb-2">{data.label}</div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-600' : isBlocked ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {data.column}
        </span>
        <span className="text-[10px] font-mono text-slate-400">{data.task.id}</span>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 rounded-full bg-slate-400 border-none" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

const columnMap = {
  planning: 0,
  implementation: 1,
  testing: 2,
  bugs: 2.5,
  done: 4
};

export function TaskDAG({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (t: Task) => void }) {
  const nodesInit = useMemo(() => {
    const colCounts = { planning: 0, implementation: 0, testing: 0, bugs: 0, done: 0 };
    return tasks.map(task => {
      const colId = task.column as keyof typeof colCounts;
      const x = columnMap[colId] * 300;
      const y = (colCounts[colId]++) * 120;
      
      const isBlocked = task.blockedBy && task.blockedBy.some(bid => {
        const b = tasks.find(t => t.id === bid);
        return b && b.column !== 'done';
      });

      return {
        id: task.id,
        type: 'custom',
        position: { x, y: colId === 'bugs' ? y + 250 : y },
        data: { label: task.title, column: task.column, task, isBlocked }
      };
    });
  }, [tasks]);

  const edgesInit = useMemo(() => {
    const edges: any[] = [];
    tasks.forEach(task => {
      if (task.blockedBy) {
        task.blockedBy.forEach(bid => {
          edges.push({
            id: `e-${bid}-${task.id}`,
            source: bid,
            target: task.id,
            animated: task.column !== 'done',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            style: { stroke: '#cbd5e1', strokeWidth: 2 }
          });
        });
      }
    });
    return edges;
  }, [tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesInit);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesInit);

  const onNodeClick = useCallback((event: any, node: any) => {
    onOpenTask(node.data.task);
  }, [onOpenTask]);

  return (
    <div className="h-[75vh] w-full border border-slate-200/60 rounded-2xl overflow-hidden bg-white/50 shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls className="bg-white/80 backdrop-blur border-none shadow-md rounded-lg overflow-hidden" />
        <MiniMap 
          zoomable 
          pannable 
          nodeClassName={(node) => {
            const data = node.data as any;
            if (data.column === 'done') return 'fill-emerald-400';
            if (data.isBlocked) return 'fill-amber-400';
            return 'fill-indigo-400';
          }}
          className="bg-white/80 backdrop-blur shadow-md rounded-lg"
        />
        <Background color="#cbd5e1" gap={16} size={2} />
      </ReactFlow>
    </div>
  );
}
