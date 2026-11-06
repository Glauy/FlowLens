/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComfyWorkflowRaw,
  ComfyNode,
  getNodeDimensions
} from '../../types/workflow';
import { NodeView } from './NodeView';
import { AlignmentToolbar } from './AlignmentToolbar';
import { getSlotColor } from '../../utils/theme';
import {
  CanvasSettings,
  DEFAULT_CANVAS_SETTINGS
} from '../../types/canvasSettings';
import {
  getSlotCoordinates,
  createWirePath
} from '../../utils/graphGeometry';
import { CanvasSettingsPopover } from './CanvasSettingsPopover';
import { SlidersHorizontal, EyeOff, X, Download } from 'lucide-react';
import { AssetRecord, WorkflowAssetRecord } from '../../types/workflow';

interface GraphCanvasProps {
  raw: ComfyWorkflowRaw;
  nodePositions: Record<string, { x: number; y: number }>;
  groupPositions: Record<string, [number, number, number, number]>;
  viewport: { x: number; y: number; zoom: number };
  onUpdatePositions: (positions: Record<string, { x: number; y: number }>, addToHistory?: boolean) => void;
  onUpdateViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  selectedNodeId: string | null;
  selectedNodeIds: Set<string>;
  onSelectNode: (nodeId: string | null, isMulti?: boolean) => void;
  onSelectMultipleNodes: (nodeIds: Set<string>) => void;
  onOpenNodeDetail: (node: ComfyNode) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  fitTrigger?: number;
  assets?: AssetRecord[];
  workflowAssetLinks?: { link: WorkflowAssetRecord; asset: AssetRecord }[];
  onBindNodeAsset?: (node: ComfyNode) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  raw,
  nodePositions,
  groupPositions,
  viewport,
  onUpdatePositions,
  onUpdateViewport,
  selectedNodeId,
  selectedNodeIds,
  onSelectNode,
  onSelectMultipleNodes,
  onOpenNodeDetail,
  undo,
  redo,
  fitTrigger,
  assets = [],
  workflowAssetLinks = [],
  onBindNodeAsset
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Lightbox Media Preview State
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);

  // Dragging Canvas Pan
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; vpX: number; vpY: number }>({ x: 0, y: 0, vpX: 0, vpY: 0 });

  // Dragging Nodes
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPositions: Record<string, { x: number; y: number }>;
    activeNodeId: string;
  } | null>(null);

  // Marquee Selection Box
  const [isMarquee, setIsMarquee] = useState(false);
  const marqueeStartRef = useRef<{ screenX: number; screenY: number; worldX: number; worldY: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Map nodes by id for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, ComfyNode>();
    raw.nodes.forEach(n => map.set(String(n.id), n));
    return map;
  }, [raw.nodes]);

  // Canvas Display Preferences (Settings Popover)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(() => {
    try {
      const saved = localStorage.getItem('flowlens_canvas_settings');
      if (saved) return { ...DEFAULT_CANVAS_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CANVAS_SETTINGS;
  });

  const handleUpdateSettings = (updated: Partial<CanvasSettings>) => {
    setCanvasSettings(prev => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('flowlens_canvas_settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetSettings = () => {
    setCanvasSettings(DEFAULT_CANVAS_SETTINGS);
    try {
      localStorage.setItem('flowlens_canvas_settings', JSON.stringify(DEFAULT_CANVAS_SETTINGS));
    } catch {}
  };

  // Compute Upstream & Downstream sets for path highlighting
  const { upstreamNodeIds, downstreamNodeIds, activeLinkIds, relevantNodeIds } = useMemo(() => {
    const upNodes = new Set<string>();
    const downNodes = new Set<string>();
    const activeLinks = new Set<number>();
    const relevantNodes = new Set<string>();

    if (!selectedNodeId) {
      return {
        upstreamNodeIds: upNodes,
        downstreamNodeIds: downNodes,
        activeLinkIds: activeLinks,
        relevantNodeIds: relevantNodes
      };
    }

    relevantNodes.add(selectedNodeId);

    // Direct & indirect upstream: find links where target is selectedNodeId or an upstream node
    const traverseUp = (currId: string) => {
      raw.links.forEach(([lId, originId, , targetId]) => {
        if (String(targetId) === currId) {
          activeLinks.add(lId);
          const oId = String(originId);
          if (!upNodes.has(oId)) {
            upNodes.add(oId);
            relevantNodes.add(oId);
            traverseUp(oId);
          }
        }
      });
    };

    // Direct & indirect downstream: find links where origin is selectedNodeId or a downstream node
    const traverseDown = (currId: string) => {
      raw.links.forEach(([lId, originId, , targetId]) => {
        if (String(originId) === currId) {
          activeLinks.add(lId);
          const tId = String(targetId);
          if (!downNodes.has(tId)) {
            downNodes.add(tId);
            relevantNodes.add(tId);
            traverseDown(tId);
          }
        }
      });
    };

    traverseUp(selectedNodeId);
    traverseDown(selectedNodeId);

    return {
      upstreamNodeIds: upNodes,
      downstreamNodeIds: downNodes,
      activeLinkIds: activeLinks,
      relevantNodeIds: relevantNodes
    };
  }, [selectedNodeId, raw.links]);

  // Screen to World coords
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - viewport.x) / viewport.zoom;
      const y = (screenY - rect.top - viewport.y) / viewport.zoom;
      return { x, y };
    },
    [viewport]
  );

  // Fit to Viewport
  const handleFitToView = useCallback(() => {
    if (!containerRef.current || raw.nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    raw.nodes.forEach(node => {
      const id = String(node.id);
      const pos = nodePositions[id] || { x: 0, y: 0 };
      const [w, h] = getNodeDimensions(node);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    });

    (raw.groups || []).forEach((grp, idx) => {
      const gId = String(grp.id || `group_${idx}`);
      const bounds = groupPositions[gId] || grp.bounding;
      if (bounds) {
        const [gx, gy, gw, gh] = bounds;
        minX = Math.min(minX, gx);
        minY = Math.min(minY, gy);
        maxX = Math.max(maxX, gx + gw);
        maxY = Math.max(maxY, gy + gh);
      }
    });

    if (minX === Infinity) return;

    // Generous balanced margins (160px horizontal, 140px vertical)
    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 140;

    const zoomX = rect.width / graphWidth;
    const zoomY = rect.height / graphHeight;
    const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 1.25);

    const x = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
    const y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;

    onUpdateViewport({ x, y, zoom });
  }, [raw.nodes, raw.groups, nodePositions, groupPositions, onUpdateViewport]);

  useEffect(() => {
    if (fitTrigger && fitTrigger > 0) {
      handleFitToView();
    }
  }, [fitTrigger, handleFitToView]);

  // Wheel Zoom anchored at cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.15), 3.0);

    const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
    const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

    onUpdateViewport({ x: newX, y: newY, zoom: newZoom });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
        return;
      }

      // Fit to View ('F')
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        handleFitToView();
        return;
      }

      // Deselect ('Escape')
      if (e.key === 'Escape') {
        onSelectNode(null);
        return;
      }

      // Arrow keys nudge selected nodes
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedNodeIds.size > 0) {
        e.preventDefault();
        const delta = e.shiftKey ? 50 : 10;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -delta;
        if (e.key === 'ArrowRight') dx = delta;
        if (e.key === 'ArrowUp') dy = -delta;
        if (e.key === 'ArrowDown') dy = delta;

        const newPositions = { ...nodePositions };
        selectedNodeIds.forEach(id => {
          if (newPositions[id]) {
            newPositions[id] = {
              x: newPositions[id].x + dx,
              y: newPositions[id].y + dy
            };
          }
        });
        onUpdatePositions(newPositions, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, nodePositions, onUpdatePositions, undo, redo, onSelectNode, handleFitToView]);

  // Track click vs drag on canvas
  const canvasClickTracker = useRef<{ x: number; y: number; moved: boolean }>({ x: 0, y: 0, moved: false });

  // Start Canvas Pan or Marquee
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If Shift + Left Click -> Marquee selection
    if (e.button === 0 && e.shiftKey) {
      onSelectNode(null);
      setIsMarquee(true);
      const world = screenToWorld(e.clientX, e.clientY);
      marqueeStartRef.current = {
        screenX: e.clientX,
        screenY: e.clientY,
        worldX: world.x,
        worldY: world.y
      };
      setMarqueeRect({ x: world.x, y: world.y, w: 0, h: 0 });
      return;
    }

    // Left click or Middle click or Alt+Drag on canvas background -> Pan (抓手平移画布)
    if (e.button === 0 || e.button === 1 || e.altKey) {
      setIsPanning(true);
      canvasClickTracker.current = {
        x: e.clientX,
        y: e.clientY,
        moved: false
      };
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        vpX: viewport.x,
        vpY: viewport.y
      };
      return;
    }
  };

  // Node Mouse Down for dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // Only left click drags node
    e.stopPropagation();

    let targetIds = selectedNodeIds;
    if (!selectedNodeIds.has(nodeId)) {
      if (e.shiftKey) {
        targetIds = new Set(selectedNodeIds);
        targetIds.add(nodeId);
      } else {
        targetIds = new Set([nodeId]);
      }
      onSelectMultipleNodes(targetIds);
    }

    setIsDraggingNode(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPositions: { ...nodePositions },
      activeNodeId: nodeId
    };
  };

  // Window Mouse Move & Mouse Up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        if (Math.hypot(dx, dy) > 4) {
          canvasClickTracker.current.moved = true;
        }
        onUpdateViewport({
          ...viewport,
          x: panStartRef.current.vpX + dx,
          y: panStartRef.current.vpY + dy
        });
        return;
      }

      if (isDraggingNode && dragStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.startX) / viewport.zoom;
        const dy = (e.clientY - dragStartRef.current.startY) / viewport.zoom;

        const newPos = { ...nodePositions };
        selectedNodeIds.forEach(id => {
          const init = dragStartRef.current!.initialPositions[id];
          if (init) {
            newPos[id] = {
              x: Math.round(init.x + dx),
              y: Math.round(init.y + dy)
            };
          }
        });

        onUpdatePositions(newPos, false);
        return;
      }

      if (isMarquee && marqueeStartRef.current) {
        const currWorld = screenToWorld(e.clientX, e.clientY);
        const start = marqueeStartRef.current;

        const x = Math.min(start.worldX, currWorld.x);
        const y = Math.min(start.worldY, currWorld.y);
        const w = Math.abs(currWorld.x - start.worldX);
        const h = Math.abs(currWorld.y - start.worldY);

        setMarqueeRect({ x, y, w, h });

        // Check node intersections
        const enclosedIds = new Set<string>();
        raw.nodes.forEach(node => {
          const id = String(node.id);
          const pos = nodePositions[id] || { x: 0, y: 0 };
          const [nw, nh] = getNodeDimensions(node);

          // Overlap check
          const overlaps =
            pos.x < x + w &&
            pos.x + nw > x &&
            pos.y < y + h &&
            pos.y + nh > y;

          if (overlaps) {
            enclosedIds.add(id);
          }
        });

        onSelectMultipleNodes(enclosedIds);
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        if (!canvasClickTracker.current.moved) {
          onSelectNode(null);
        }
      }
      if (isDraggingNode) {
        setIsDraggingNode(false);
        // Push commit to history
        onUpdatePositions(nodePositions, true);
        dragStartRef.current = null;
      }
      if (isMarquee) {
        setIsMarquee(false);
        marqueeStartRef.current = null;
        setMarqueeRect(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isPanning,
    isDraggingNode,
    isMarquee,
    viewport,
    nodePositions,
    selectedNodeIds,
    raw.nodes,
    screenToWorld,
    onUpdateViewport,
    onUpdatePositions,
    onSelectMultipleNodes
  ]);

  // Multi-node Alignment Actions
  const handleAlign = (type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY') => {
    if (selectedNodeIds.size < 2) return;
    const newPos = { ...nodePositions };
    const nodes = Array.from(selectedNodeIds).map(id => ({
      id,
      node: nodeMap.get(id)!,
      pos: nodePositions[id] || { x: 0, y: 0 }
    }));

    if (type === 'left') {
      const minX = Math.min(...nodes.map(n => n.pos.x));
      nodes.forEach(n => (newPos[n.id] = { ...newPos[n.id], x: minX }));
    } else if (type === 'right') {
      const maxRight = Math.max(...nodes.map(n => n.pos.x + getNodeDimensions(n.node)[0]));
      nodes.forEach(n => {
        const [w] = getNodeDimensions(n.node);
        newPos[n.id] = { ...newPos[n.id], x: maxRight - w };
      });
    } else if (type === 'top') {
      const minY = Math.min(...nodes.map(n => n.pos.y));
      nodes.forEach(n => (newPos[n.id] = { ...newPos[n.id], y: minY }));
    } else if (type === 'bottom') {
      const maxBottom = Math.max(...nodes.map(n => n.pos.y + getNodeDimensions(n.node)[1]));
      nodes.forEach(n => {
        const [, h] = getNodeDimensions(n.node);
        newPos[n.id] = { ...newPos[n.id], y: maxBottom - h };
      });
    } else if (type === 'centerX') {
      const avgCenter =
        nodes.reduce((acc, n) => acc + (n.pos.x + getNodeDimensions(n.node)[0] / 2), 0) / nodes.length;
      nodes.forEach(n => {
        const [w] = getNodeDimensions(n.node);
        newPos[n.id] = { ...newPos[n.id], x: Math.round(avgCenter - w / 2) };
      });
    } else if (type === 'centerY') {
      const avgCenter =
        nodes.reduce((acc, n) => acc + (n.pos.y + getNodeDimensions(n.node)[1] / 2), 0) / nodes.length;
      nodes.forEach(n => {
        const [, h] = getNodeDimensions(n.node);
        newPos[n.id] = { ...newPos[n.id], y: Math.round(avgCenter - h / 2) };
      });
    }

    onUpdatePositions(newPos, true);
  };

  // Multi-node Equidistant Distribution
  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    if (selectedNodeIds.size < 3) return;
    const newPos = { ...nodePositions };
    const nodes = Array.from(selectedNodeIds).map(id => ({
      id,
      node: nodeMap.get(id)!,
      pos: nodePositions[id] || { x: 0, y: 0 }
    }));

    if (axis === 'horizontal') {
      nodes.sort((a, b) => a.pos.x - b.pos.x);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const totalSpan = last.pos.x - first.pos.x;
      const step = totalSpan / (nodes.length - 1);

      nodes.forEach((n, idx) => {
        newPos[n.id] = { ...newPos[n.id], x: Math.round(first.pos.x + step * idx) };
      });
    } else {
      nodes.sort((a, b) => a.pos.y - b.pos.y);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const totalSpan = last.pos.y - first.pos.y;
      const step = totalSpan / (nodes.length - 1);

      nodes.forEach((n, idx) => {
        newPos[n.id] = { ...newPos[n.id], y: Math.round(first.pos.y + step * idx) };
      });
    }

    onUpdatePositions(newPos, true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#121316] overflow-hidden select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Background Dots Grid */}
      {canvasSettings.showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1.2px, transparent 1.2px)',
            backgroundSize: `${30 * viewport.zoom}px ${30 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`
          }}
        />
      )}

      {/* Alignment Toolbar */}
      <AlignmentToolbar
        selectedCount={selectedNodeIds.size}
        onAlignLeft={() => handleAlign('left')}
        onAlignRight={() => handleAlign('right')}
        onAlignTop={() => handleAlign('top')}
        onAlignBottom={() => handleAlign('bottom')}
        onAlignCenterX={() => handleAlign('centerX')}
        onAlignCenterY={() => handleAlign('centerY')}
        onDistributeHorizontal={() => handleDistribute('horizontal')}
        onDistributeVertical={() => handleDistribute('vertical')}
      />

      {/* Transform Container */}
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
        }}
      >
        {/* SVG Layer: Groups and Connection Links */}
        <svg
          className="absolute overflow-visible pointer-events-none"
          style={{ width: 1, height: 1 }}
        >
          {/* Neon Bloom and High-Tech Energy Glow Filters */}
          <defs>
            <filter id="fl-wire-bloom" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fl-photon-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="laserGlow" />
              <feMerge>
                <feMergeNode in="laserGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Groups */}
          {(raw.groups || []).map((grp, idx) => {
            const gId = String(grp.id || `group_${idx}`);
            const bounds = groupPositions[gId] || grp.bounding || [0, 0, 400, 300];
            const [gx, gy, gw, gh] = bounds;
            const color = grp.color || '#3f3f46';

            return (
              <g key={gId}>
                <rect
                  x={gx}
                  y={gy}
                  width={gw}
                  height={gh}
                  rx={16}
                  fill={color}
                  fillOpacity={0.12}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <text
                  x={gx + 18}
                  y={gy + 26}
                  fill={color}
                  fontSize={grp.font_size || 16}
                  fontWeight="bold"
                  className="select-none tracking-wide"
                >
                  {grp.title}
                </text>
              </g>
            );
          })}

          {/* Links / Wires (Hidden entirely if hideAllEdges is active) */}
          {!canvasSettings.hideAllEdges &&
            raw.links.map(link => {
              const [lId, originId, originSlot, targetId, targetSlot, type] = link;
              const originNode = nodeMap.get(String(originId));
              const targetNode = nodeMap.get(String(targetId));

              if (!originNode || !targetNode) return null;

              const isLinkActive = activeLinkIds.has(lId);

              // If in focus mode and focusOnlyActiveEdges is true: only show links on active branch
              if (
                selectedNodeId &&
                canvasSettings.focusMode &&
                canvasSettings.focusOnlyActiveEdges &&
                !isLinkActive
              ) {
                return null;
              }

              const originPos = nodePositions[String(originId)] || { x: 0, y: 0 };
              const targetPos = nodePositions[String(targetId)] || { x: 0, y: 0 };

              // Calculate pixel-perfect port anchors matching NodeView DOM
              const src = getSlotCoordinates(originNode, originSlot, false, originPos);
              const tgt = getSlotCoordinates(targetNode, targetSlot, true, targetPos);

              const pathD = createWirePath(
                src.x,
                src.y,
                tgt.x,
                tgt.y,
                canvasSettings.wireStyle
              );

              const slotColor = getSlotColor(type);

              // Determine whether this wire streams flow animation
              const isStreamAnimated =
                canvasSettings.flowAnimation === 'always' ||
                (canvasSettings.flowAnimation === 'active_only' && isLinkActive);

              const speedClass =
                canvasSettings.flowSpeed === 'fast'
                  ? 'animate-wire-stream-fast'
                  : canvasSettings.flowSpeed === 'slow'
                  ? 'animate-wire-stream-slow'
                  : 'animate-wire-stream-normal';

              const isDimmedLink =
                selectedNodeId &&
                canvasSettings.focusMode &&
                !canvasSettings.focusOnlyActiveEdges &&
                !isLinkActive;

              return (
                <g key={lId} opacity={isDimmedLink ? 0.14 : 1}>
                  {/* Layer 0: Dark cable backing - provides depth and separates cables from background grid */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#090a0f"
                    strokeWidth={isLinkActive ? 5.5 : 3.8}
                    strokeOpacity={0.85}
                    strokeLinecap="round"
                  />

                  {/* Layer 1: Ambient Neon Bloom Underlay when link is active or traced */}
                  {isLinkActive && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={slotColor}
                      strokeWidth={8}
                      strokeOpacity={0.42}
                      strokeLinecap="round"
                      filter="url(#fl-wire-bloom)"
                    />
                  )}

                  {/* Layer 2: Main Solid Data Cable (preserves authentic ComfyUI slot color) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={slotColor}
                    strokeWidth={isLinkActive ? 2.8 : 1.8}
                    strokeOpacity={isLinkActive ? 0.98 : 0.72}
                    strokeLinecap="round"
                  />

                  {/* Layer 3: High-End Fiber-Optic Energy Stream & Photon Pulse */}
                  {isStreamAnimated && !isDimmedLink && (
                    <>
                      {/* 3a: Trailing Comet-Tail Energy Beam */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isLinkActive ? '#a5f3fc' : slotColor}
                        strokeWidth={isLinkActive ? 2.8 : 2}
                        strokeDasharray={isLinkActive ? '44 216' : '36 224'}
                        strokeLinecap="round"
                        className={speedClass}
                        strokeOpacity={isLinkActive ? 0.95 : 0.78}
                        filter="url(#fl-wire-bloom)"
                      />

                      {/* 3b: White-Hot High-Frequency Photon Core (Smooth Flow) */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={isLinkActive ? 2.2 : 1.5}
                        strokeDasharray="10 250"
                        strokeLinecap="round"
                        className={speedClass}
                        strokeOpacity={0.92}
                        filter="url(#fl-photon-glow)"
                      />
                    </>
                  )}
                </g>
              );
            })}
        </svg>

        {/* Nodes Layer */}
        {raw.nodes.map(node => {
          const idStr = String(node.id);
          const pos = nodePositions[idStr] || { x: 0, y: 0 };
          const isSelected = selectedNodeIds.has(idStr);
          const isUpstream = upstreamNodeIds.has(idStr);
          const isDownstream = downstreamNodeIds.has(idStr);

          // Focus dimming: Dim nodes not part of upstream/downstream/selected when a node is picked
          const isDimmed = Boolean(
            selectedNodeId &&
              canvasSettings.focusMode &&
              !relevantNodeIds.has(idStr)
          );

          return (
            <NodeView
              key={idStr}
              node={node}
              position={pos}
              isSelected={isSelected}
              isUpstream={isUpstream}
              isDownstream={isDownstream}
              isDimmed={isDimmed}
              assets={assets}
              workflowAssetLinks={workflowAssetLinks}
              onSelect={(nId, isShift) => {
                if (isShift) {
                  const next = new Set(selectedNodeIds);
                  if (next.has(nId)) next.delete(nId);
                  else next.add(nId);
                  onSelectMultipleNodes(next);
                } else {
                  onSelectNode(nId);
                }
              }}
              onMouseDown={handleNodeMouseDown}
              onDoubleClick={() => onOpenNodeDetail(node)}
              onBindAsset={onBindNodeAsset}
              onPreviewAsset={asset => setPreviewAsset(asset)}
            />
          );
        })}

        {/* Marquee Box */}
        {marqueeRect && (
          <div
            className="absolute border border-cyan-400 bg-cyan-500/15 rounded pointer-events-none"
            style={{
              left: marqueeRect.x,
              top: marqueeRect.y,
              width: marqueeRect.w,
              height: marqueeRect.h
            }}
          />
        )}
      </div>

      {/* Floating Canvas Quick Controls (Zoom, Fit, and Settings) */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-zinc-400 backdrop-blur-md shadow-2xl">
        <span className="text-zinc-200 font-bold px-1">{Math.round(viewport.zoom * 100)}%</span>
        <div className="w-[1px] h-3 bg-zinc-700/80 mx-0.5" />
        <button
          onClick={() => onUpdateViewport({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, 3.0) })}
          className="hover:text-white px-1.5 py-0.5 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
          title="放大 (Zoom In)"
        >
          +
        </button>
        <button
          onClick={() => onUpdateViewport({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, 0.15) })}
          className="hover:text-white px-1.5 py-0.5 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
          title="缩小 (Zoom Out)"
        >
          -
        </button>
        <button
          onClick={handleFitToView}
          className="hover:text-cyan-400 px-2 py-0.5 hover:bg-zinc-800 rounded transition-colors cursor-pointer text-cyan-300 font-sans"
          title="适应画布 (Fit to Canvas, Key: F)"
        >
          适应画布 (F)
        </button>

        <div className="w-[1px] h-3 bg-zinc-700/80 mx-0.5" />

        {/* Canvas Display Settings Popover Trigger */}
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all cursor-pointer font-sans text-xs ${
            isSettingsOpen
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : canvasSettings.hideAllEdges
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'hover:text-white hover:bg-zinc-800 text-zinc-300'
          }`}
          title="画布偏好与连线显示设置"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>设置</span>
          {canvasSettings.hideAllEdges && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="已开启隐藏所有连线" />
          )}
          {!canvasSettings.hideAllEdges && canvasSettings.flowAnimation !== 'off' && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="流光动效已开启" />
          )}
        </button>
      </div>

      {/* Floating Canvas Settings Popover Panel */}
      <CanvasSettingsPopover
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={canvasSettings}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaults={handleResetSettings}
      />

      {/* Lightbox Media Modal for Node Preview */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-zinc-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <span className="text-xs font-bold text-zinc-200 truncate max-w-[400px]">
                {previewAsset.name}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewAsset.dataUrl}
                  download={previewAsset.name}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="下载原素材"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-zinc-950/90 min-h-[300px]">
              {previewAsset.mimeType.startsWith('video/') ? (
                <video src={previewAsset.dataUrl} controls autoPlay className="max-h-[75vh] max-w-full rounded" />
              ) : previewAsset.mimeType.startsWith('audio/') ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <span className="text-xs text-zinc-400 mb-3">音频素材在线试听</span>
                  <audio src={previewAsset.dataUrl} controls autoPlay className="w-80" />
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
    </div>
  );
};
