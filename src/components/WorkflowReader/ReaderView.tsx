/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  WorkflowRecord,
  ComfyWorkflowRaw,
  ComfyNode,
  LayoutAlgorithm,
  LayoutDirection,
  TagCategory,
  Tag,
  AssetRecord,
  WorkflowAssetRecord,
  AssetType
} from '../../types/workflow';
import { StorageService } from '../../services/storage';
import { runLayout, extractOriginalLayout } from '../../services/layout';
import { ReaderHeader } from './ReaderHeader';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import { WorkflowSheet } from './WorkflowSheet';

interface ReaderViewProps {
  workflowId: string;
  onBack: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ workflowId, onBack }) => {
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [raw, setRaw] = useState<ComfyWorkflowRaw | null>(null);

  // Hidden Entrance Sheet State (Off by default for pristine full-canvas immersion)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Layout State
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>('smart');
  const [currentDirection, setCurrentDirection] = useState<LayoutDirection>('LR');
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [groupPositions, setGroupPositions] = useState<Record<string, [number, number, number, number]>>({});
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number }>({ x: 60, y: 60, zoom: 0.85 });

  // Undo / Redo History Stack
  const historyRef = useRef<Record<string, { x: number; y: number }>[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // Right Node Inspector Drawer
  const [inspectingNode, setInspectingNode] = useState<ComfyNode | null>(null);

  // Metadata & Associations
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [workflowTags, setWorkflowTags] = useState<{ tag: Tag; category: TagCategory; isAutoDetected: boolean }[]>([]);
  const [noteText, setNoteText] = useState<string>('');
  const [assets, setAssets] = useState<{ link: WorkflowAssetRecord; asset: AssetRecord }[]>([]);

  // Push positions to undo history
  const pushHistory = useCallback((positions: Record<string, { x: number; y: number }>) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(JSON.parse(JSON.stringify(positions)));
    if (nextHistory.length > 30) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Keyboard shortcut: 'I' key toggles the Sheet
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsSheetOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Load Workflow and associated data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const [wf, cats, tags, wfTags, note, wfAssets, savedLayout] = await Promise.all([
        StorageService.getWorkflowById(workflowId),
        StorageService.getAllCategories(),
        StorageService.getAllTags(),
        StorageService.getWorkflowTags(workflowId),
        StorageService.getWorkflowNote(workflowId),
        StorageService.getWorkflowAssets(workflowId),
        StorageService.getWorkflowLayout(workflowId)
      ]);

      if (!isMounted || !wf) return;

      setWorkflow(wf);
      setCategories(cats);
      setAllTags(tags);
      setWorkflowTags(wfTags);
      setNoteText(note);
      setAssets(wfAssets);

      let parsedRaw: ComfyWorkflowRaw;
      try {
        parsedRaw = JSON.parse(wf.rawJson);
      } catch {
        parsedRaw = { nodes: [], links: [] };
      }
      setRaw(parsedRaw);

      if (savedLayout && Object.keys(savedLayout.nodePositions || {}).length > 0) {
        setNodePositions(savedLayout.nodePositions);
        setGroupPositions(savedLayout.groupPositions || {});
        setCurrentLayout(savedLayout.layoutType);
        setCurrentDirection(savedLayout.direction || 'LR');
        setViewport(savedLayout.viewport || { x: 60, y: 60, zoom: 0.85 });

        historyRef.current = [JSON.parse(JSON.stringify(savedLayout.nodePositions))];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      } else {
        const res = runLayout('smart', parsedRaw, 'LR');
        setNodePositions(res.nodePositions);
        setGroupPositions(res.groupPositions);
        setCurrentLayout('smart');
        setCurrentDirection('LR');

        historyRef.current = [JSON.parse(JSON.stringify(res.nodePositions))];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);

        StorageService.saveWorkflowLayout({
          workflowId,
          layoutType: 'smart',
          direction: 'LR',
          nodePositions: res.nodePositions,
          groupPositions: res.groupPositions,
          viewport: { x: 60, y: 60, zoom: 0.85 },
          updatedAt: Date.now()
        });
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [workflowId]);

  // Persist layout changes
  const persistLayout = useCallback(
    (
      positions: Record<string, { x: number; y: number }>,
      groups: Record<string, [number, number, number, number]>,
      type: LayoutAlgorithm,
      dir: LayoutDirection,
      vp: { x: number; y: number; zoom: number }
    ) => {
      StorageService.saveWorkflowLayout({
        workflowId,
        layoutType: type,
        direction: dir,
        nodePositions: positions,
        groupPositions: groups,
        viewport: vp,
        updatedAt: Date.now()
      });
    },
    [workflowId]
  );

  const handleUpdatePositions = (
    newPositions: Record<string, { x: number; y: number }>,
    addToHistory: boolean = false
  ) => {
    setNodePositions(newPositions);
    if (addToHistory) {
      setCurrentLayout('custom');
      pushHistory(newPositions);
      persistLayout(newPositions, groupPositions, 'custom', currentDirection, viewport);
    }
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const targetPos = historyRef.current[historyIndexRef.current];
      setNodePositions(targetPos);
      setCurrentLayout('custom');
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      persistLayout(targetPos, groupPositions, 'custom', currentDirection, viewport);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const targetPos = historyRef.current[historyIndexRef.current];
      setNodePositions(targetPos);
      setCurrentLayout('custom');
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      persistLayout(targetPos, groupPositions, 'custom', currentDirection, viewport);
    }
  };

  const handleApplyLayout = (algorithm: LayoutAlgorithm, direction?: LayoutDirection) => {
    if (!raw) return;
    const dir = direction || currentDirection;
    const res = runLayout(algorithm, raw, dir);

    setNodePositions(res.nodePositions);
    setGroupPositions(res.groupPositions);
    setCurrentLayout(algorithm);
    if (direction) setCurrentDirection(direction);

    pushHistory(res.nodePositions);
    persistLayout(res.nodePositions, res.groupPositions, algorithm, dir, viewport);
  };

  const handleResetOriginal = () => {
    if (!raw) return;
    const res = extractOriginalLayout(raw);
    setNodePositions(res.nodePositions);
    setGroupPositions(res.groupPositions);
    setCurrentLayout('original');

    pushHistory(res.nodePositions);
    persistLayout(res.nodePositions, res.groupPositions, 'original', currentDirection, viewport);
  };

  const handleSelectNode = (nId: string | null) => {
    setSelectedNodeId(nId);
    if (nId) {
      setSelectedNodeIds(new Set([nId]));
      const node = raw?.nodes.find(n => String(n.id) === nId);
      if (node) setInspectingNode(node);
    } else {
      setSelectedNodeIds(new Set());
      setInspectingNode(null);
    }
  };

  const handleSelectMultipleNodes = (nodeIds: Set<string>) => {
    setSelectedNodeIds(nodeIds);
    if (nodeIds.size === 1) {
      const singleId = Array.from(nodeIds)[0];
      setSelectedNodeId(singleId);
      const node = raw?.nodes.find(n => String(n.id) === singleId);
      if (node) setInspectingNode(node);
    } else {
      setSelectedNodeId(null);
      setInspectingNode(null);
    }
  };

  const handleToggleFavorite = async () => {
    if (!workflow) return;
    const isFav = await StorageService.toggleFavorite(workflow.id);
    setWorkflow(prev => (prev ? { ...prev, isFavorite: isFav } : null));
  };

  const handleExportWorkflow = () => {
    if (!workflow) return;
    const blob = new Blob([workflow.rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')}_comfy.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleTag = async (tag: Tag, isAuto?: boolean) => {
    const existing = workflowTags.find(wt => wt.tag.id === tag.id);
    let nextTags: { tagId: string; isAutoDetected?: boolean }[];

    if (existing) {
      nextTags = workflowTags.filter(wt => wt.tag.id !== tag.id).map(wt => ({
        tagId: wt.tag.id,
        isAutoDetected: wt.isAutoDetected
      }));
    } else {
      nextTags = [
        ...workflowTags.map(wt => ({ tagId: wt.tag.id, isAutoDetected: wt.isAutoDetected })),
        { tagId: tag.id, isAutoDetected: !!isAuto }
      ];
    }

    await StorageService.setWorkflowTags(workflowId, nextTags);
    const updated = await StorageService.getWorkflowTags(workflowId);
    setWorkflowTags(updated);
  };

  const handleCreateTag = async (categoryId: string, tagName: string) => {
    const newTagId = 'tag_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newTag: Tag = {
      id: newTagId,
      categoryId,
      name: tagName
    };
    await StorageService.saveTag(newTag);
    const all = await StorageService.getAllTags();
    setAllTags(all);
    await handleToggleTag(newTag, false);
  };

  const handleSaveNote = async (note: string) => {
    setNoteText(note);
    await StorageService.saveWorkflowNote(workflowId, note);
  };

  const handleAddAsset = async (file: File, type: AssetType, caption?: string) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const assetId = 'asset_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const assetRecord: AssetRecord = {
        id: assetId,
        name: file.name,
        type,
        mimeType: file.type || 'image/png',
        dataUrl,
        size: file.size,
        createdAt: Date.now()
      };

      await StorageService.saveAsset(assetRecord);
      await StorageService.linkAssetToWorkflow({
        workflowId,
        assetId,
        assetType: type,
        caption: caption || '',
        order: assets.length + 1
      });

      const updated = await StorageService.getWorkflowAssets(workflowId);
      setAssets(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleUnlinkAsset = async (assetId: string) => {
    await StorageService.unlinkAssetFromWorkflow(workflowId, assetId);
    const updated = await StorageService.getWorkflowAssets(workflowId);
    setAssets(updated);
  };

  if (!workflow || !raw) {
    return (
      <div className="h-screen w-screen bg-[#0e0f12] flex items-center justify-center text-zinc-400 font-mono text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>正在加载 ComfyUI 画布...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0e0f12] overflow-hidden select-none">
      {/* Top Header */}
      <ReaderHeader
        workflowName={workflow.name}
        modelInfo={workflow.modelInfo}
        nodeCount={workflow.nodeCount}
        linkCount={workflow.linkCount}
        isFavorite={workflow.isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onBack={onBack}
        currentLayout={currentLayout}
        currentDirection={currentDirection}
        onApplyLayout={handleApplyLayout}
        onResetOriginal={handleResetOriginal}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportWorkflow={handleExportWorkflow}
        isSheetOpen={isSheetOpen}
        onToggleSheet={() => setIsSheetOpen(prev => !prev)}
        assetCount={assets.length}
      />

      {/* Main Workspace (100% Canvas, Zero floating tab pills blocking nodes!) */}
      <div className="flex-1 relative overflow-hidden w-full h-full">
        {/* Full Canvas */}
        <GraphCanvas
          raw={raw}
          nodePositions={nodePositions}
          groupPositions={groupPositions}
          viewport={viewport}
          onUpdatePositions={handleUpdatePositions}
          onUpdateViewport={vp => {
            setViewport(vp);
            persistLayout(nodePositions, groupPositions, currentLayout, currentDirection, vp);
          }}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onSelectNode={handleSelectNode}
          onSelectMultipleNodes={handleSelectMultipleNodes}
          onOpenNodeDetail={node => setInspectingNode(node)}
          undo={handleUndo}
          redo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          fitTrigger={fitTrigger}
          assets={assets.map(a => a.asset)}
          onBindNodeAsset={() => setIsSheetOpen(true)}
        />

        {/* Selected Node Inspector Drawer (Only opens when a specific node on canvas is clicked) */}
        <NodeDetailDrawer
          node={inspectingNode}
          raw={raw}
          onClose={() => setInspectingNode(null)}
          onSelectNodeById={handleSelectNode}
        />

        {/* Slide-over Workflow Sheet: Opened via the clean trigger, hosting the 3 tabs inside! */}
        <WorkflowSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          workflow={workflow}
          onUpdateWorkflow={updated => {
            const next = { ...workflow, ...updated };
            setWorkflow(next);
            StorageService.saveWorkflow(next);
          }}
          categories={categories}
          allTags={allTags}
          workflowTags={workflowTags}
          onToggleTag={handleToggleTag}
          onCreateTag={handleCreateTag}
          noteText={noteText}
          onSaveNote={handleSaveNote}
          assets={assets}
          onAddAsset={handleAddAsset}
          onUnlinkAsset={handleUnlinkAsset}
        />
      </div>
    </div>
  );
};
