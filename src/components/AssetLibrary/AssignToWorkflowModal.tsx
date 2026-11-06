/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Star, Link2, Search, Layers, Image as ImageIcon } from 'lucide-react';
import { AssetRecord, WorkflowRecord } from '../../types/workflow';
import { StorageService } from '../../services/storage';

interface AssignToWorkflowModalProps {
  asset: AssetRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenWorkflow?: (workflowId: string) => void;
}

export const AssignToWorkflowModal: React.FC<AssignToWorkflowModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
  onOpenWorkflow
}) => {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [linkedWorkflowIds, setLinkedWorkflowIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setIsLoading(true);
      const [allWfs, usages] = await Promise.all([
        StorageService.getAllWorkflows(),
        StorageService.getAssetUsage(asset.id)
      ]);

      setWorkflows(allWfs);
      setLinkedWorkflowIds(new Set(usages.map(u => u.workflowId)));
      setIsLoading(false);
    };

    load();
  }, [isOpen, asset.id]);

  if (!isOpen) return null;

  const handleSetCover = async (wf: WorkflowRecord) => {
    await StorageService.setWorkflowCover(wf.id, asset.id);
    // Also ensure linked
    await StorageService.linkAssetToWorkflow({
      workflowId: wf.id,
      assetId: asset.id,
      assetType: 'cover',
      caption: '从素材库指定封面',
      order: 0
    });
    setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, coverAssetId: asset.id } : w));
    setLinkedWorkflowIds(prev => new Set(prev).add(wf.id));
    onSuccess();
  };

  const handleToggleLink = async (wf: WorkflowRecord) => {
    if (linkedWorkflowIds.has(wf.id)) {
      // Unlink
      await StorageService.unlinkAssetFromWorkflow(wf.id, asset.id);
      if (wf.coverAssetId === asset.id) {
        await StorageService.setWorkflowCover(wf.id, null);
        setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, coverAssetId: undefined } : w));
      }
      setLinkedWorkflowIds(prev => {
        const next = new Set(prev);
        next.delete(wf.id);
        return next;
      });
    } else {
      // Link
      await StorageService.linkAssetToWorkflow({
        workflowId: wf.id,
        assetId: asset.id,
        assetType: asset.type,
        caption: asset.name,
        order: Date.now()
      });
      setLinkedWorkflowIds(prev => new Set(prev).add(wf.id));
    }
    onSuccess();
  };

  const filteredWorkflows = workflows.filter(
    w =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.modelInfo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isImage =
    asset.mimeType.startsWith('image/') ||
    ['cover', 'showcase', 'input', 'reference', 'output', 'comparison'].includes(asset.type);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-[#111216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-700/40 flex items-center justify-center text-purple-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">关联素材至工作流</h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-md">
                当前素材：<span className="text-zinc-200 font-medium">{asset.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索工作流名称或模型类型..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        </div>

        {/* Workflows List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-zinc-500 font-mono">
              加载工作流列表中...
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-zinc-500">
              暂无匹配工作流
            </div>
          ) : (
            filteredWorkflows.map(wf => {
              const isCover = wf.coverAssetId === asset.id;
              const isLinked = linkedWorkflowIds.has(wf.id);

              return (
                <div
                  key={wf.id}
                  className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl flex items-center justify-between gap-3.5 transition-colors"
                >
                  {/* Left: Workflow Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate" title={wf.name}>
                        {wf.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-cyan-800/30 shrink-0">
                        {wf.modelInfo}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-1">
                      <span className="text-zinc-400 font-mono">{wf.nodeCount} 节点</span>
                      <span className="mx-1.5 text-zinc-600">·</span>
                      <span>{wf.description || 'ComfyUI 流程'}</span>
                    </div>
                  </div>

                  {/* Right: Actions & Badges (Cleanly separated, no duplicate status!) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Cover State or Action (for images) */}
                    {isImage && (
                      isCover ? (
                        <div
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 select-none"
                          title="当前素材已被设为此工作流的代表封面"
                        >
                          <Star className="w-3 h-3 fill-current text-amber-400" />
                          <span>当前封面</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetCover(wf)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800 hover:bg-amber-500/15 text-zinc-300 hover:text-amber-300 border border-zinc-700 hover:border-amber-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                          title="将此图片设为此工作流的展示封面"
                        >
                          <Star className="w-3 h-3 text-zinc-400" />
                          <span>设为封面</span>
                        </button>
                      )
                    )}

                    {/* Link / Unlink Action */}
                    <button
                      onClick={() => handleToggleLink(wf)}
                      className={`group px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        isLinked
                          ? 'bg-purple-950/40 text-purple-300 border border-purple-500/40 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      }`}
                      title={isLinked ? '点击解除素材与此工作流的关联' : '关联此素材至该工作流'}
                    >
                      {isLinked ? (
                        <>
                          <Check className="w-3 h-3 text-purple-400 group-hover:hidden" />
                          <X className="w-3 h-3 text-rose-400 hidden group-hover:inline" />
                          <span className="group-hover:hidden">已关联</span>
                          <span className="hidden group-hover:inline">取消关联</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3 text-zinc-400" />
                          <span>关联入库</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>素材与工作流为多对多关联，无损复用，随时解绑</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
