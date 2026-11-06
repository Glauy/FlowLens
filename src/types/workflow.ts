/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ComfyNodeInput {
  name: string;
  type: string;
  link: number | null;
  label?: string;
  slot_index?: number;
}

export interface ComfyNodeOutput {
  name: string;
  type: string;
  links: number[] | null;
  slot_index: number;
  label?: string;
}

export interface ComfyNode {
  id: number | string;
  type: string;
  pos: [number, number];
  size: [number, number] | { 0: number; 1: number };
  flags?: Record<string, unknown>;
  order?: number;
  mode?: number;
  inputs?: ComfyNodeInput[];
  outputs?: ComfyNodeOutput[];
  properties?: Record<string, unknown>;
  widgets_values?: (string | number | boolean | Record<string, unknown> | null)[];
  title?: string;
  color?: string;
  bgcolor?: string;
}

// ComfyUI Link format: [id, origin_id, origin_slot, target_id, target_slot, type]
export type ComfyLink = [number, number | string, number, number | string, number, string];

export interface ComfyGroup {
  id?: string | number;
  title: string;
  bounding: [number, number, number, number]; // [x, y, width, height]
  color?: string;
  font_size?: number;
}

export interface ComfyWorkflowRaw {
  last_node_id?: number;
  last_link_id?: number;
  nodes: ComfyNode[];
  links: ComfyLink[];
  groups?: ComfyGroup[];
  config?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  version?: number;
}

export function getNodeDimensions(node: ComfyNode): [number, number] {
  if (Array.isArray(node.size)) {
    return [Math.max(160, node.size[0] || 220), Math.max(80, node.size[1] || 120)];
  } else if (node.size && typeof node.size === 'object') {
    const s = node.size as { 0: number; 1: number };
    return [Math.max(160, s[0] || 220), Math.max(80, s[1] || 120)];
  }
  return [220, 120];
}

export interface ExtractedMeta {
  checkpoints: string[];
  loras: string[];
  controlnets: string[];
  samplers: string[];
  vaes: string[];
  upscalers: string[];
  customNodeTypes: string[];
  hasInpaint: boolean;
  hasVideo: boolean;
  hasFaceRestore: boolean;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  source?: string;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  fingerprint: string;
  nodeCount: number;
  linkCount: number;
  modelInfo: string; // e.g. "SDXL", "Flux.1", "Qwen Image"
  coverAssetId?: string; // Dedicated Cover Image reference from Asset Pool
  extractedMeta: ExtractedMeta;
  rawJson: string; // Immutable original JSON
}

export type TagDimension =
  | 'model' // 模型 / 架构
  | 'type' // 工作流类型
  | 'task' // 任务 / 功能
  | 'scenario' // 应用场景
  | 'technique' // 技术 / 方法
  | 'custom'; // 自定义标签

export interface TagCategory {
  id: string;
  key: TagDimension;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
}

export interface Tag {
  id: string;
  categoryId: string; // maps to TagCategory.id
  name: string;
  color?: string;
  isAutoDetected?: boolean; // system auto-detected flag (never overwrites user tags)
}

export interface WorkflowTagRecord {
  workflowId: string;
  tagId: string;
  isAutoDetected: boolean;
}

export type AssetType =
  | 'cover' // 独立封面
  | 'showcase' // 效果示例
  | 'input' // 输入图片
  | 'reference' // 参考图片
  | 'output' // 生成结果
  | 'comparison' // 对比图片
  | 'video' // 视频 / 动图
  | 'audio' // 音频
  | 'text' // 提示词 / 文本配置
  | 'attachment'; // 截图及其他附件

export interface AssetRecord {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  dataUrl: string; // Data URL or Public URL
  size: number;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface WorkflowAssetRecord {
  workflowId: string;
  assetId: string;
  assetType: AssetType;
  caption?: string;
  order: number;
  nodeId?: number | string; // 可选关联到具体节点
  paramName?: string; // 绑定的具体参数或输入端口 (如 "image", "mask", "widget[0]")
  slotIndex?: number; // 关联的端口或Widget索引
}

export interface AssetUsage {
  workflowId: string;
  workflowName: string;
  modelInfo: string;
  isCover: boolean;
  assetType?: AssetType;
  caption?: string;
}

export interface WorkflowNoteRecord {
  workflowId: string;
  markdown: string;
  updatedAt: number;
}

export type LayoutAlgorithm = 'original' | 'smart' | 'quick' | 'advanced' | 'custom';
export type LayoutDirection = 'LR' | 'TB';

export interface WorkflowLayoutRecord {
  workflowId: string;
  layoutType: LayoutAlgorithm;
  direction: LayoutDirection;
  nodePositions: Record<string, { x: number; y: number }>;
  groupPositions?: Record<string, [number, number, number, number]>;
  viewport: { x: number; y: number; zoom: number };
  updatedAt: number;
}
