/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Layers,
  BookOpen,
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  Check,
  Tag as TagIcon,
  Star,
  FolderOpen,
  Music,
  FileText,
  Volume2
} from 'lucide-react';
import {
  WorkflowRecord,
  TagCategory,
  Tag,
  AssetRecord,
  WorkflowAssetRecord,
  AssetType
} from '../../types/workflow';
import { StorageService } from '../../services/storage';
import { AssetPickerModal } from './AssetPickerModal';

export type SheetTab = 'info' | 'notes' | 'assets';

interface WorkflowSheetProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowRecord;
  onUpdateWorkflow: (updated: Partial<WorkflowRecord>) => void;
  categories: TagCategory[];
  allTags: Tag[];
  workflowTags: { tag: Tag; category: TagCategory; isAutoDetected: boolean }[];
  onToggleTag: (tag: Tag, isAuto?: boolean) => void;
  onCreateTag: (categoryId: string, tagName: string) => Promise<void>;
  noteText: string;
  onSaveNote: (note: string) => void;
  assets: { link: WorkflowAssetRecord; asset: AssetRecord }[];
  onAddAsset: (file: File, type: AssetType, caption?: string) => Promise<void>;
  onUnlinkAsset: (assetId: string) => Promise<void>;
  initialTab?: SheetTab;
}

export const WorkflowSheet: React.FC<WorkflowSheetProps> = ({
  isOpen,
  onClose,
  workflow,
  onUpdateWorkflow,
  categories,
  allTags,
  workflowTags,
  onToggleTag,
  onCreateTag,
  noteText,
  onSaveNote,
  assets,
  onAddAsset,
  onUnlinkAsset,
  initialTab = 'info'
}) => {
  const [activeTab, setActiveTab] = useState<SheetTab>(initialTab);

  // Sync tab if initialTab changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Editing Name & Description
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);

  useEffect(() => {
    setName(workflow.name);
    setDescription(workflow.description);
  }, [workflow.name, workflow.description]);

  // Cover asset resolution
  const [coverAsset, setCoverAsset] = useState<AssetRecord | null>(null);

  useEffect(() => {
    async function loadCover() {
      if (workflow.coverAssetId) {
        const found = assets.find(a => a.asset.id === workflow.coverAssetId)?.asset;
        if (found) {
          setCoverAsset(found);
          return;
        }
        const fromDb = await StorageService.getAssetById(workflow.coverAssetId);
        setCoverAsset(fromDb);
      } else {
        setCoverAsset(null);
      }
    }
    loadCover();
  }, [workflow.coverAssetId, assets]);

  // Markdown note local state
  const [noteContent, setNoteContent] = useState(noteText);
  const [isNotePreview, setIsNotePreview] = useState(false);
  const [noteSavedBadge, setNoteSavedBadge] = useState(false);

  useEffect(() => {
    setNoteContent(noteText);
  }, [noteText]);

  // Tag creation
  const [newTagInput, setNewTagInput] = useState<{ [catId: string]: string }>({});
  const [isAddingTag, setIsAddingTag] = useState<string | null>(null);

  // Asset upload & Picker Modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadAssetType, setUploadAssetType] = useState<AssetType>('showcase');
  const [uploadCaption, setUploadCaption] = useState('');
  const [previewingAsset, setPreviewingAsset] = useState<AssetRecord | null>(null);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'cover' | 'link'>('link');

  const activeTagIds = new Set(workflowTags.map(wt => wt.tag.id));
  const linkedAssetIds = new Set(assets.map(a => a.asset.id));

  const handleNoteChange = (val: string) => {
    setNoteContent(val);
    onSaveNote(val);
    setNoteSavedBadge(true);
    setTimeout(() => setNoteSavedBadge(false), 2000);
  };

  const handleSaveInfo = () => {
    onUpdateWorkflow({
      name,
      description,
      updatedAt: Date.now()
    });
  };

  const handleCreateNewTag = async (categoryId: string) => {
    const tagName = (newTagInput[categoryId] || '').trim();
    if (!tagName) return;
    await onCreateTag(categoryId, tagName);
    setNewTagInput(prev => ({ ...prev, [categoryId]: '' }));
    setIsAddingTag(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await onAddAsset(file, uploadAssetType, uploadCaption);
    setUploadCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const assetId = 'asset_cover_' + Date.now().toString(36);
      const assetRecord: AssetRecord = {
        id: assetId,
        name: file.name,
        type: 'cover',
        mimeType: file.type || 'image/png',
        dataUrl,
        size: file.size,
        createdAt: Date.now()
      };
      await StorageService.saveAsset(assetRecord);
      await StorageService.linkAssetToWorkflow({
        workflowId: workflow.id,
        assetId,
        assetType: 'cover',
        caption: '工作流封面',
        order: 0
      });
      await StorageService.setWorkflowCover(workflow.id, assetId);
      onUpdateWorkflow({ coverAssetId: assetId, updatedAt: Date.now() });
    };
    reader.readAsDataURL(file);
  };

  const handleSetCover = async (assetId: string) => {
    await StorageService.setWorkflowCover(workflow.id, assetId);
    onUpdateWorkflow({ coverAssetId: assetId, updatedAt: Date.now() });
    setIsPickerModalOpen(false);
  };

  const handleRemoveCover = async () => {
    await StorageService.setWorkflowCover(workflow.id, null);
    onUpdateWorkflow({ coverAssetId: undefined, updatedAt: Date.now() });
  };

  const handleLinkFromPool = async (assetId: string, type: AssetType) => {
    await StorageService.linkAssetToWorkflow({
      workflowId: workflow.id,
      assetId,
      assetType: type,
      caption: '',
      order: assets.length + 1
    });
    // refresh assets
    const updated = await StorageService.getWorkflowAssets(workflow.id);
    onUpdateWorkflow({ updatedAt: Date.now() });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent backdrop for focus */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Sheet Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-[450px] max-w-[92vw] bg-[#111215] border-l border-zinc-800 shadow-2xl flex flex-col text-zinc-200 select-none animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Sheet Top Bar: Title & Close */}
        <div className="h-14 px-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-[260px]">
              工作流档案与知识沉淀
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="关闭面板 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Tabs Navigation Bar inside the Sheet */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 text-xs font-medium px-4 shrink-0">
          {/* Tab 1: 属性与标签 */}
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>属性与标签</span>
          </button>

          {/* Tab 2: 心得备忘 */}
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'border-amber-400 text-amber-300 font-semibold bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>心得备忘</span>
          </button>

          {/* Tab 3: 素材关联 */}
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'assets'
                ? 'border-emerald-400 text-emerald-300 font-semibold bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>素材关联</span>
            {assets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-zinc-950 ml-0.5">
                {assets.length}
              </span>
            )}
          </button>
        </div>

        {/* Sheet Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab 1: Info & Tags */}
          {activeTab === 'info' && (
            <div className="p-5 space-y-5">
              {/* Dedicated Workflow Cover Section */}
              <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>独立工作流封面 (Cover)</span>
                  </div>
                  {coverAsset && (
                    <button
                      onClick={handleRemoveCover}
                      className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      移除封面
                    </button>
                  )}
                </div>

                {coverAsset ? (
                  <div className="relative h-44 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center group">
                    <img
                      src={coverAsset.dataUrl}
                      alt="Workflow Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setPickerMode('cover');
                          setIsPickerModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
                      >
                        从素材池更换
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center p-3 text-center">
                    <ImageIcon className="w-6 h-6 text-zinc-600 mb-1" />
                    <span className="text-xs text-zinc-400 font-medium">尚未设置封面</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      可在素材池中挑选一张代表图作为卡片展示封面
                    </span>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => {
                          setPickerMode('cover');
                          setIsPickerModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        从素材池选取
                      </button>
                      <button
                        onClick={() => coverFileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        上传新封面
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>

              {/* Title & Desc */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    工作流名称
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleSaveInfo}
                    className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    简短描述
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onBlur={handleSaveInfo}
                    rows={2}
                    className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Topology & Model Stats */}
              <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 space-y-2.5">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  拓扑与模型元数据
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-zinc-500 text-[10px]">模型架构</div>
                    <div className="font-semibold text-cyan-300 truncate">{workflow.modelInfo}</div>
                  </div>
                  <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-zinc-500 text-[10px]">节点与连线</div>
                    <div className="font-semibold text-zinc-200">
                      {workflow.nodeCount} 节点 / {workflow.linkCount} 连线
                    </div>
                  </div>
                </div>

                {workflow.extractedMeta?.checkpoints?.length > 0 && (
                  <div className="text-xs pt-1">
                    <div className="text-zinc-500 text-[10px] mb-1">检测到的 Checkpoint</div>
                    <div className="space-y-1">
                      {workflow.extractedMeta.checkpoints.map((ck, i) => (
                        <div
                          key={i}
                          className="text-[11px] font-mono text-purple-300 bg-purple-950/30 px-2 py-1 rounded border border-purple-800/40 truncate"
                          title={ck}
                        >
                          {ck}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Dimensional Tags */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>多维标签库</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">点击切换关联</span>
                </div>

                {categories.map(cat => {
                  const catTags = allTags.filter(t => t.categoryId === cat.id);

                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                        <button
                          onClick={() => setIsAddingTag(isAddingTag === cat.id ? null : cat.id)}
                          className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>添加</span>
                        </button>
                      </div>

                      {isAddingTag === cat.id && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="输入新标签名称..."
                            value={newTagInput[cat.id] || ''}
                            onChange={e => setNewTagInput({ ...newTagInput, [cat.id]: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleCreateNewTag(cat.id);
                            }}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleCreateNewTag(cat.id)}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs cursor-pointer font-medium"
                          >
                            确定
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {catTags.map(tag => {
                          const isLinked = activeTagIds.has(tag.id);
                          const wfTag = workflowTags.find(wt => wt.tag.id === tag.id);

                          return (
                            <button
                              key={tag.id}
                              onClick={() => onToggleTag(tag, wfTag?.isAutoDetected)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                isLinked
                                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm'
                                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: isLinked ? cat.color : '#52525b' }}
                              />
                              <span>{tag.name}</span>
                              {wfTag?.isAutoDetected && (
                                <span className="text-[9px] bg-cyan-950 text-cyan-400 px-1 rounded ml-0.5 font-mono">
                                  自动
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Notes */}
          {activeTab === 'notes' && (
            <div className="p-5 flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <span>心得与经验沉淀</span>
                  {noteSavedBadge && (
                    <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> 已自动保存
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setIsNotePreview(!isNotePreview)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>{isNotePreview ? '编辑模式' : '预览效果'}</span>
                </button>
              </div>

              <div className="text-[11px] text-zinc-500 italic leading-relaxed">
                记录工作流用途、效果特点、关键配比、避坑经验与保留原因（支持 Markdown）。
              </div>

              {isNotePreview ? (
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-xs text-zinc-300 prose prose-invert max-w-none space-y-2 leading-relaxed min-h-[360px]">
                  {noteContent ? (
                    <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(noteContent) }} />
                  ) : (
                    <div className="text-zinc-600 italic">还没有记录心得，随时切换到编辑模式填写！</div>
                  )}
                </div>
              ) : (
                <textarea
                  value={noteContent}
                  onChange={e => handleNoteChange(e.target.value)}
                  placeholder="在此记录关键采样参数、LoRA 强度配比、最佳画幅比例、负面词注意事项..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500/80 rounded-xl p-3 text-xs text-zinc-200 outline-none leading-relaxed font-mono resize-none shadow-inner min-h-[360px]"
                />
              )}
            </div>
          )}

          {/* Tab 3: Assets */}
          {activeTab === 'assets' && (
            <div className="p-5 space-y-5">
              {/* Asset Pool Integration Banner */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">复用已有素材</div>
                  <div className="text-[10px] text-zinc-500">跨工作流无损引用，不占重复存储</div>
                </div>
                <button
                  onClick={() => {
                    setPickerMode('link');
                    setIsPickerModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>素材池选取引用</span>
                </button>
              </div>

              {/* Upload New Asset Section */}
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>上传新素材并存入素材池</span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">素材用途</label>
                      <select
                        value={uploadAssetType}
                        onChange={e => setUploadAssetType(e.target.value as AssetType)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 py-1.5 text-xs outline-none cursor-pointer"
                      >
                        <option value="showcase">效果示例 (Showcase)</option>
                        <option value="input">输入图片 (Input)</option>
                        <option value="reference">参考图片 (Reference)</option>
                        <option value="output">生成结果 (Output)</option>
                        <option value="comparison">对比图片 (Comparison)</option>
                        <option value="video">GIF / 视频 (Video)</option>
                        <option value="audio">音频采样 (Audio)</option>
                        <option value="text">提示词 / 文本 (Text)</option>
                        <option value="attachment">其他附件 (Attachment)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">简要说明</label>
                      <input
                        type="text"
                        placeholder="如：0.8 权重渲染结果"
                        value={uploadCaption}
                        onChange={e => setUploadCaption(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,text/*,.txt,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>选择本地文件上传</span>
                  </button>
                </div>
              </div>

              {/* Linked Assets List */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  已关联素材 ({assets.length})
                </div>

                {assets.length === 0 ? (
                  <div className="text-xs text-zinc-600 italic py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                    暂无关联素材，可从全局素材池选取或上传新素材
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.map(({ link, asset }) => {
                      const isCover = workflow.coverAssetId === asset.id;

                      return (
                        <div
                          key={asset.id}
                          className={`group relative bg-zinc-900 border rounded-xl overflow-hidden transition-all shadow-md ${
                            isCover ? 'border-amber-400/80 ring-1 ring-amber-400/30' : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div
                            className="relative h-44 w-full bg-zinc-950 flex items-center justify-center cursor-pointer overflow-hidden"
                            onClick={() => setPreviewingAsset(asset)}
                          >
                            {asset.mimeType.startsWith('video/') || asset.type === 'video' ? (
                              <video src={asset.dataUrl} className="max-h-full max-w-full object-contain" controls />
                            ) : asset.mimeType.startsWith('audio/') || asset.type === 'audio' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-950/40 to-zinc-950">
                                <Music className="w-8 h-8 text-purple-400 mb-2" />
                                <span className="text-xs text-zinc-300 font-semibold mb-2">{asset.name}</span>
                                <audio src={asset.dataUrl} controls className="w-full max-w-xs h-8" />
                              </div>
                            ) : asset.mimeType.startsWith('text/') || asset.type === 'text' ? (
                              <div className="w-full h-full p-4 overflow-y-auto bg-zinc-950 font-mono text-[11px] text-zinc-300 leading-relaxed">
                                <div className="flex items-center gap-1.5 text-cyan-400 mb-1.5 font-bold">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{asset.name}</span>
                                </div>
                                <div className="line-clamp-4 italic text-zinc-400">
                                  {asset.dataUrl.length > 300 ? asset.dataUrl.substring(0, 300) + '...' : asset.dataUrl}
                                </div>
                              </div>
                            ) : (
                              <img
                                src={asset.dataUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}

                            {/* Top Badges */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/70 backdrop-blur-md text-white border border-white/10 uppercase font-mono">
                                {link.assetType}
                              </span>
                              {isCover && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-zinc-950 flex items-center gap-0.5 shadow-md">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>代表封面</span>
                                </span>
                              )}
                            </div>

                            {/* Hover Overlay Actions */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setPreviewingAsset(asset);
                                }}
                                className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition-colors cursor-pointer"
                                title="查看大图"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {!isCover && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleSetCover(asset.id);
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-500/80 hover:bg-amber-500 text-zinc-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-md"
                                  title="将此图设为当前工作流的代表封面"
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span>设为封面</span>
                                </button>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onUnlinkAsset(asset.id);
                                }}
                                className="p-2 bg-red-500/40 hover:bg-red-500/60 backdrop-blur-md text-red-200 rounded-full transition-colors cursor-pointer"
                                title="解除与此工作流的关联 (素材仍保存在素材池)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="p-2.5 flex items-center justify-between text-xs border-t border-zinc-800">
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-zinc-200 truncate">{asset.name}</div>
                              {link.caption && (
                                <div className="text-[11px] text-zinc-400 truncate">{link.caption}</div>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                              {Math.round(asset.size / 1024)} KB
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Picker Modal */}
      {isPickerModalOpen && (
        <AssetPickerModal
          workflowId={workflow.id}
          currentCoverAssetId={workflow.coverAssetId}
          linkedAssetIds={linkedAssetIds}
          onSelectAsCover={handleSetCover}
          onLinkAsset={handleLinkFromPool}
          onUploadNew={onAddAsset}
          onClose={() => setIsPickerModalOpen(false)}
          mode={pickerMode}
        />
      )}

      {/* Lightbox Modal */}
      {previewingAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewingAsset(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewingAsset(null)}
              className="absolute -top-10 right-0 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewingAsset.dataUrl}
              alt={previewingAsset.name}
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl border border-zinc-800"
            />
            <div className="mt-3 text-sm text-zinc-300 font-medium">
              {previewingAsset.name}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function simpleMarkdownToHtml(md: string): string {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-white mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-white mt-5 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-zinc-300">$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-zinc-800 text-cyan-300 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-zinc-300">$1</li>')
    .replace(/\n$/gim, '<br />')
    .replace(/\n\n/g, '<p class="my-2"></p>');
}
