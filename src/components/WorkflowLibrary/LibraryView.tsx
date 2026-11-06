/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  WorkflowRecord,
  TagCategory,
  Tag,
  WorkflowAssetRecord,
  AssetRecord
} from '../../types/workflow';
import { StorageService } from '../../services/storage';
import { WorkflowCard } from './WorkflowCard';
import { WorkflowListItem } from './WorkflowListItem';
import { FilterSidebar } from './FilterSidebar';
import { BatchActionBar } from './BatchActionBar';
import { ImportModal } from './ImportModal';
import { BatchTagModal } from './BatchTagModal';
import { CoverPickerModal } from './CoverPickerModal';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  X,
  FolderOpen,
  Layers
} from 'lucide-react';

interface LibraryViewProps {
  onOpenWorkflow: (id: string) => void;
  onOpenAssetHub?: () => void;
}

type SortField = 'updatedAt' | 'createdAt' | 'name' | 'nodeCount';
type SortOrder = 'asc' | 'desc';

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenWorkflow, onOpenAssetHub }) => {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Workflow associations map for ultra-fast filtering
  const [workflowTagsMap, setWorkflowTagsMap] = useState<Map<string, { tag: Tag; category: TagCategory }[]>>(new Map());
  const [workflowAssetsMap, setWorkflowAssetsMap] = useState<Map<string, { link: WorkflowAssetRecord; asset: AssetRecord }[]>>(new Map());
  const [workflowNotesMap, setWorkflowNotesMap] = useState<Map<string, string>>(new Map());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isOnlyFavorites, setIsOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Batch selection
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(new Set());

  // Modals & UI states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [coverEditingWorkflow, setCoverEditingWorkflow] = useState<WorkflowRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSaveCover = async (assetId: string | null) => {
    if (!coverEditingWorkflow) return;
    await StorageService.setWorkflowCover(coverEditingWorkflow.id, assetId);
    setCoverEditingWorkflow(null);
    await loadLibraryData();
  };

  // Load all library data
  const loadLibraryData = useCallback(async () => {
    setIsLoading(true);
    await StorageService.initialize();

    const [allWfs, allCats, allTgs] = await Promise.all([
      StorageService.getAllWorkflows(),
      StorageService.getAllCategories(),
      StorageService.getAllTags()
    ]);

    setWorkflows(allWfs);
    setCategories(allCats);
    setAllTags(allTgs);

    // Fetch tags, assets, notes for each workflow
    const tMap = new Map<string, { tag: Tag; category: TagCategory }[]>();
    const aMap = new Map<string, { link: WorkflowAssetRecord; asset: AssetRecord }[]>();
    const nMap = new Map<string, string>();

    await Promise.all(
      allWfs.map(async wf => {
        const [wfTags, wfAssets, wfNote] = await Promise.all([
          StorageService.getWorkflowTags(wf.id),
          StorageService.getWorkflowAssets(wf.id),
          StorageService.getWorkflowNote(wf.id)
        ]);
        let fullAssets = wfAssets;
        if (wf.coverAssetId && !wfAssets.some(a => a.asset.id === wf.coverAssetId)) {
          const cover = await StorageService.getAssetById(wf.coverAssetId);
          if (cover) {
            fullAssets = [
              {
                link: { workflowId: wf.id, assetId: cover.id, assetType: 'cover', order: 0 },
                asset: cover
              },
              ...wfAssets
            ];
          }
        }
        tMap.set(wf.id, wfTags.map(wt => ({ tag: wt.tag, category: wt.category })));
        aMap.set(wf.id, fullAssets);
        nMap.set(wf.id, wfNote);
      })
    );

    setWorkflowTagsMap(tMap);
    setWorkflowAssetsMap(aMap);
    setWorkflowNotesMap(nMap);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadLibraryData();
  }, [loadLibraryData]);

  // Tag filter toggle
  const handleToggleTagFilter = (tagId: string) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelectedTagIds(next);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedTagIds(new Set());
    setIsOnlyFavorites(false);
    setSearchQuery('');
  };

  // Create tag on the fly
  const handleCreateTag = async (categoryId: string, tagName: string) => {
    const newId = 'tag_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newTag: Tag = { id: newId, categoryId, name: tagName };
    await StorageService.saveTag(newTag);
    const updated = await StorageService.getAllTags();
    setAllTags(updated);
  };

  // Create category on the fly
  const handleCreateCategory = async (name: string, color: string) => {
    const newId = 'cat_' + Date.now().toString(36);
    const newCat: TagCategory = {
      id: newId,
      key: 'custom',
      name,
      description: '自定义标签维度',
      color,
      isSystem: false
    };
    await StorageService.saveCategory(newCat);
    const updated = await StorageService.getAllCategories();
    setCategories(updated);
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = await StorageService.toggleFavorite(id);
    setWorkflows(prev => prev.map(w => (w.id === id ? { ...w, isFavorite: isFav } : w)));
  };

  // Batch Selection toggle
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedWorkflowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWorkflowIds(next);
  };

  // Select All visible
  const handleSelectAllVisible = () => {
    if (selectedWorkflowIds.size === filteredWorkflows.length) {
      setSelectedWorkflowIds(new Set());
    } else {
      setSelectedWorkflowIds(new Set(filteredWorkflows.map(w => w.id)));
    }
  };

  // Batch Export JSON bundle
  const handleBatchExport = () => {
    const selectedWfs = workflows.filter(w => selectedWorkflowIds.has(w.id));
    if (selectedWfs.length === 0) return;

    const bundle = {
      flowlens_version: 1,
      exportedAt: Date.now(),
      workflows: selectedWfs.map(w => ({
        ...w,
        tags: (workflowTagsMap.get(w.id) || []).map(t => t.tag.name),
        note: workflowNotesMap.get(w.id) || ''
      }))
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowLens_Bundle_${selectedWfs.length}_Workflows.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedWorkflowIds.size === 0) return;
    if (!window.confirm(`确定要彻底删除选中的 ${selectedWorkflowIds.size} 个工作流吗？此操作无法撤销。`)) {
      return;
    }

    for (const id of Array.from(selectedWorkflowIds)) {
      await StorageService.deleteWorkflow(id);
    }
    setSelectedWorkflowIds(new Set());
    await loadLibraryData();
  };

  // Multi-dimensional filtering logic:
  // Same Dimension: OR (if user picked 'SDXL' and 'Flux.1' in Model category, match either)
  // Across Dimensions: AND (must match chosen Model OR, AND chosen Task OR, AND chosen Technique OR)
  const filteredWorkflows = useMemo(() => {
    // Group active selected tag IDs by their categoryId
    const tagToCategoryMap = new Map<string, string>();
    allTags.forEach(t => tagToCategoryMap.set(t.id, t.categoryId));

    const selectedByCategory = new Map<string, Set<string>>();
    selectedTagIds.forEach(tId => {
      const catId = tagToCategoryMap.get(tId);
      if (catId) {
        if (!selectedByCategory.has(catId)) selectedByCategory.set(catId, new Set());
        selectedByCategory.get(catId)!.add(tId);
      }
    });

    const query = searchQuery.trim().toLowerCase();

    return workflows.filter(wf => {
      // 1. Favorite filter
      if (isOnlyFavorites && !wf.isFavorite) return false;

      // 2. Multi-dimensional tag matching
      if (selectedByCategory.size > 0) {
        const wfTagIds = new Set((workflowTagsMap.get(wf.id) || []).map(t => t.tag.id));

        for (const [, tagIdsInCat] of selectedByCategory) {
          // Within same category: OR logic (workflow must have at least one of these tags)
          const hasAnyInCat = Array.from(tagIdsInCat).some(tId => wfTagIds.has(tId));
          if (!hasAnyInCat) return false; // Across categories: AND logic
        }
      }

      // 3. Search query filter (matches name, description, model, checkpoints, note, tags)
      if (query) {
        const nameMatch = wf.name.toLowerCase().includes(query);
        const descMatch = wf.description.toLowerCase().includes(query);
        const modelMatch = wf.modelInfo.toLowerCase().includes(query);
        const ckptMatch = (wf.extractedMeta?.checkpoints || []).some(c => c.toLowerCase().includes(query));
        const noteMatch = (workflowNotesMap.get(wf.id) || '').toLowerCase().includes(query);
        const tagMatch = (workflowTagsMap.get(wf.id) || []).some(t => t.tag.name.toLowerCase().includes(query));

        if (!nameMatch && !descMatch && !modelMatch && !ckptMatch && !noteMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      let diff = 0;
      if (sortField === 'updatedAt') diff = b.updatedAt - a.updatedAt;
      else if (sortField === 'createdAt') diff = b.createdAt - a.createdAt;
      else if (sortField === 'name') diff = a.name.localeCompare(b.name);
      else if (sortField === 'nodeCount') diff = b.nodeCount - a.nodeCount;

      return sortOrder === 'desc' ? diff : -diff;
    });
  }, [
    workflows,
    allTags,
    selectedTagIds,
    isOnlyFavorites,
    searchQuery,
    workflowTagsMap,
    workflowNotesMap,
    sortField,
    sortOrder
  ]);

  return (
    <div className="h-screen w-screen bg-[#0e0f12] text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-16 px-5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between z-30 shrink-0">
        {/* Brand & Primary View Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">FlowLens</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-semibold">
                  v1.0
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                ComfyUI 工作流知识库与视觉画板
              </div>
            </div>
          </div>

          {/* Primary View Switcher: 工作流库 vs 素材库 */}
          {onOpenAssetHub && (
            <div className="hidden sm:flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30 shadow-sm cursor-default"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>工作流库 ({workflows.length})</span>
              </button>
              <button
                onClick={onOpenAssetHub}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>素材库</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Search Box */}
        <div className="flex-1 max-w-md mx-6 hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索工作流名称、模型、节点参数、心得笔记或标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500/80 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Actions & Import */}
        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white"
            title="筛选标签"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>收录工作流</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Multi-dimensional Filter Sidebar */}
        <FilterSidebar
          categories={categories}
          allTags={allTags}
          selectedTagIds={selectedTagIds}
          onToggleTagFilter={handleToggleTagFilter}
          isOnlyFavorites={isOnlyFavorites}
          onToggleOnlyFavorites={() => setIsOnlyFavorites(!isOnlyFavorites)}
          onClearFilters={handleClearFilters}
          onCreateTag={handleCreateTag}
          onCreateCategory={handleCreateCategory}
          isOpenMobile={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />

        {/* Main Workflows Browsing Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950/30">
          {/* Controls Bar: Stats, View Mode, Sorting */}
          <div className="h-12 px-6 border-b border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
            {/* Left: Counts and Active Filters */}
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              <span className="font-medium text-zinc-200">
                共 {filteredWorkflows.length} 个工作流
                {filteredWorkflows.length !== workflows.length && (
                  <span className="text-zinc-500 ml-1 font-mono">/ 总计 {workflows.length}</span>
                )}
              </span>

              {/* Active tag pills */}
              {selectedTagIds.size > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-zinc-500 text-[10px]">筛选:</span>
                  {Array.from(selectedTagIds).map(tId => {
                    const tag = allTags.find(t => t.id === tId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800/60"
                      >
                        <span>{tag.name}</span>
                        <X
                          className="w-2.5 h-2.5 cursor-pointer hover:text-white"
                          onClick={() => handleToggleTagFilter(tId)}
                        />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Sort and Grid/List toggle */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={e => {
                    const [f, o] = e.target.value.split('-') as [SortField, SortOrder];
                    setSortField(f);
                    setSortOrder(o);
                  }}
                  className="bg-transparent text-zinc-300 text-xs outline-none cursor-pointer"
                >
                  <option value="updatedAt-desc" className="bg-zinc-900">最近更新</option>
                  <option value="createdAt-desc" className="bg-zinc-900">最近收录</option>
                  <option value="name-asc" className="bg-zinc-900">名称 (A-Z)</option>
                  <option value="nodeCount-desc" className="bg-zinc-900">节点数量</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                  title="卡片网格视图"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                  title="列表清单视图"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards / List Display Container */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-xs text-zinc-500 font-mono">
                正在加载工作流库...
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-800/80 rounded-2xl max-w-md mx-auto my-12">
                <Compass className="w-10 h-10 text-zinc-600 mb-3" />
                <h3 className="text-sm font-semibold text-zinc-300">未找到符合条件的工作流</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  尝试清空搜索词、放宽多维标签筛选条件，或收录新的 ComfyUI 工作流。
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-xl transition-colors cursor-pointer"
                  >
                    重置所有筛选
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-xs text-white rounded-xl transition-colors cursor-pointer"
                  >
                    导入新工作流
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredWorkflows.map(wf => (
                  <WorkflowCard
                    key={wf.id}
                    workflow={wf}
                    tags={workflowTagsMap.get(wf.id) || []}
                    assets={workflowAssetsMap.get(wf.id) || []}
                    noteSnippet={workflowNotesMap.get(wf.id) || ''}
                    isSelected={selectedWorkflowIds.has(wf.id)}
                    onToggleSelect={handleToggleSelect}
                    onToggleFavorite={handleToggleFavorite}
                    onOpen={onOpenWorkflow}
                    onChangeCover={wf => setCoverEditingWorkflow(wf)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* List Header Checkbox */}
                <div className="px-4 py-2 text-[11px] text-zinc-500 font-mono flex items-center justify-between border-b border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedWorkflowIds.size > 0 &&
                        selectedWorkflowIds.size === filteredWorkflows.length
                      }
                      onChange={handleSelectAllVisible}
                      className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>全选当前列表 ({filteredWorkflows.length})</span>
                  </div>
                  <div>操作</div>
                </div>

                {filteredWorkflows.map(wf => (
                  <WorkflowListItem
                    key={wf.id}
                    workflow={wf}
                    tags={workflowTagsMap.get(wf.id) || []}
                    assets={workflowAssetsMap.get(wf.id) || []}
                    isSelected={selectedWorkflowIds.has(wf.id)}
                    onToggleSelect={handleToggleSelect}
                    onToggleFavorite={handleToggleFavorite}
                    onOpen={onOpenWorkflow}
                    onChangeCover={wf => setCoverEditingWorkflow(wf)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Batch Floating Action Bar */}
      <BatchActionBar
        selectedCount={selectedWorkflowIds.size}
        onOpenBatchTag={() => setIsBatchTagModalOpen(true)}
        onBatchExport={handleBatchExport}
        onBatchDelete={handleBatchDelete}
        onClearSelection={() => setSelectedWorkflowIds(new Set())}
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportModal
          existingWorkflows={workflows}
          onImportSuccess={loadLibraryData}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* Batch Tag Modal */}
      {isBatchTagModalOpen && (
        <BatchTagModal
          selectedWorkflowIds={Array.from(selectedWorkflowIds)}
          categories={categories}
          allTags={allTags}
          onSuccess={loadLibraryData}
          onClose={() => setIsBatchTagModalOpen(false)}
        />
      )}

      {/* Cover Picker Modal (from Asset Hub or Upload) */}
      {coverEditingWorkflow && (
        <CoverPickerModal
          workflow={coverEditingWorkflow}
          onSelectCover={handleSaveCover}
          onClose={() => setCoverEditingWorkflow(null)}
          onOpenAssetHub={onOpenAssetHub}
        />
      )}
    </div>
  );
};
