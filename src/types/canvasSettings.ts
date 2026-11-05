/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FlowAnimationMode = 'active_only' | 'always' | 'off';
export type FlowSpeed = 'slow' | 'normal' | 'fast';
export type WireStyle = 'bezier' | 'step' | 'straight';

export interface CanvasSettings {
  /** 全局隐藏所有边 */
  hideAllEdges: boolean;
  /** 节点聚焦模式：点击节点时高亮上下游节点，淡化无关节点 */
  focusMode: boolean;
  /** 聚焦时仅展示上下游关联边，隐藏其他非关联边 */
  focusOnlyActiveEdges: boolean;
  /** 连线流光动效：仅上下游链路 / 全图常开 / 关闭 */
  flowAnimation: FlowAnimationMode;
  /** 流光速度 */
  flowSpeed: FlowSpeed;
  /** 连线风格 */
  wireStyle: WireStyle;
  /** 是否显示背景点阵网格 */
  showGrid: boolean;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  hideAllEdges: false,
  focusMode: true,
  focusOnlyActiveEdges: true,
  flowAnimation: 'active_only',
  flowSpeed: 'normal',
  wireStyle: 'bezier',
  showGrid: true
};
