/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Upload,
  Check,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AssetRecord, WorkflowRecord } from '../../types/workflow';
import { StorageService } from '../../services/storage';

interface CoverPickerModalProps {
  workflow: WorkflowRecord;
  onSelectCover: (assetId: string | null) => Promise<void>;
  onClose: () => void;
  onOpenAssetHub?: () => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  workflow,
  onSelectCover,
  onClose,
  onOpenAssetHub
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetUsages, setAssetUsages] = useState<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Upload Tab state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [allAssets, usagesMap] = await Promise.all([
      StorageService.getAllAssets(),
      StorageService.getAssetUsagesMap()
    ]);

    // Only image assets can be used as workflow covers
    const imageAssets = allAssets.filter(
      a =>
        a.mimeType.startsWith('image/') ||
        ['cover', 'showcase', 'input', 'reference', 'output', 'comparison'].includes(a.type)
    );

    const counts = new Map<string, number>();
    usagesMap.forEach((list, id) => {
      counts.set(id, list.length);
    });

    setAssets(imageAssets.sort((a, b) => b.createdAt - a.createdAt));
    setAssetUsages(counts);
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadedFile(file);
    setAssetName(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = ev => {
      setPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUploadedCover = async () => {
    if (!uploadedFile || !previewUrl) return;
    setIsUploading(true);

    try {
      const assetId = 'asset_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const newAsset: AssetRecord = {
        id: assetId,
        name: assetName.trim() || uploadedFile.name,
        type: 'cover',
        mimeType: uploadedFile.type || 'image/jpeg',
        dataUrl: previewUrl,
        size: uploadedFile.size,
        createdAt: Date.now()
      };

      // 1. Save asset to global Asset Hub
      await StorageService.saveAsset(newAsset);

      // 2. Link asset to this workflow
      await StorageService.linkAssetToWorkflow({
        workflowId: workflow.id,
        assetId,
        assetType: 'cover',
        caption: `${workflow.name} 专属封面`,
        order: 0
      });

      // 3. Set as workflow cover
      await onSelectCover(assetId);
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] bg-[#111216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/40 flex items-center justify-center text-cyan-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">设置工作流封面</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {workflow.name}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                支持从全局素材库挑选复用，或直接上传新素材（自动存入素材库形成闭环）。
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

        {/* Tabs */}
        <div className="flex items-center justify-between px-4 pt-3 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('library')}
              className={`pb-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'library'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>从素材库挑选已有素材 ({assets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>上传本地新图片</span>
            </button>
          </div>

          {workflow.coverAssetId && (
            <button
              onClick={async () => {
                await onSelectCover(null);
                onClose();
              }}
              className="mb-2 text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>清除当前封面 (恢复默认拓扑图)</span>
            </button>
          )}
        </div>

        {/* Tab 1: Library View */}
        {activeTab === 'library' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search toolbar */}
            <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/20 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索素材库中的图片名称..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              {onOpenAssetHub && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAssetHub();
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>前往完整素材库</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Assets Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center text-xs text-zinc-500 font-mono">
                  正在加载素材库...
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-zinc-500">
                  <ImageIcon className="w-8 h-8 text-zinc-700 mb-2" />
                  <span>未找到匹配图片，可切换至「上传本地新图片」标签页</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredAssets.map(asset => {
                    const isCurrentCover = workflow.coverAssetId === asset.id;
                    const usageCount = assetUsages.get(asset.id) || 0;

                    return (
                      <div
                        key={asset.id}
                        onClick={async () => {
                          await onSelectCover(asset.id);
                          onClose();
                        }}
                        className={`group relative rounded-xl overflow-hidden border bg-zinc-950 transition-all cursor-pointer flex flex-col ${
                          isCurrentCover
                            ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                            : 'border-zinc-800 hover:border-cyan-500/80 hover:shadow-lg hover:shadow-cyan-950/30'
                        }`}
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isCurrentCover && (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-cyan-500 text-zinc-950 text-[10px] font-bold flex items-center gap-1 shadow-md">
                              <Check className="w-3 h-3" />
                              <span>当前封面</span>
                            </div>
                          )}
                          <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur">
                            <span className="capitalize">{asset.type}</span>
                            {usageCount > 0 && <span>🔗 {usageCount} 处引用</span>}
                          </div>
                        </div>

                        <div className="p-2 bg-zinc-900/90">
                          <div className="text-xs text-zinc-200 font-medium truncate group-hover:text-cyan-300 transition-colors">
                            {asset.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Upload View */}
        {activeTab === 'upload' && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-zinc-700 hover:border-cyan-400 bg-zinc-950/60 hover:bg-cyan-950/10 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-900 group-hover:bg-cyan-950 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-zinc-200 group-hover:text-cyan-300">
                  点击选择或拖拽图片文件
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  支持 JPG, PNG, WEBP 高清图片，上传后将存入全局素材库
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-lg cursor-pointer"
                    title="重新选择"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    素材命名 (存入素材库)
                  </label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={e => setAssetName(e.target.value)}
                    placeholder="输入素材名称..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveUploadedCover}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isUploading ? '保存并入库中...' : '入库并设为封面'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
