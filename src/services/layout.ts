/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dagre from 'dagre';
import {
  ComfyWorkflowRaw,
  ComfyNode,
  LayoutAlgorithm,
  LayoutDirection,
  getNodeDimensions
} from '../types/workflow';

export interface LayoutResult {
  nodePositions: Record<string, { x: number; y: number }>;
  groupPositions: Record<string, [number, number, number, number]>;
}

/**
 * 1. Quick Layout: Lightweight Topological Dependency Leveling
 */
export function computeQuickLayout(
  raw: ComfyWorkflowRaw,
  direction: LayoutDirection = 'LR'
): LayoutResult {
  const nodeMap = new Map<string, ComfyNode>();
  raw.nodes.forEach(n => nodeMap.set(String(n.id), n));

  // Build adjacency & in-degree
  const inDegree = new Map<string, number>();
  const adj = new Map<string, Set<string>>();
  raw.nodes.forEach(n => {
    const id = String(n.id);
    inDegree.set(id, 0);
    adj.set(id, new Set());
  });

  raw.links.forEach(([, originId, , targetId]) => {
    const oId = String(originId);
    const tId = String(targetId);
    if (adj.has(oId) && inDegree.has(tId)) {
      if (!adj.get(oId)!.has(tId)) {
        adj.get(oId)!.add(tId);
        inDegree.set(tId, (inDegree.get(tId) || 0) + 1);
      }
    }
  });

  // Calculate topological ranks (longest path to avoid early-stage nodes getting placed too far right)
  const rank = new Map<string, number>();
  const queue: string[] = [];

  raw.nodes.forEach(n => {
    const id = String(n.id);
    if ((inDegree.get(id) || 0) === 0) {
      rank.set(id, 0);
      queue.push(id);
    }
  });

  // BFS / Longest path leveling
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = rank.get(curr) || 0;
    const targets = adj.get(curr) || new Set();

    targets.forEach(target => {
      const nextRank = Math.max(rank.get(target) || 0, currRank + 1);
      rank.set(target, nextRank);
      queue.push(target);
    });
  }

  // Handle disconnected or cycle fallback
  raw.nodes.forEach(n => {
    const id = String(n.id);
    if (!rank.has(id)) {
      rank.set(id, 0);
    }
  });

  // Group nodes by rank
  const rankGroups = new Map<number, string[]>();
  rank.forEach((r, id) => {
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(id);
  });

  const nodePositions: Record<string, { x: number; y: number }> = {};
  const isLR = direction === 'LR';

  let currentRankOffset = 60;
  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

  sortedRanks.forEach(r => {
    const nodeIds = rankGroups.get(r)!;
    let maxBreadth = 0;
    let currentCrossOffset = 60;

    nodeIds.forEach(id => {
      const node = nodeMap.get(id)!;
      const [w, h] = getNodeDimensions(node);

      if (isLR) {
        nodePositions[id] = { x: currentRankOffset, y: currentCrossOffset };
        currentCrossOffset += h + 60;
        maxBreadth = Math.max(maxBreadth, w);
      } else {
        nodePositions[id] = { x: currentCrossOffset, y: currentRankOffset };
        currentCrossOffset += w + 60;
        maxBreadth = Math.max(maxBreadth, h);
      }
    });

    currentRankOffset += maxBreadth + 90;
  });

  const groupPositions = updateGroupBounds(raw, nodePositions);
  return { nodePositions, groupPositions };
}

/**
 * 2. Smart Layout: Dagre-based Hierarchical Topological Layout
 */
export function computeSmartLayout(
  raw: ComfyWorkflowRaw,
  direction: LayoutDirection = 'LR'
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  const isLR = direction === 'LR';

  g.setGraph({
    rankdir: isLR ? 'LR' : 'TB',
    nodesep: 55,
    ranksep: 90,
    marginx: 60,
    marginy: 60,
    ranker: 'tight-tree'
  });

  g.setDefaultEdgeLabel(() => ({}));

  const isolatedNodes: ComfyNode[] = [];
  const connectedNodeIds = new Set<string>();

  raw.links.forEach(([, originId, , targetId]) => {
    connectedNodeIds.add(String(originId));
    connectedNodeIds.add(String(targetId));
  });

  // Add connected nodes to Dagre
  raw.nodes.forEach(node => {
    const id = String(node.id);
    if (!connectedNodeIds.has(id) && raw.nodes.length > 3) {
      isolatedNodes.push(node);
      return;
    }
    const [w, h] = getNodeDimensions(node);
    g.setNode(id, { width: w, height: h });
  });

  // Add edges
  raw.links.forEach(([, originId, , targetId]) => {
    const oId = String(originId);
    const tId = String(targetId);
    if (g.hasNode(oId) && g.hasNode(tId)) {
      g.setEdge(oId, tId);
    }
  });

  dagre.layout(g);

  const nodePositions: Record<string, { x: number; y: number }> = {};
  let maxX = 0;
  let maxY = 0;

  g.nodes().forEach(nodeId => {
    const n = g.node(nodeId);
    if (n) {
      const x = Math.round(n.x - n.width / 2);
      const y = Math.round(n.y - n.height / 2);
      nodePositions[nodeId] = { x, y };
      maxX = Math.max(maxX, x + n.width);
      maxY = Math.max(maxY, y + n.height);
    }
  });

  // Neatly arrange isolated nodes in a secondary row/column
  if (isolatedNodes.length > 0) {
    let isoX = isLR ? 60 : maxX + 80;
    let isoY = isLR ? maxY + 80 : 60;
    isolatedNodes.forEach(node => {
      const id = String(node.id);
      const [w, h] = getNodeDimensions(node);
      nodePositions[id] = { x: isoX, y: isoY };
      if (isLR) {
        isoX += w + 40;
      } else {
        isoY += h + 40;
      }
    });
  }

  const groupPositions = updateGroupBounds(raw, nodePositions);
  return { nodePositions, groupPositions };
}

/**
 * 3. Advanced Layout: Port-Aware, Backbone Straightening & Reroute Compacting
 */
export function computeAdvancedLayout(
  raw: ComfyWorkflowRaw,
  direction: LayoutDirection = 'LR'
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  const isLR = direction === 'LR';

  g.setGraph({
    rankdir: isLR ? 'LR' : 'TB',
    nodesep: 50,
    ranksep: 95,
    marginx: 80,
    marginy: 80,
    ranker: 'network-simplex',
    align: 'DL' // Align towards top-left to straighten flow
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Identify nodes and specialized types
  raw.nodes.forEach(node => {
    const id = String(node.id);
    let [w, h] = getNodeDimensions(node);
    
    // Reroute nodes are tiny and compact
    if (node.type === 'Reroute') {
      w = 80;
      h = 36;
    }

    g.setNode(id, { width: w, height: h });
  });

  // Assign edge weights to prioritize backbone paths
  // Primary flow: Checkpoint/Model -> KSampler -> VAEDecode -> SaveImage has higher weight
  raw.links.forEach(([, originId, originSlot, targetId, targetSlot, type]) => {
    const oId = String(originId);
    const tId = String(targetId);
    if (g.hasNode(oId) && g.hasNode(tId)) {
      let weight = 1;
      const typeUpper = (type || '').toUpperCase();
      if (typeUpper === 'LATENT' || typeUpper === 'IMAGE') {
        weight = 3; // Keep image and latent path super straight
      } else if (typeUpper === 'MODEL') {
        weight = 2;
      }

      g.setEdge(oId, tId, {
        weight,
        minlen: 1
      });
    }
  });

  dagre.layout(g);

  const nodePositions: Record<string, { x: number; y: number }> = {};

  g.nodes().forEach(nodeId => {
    const n = g.node(nodeId);
    if (n) {
      const x = Math.round(n.x - n.width / 2);
      const y = Math.round(n.y - n.height / 2);
      nodePositions[nodeId] = { x, y };
    }
  });

  // Fallback for any missed nodes
  raw.nodes.forEach((n, idx) => {
    const id = String(n.id);
    if (!nodePositions[id]) {
      nodePositions[id] = { x: 80 + idx * 260, y: 80 };
    }
  });

  const groupPositions = updateGroupBounds(raw, nodePositions);
  return { nodePositions, groupPositions };
}

/**
 * Extracts author's original layout from workflow JSON
 */
export function extractOriginalLayout(raw: ComfyWorkflowRaw): LayoutResult {
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const groupPositions: Record<string, [number, number, number, number]> = {};

  raw.nodes.forEach(node => {
    const id = String(node.id);
    const pos = Array.isArray(node.pos) ? node.pos : [0, 0];
    nodePositions[id] = { x: Number(pos[0]) || 0, y: Number(pos[1]) || 0 };
  });

  if (raw.groups) {
    raw.groups.forEach((g, idx) => {
      const gId = String(g.id || `group_${idx}`);
      groupPositions[gId] = Array.isArray(g.bounding) && g.bounding.length === 4
        ? [g.bounding[0], g.bounding[1], g.bounding[2], g.bounding[3]]
        : [0, 0, 400, 300];
    });
  }

  return { nodePositions, groupPositions };
}

/**
 * Dynamically recalculates group bounding boxes to surround their nodes
 */
function updateGroupBounds(
  raw: ComfyWorkflowRaw,
  positions: Record<string, { x: number; y: number }>
): Record<string, [number, number, number, number]> {
  const groupPositions: Record<string, [number, number, number, number]> = {};

  if (!raw.groups || raw.groups.length === 0) return groupPositions;

  raw.groups.forEach((group, idx) => {
    const gId = String(group.id || `group_${idx}`);
    // If the original group had a bounding box, check which nodes originally resided in it
    const origBox = group.bounding || [0, 0, 400, 300];
    const origLeft = origBox[0];
    const origTop = origBox[1];
    const origRight = origBox[0] + origBox[2];
    const origBottom = origBox[1] + origBox[3];

    // Find original nodes inside this group
    const memberNodes = raw.nodes.filter(n => {
      const nx = n.pos[0];
      const ny = n.pos[1];
      return nx >= origLeft - 50 && nx <= origRight + 50 && ny >= origTop - 50 && ny <= origBottom + 50;
    });

    if (memberNodes.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      memberNodes.forEach(node => {
        const id = String(node.id);
        const pos = positions[id];
        if (pos) {
          const [w, h] = getNodeDimensions(node);
          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          maxX = Math.max(maxX, pos.x + w);
          maxY = Math.max(maxY, pos.y + h);
        }
      });

      if (minX !== Infinity) {
        const padding = 45;
        groupPositions[gId] = [
          minX - padding,
          minY - padding - 30, // Extra headroom for title
          maxX - minX + padding * 2,
          maxY - minY + padding * 2 + 30
        ];
        return;
      }
    }

    // Fallback to original group bounds
    groupPositions[gId] = [origBox[0], origBox[1], origBox[2], origBox[3]];
  });

  return groupPositions;
}

/**
 * Master dispatcher for layout generation
 */
export function runLayout(
  algorithm: LayoutAlgorithm,
  raw: ComfyWorkflowRaw,
  direction: LayoutDirection = 'LR'
): LayoutResult {
  switch (algorithm) {
    case 'original':
      return extractOriginalLayout(raw);
    case 'quick':
      return computeQuickLayout(raw, direction);
    case 'advanced':
      return computeAdvancedLayout(raw, direction);
    case 'smart':
    default:
      return computeSmartLayout(raw, direction);
  }
}
