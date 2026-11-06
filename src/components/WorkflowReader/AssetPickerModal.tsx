/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  Star,
  Image as ImageIcon,
  FolderOpen
} from 'lucide-react';
import { AssetRecord, AssetType } from '../../types/workflow';
import { StorageService } from '../../services/storage';

interface AssetPickerModalProps {
  workflowId: string;
  currentCoverAssetId?: string;
  linkedAssetIds: Set<string>;
  onSelectAsCover: (assetId: string) => Promise<void>;
  onLinkAsset: (assetId: string, assetType: AssetType) => Promise<void>;
  onUploadNew: (file: File, type: AssetType, caption?: string) => Promise<void>;
  onClose: () => void;
  mode?: 'cover' | 'link'; // whether opened specifically to select cover, or link assets
}

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  workflowId,
  currentCoverAssetId,
  linkedAssetIds,
  onSelectAsCover,
  onLinkAsset,
  onUploadNew,
  onClose,
  mode = 'link'
}) => {
  const [allAssets, setAllAssets] = useState<AssetRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadType, setUploadType] = useState<AssetType>('showcase');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async () => {
    setIsLoading(true);
    const list = await StorageService.getAllAssets();
    setAllAssets(list.sort((a, b) => b.createdAt - a.createdAt));
    setIsLoading(false);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await onUploadNew(file, uploadType, file.name);
    await loadAssets();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredAssets = allAssets.filter(a =>
    a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-[#111215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'cover' ? '选择工作流封面 (全局素材库)' : '全局素材库 (引用复用)'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                素材为全局独立存储，支持跨工作流无损复用，无需重复上传。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Quick Upload */}
        <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索素材库文件名称..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>上传并存入素材库</span>
            </button>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-zinc-500 font-mono">
              加载素材库中...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-zinc-500">
              <ImageIcon className="w-8 h-8 text-zinc-700 mb-2" />
              <span>未找到素材，可直接上传本地文件</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map(asset => {
                const isLinked = linkedAssetIds.has(asset.id);
                const isCover = currentCoverAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className={`group relative bg-zinc-900 border rounded-xl overflow-hidden transition-all flex flex-col ${
                      isCover
                        ? 'border-amber-400 ring-2 ring-amber-400/20'
                        : isLinked
                        ? 'border-cyan-500/60 bg-zinc-850'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Thumbnail Preview */}
                    <div className="relative h-28 w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {asset.mimeType.startsWith('video/') ? (
                        <video src={asset.dataUrl} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <img
                          src={asset.dataUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Cover Badge */}
                      {isCover && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-zinc-950 flex items-center gap-0.5 shadow-md">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>当前封面</span>
                        </span>
                      )}

                      {/* Linked Badge */}
                      {isLinked && !isCover && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-950/90 text-cyan-300 border border-cyan-800/60 shadow-md">
                          已关联
                        </span>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-2 flex-1 flex flex-col justify-between space-y-1.5">
                      <div className="text-[11px] font-medium text-zinc-200 truncate" title={asset.name}>
                        {asset.name}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{Math.round(asset.size / 1024)} KB</span>
                        <span className="uppercase">{asset.type}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1 flex items-center gap-1 border-t border-zinc-800/80">
                        {/* Set as Cover button */}
                        <button
                          onClick={() => onSelectAsCover(asset.id)}
                          className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                            isCover
                              ? 'bg-amber-400 text-zinc-950'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                          }`}
                          title="将此图设为当前工作流的代表封面"
                        >
                          <Star className={`w-2.5 h-2.5 ${isCover ? 'fill-current' : ''}`} />
                          <span>{isCover ? '封面' : '设为封面'}</span>
                        </button>

                        {/* Link / Unlink button */}
                        {!isLinked && (
                          <button
                            onClick={() => onLinkAsset(asset.id, asset.type || 'showcase')}
                            className="px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded text-[10px] font-medium transition-colors cursor-pointer"
                            title="关联引用到当前工作流"
                          >
                            + 关联入库
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
