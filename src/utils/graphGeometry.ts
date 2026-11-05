/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComfyNode, getNodeDimensions } from '../types/workflow';
import { WireStyle } from '../types/canvasSettings';

/**
 * Exact deterministic dimensions for node DOM structure and SVG port anchoring.
 * Matches NodeView.tsx 1:1 down to the pixel.
 */
export const GRAPH_GEOMETRY = {
  HEADER_HEIGHT: 32, // h-8
  PORTS_TOP_PADDING: 8, // pt-2
  SLOT_ROW_HEIGHT: 24, // h-6
  SLOT_CIRCLE_DIAMETER: 12, // w-3 h-3
  REROUTE_WIDTH: 80,
  REROUTE_HEIGHT: 36
} as const;

/**
 * Computes exact center (x, y) coordinates for an input or output port of a node in canvas world space.
 */
export function getSlotCoordinates(
  node: ComfyNode,
  slotIndex: number,
  isInput: boolean,
  nodePos: { x: number; y: number }
): { x: number; y: number } {
  const isReroute = node.type === 'Reroute';

  if (isReroute) {
    return {
      x: isInput ? nodePos.x : nodePos.x + GRAPH_GEOMETRY.REROUTE_WIDTH,
      y: nodePos.y + GRAPH_GEOMETRY.REROUTE_HEIGHT / 2
    };
  }

  const [width] = getNodeDimensions(node);

  // Exact vertical center of slot row:
  // Node Header (32px) + Container pt-2 (8px) + row index * 24px + half row height (12px)
  const slotCenterY =
    nodePos.y +
    GRAPH_GEOMETRY.HEADER_HEIGHT +
    GRAPH_GEOMETRY.PORTS_TOP_PADDING +
    (slotIndex || 0) * GRAPH_GEOMETRY.SLOT_ROW_HEIGHT +
    GRAPH_GEOMETRY.SLOT_ROW_HEIGHT / 2;

  // Exact horizontal center of slot circle:
  // Inputs circle is at x = 0 (left edge of node)
  // Outputs circle is at x = width (right edge of node)
  const slotCenterX = isInput ? nodePos.x : nodePos.x + width;

  return {
    x: slotCenterX,
    y: slotCenterY
  };
}

/**
 * Generates SVG path string based on WireStyle (Bezier / Orthogonal Step / Straight).
 */
export function createWirePath(
  srcX: number,
  srcY: number,
  tgtX: number,
  tgtY: number,
  style: WireStyle = 'bezier'
): string {
  if (style === 'straight') {
    return `M ${srcX} ${srcY} L ${tgtX} ${tgtY}`;
  }

  if (style === 'step') {
    // Orthogonal step routing
    const midX = (srcX + tgtX) / 2;
    return `M ${srcX} ${srcY} L ${midX} ${srcY} L ${midX} ${tgtY} L ${tgtX} ${tgtY}`;
  }

  // Default: ComfyUI-style smooth cubic Bezier
  const dx = Math.abs(tgtX - srcX);
  const curveOffset = Math.max(dx * 0.45, 40);
  return `M ${srcX} ${srcY} C ${srcX + curveOffset} ${srcY}, ${tgtX - curveOffset} ${tgtY}, ${tgtX} ${tgtY}`;
}
