/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TagCategory,
  Tag
} from '../../types/workflow';
import {
  Filter,
  Star,
  Plus,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

interface FilterSidebarProps {
  categories: TagCategory[];
  allTags: Tag[];
  selectedTagIds: Set<string>; // All currently selected tag IDs
  onToggleTagFilter: (tagId: string) => void;
  isOnlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
  onClearFilters: () => void;
  onCreateTag: (categoryId: string, tagName: string) => Promise<void>;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  allTags,
  selectedTagIds,
  onToggleTagFilter,
  isOnlyFavorites,
  onToggleOnlyFavorites,
  onClearFilters,
  onCreateTag,
  onCreateCategory,
  isOpenMobile,
  onCloseMobile
}) => {
  // Collapsed sections
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Inline tag creation
  const [addingTagCatId, setAddingTagCatId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');

  // Inline category creation
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8b5cf6');

  const toggleCollapse = (catId: string) => {
    const next = new Set(collapsedCategories);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setCollapsedCategories(next);
  };

  const handleCreateTagSubmit = async (catId: string) => {
    if (!newTagName.trim()) return;
    await onCreateTag(catId, newTagName.trim());
    setNewTagName('');
    setAddingTagCatId(null);
  };

  const handleCreateCategorySubmit = async () => {
    if (!newCatName.trim()) return;
    await onCreateCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const content = (
    <div className="flex flex-col h-full text-zinc-300">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">多维标签筛选</h2>
        </div>

        {(selectedTagIds.size > 0 || isOnlyFavorites) && (
          <button
            onClick={onClearFilters}
            className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>重置</span>
          </button>
        )}
      </div>

      {/* Filter Mode Notice */}
      <div className="px-4 py-2 bg-zinc-900/40 border-b border-zinc-800/60 text-[10px] text-zinc-400 leading-relaxed font-mono">
        💡 同维度标签多选为 <span className="text-cyan-300 font-bold">OR</span>，不同维度之间采用 <span className="text-purple-300 font-bold">AND</span> 逻辑。
      </div>

      {/* Filter Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Quick Filter: Only Favorites */}
        <div>
          <button
            onClick={onToggleOnlyFavorites}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isOnlyFavorites
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className={`w-3.5 h-3.5 ${isOnlyFavorites ? 'fill-current text-amber-400' : 'text-zinc-500'}`} />
              <span>仅看标星收藏</span>
            </div>
            {isOnlyFavorites && <span className="text-[10px] font-mono bg-amber-500/20 px-1.5 py-0.2 rounded">已启用</span>}
          </button>
        </div>

        {/* Categories List */}
        {categories.map(cat => {
          const isCollapsed = collapsedCategories.has(cat.id);
          const catTags = allTags.filter(t => t.categoryId === cat.id);
          const activeCountInCat = catTags.filter(t => selectedTagIds.has(t.id)).length;

          return (
            <div key={cat.id} className="space-y-2">
              {/* Category Header */}
              <div className="flex items-center justify-between text-xs group">
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  className="flex items-center gap-1.5 font-medium text-zinc-200 hover:text-white cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                  {activeCountInCat > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                      {activeCountInCat}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setAddingTagCatId(addingTagCatId === cat.id ? null : cat.id)}
                  className="opacity-0 group-hover:opacity-100 text-[11px] text-zinc-500 hover:text-cyan-400 transition-opacity cursor-pointer flex items-center gap-0.5"
                  title={`在【${cat.name}】下添加标签`}
                >
                  <Plus className="w-3 h-3" />
                  <span>添加</span>
                </button>
              </div>

              {/* Collapsible Content */}
              {!isCollapsed && (
                <div className="pl-2 space-y-1.5">
                  {/* Inline Tag Add input */}
                  {addingTagCatId === cat.id && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="新标签名称..."
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateTagSubmit(cat.id);
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleCreateTagSubmit(cat.id)}
                        className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs cursor-pointer font-medium"
                      >
                        确定
                      </button>
                    </div>
                  )}

                  {/* Tags Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {catTags.map(tag => {
                      const isSelected = selectedTagIds.has(tag.id);

                      return (
                        <button
                          key={tag.id}
                          onClick={() => onToggleTagFilter(tag.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-medium shadow-sm'
                              : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? '#38bdf8' : cat.color }}
                          />
                          <span>{tag.name}</span>
                        </button>
                      );
                    })}

                    {catTags.length === 0 && (
                      <span className="text-[11px] text-zinc-600 italic">暂无标签</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Custom Category Button */}
        <div className="pt-2 border-t border-zinc-800">
          {isAddingCategory ? (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-zinc-200">新建标签维度</div>
              <input
                type="text"
                placeholder="维度名称 (如：商业用途)..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white outline-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-500">主色调</label>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAddingCategory(false)}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCategorySubmit}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium cursor-pointer"
                >
                  保存维度
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-full py-2 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>新建自定义标签维度</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-950/60 flex-col h-full backdrop-blur-sm">
        {content}
      </aside>

      {/* Mobile Modal Drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex justify-start"
          onClick={onCloseMobile}
        >
          <div
            className="w-80 max-w-[85vw] h-full bg-zinc-950 border-r border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
