/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Copy, Check, Code, Sliders, ArrowRight } from 'lucide-react';
import { ComfyNode, ComfyWorkflowRaw } from '../../types/workflow';
import { getSlotColor, getNodeHeaderColor } from '../../utils/theme';

interface NodeDetailDrawerProps {
  node: ComfyNode | null;
  raw: ComfyWorkflowRaw;
  onClose: () => void;
  onSelectNodeById: (nodeId: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  raw,
  onClose,
  onSelectNodeById
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'json'>('params');
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const headerColor = node.color || getNodeHeaderColor(node.type);

  // Incoming links to this node
  const incomingLinks = raw.links.filter(l => String(l[3]) === String(node.id));
  // Outgoing links from this node
  const outgoingLinks = raw.links.filter(l => String(l[1]) === String(node.id));

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-14 right-0 bottom-0 w-96 bg-zinc-950/95 border-l border-zinc-800 shadow-2xl backdrop-blur-md flex flex-col z-40 text-zinc-200">
      {/* Header */}
      <div
        className="p-4 border-b border-zinc-800/80 flex items-start justify-between"
        style={{ borderTop: `4px solid ${headerColor}` }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate max-w-[220px]">
              {node.title || node.type}
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              #{node.id}
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-0.5">{node.type}</div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('params')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'params'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>参数与连接</span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'json'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>节点原始 JSON</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'params' ? (
          <>
            {/* Widget Values / Parameters */}
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                节点参数 (Widgets)
              </div>
              {node.widgets_values && node.widgets_values.length > 0 ? (
                <div className="space-y-2">
                  {node.widgets_values.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono break-all"
                    >
                      <span className="text-zinc-500 mr-2">[{idx}]:</span>
                      <span className="text-zinc-200">
                        {typeof w === 'object' ? JSON.stringify(w) : String(w)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic">无内部参数</div>
              )}
            </div>

            {/* Inputs & Connections */}
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                输入端口 ({node.inputs?.length || 0})
              </div>
              {node.inputs && node.inputs.length > 0 ? (
                <div className="space-y-1.5">
                  {node.inputs.map((inp, idx) => {
                    const conn = incomingLinks.find(l => l[4] === idx || l[0] === inp.link);
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getSlotColor(inp.type) }}
                          />
                          <span className="font-medium text-zinc-200">{inp.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({inp.type})</span>
                        </div>

                        {conn ? (
                          <button
                            onClick={() => onSelectNodeById(String(conn[1]))}
                            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer"
                            title={`查看前序节点 #${conn[1]}`}
                          >
                            <span>from #{conn[1]}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-600">未连线</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic">无输入端口</div>
              )}
            </div>

            {/* Outputs & Connections */}
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                输出端口 ({node.outputs?.length || 0})
              </div>
              {node.outputs && node.outputs.length > 0 ? (
                <div className="space-y-1.5">
                  {node.outputs.map((out, idx) => {
                    const conns = outgoingLinks.filter(l => l[2] === idx);
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: getSlotColor(out.type) }}
                            />
                            <span className="font-medium text-zinc-200">{out.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">({out.type})</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {conns.length} 个连线
                          </span>
                        </div>

                        {conns.length > 0 && (
                          <div className="pl-4 pt-1 flex flex-wrap gap-1.5">
                            {conns.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => onSelectNodeById(String(c[3]))}
                                className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 hover:text-cyan-300 text-[10px] font-mono cursor-pointer"
                              >
                                &rarr; to #{c[3]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic">无输出端口</div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制 JSON'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-cyan-300/90 bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(node, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
