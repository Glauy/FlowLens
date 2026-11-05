/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Tag as TagIcon, Check } from 'lucide-react';
import { TagCategory, Tag } from '../../types/workflow';
import { StorageService } from '../../services/storage';

interface BatchTagModalProps {
  selectedWorkflowIds: string[];
  categories: TagCategory[];
  allTags: Tag[];
  onSuccess: () => void;
  onClose: () => void;
}

export const BatchTagModal: React.FC<BatchTagModalProps> = ({
  selectedWorkflowIds,
  categories,
  allTags,
  onSuccess,
  onClose
}) => {
  const [tagsToAdd, setTagsToAdd] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tagId: string) => {
    const next = new Set(tagsToAdd);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setTagsToAdd(next);
  };

  const handleApply = async () => {
    if (tagsToAdd.size === 0) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    for (const wfId of selectedWorkflowIds) {
      const existing = await StorageService.getWorkflowTags(wfId);
      const existingIds = new Set(existing.map(e => e.tag.id));
      const combined = [
        ...existing.map(e => ({ tagId: e.tag.id, isAutoDetected: e.isAutoDetected })),
        ...Array.from(tagsToAdd)
          .filter(tId => !existingIds.has(tId))
          .map(tId => ({ tagId: tId, isAutoDetected: false }))
      ];
      await StorageService.setWorkflowTags(wfId, combined);
    }
    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              批量添加标签 ({selectedWorkflowIds.length} 个工作流)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          <p className="text-xs text-zinc-400">
            勾选希望批量赋予选定工作流的标签（已有标签将保留）：
          </p>

          {categories.map(cat => {
            const catTags = allTags.filter(t => t.categoryId === cat.id);
            if (catTags.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-1.5">
                <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {catTags.map(tag => {
                    const isChecked = tagsToAdd.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-medium'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-cyan-400" />}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            disabled={isSubmitting}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:bg-zinc-800"
          >
            {isSubmitting ? '正在应用...' : `确认赋予 (${tagsToAdd.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};
