/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tag as TagIcon, Download, Trash2, X } from 'lucide-react';

interface BatchActionBarProps {
  selectedCount: number;
  onOpenBatchTag: () => void;
  onBatchExport: () => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  onOpenBatchTag,
  onBatchExport,
  onBatchDelete,
  onClearSelection
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-zinc-200">
      <div className="flex items-center gap-2 pr-3 border-r border-zinc-700 text-xs">
        <span className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="font-semibold text-white">已选择 {selectedCount} 个工作流</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenBatchTag}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
        >
          <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>批量标签</span>
        </button>

        <button
          onClick={onBatchExport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-purple-400" />
          <span>批量导出 JSON</span>
        </button>

        <button
          onClick={onBatchDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 border border-red-800/40 rounded-xl text-xs font-medium text-red-300 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>批量删除</span>
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
        title="取消全选"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
