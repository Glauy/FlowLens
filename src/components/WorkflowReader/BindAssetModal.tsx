/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Link2,
  Check,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Trash2,
  Layers,
  ArrowRight,
  ChevronDown,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  ComfyNode,
  ComfyWorkflowRaw,
  AssetRecord,
  WorkflowAssetRecord
} from '../../types/workflow';
import { StorageService } from '../../services/storage';
import { filterCandidateNodes, CandidateNode, isInputSlotBindable, isWidgetBindable, isNodeBindable } from '../../utils/nodeCandidateUtils';

export interface BindAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  raw: ComfyWorkflowRaw;
  initialNodeId?: string | null;
  initialParamName?: string | null;
  initialSlotIndex?: number | null;
  workflowAssetLinks: { link: WorkflowAssetRecord; asset: AssetRecord }[];
  onBindingComplete: () => Promise<void>;
}

export const BindAssetModal: React.FC<BindAssetModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  raw,
  initialNodeId,
  initialParamName,
  initialSlotIndex,
  workflowAssetLinks,
  onBindingComplete
}) => {
  // All assets available in the global AssetHub
  const [hubAssets, setHubAssets] = useState<AssetRecord[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  // Selected Target Node (defaults to the first genuine media-capable node)
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => {
    if (initialNodeId) return initialNodeId;
    const firstBindable = raw.nodes.find(isNodeBindable);
    return firstBindable ? String(firstBindable.id) : (raw.nodes[0] ? String(raw.nodes[0].id) : '');
  });

  // Selected Target Parameter / Slot
  const [targetType, setTargetType] = useState<'input_slot' | 'widget_param' | 'node_primary'>('node_primary');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(initialSlotIndex ?? null);
  const [selectedParamName, setSelectedParamName] = useState<string>(initialParamName || '');

  // Selected Asset from AssetHub
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Popover Dropdown States
  const [isNodePickerOpen, setIsNodePickerOpen] = useState(false);
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);
  const nodeDropdownRef = useRef<HTMLDivElement>(null);
  const slotDropdownRef = useRef<HTMLDivElement>(null);

  // Filters & Search
  const [nodeCategoryFilter, setNodeCategoryFilter] = useState<'all' | 'input' | 'output'>('input');
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load assets from AssetHub
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const load = async () => {
      setIsLoadingAssets(true);
      const list = await StorageService.getAllAssets();
      if (isMounted) {
        setHubAssets(list.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoadingAssets(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sync initial selections if props change
  useEffect(() => {
    if (initialNodeId) {
      setSelectedNodeId(initialNodeId);
    }
    if (initialParamName) {
      setSelectedParamName(initialParamName);
      setTargetType('widget_param');
    }
    if (initialSlotIndex !== undefined && initialSlotIndex !== null) {
      setSelectedSlotIndex(initialSlotIndex);
      setTargetType('input_slot');
    }
  }, [initialNodeId, initialParamName, initialSlotIndex]);

  // Pre-select asset if the selected node already has a bound asset
  useEffect(() => {
    if (!selectedNodeId) return;
    const currentBound = workflowAssetLinks.find(
      l => l.link.nodeId !== undefined && l.link.nodeId !== null && String(l.link.nodeId) === String(selectedNodeId)
    );
    if (currentBound) {
      setSelectedAssetId(currentBound.asset.id);
      if (currentBound.link.paramName) {
        setSelectedParamName(currentBound.link.paramName);
      }
      if (currentBound.link.slotIndex !== undefined) {
        setSelectedSlotIndex(currentBound.link.slotIndex);
      }
    } else {
      setSelectedAssetId(null);
    }
  }, [selectedNodeId, workflowAssetLinks]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (nodeDropdownRef.current && !nodeDropdownRef.current.contains(e.target as Node)) {
        setIsNodePickerOpen(false);
      }
      if (slotDropdownRef.current && !slotDropdownRef.current.contains(e.target as Node)) {
        setIsSlotPickerOpen(false);
      }
    };
    if (isNodePickerOpen || isSlotPickerOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isNodePickerOpen, isSlotPickerOpen]);

  // Map of currently bound assets per node
  const boundMap = useMemo(() => {
    const map = new Map<string, { assetId: string; assetName: string }>();
    workflowAssetLinks.forEach(({ link, asset }) => {
      if (link.nodeId !== undefined && link.nodeId !== null && String(link.nodeId).trim() !== '') {
        map.set(String(link.nodeId), { assetId: asset.id, assetName: asset.name });
      }
    });
    return map;
  }, [workflowAssetLinks]);

  // Candidate nodes categorized
  const { inputNodes, outputNodes, otherNodes, allCandidates } = useMemo(() => {
    return filterCandidateNodes(raw.nodes, boundMap);
  }, [raw.nodes, boundMap]);

  // Find the selected ComfyNode object
  const currentNode = useMemo(() => {
    return raw.nodes.find(n => String(n.id) === String(selectedNodeId));
  }, [raw.nodes, selectedNodeId]);

  // Filtered candidate nodes for dropdown
  const filteredNodes = useMemo(() => {
    let pool = allCandidates;
    if (nodeCategoryFilter === 'input') pool = inputNodes;
    else if (nodeCategoryFilter === 'output') pool = outputNodes;

    if (!nodeSearchQuery.trim()) return pool;
    const q = nodeSearchQuery.toLowerCase();
    return pool.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.id.includes(q) ||
        (n.paramPreview && n.paramPreview.toLowerCase().includes(q))
    );
  }, [allCandidates, inputNodes, outputNodes, nodeCategoryFilter, nodeSearchQuery]);

  // Filtered assets for full grid
  const filteredAssets = useMemo(() => {
    return hubAssets.filter(asset => {
      if (assetTypeFilter === 'image' && !asset.mimeType.startsWith('image/')) return false;
      if (assetTypeFilter === 'video' && !asset.mimeType.startsWith('video/')) return false;
      if (assetTypeFilter === 'audio' && !asset.mimeType.startsWith('audio/')) return false;

      if (!assetSearchQuery.trim()) return true;
      const q = assetSearchQuery.toLowerCase();
      return asset.name.toLowerCase().includes(q);
    });
  }, [hubAssets, assetTypeFilter, assetSearchQuery]);

  // Currently bound asset to the selected node (if any)
  const currentlyBoundToThisNode = useMemo(() => {
    return workflowAssetLinks.find(
      l => l.link.nodeId !== undefined && l.link.nodeId !== null && String(l.link.nodeId) === String(selectedNodeId)
    );
  }, [workflowAssetLinks, selectedNodeId]);

  // Eligible media input slots for the selected node
  const eligibleInputs = useMemo(() => {
    if (!currentNode?.inputs) return [];
    return currentNode.inputs
      .map((inp, idx) => ({ inp, idx }))
      .filter(({ inp }) => isInputSlotBindable(inp));
  }, [currentNode]);

  // Eligible media parameter widgets for the selected node
  const eligibleWidgets = useMemo(() => {
    if (!currentNode?.widgets_values) return [];
    return currentNode.widgets_values
      .map((w, idx) => ({ w, idx }))
      .filter(({ w, idx }) => isWidgetBindable(w, idx, currentNode));
  }, [currentNode]);

  if (!isOpen) return null;

  // Handle Bind action
  const handleConfirmBind = async () => {
    if (!selectedNodeId || !selectedAssetId) return;
    setIsSubmitting(true);
    try {
      const paramToStore =
        selectedParamName ||
        (targetType === 'input_slot' && selectedSlotIndex !== null ? `slot_${selectedSlotIndex}` : 'primary_input');
      await StorageService.bindAssetToNode(
        workflowId,
        selectedAssetId,
        selectedNodeId,
        paramToStore,
        selectedSlotIndex ?? undefined
      );

      // If the node has a filename parameter in widgets_values, update and persist
      if (currentNode && currentNode.widgets_values && currentNode.widgets_values.length > 0) {
        const pickedAsset = hubAssets.find(a => a.id === selectedAssetId);
        if (pickedAsset) {
          const firstWidget = currentNode.widgets_values[0];
          if (typeof firstWidget === 'string' && (firstWidget.includes('.') || firstWidget.length > 0)) {
            currentNode.widgets_values[0] = pickedAsset.name;
            const wf = await StorageService.getWorkflowById(workflowId);
            if (wf) {
              wf.rawJson = JSON.stringify(raw);
              await StorageService.saveWorkflow(wf);
            }
          }
        }
      }

      await onBindingComplete();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Unbind action
  const handleUnbindCurrentNode = async () => {
    if (!selectedNodeId) return;
    setIsSubmitting(true);
    try {
      await StorageService.unbindNodeAsset(workflowId, selectedNodeId);
      setSelectedAssetId(null);
      await onBindingComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle direct file upload into AssetHub and auto-bind
  const handleUploadAndBind = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsSubmitting(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const newAssetId = 'asset_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const newAsset: AssetRecord = {
          id: newAssetId,
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'input',
          mimeType: file.type || 'image/png',
          dataUrl,
          size: file.size,
          createdAt: Date.now()
        };

        // 1. Save to global AssetHub
        await StorageService.saveAsset(newAsset);
        setHubAssets(prev => [newAsset, ...prev]);

        // 2. Bind directly to selected node
        const paramToStore =
          selectedParamName ||
          (targetType === 'input_slot' && selectedSlotIndex !== null ? `slot_${selectedSlotIndex}` : 'primary_input');
        await StorageService.bindAssetToNode(
          workflowId,
          newAssetId,
          selectedNodeId,
          paramToStore,
          selectedSlotIndex ?? undefined
        );

        setSelectedAssetId(newAssetId);
        await onBindingComplete();
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedAsset = hubAssets.find(a => a.id === selectedAssetId);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[85vh] max-h-[760px] bg-[#111216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">节点素材绑定 (Bind Asset)</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  单一节点激活唯一素材
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                从素材库挑选素材挂载至目标节点，在画布中直接预览生效
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

        {/* Compact Target Node & Slot Context Bar */}
        <div className="px-5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {/* Target Node Selector Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 font-medium">目标节点:</span>
              <div className="relative" ref={nodeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsNodePickerOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700/80 text-white font-medium transition-colors cursor-pointer text-xs"
                >
                  {currentNode ? (
                    <>
                      <span className="text-cyan-400 font-mono font-bold">#{currentNode.id}</span>
                      <span className="truncate max-w-[150px]">{currentNode.title || currentNode.type}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">选择目标节点...</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                </button>

                {/* Node Picker Dropdown Popover */}
                {isNodePickerOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2.5 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px] mb-2">
                      <button
                        onClick={() => setNodeCategoryFilter('input')}
                        className={`flex-1 py-1 rounded font-medium ${
                          nodeCategoryFilter === 'input' ? 'bg-cyan-900/60 text-cyan-300' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        📥 输入节点 ({inputNodes.length})
                      </button>
                      <button
                        onClick={() => setNodeCategoryFilter('output')}
                        className={`flex-1 py-1 rounded font-medium ${
                          nodeCategoryFilter === 'output' ? 'bg-cyan-900/60 text-cyan-300' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        📤 输出 ({outputNodes.length})
                      </button>
                      <button
                        onClick={() => setNodeCategoryFilter('all')}
                        className={`flex-1 py-1 rounded font-medium ${
                          nodeCategoryFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        全部 ({allCandidates.length})
                      </button>
                    </div>

                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="搜索节点 ID 或名称..."
                        value={nodeSearchQuery}
                        onChange={e => setNodeSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredNodes.map(n => {
                        const isCur = String(n.id) === String(selectedNodeId);
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              setSelectedNodeId(n.id);
                              setSelectedParamName('');
                              setSelectedSlotIndex(null);
                              setTargetType('node_primary');
                              setIsNodePickerOpen(false);
                            }}
                            className={`p-2 rounded-lg flex items-center justify-between cursor-pointer border ${
                              isCur
                                ? 'bg-cyan-950/40 border-cyan-500/80 text-white'
                                : 'bg-zinc-950/50 border-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-cyan-400 font-bold shrink-0">#{n.id}</span>
                                <span className="truncate font-medium">{n.title}</span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono truncate block">{n.type}</span>
                            </div>
                            {n.currentBoundAssetName && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/50 text-emerald-300 shrink-0">
                                已绑
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Target Parameter / Slot Selector */}
            {currentNode && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-400 font-medium">绑定槽位:</span>
                <div className="relative" ref={slotDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSlotPickerOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs"
                  >
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    <span className="truncate max-w-[140px]">
                      {targetType === 'node_primary'
                        ? '默认主输入 / 核心展示'
                        : targetType === 'input_slot'
                        ? `输入端口: ${selectedParamName || 'slot_' + selectedSlotIndex}`
                        : `参数: ${selectedParamName}`}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
                  </button>

                  {/* Slot Popover */}
                  {isSlotPickerOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100 space-y-1">
                      <div
                        onClick={() => {
                          setTargetType('node_primary');
                          setSelectedParamName('');
                          setSelectedSlotIndex(null);
                          setIsSlotPickerOpen(false);
                        }}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                          targetType === 'node_primary' ? 'bg-cyan-950/60 text-cyan-300 font-bold' : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span>默认主输入 / 核心展示</span>
                        {targetType === 'node_primary' && <Check className="w-3.5 h-3.5" />}
                      </div>

                      {eligibleInputs.length > 0 && (
                        <div className="border-t border-zinc-800 pt-1">
                          <div className="text-[10px] text-zinc-500 uppercase px-2 py-0.5">媒体输入端口</div>
                          {eligibleInputs.map(({ inp, idx }) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setTargetType('input_slot');
                                setSelectedSlotIndex(idx);
                                setSelectedParamName(inp.name);
                                setIsSlotPickerOpen(false);
                              }}
                              className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-between ${
                                targetType === 'input_slot' && selectedSlotIndex === idx
                                  ? 'bg-cyan-950/60 text-cyan-300 font-bold'
                                  : 'hover:bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              <span>{inp.name} ({inp.type})</span>
                              {targetType === 'input_slot' && selectedSlotIndex === idx && <Check className="w-3 h-3" />}
                            </div>
                          ))}
                        </div>
                      )}

                      {eligibleWidgets.length > 0 && (
                        <div className="border-t border-zinc-800 pt-1">
                          <div className="text-[10px] text-zinc-500 uppercase px-2 py-0.5">素材参数 (Widgets)</div>
                          {eligibleWidgets.map(({ w, idx }) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setTargetType('widget_param');
                                setSelectedSlotIndex(idx);
                                setSelectedParamName(`widget_${idx}`);
                                setIsSlotPickerOpen(false);
                              }}
                              className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-between ${
                                targetType === 'widget_param' && selectedSlotIndex === idx
                                  ? 'bg-cyan-950/60 text-cyan-300 font-bold'
                                  : 'hover:bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              <span className="truncate max-w-[200px]">[{idx}]: {String(w)}</span>
                              {targetType === 'widget_param' && selectedSlotIndex === idx && <Check className="w-3 h-3" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Currently Bound Status & Quick Unbind */}
          {currentlyBoundToThisNode && (
            <div className="flex items-center gap-2 text-xs bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              <span className="text-zinc-500">当前已挂载:</span>
              <span className="text-emerald-400 font-medium truncate max-w-[150px]">
                {currentlyBoundToThisNode.asset.name}
              </span>
              <button
                type="button"
                onClick={handleUnbindCurrentNode}
                className="text-red-400 hover:text-red-300 text-xs font-semibold px-1 py-0.5 rounded hover:bg-red-950/30 transition-colors cursor-pointer flex items-center gap-0.5"
                title="解除绑定"
              >
                <Trash2 className="w-3 h-3" />
                <span>解绑</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area: 100% Full-Width Asset Hub Gallery */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/40">
          {/* Asset Hub Filter & Upload Toolbar */}
          <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 shrink-0">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5">
              {(['all', 'image', 'video', 'audio'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setAssetTypeFilter(tabKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    assetTypeFilter === tabKey
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {tabKey === 'all' && '全部素材'}
                  {tabKey === 'image' && '图片'}
                  {tabKey === 'video' && '视频'}
                  {tabKey === 'audio' && '音频'}
                </button>
              ))}
            </div>

            {/* Search Input & Direct Upload */}
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索素材库中的图片、视频..."
                  value={assetSearchQuery}
                  onChange={e => setAssetSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleUploadAndBind}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>上传新素材并绑定</span>
              </button>
            </div>
          </div>

          {/* Full Asset Grid Browser */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {isLoadingAssets ? (
              <div className="h-48 flex items-center justify-center text-xs text-zinc-500 font-mono">
                正在加载素材库资产...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <ImageIcon className="w-10 h-10 text-zinc-700 mb-2.5" />
                <span className="text-xs text-zinc-300 font-medium">素材库暂无匹配资产</span>
                <span className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  点击右上角「上传新素材并绑定」可直接从本地选取图片或视频，存入素材库并同步挂载至节点
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredAssets.map(asset => {
                  const isSelected = selectedAssetId === asset.id;
                  const isBoundToCurrentNode = currentlyBoundToThisNode?.asset.id === asset.id;
                  const boundLink = workflowAssetLinks.find(
                    l => l.asset.id === asset.id && l.link.nodeId !== undefined && l.link.nodeId !== null
                  );

                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-zinc-900/80 ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-950/40 bg-zinc-900'
                          : isBoundToCurrentNode
                          ? 'border-emerald-600/70 ring-1 ring-emerald-600/40'
                          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-video sm:aspect-square w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                        {asset.mimeType.startsWith('video/') ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-black">
                            <video src={asset.dataUrl} className="w-full h-full object-cover opacity-80" />
                            <VideoIcon className="w-6 h-6 text-white absolute drop-shadow-md" />
                          </div>
                        ) : asset.mimeType.startsWith('audio/') ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-purple-950/40 p-2">
                            <Music className="w-6 h-6 text-purple-400 mb-1" />
                            <span className="text-[9px] text-purple-300 font-mono">Audio Sample</span>
                          </div>
                        ) : (
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}

                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-zinc-950 flex items-center justify-center shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}

                        {/* Binding Status Badge */}
                        {isBoundToCurrentNode ? (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-zinc-950 flex items-center gap-0.5 shadow-md">
                            当前绑定
                          </span>
                        ) : boundLink ? (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-900/90 text-cyan-300 border border-cyan-800/60 shadow-md">
                            已绑 #{boundLink.link.nodeId}
                          </span>
                        ) : null}
                      </div>

                      {/* Asset Info Card Footer */}
                      <div className="p-2 flex-1 flex flex-col justify-between space-y-1">
                        <div className="text-[11px] font-medium text-zinc-200 truncate" title={asset.name}>
                          {asset.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                          <span>{Math.round(asset.size / 1024)} KB</span>
                          <span className="uppercase text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">
                            {asset.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-2 truncate max-w-xl">
            {currentNode && selectedAsset ? (
              <span className="flex items-center gap-1.5 text-zinc-300 truncate">
                <span>将素材</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[150px]">
                  「{selectedAsset.name}」
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>挂载至节点</span>
                <span className="text-cyan-300 font-mono font-bold shrink-0">
                  #{currentNode.id} ({currentNode.title})
                </span>
                <span className="text-zinc-500 shrink-0">
                  [{selectedParamName || '主输入'}]
                </span>
              </span>
            ) : (
              <span className="text-zinc-500">
                请在上方素材库挑选素材，点击「确认绑定至此节点」生效
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              取消
            </button>

            <button
              type="button"
              onClick={handleConfirmBind}
              disabled={!selectedNodeId || !selectedAssetId || isSubmitting}
              className="px-5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-semibold rounded-xl text-xs shadow-lg shadow-cyan-950/50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '正在绑定...' : '确认绑定至此节点'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
