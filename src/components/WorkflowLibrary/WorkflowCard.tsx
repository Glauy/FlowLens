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
import { Star, Image as ImageIcon, Layers, Calendar, ChevronRight } from 'lucide-react';

interface WorkflowCardProps {
  workflow: WorkflowRecord;
  tags: { tag: Tag; category: TagCategory }[];
  assets: { link: WorkflowAssetRecord; asset: AssetRecord }[];
  noteSnippet: string;
  isSelected: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onOpen: (id: string) => void;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  tags,
  assets,
  noteSnippet,
  isSelected,
  onToggleFavorite,
  onOpen
}) => {
  // Resolve designated cover asset first, then fallback to showcase or first asset
  const coverAsset =
    (workflow.coverAssetId && assets.find(a => a.asset.id === workflow.coverAssetId)) ||
    assets.find(a => a.link.assetType === 'cover') ||
    assets.find(a => a.link.assetType === 'showcase') ||
    assets[0];

  return (
    <div
      onClick={() => onOpen(workflow.id)}
      className={`group relative bg-zinc-900/90 border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col backdrop-blur-sm ${
        isSelected
          ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-zinc-850'
          : 'border-zinc-800/90 hover:border-zinc-700 hover:shadow-cyan-950/20'
      }`}
    >
      {/* Top Media / Cover Preview */}
      <div className="relative h-44 w-full bg-zinc-950 overflow-hidden border-b border-zinc-800/80 flex items-center justify-center">
        {coverAsset ? (
          <img
            src={coverAsset.asset.dataUrl}
            alt={workflow.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          /* Dynamic SVG Topology Mini-Map Visual */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 to-zinc-950">
            <div className="flex items-center gap-3 opacity-40">
              <div className="w-10 h-10 rounded-lg border border-purple-500/50 bg-purple-950/30" />
              <div className="w-8 h-0.5 bg-zinc-600 border-dashed" />
              <div className="w-12 h-12 rounded-lg border border-cyan-500/50 bg-cyan-950/30" />
              <div className="w-8 h-0.5 bg-zinc-600 border-dashed" />
              <div className="w-10 h-10 rounded-lg border border-emerald-500/50 bg-emerald-950/30" />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 mt-3">ComfyUI Graph Node Map</span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900/90 backdrop-blur-md text-cyan-300 border border-cyan-500/30 shadow-sm">
            {workflow.modelInfo}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/70 backdrop-blur-md text-zinc-300 border border-white/10 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-zinc-400" />
            {workflow.nodeCount} 节点
          </span>
        </div>

        {/* Favorite Star Button */}
        <button
          onClick={e => onToggleFavorite(workflow.id, e)}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer ${
            workflow.isFavorite
              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40 shadow-lg'
              : 'bg-black/50 text-zinc-400 hover:text-white border border-white/10 hover:bg-black/70'
          }`}
          title={workflow.isFavorite ? '取消收藏' : '加入收藏'}
        >
          <Star className={`w-3.5 h-3.5 ${workflow.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Asset Count Badge */}
        {assets.length > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-zinc-300 border border-white/10 flex items-center gap-1 font-mono">
            <ImageIcon className="w-3 h-3 text-emerald-400" />
            <span>{assets.length}</span>
          </div>
        )}
      </div>

      {/* Body Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3
            className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate"
            title={workflow.name}
          >
            {workflow.name}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
            {workflow.description}
          </p>
        </div>

        {/* Note Snippet */}
        {noteSnippet && (
          <div className="text-[11px] text-zinc-400 bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/80 line-clamp-2 font-mono italic">
            📝 {noteSnippet.replace(/[#*`_]/g, '')}
          </div>
        )}

        {/* Tags Chips */}
        <div className="flex flex-wrap gap-1 pt-1">
          {tags.slice(0, 4).map(({ tag, category }) => (
            <span
              key={tag.id}
              className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-750 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {tag.name}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800/50 text-zinc-500 font-mono">
              +{tags.length - 4}
            </span>
          )}
        </div>

        {/* Footer Meta */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity font-sans text-xs font-medium">
            <span>进入画布</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
