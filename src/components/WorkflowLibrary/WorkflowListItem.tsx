/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  WorkflowRecord,
  Tag,
  TagCategory,
  WorkflowAssetRecord,
  AssetRecord
} from '../../types/workflow';
import { Star, Image as ImageIcon, ChevronRight } from 'lucide-react';

interface WorkflowListItemProps {
  workflow: WorkflowRecord;
  tags: { tag: Tag; category: TagCategory }[];
  assets: { link: WorkflowAssetRecord; asset: AssetRecord }[];
  isSelected: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onOpen: (id: string) => void;
  onChangeCover?: (workflow: WorkflowRecord, e: React.MouseEvent) => void;
}

export const WorkflowListItem: React.FC<WorkflowListItemProps> = ({
  workflow,
  tags,
  assets,
  isSelected,
  onToggleSelect,
  onToggleFavorite,
  onOpen,
  onChangeCover
}) => {
  const coverAsset =
    (workflow.coverAssetId && assets.find(a => a.asset.id === workflow.coverAssetId)) ||
    assets.find(a => a.link.assetType === 'cover') ||
    assets.find(a => a.link.assetType === 'showcase') ||
    assets[0];

  return (
    <div
      onClick={() => onOpen(workflow.id)}
      className={`group px-4 py-3 bg-zinc-900/60 hover:bg-zinc-850 border rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer ${
        isSelected ? 'border-cyan-400 bg-zinc-800' : 'border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => onToggleSelect(workflow.id, e as any)}
          onClick={e => e.stopPropagation()}
          className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
        />

        {/* Favorite */}
        <button
          onClick={e => onToggleFavorite(workflow.id, e)}
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            workflow.isFavorite ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
          }`}
          title={workflow.isFavorite ? '取消收藏' : '加入收藏'}
        >
          <Star className={`w-4 h-4 ${workflow.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Mini Preview Image */}
        <div
          onClick={e => {
            if (onChangeCover) {
              e.stopPropagation();
              onChangeCover(workflow, e);
            }
          }}
          className="relative group/thumb w-12 h-12 rounded-lg bg-zinc-950 overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center cursor-pointer hover:border-cyan-400"
          title="更换封面"
        >
          {coverAsset ? (
            <img src={coverAsset.asset.dataUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded bg-zinc-800" />
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
            <ImageIcon className="w-4 h-4 text-cyan-300" />
          </div>
        </div>

        {/* Workflow Title & Desc */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 truncate transition-colors">
              {workflow.name}
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-cyan-300 border border-cyan-800/40">
              {workflow.modelInfo}
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-xl">
            {workflow.description}
          </p>
        </div>
      </div>

      {/* Middle Tags */}
      <div className="hidden lg:flex items-center gap-1.5 flex-wrap max-w-xs shrink-0">
        {tags.slice(0, 3).map(({ tag, category }) => (
          <span
            key={tag.id}
            className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-750 flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
            {tag.name}
          </span>
        ))}
      </div>

      {/* Right Stats & Action */}
      <div className="flex items-center gap-5 text-xs text-zinc-400 shrink-0 font-mono">
        <div className="hidden sm:block text-right">
          <div>{workflow.nodeCount} 节点</div>
          <div className="text-[10px] text-zinc-500">{workflow.linkCount} 连线</div>
        </div>

        {assets.length > 0 && (
          <div className="hidden md:flex items-center gap-1 text-emerald-400">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{assets.length}</span>
          </div>
        )}

        <div className="hidden sm:block text-[11px] text-zinc-500">
          {new Date(workflow.updatedAt).toLocaleDateString()}
        </div>

        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
      </div>
    </div>
  );
};
