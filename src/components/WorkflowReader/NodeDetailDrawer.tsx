/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Copy, Check, Code, Sliders, ArrowRight, Link2, Trash2, Image as ImageIcon, Video as VideoIcon, Music, Sparkles } from 'lucide-react';
import { ComfyNode, ComfyWorkflowRaw, WorkflowAssetRecord, AssetRecord } from '../../types/workflow';
import { getSlotColor, getNodeHeaderColor } from '../../utils/theme';
import { isNodeBindable, isWidgetBindable, isInputSlotBindable } from '../../utils/nodeCandidateUtils';

interface NodeDetailDrawerProps {
  node: ComfyNode | null;
  raw: ComfyWorkflowRaw;
  onClose: () => void;
  onSelectNodeById: (nodeId: string) => void;
  workflowAssetLinks?: { link: WorkflowAssetRecord; asset: AssetRecord }[];
  onOpenBindAssetModal?: (nodeId: string, paramName?: string, slotIndex?: number) => void;
  onUnbindNodeAsset?: (nodeId: string) => void;
  isEmbedded?: boolean;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  raw,
  onClose,
  onSelectNodeById,
  workflowAssetLinks = [],
  onOpenBindAssetModal,
  onUnbindNodeAsset,
  isEmbedded = false
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'json'>('params');
  const [copied, setCopied] = useState(false);

  if (!node) {
    if (isEmbedded) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
          <Sliders className="w-10 h-10 text-zinc-700 mb-3" />
          <span className="text-xs font-medium text-zinc-400">未选择节点</span>
          <span className="text-[11px] text-zinc-600 mt-1 max-w-xs">
            在左侧画布中点击或双击任意节点，即可在此实时查看参数、输入端口与连线关系
          </span>
        </div>
      );
    }
    return null;
  }

  const headerColor = node.color || getNodeHeaderColor(node.type);

  // Incoming links to this node
  const incomingLinks = raw.links.filter(l => String(l[3]) === String(node.id));
  // Outgoing links from this node
  const outgoingLinks = raw.links.filter(l => String(l[1]) === String(node.id));

  // Find if an asset is currently bound to this specific node
  const boundAssetItem = workflowAssetLinks.find(
    l => l.link.nodeId !== undefined && l.link.nodeId !== null && String(l.link.nodeId) === String(node.id)
  );

  // Check if node is eligible for media asset binding
  const isBindable = isNodeBindable(node);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={
        isEmbedded
          ? 'flex-1 flex flex-col min-h-0 bg-transparent text-zinc-200 overflow-hidden'
          : 'absolute inset-y-0 right-0 w-96 sm:w-[400px] bg-zinc-950/98 border-l border-zinc-800/90 shadow-2xl backdrop-blur-xl flex flex-col z-40 text-zinc-200 animate-in slide-in-from-right-4 duration-200'
      }
    >
      {/* Header */}
      <div
        className="p-3.5 border-b border-zinc-800/80 flex items-start justify-between bg-zinc-950/40"
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

        {!isEmbedded && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
            {/* Node Asset Binding Section - Only displayed for media-capable nodes */}
            {isBindable && (
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-inner">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                    <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>节点展示素材绑定</span>
                  </div>
                  {boundAssetItem && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 font-medium">
                      画布展示生效中
                    </span>
                  )}
                </div>

                {boundAssetItem ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800">
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-zinc-900 border border-zinc-700/60 shrink-0 flex items-center justify-center relative group">
                        {boundAssetItem.asset.type === 'video' ? (
                          <video src={boundAssetItem.asset.dataUrl} className="w-full h-full object-cover" muted />
                        ) : boundAssetItem.asset.type === 'audio' ? (
                          <Music className="w-6 h-6 text-cyan-400" />
                        ) : (
                          <img src={boundAssetItem.asset.dataUrl} alt={boundAssetItem.asset.name} className="w-full h-full object-cover" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate" title={boundAssetItem.asset.name}>
                          {boundAssetItem.asset.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                            {boundAssetItem.asset.type}
                          </span>
                          {boundAssetItem.link.paramName && (
                            <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[130px]">
                              &rarr; {boundAssetItem.link.paramName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenBindAssetModal?.(String(node.id), boundAssetItem.link.paramName, boundAssetItem.link.slotIndex)}
                        className="flex-1 py-1.5 px-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>更换素材 / 参数</span>
                      </button>
                      <button
                        onClick={() => onUnbindNodeAsset?.(String(node.id))}
                        className="py-1.5 px-2.5 text-xs font-medium rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="解除绑定 (此素材保留在工作流与素材库中，仅从节点解绑)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>解绑</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-950/50 border border-dashed border-zinc-800 rounded-lg p-3 text-center space-y-2">
                    <p className="text-xs text-zinc-400">
                      当前节点尚未绑定展示素材。绑定后将在画布节点内直观预览输入素材图。
                    </p>
                    <button
                      onClick={() => onOpenBindAssetModal?.(String(node.id))}
                      className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>从素材库绑定资产至此节点</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Widget Values / Parameters */}
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                节点参数 (Widgets)
              </div>
              {node.widgets_values && node.widgets_values.length > 0 ? (
                <div className="space-y-2">
                  {node.widgets_values.map((w, idx) => {
                    const canBind = isBindable && isWidgetBindable(w, idx, node);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono break-all flex items-start justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-zinc-500 mr-2">[{idx}]:</span>
                          <span className="text-zinc-200">
                            {typeof w === 'object' ? JSON.stringify(w) : String(w)}
                          </span>
                        </div>
                        {canBind && (
                          <button
                            onClick={() => onOpenBindAssetModal?.(String(node.id), `widget_${idx}`, idx)}
                            className="shrink-0 p-1 rounded hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                            title="将素材库资产绑定至此素材参数"
                          >
                            <Link2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
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

                        <div className="flex items-center gap-2">
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
