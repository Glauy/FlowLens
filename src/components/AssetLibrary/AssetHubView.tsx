/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Upload,
  Layers,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  FileText,
  Star,
  Link2,
  Trash2,
  Download,
  Maximize2,
  Eye,
  Check,
  X,
  Play,
  Pause,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  Volume2,
  Edit2,
  ExternalLink,
  Plus,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  AssetRecord,
  AssetType,
  AssetUsage,
  WorkflowRecord
} from '../../types/workflow';
import { StorageService } from '../../services/storage';
import { AssetUploadModal } from './AssetUploadModal';
import { AssignToWorkflowModal } from './AssignToWorkflowModal';

interface AssetHubViewProps {
  onOpenWorkflow: (workflowId: string) => void;
  onNavigateToWorkflows: () => void;
}

type FilterCategory = 'all' | 'image' | 'reference' | 'input' | 'output' | 'audio' | 'video' | 'text';
type UsageFilter = 'all' | 'used' | 'unused';
type SortField = 'createdAt' | 'usages' | 'size' | 'name';

export const AssetHubView: React.FC<AssetHubViewProps> = ({
  onOpenWorkflow,
  onNavigateToWorkflows
}) => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [usagesMap, setUsagesMap] = useState<Map<string, AssetUsage[]>>(new Map());
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Active items
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<AssetRecord | null>(null);
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AssetType>('reference');

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await StorageService.initialize();

    const [allAssets, usages, allWfs] = await Promise.all([
      StorageService.getAllAssets(),
      StorageService.getAssetUsagesMap(),
      StorageService.getAllWorkflows()
    ]);

    setAssets(allAssets);
    setUsagesMap(usages);
    setWorkflows(allWfs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Audio control
  const handleTogglePlayAudio = (asset: AssetRecord) => {
    if (playingAudioId === asset.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(asset.id);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = asset.dataUrl;
        audioPlayerRef.current.play();
      }
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (asset: AssetRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const usages = usagesMap.get(asset.id) || [];
    let message = `确定要从素材库彻底删除 "${asset.name}" 吗？`;
    if (usages.length > 0) {
      message += `\n注意：该素材当前已被 ${usages.length} 个工作流引用，删除后相关引用和封面将被同步移除！`;
    }

    if (!window.confirm(message)) return;

    await StorageService.deleteAsset(asset.id);
    await loadData();
  };

  // Download Asset
  const handleDownloadAsset = (asset: AssetRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = asset.dataUrl;
    let ext = 'jpg';
    if (asset.mimeType.includes('png')) ext = 'png';
    else if (asset.mimeType.includes('wav')) ext = 'wav';
    else if (asset.mimeType.includes('mp3')) ext = 'mp3';
    else if (asset.mimeType.includes('mp4')) ext = 'mp4';
    else if (asset.mimeType.includes('text') || asset.name.endsWith('.txt')) ext = 'txt';
    a.download = `${asset.name}.${ext}`;
    a.click();
  };

  // Edit Asset Name/Type
  const handleOpenEdit = (asset: AssetRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setNewName(asset.name);
    setNewType(asset.type);
  };

  const handleSaveEdit = async () => {
    if (!editingAsset) return;
    const updated: AssetRecord = {
      ...editingAsset,
      name: newName.trim() || editingAsset.name,
      type: newType
    };
    await StorageService.updateAsset(updated);
    setEditingAsset(null);
    await loadData();
  };

  // Computed statistics
  const stats = useMemo(() => {
    let images = 0;
    let audios = 0;
    let videos = 0;
    let texts = 0;
    let usedCount = 0;

    assets.forEach(a => {
      if (a.mimeType.startsWith('image/') || ['cover', 'showcase', 'input', 'reference', 'output', 'comparison'].includes(a.type)) {
        images++;
      } else if (a.mimeType.startsWith('audio/') || a.type === 'audio') {
        audios++;
      } else if (a.mimeType.startsWith('video/') || a.type === 'video') {
        videos++;
      } else if (a.mimeType.startsWith('text/') || a.type === 'text') {
        texts++;
      }

      if ((usagesMap.get(a.id) || []).length > 0) {
        usedCount++;
      }
    });

    return {
      total: assets.length,
      images,
      audios,
      videos,
      texts,
      usedCount,
      unusedCount: assets.length - usedCount
    };
  }, [assets, usagesMap]);

  // Filter & Sort
  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return assets
      .filter(a => {
        // 1. Category Filter
        if (categoryFilter === 'image') {
          if (!a.mimeType.startsWith('image/') && !['cover', 'showcase', 'input', 'reference', 'output', 'comparison'].includes(a.type)) return false;
        } else if (categoryFilter === 'reference') {
          if (a.type !== 'reference') return false;
        } else if (categoryFilter === 'input') {
          if (a.type !== 'input') return false;
        } else if (categoryFilter === 'output') {
          if (a.type !== 'output' && a.type !== 'cover' && a.type !== 'showcase') return false;
        } else if (categoryFilter === 'audio') {
          if (!a.mimeType.startsWith('audio/') && a.type !== 'audio') return false;
        } else if (categoryFilter === 'video') {
          if (!a.mimeType.startsWith('video/') && a.type !== 'video') return false;
        } else if (categoryFilter === 'text') {
          if (!a.mimeType.startsWith('text/') && a.type !== 'text') return false;
        }

        // 2. Usage Filter
        const usages = usagesMap.get(a.id) || [];
        if (usageFilter === 'used' && usages.length === 0) return false;
        if (usageFilter === 'unused' && usages.length > 0) return false;

        // 3. Search Query
        if (q) {
          const nameMatch = a.name.toLowerCase().includes(q);
          const typeMatch = a.type.toLowerCase().includes(q);
          const wfMatch = usages.some(u => u.workflowName.toLowerCase().includes(q));
          if (!nameMatch && !typeMatch && !wfMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'createdAt') {
          diff = b.createdAt - a.createdAt;
        } else if (sortField === 'usages') {
          const uA = (usagesMap.get(a.id) || []).length;
          const uB = (usagesMap.get(b.id) || []).length;
          diff = uB - uA;
        } else if (sortField === 'size') {
          diff = (b.size || 0) - (a.size || 0);
        } else if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        }
        return sortOrder === 'desc' ? diff : -diff;
      });
  }, [assets, usagesMap, searchQuery, categoryFilter, usageFilter, sortField, sortOrder]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0c] text-zinc-100 select-none overflow-hidden">
      {/* Hidden global audio element */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingAudioId(null)}
        onPause={() => setPlayingAudioId(null)}
      />

      {/* Global Top Navigation Header */}
      <header className="h-14 px-6 border-b border-zinc-800/90 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        {/* Brand & Main View Switcher */}
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
            </div>
          </div>

          {/* Top Primary Tabs: 工作流库 vs 素材库 */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={onNavigateToWorkflows}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>工作流库 ({workflows.length})</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30 shadow-sm cursor-default"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>素材库 ({assets.length})</span>
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索素材名称、分类或关联的工作流..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-500"
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

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>上传素材入库</span>
          </button>
        </div>
      </header>

      {/* Secondary Controls & Category Filter Bar */}
      <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            全部 ({stats.total})
          </button>

          <button
            onClick={() => setCategoryFilter('reference')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'reference'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-600/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>参考垫图 / 肖像</span>
          </button>

          <button
            onClick={() => setCategoryFilter('input')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'input'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-600/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>输入底图 / 线稿</span>
          </button>

          <button
            onClick={() => setCategoryFilter('output')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'output'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>输出成果 / 封面</span>
          </button>

          <button
            onClick={() => setCategoryFilter('audio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'audio'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Music className="w-3 h-3 text-emerald-400" />
            <span>音频 ({stats.audios})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'video'
                ? 'bg-pink-950/80 text-pink-300 border border-pink-600/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <VideoIcon className="w-3 h-3 text-pink-400" />
            <span>视频 ({stats.videos})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'text'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-600/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-3 h-3 text-indigo-400" />
            <span>提示词配置 ({stats.texts})</span>
          </button>
        </div>

        {/* Right Sort & Usage Status Filter */}
        <div className="flex items-center gap-3">
          {/* Usage Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 border border-zinc-800 rounded-xl text-xs">
            <button
              onClick={() => setUsageFilter('all')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                usageFilter === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setUsageFilter('used')}
              className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                usageFilter === 'used'
                  ? 'bg-cyan-950 text-cyan-300 font-medium border border-cyan-800/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="仅看被工作流引用的素材"
            >
              <Link2 className="w-3 h-3 text-cyan-400" />
              <span>已引用 ({stats.usedCount})</span>
            </button>
            <button
              onClick={() => setUsageFilter('unused')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                usageFilter === 'unused' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="未被任何工作流引用的闲置素材"
            >
              未引用 ({stats.unusedCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="bg-transparent text-zinc-300 outline-none cursor-pointer"
            >
              <option value="createdAt" className="bg-zinc-900">最新入库</option>
              <option value="usages" className="bg-zinc-900">最多引用</option>
              <option value="size" className="bg-zinc-900">文件大小</option>
              <option value="name" className="bg-zinc-900">素材名称</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="text-zinc-400 hover:text-white cursor-pointer px-1"
              title={sortOrder === 'desc' ? '降序排列' : '升序排列'}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Asset Grid Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-zinc-500 font-mono gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
            <span>正在加载全局素材库...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
              <FolderOpen className="w-7 h-7 text-zinc-600" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">素材库暂无匹配内容</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              可以调整筛选条件，或者点击右上角「上传素材入库」添加常用参考图、线稿底图或音频素材。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map(asset => {
              const usages = usagesMap.get(asset.id) || [];
              const isCoverForAny = usages.some(u => u.isCover);
              const isAudio = asset.mimeType.startsWith('audio/') || asset.type === 'audio';
              const isVideo = asset.mimeType.startsWith('video/') || asset.type === 'video';
              const isText = asset.mimeType.startsWith('text/') || asset.type === 'text';
              const isPlaying = playingAudioId === asset.id;

              return (
                <div
                  key={asset.id}
                  onClick={() => setPreviewAsset(asset)}
                  className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 hover:shadow-xl rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer backdrop-blur-sm"
                >
                  {/* Media Preview Box */}
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden flex items-center justify-center border-b border-zinc-800/60">
                    {isAudio ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-950/40 to-zinc-950">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleTogglePlayAudio(asset);
                          }}
                          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <span className="text-[11px] text-purple-300 mt-2 font-medium">
                          {isPlaying ? '播放中...' : '点击试听音频'}
                        </span>
                      </div>
                    ) : isVideo ? (
                      <div className="w-full h-full relative group/vid">
                        <video
                          src={asset.dataUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={e => (e.target as HTMLVideoElement).pause()}
                        />
                        <div className="absolute top-2 right-2 p-1 bg-black/60 rounded backdrop-blur">
                          <VideoIcon className="w-3.5 h-3.5 text-pink-400" />
                        </div>
                      </div>
                    ) : isText ? (
                      <div className="w-full h-full p-3 bg-zinc-950 text-[10px] text-zinc-400 font-mono overflow-hidden line-clamp-5 leading-relaxed">
                        📄 提示词/配置文件内容
                        <div className="mt-1 text-zinc-300 italic">{asset.dataUrl.slice(0, 160)}...</div>
                      </div>
                    ) : (
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}

                    {/* Top Overlay Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/70 backdrop-blur-md text-zinc-200 border border-white/10 uppercase">
                        {asset.type}
                      </span>
                      {isCoverForAny && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-zinc-950 flex items-center gap-1 shadow-md">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>封面</span>
                        </span>
                      )}
                    </div>

                    {/* Hover Actions Bar */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setPreviewAsset(asset);
                        }}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl shadow-md cursor-pointer transition-colors"
                        title="查看高清预览"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setAssigningAsset(asset);
                        }}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md cursor-pointer transition-colors"
                        title="设为工作流封面 / 关联工作流"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={e => handleDownloadAsset(asset, e)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl shadow-md cursor-pointer transition-colors"
                        title="下载原文件"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={e => handleDeleteAsset(asset, e)}
                        className="p-2 bg-zinc-800 hover:bg-rose-600 text-zinc-400 hover:text-white rounded-xl shadow-md cursor-pointer transition-colors"
                        title="从素材库删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate"
                          title={asset.name}
                        >
                          {asset.name}
                        </h4>
                        <button
                          onClick={e => handleOpenEdit(asset, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-cyan-300 text-zinc-500 cursor-pointer transition-opacity"
                          title="修改名称/分类"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                        <span>{(asset.size / 1024).toFixed(0)} KB</span>
                        <span>·</span>
                        <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Workflow Usages Linkage Section (THE CLOSING LOOP!) */}
                    <div className="pt-2 border-t border-zinc-800/80">
                      {usages.length === 0 ? (
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>暂未关联工作流</span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setAssigningAsset(asset);
                            }}
                            className="text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>关联</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1 text-cyan-300 font-medium">
                              <Link2 className="w-3 h-3" />
                              <span>引用 ({usages.length})</span>
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setAssigningAsset(asset);
                              }}
                              className="text-[10px] text-zinc-500 hover:text-cyan-400 cursor-pointer"
                            >
                              管理
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {usages.slice(0, 2).map((u, idx) => (
                              <button
                                key={idx}
                                onClick={e => {
                                  e.stopPropagation();
                                  onOpenWorkflow(u.workflowId);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded-md truncate max-w-full text-left transition-colors flex items-center gap-1 cursor-pointer ${
                                  u.isCover
                                    ? 'bg-amber-950/60 text-amber-300 border border-amber-600/30 hover:bg-amber-900/60'
                                    : 'bg-zinc-800/80 text-zinc-300 border border-zinc-750 hover:bg-cyan-950/60 hover:text-cyan-300'
                                }`}
                                title={`点击直接跳转打开工作流：${u.workflowName}`}
                              >
                                {u.isCover ? <Star className="w-2.5 h-2.5 fill-current shrink-0" /> : <ExternalLink className="w-2.5 h-2.5 shrink-0" />}
                                <span className="truncate">{u.workflowName}</span>
                              </button>
                            ))}
                            {usages.length > 2 && (
                              <span className="text-[9px] text-zinc-500 self-center">
                                +{usages.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <AssetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Assign to Workflow Modal */}
      {assigningAsset && (
        <AssignToWorkflowModal
          asset={assigningAsset}
          isOpen={true}
          onClose={() => setAssigningAsset(null)}
          onSuccess={loadData}
          onOpenWorkflow={onOpenWorkflow}
        />
      )}

      {/* Lightbox Modal */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col text-zinc-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{previewAsset.name}</h3>
                <p className="text-xs text-zinc-400 capitalize">
                  {previewAsset.type} · {(previewAsset.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={e => handleDownloadAsset(previewAsset, e)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer"
                  title="下载原图"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-black min-h-[360px]">
              {previewAsset.mimeType.startsWith('video/') ? (
                <video src={previewAsset.dataUrl} controls autoPlay className="max-h-[75vh] max-w-full rounded" />
              ) : previewAsset.mimeType.startsWith('audio/') ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <span className="text-xs text-zinc-400 mb-3">音频素材在线试听</span>
                  <audio src={previewAsset.dataUrl} controls autoPlay className="w-80" />
                </div>
              ) : previewAsset.mimeType.startsWith('text/') ? (
                <div className="w-full max-w-2xl bg-zinc-900 p-4 rounded-xl font-mono text-xs text-zinc-300 whitespace-pre-wrap">
                  {previewAsset.dataUrl}
                </div>
              ) : (
                <img
                  src={previewAsset.dataUrl}
                  alt={previewAsset.name}
                  className="max-h-[75vh] max-w-full object-contain rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingAsset(null)}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-200"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white mb-4">修改素材信息</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">素材名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">素材用途分类</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as AssetType)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="reference">参考垫图 (Reference)</option>
                  <option value="cover">封面图 (Cover)</option>
                  <option value="showcase">效果示例 (Showcase)</option>
                  <option value="input">输入底图/线稿 (Input)</option>
                  <option value="output">生成成果 (Output)</option>
                  <option value="comparison">对比样张 (Comparison)</option>
                  <option value="audio">音频伴奏 (Audio)</option>
                  <option value="video">视频 (Video)</option>
                  <option value="text">提示词/配置 (Text)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingAsset(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shadow-md"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
