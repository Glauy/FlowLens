/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Upload, Plus, Image as ImageIcon, Music, Video, FileText, Check, AlertCircle } from 'lucide-react';
import { AssetRecord, AssetType } from '../../types/workflow';
import { StorageService } from '../../services/storage';

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PendingFile {
  file: File;
  name: string;
  type: AssetType;
  previewUrl: string;
  size: number;
}

export const AssetUploadModal: React.FC<AssetUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultType, setDefaultType] = useState<AssetType>('reference');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPending: PendingFile[] = [];
    Array.from(files).forEach(file => {
      let inferredType: AssetType = defaultType;
      if (file.type.startsWith('audio/')) inferredType = 'audio';
      else if (file.type.startsWith('video/')) inferredType = 'video';
      else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.json')) inferredType = 'text';

      const previewUrl = URL.createObjectURL(file);
      newPending.push({
        file,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: inferredType,
        previewUrl,
        size: file.size
      });
    });

    setPendingFiles(prev => [...prev, ...newPending]);
  };

  const handleRemovePending = (index: number) => {
    setPendingFiles(prev => {
      const target = prev[index];
      if (target && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) return;
    setIsSubmitting(true);

    try {
      for (const item of pendingFiles) {
        // Read file into Data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });

        const assetId = 'asset_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const record: AssetRecord = {
          id: assetId,
          name: item.name.trim() || item.file.name,
          type: item.type,
          mimeType: item.file.type || 'application/octet-stream',
          dataUrl,
          size: item.size,
          createdAt: Date.now()
        };

        await StorageService.saveAsset(record);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to upload assets:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] bg-[#111216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/40 flex items-center justify-center text-cyan-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">批量存入全局素材库</h3>
              <p className="text-[11px] text-zinc-400">
                素材入库后，可在所有工作流中自由引用、设为封面或作为节点输入。
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

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.txt,.json"
            onChange={e => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-cyan-400 bg-zinc-950/60 hover:bg-cyan-950/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-zinc-900 group-hover:bg-cyan-950 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300">
              点击选择或拖放文件至此处 (支持多选)
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              支持 图片 (JPG/PNG/WEBP), 视频 (MP4/WEBM), 音频 (WAV/MP3), 提示词文本 (.txt)
            </div>
          </div>

          {/* Pending files list */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>待入库文件清单 ({pendingFiles.length})</span>
                <span className="text-[11px] text-zinc-500">可独立修改名称与分类</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {pendingFiles.map((item, index) => (
                  <div
                    key={index}
                    className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    {/* Thumbnail preview */}
                    <div className="w-12 h-12 rounded-lg bg-black border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.file.type.startsWith('image/') ? (
                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : item.file.type.startsWith('video/') ? (
                        <Video className="w-5 h-5 text-purple-400" />
                      ) : item.file.type.startsWith('audio/') ? (
                        <Music className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const val = e.target.value;
                          setPendingFiles(prev =>
                            prev.map((f, i) => (i === index ? { ...f, name: val } : f))
                          );
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={item.type}
                          onChange={e => {
                            const val = e.target.value as AssetType;
                            setPendingFiles(prev =>
                              prev.map((f, i) => (i === index ? { ...f, type: val } : f))
                            );
                          }}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-300 px-1.5 py-0.5 outline-none cursor-pointer"
                        >
                          <option value="reference">参考垫图 (Reference)</option>
                          <option value="cover">封面图 (Cover)</option>
                          <option value="showcase">演示效果图 (Showcase)</option>
                          <option value="input">输入线稿/底图 (Input)</option>
                          <option value="output">生成成果 (Output)</option>
                          <option value="comparison">对比样张 (Comparison)</option>
                          <option value="audio">音频伴奏 (Audio)</option>
                          <option value="video">视频片段 (Video)</option>
                          <option value="text">提示词/配置 (Text)</option>
                        </select>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {(item.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemovePending(index)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            {pendingFiles.length > 0 ? `已准备 ${pendingFiles.length} 项素材` : '请先选择文件'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleUploadAll}
              disabled={pendingFiles.length === 0 || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '正在存入素材库...' : `保存入库 (${pendingFiles.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
