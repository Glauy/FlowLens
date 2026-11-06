/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Sparkles,
  RotateCcw,
  Undo2,
  Redo2,
  ChevronDown,
  ArrowRightLeft,
  ArrowUpDown,
  Download,
  Layers,
  BookOpen,
  Link2
} from 'lucide-react';
import { LayoutAlgorithm, LayoutDirection } from '../../types/workflow';

interface ReaderHeaderProps {
  workflowName: string;
  modelInfo: string;
  nodeCount: number;
  linkCount: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
  currentLayout: LayoutAlgorithm;
  currentDirection: LayoutDirection;
  onApplyLayout: (algorithm: LayoutAlgorithm, direction?: LayoutDirection) => void;
  onResetOriginal: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportWorkflow: () => void;
  isSheetOpen: boolean;
  onToggleSheet: () => void;
  assetCount: number;
  onOpenBindModal?: () => void;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  workflowName,
  modelInfo,
  nodeCount,
  linkCount,
  isFavorite,
  onToggleFavorite,
  onBack,
  currentLayout,
  currentDirection,
  onApplyLayout,
  onResetOriginal,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportWorkflow,
  isSheetOpen,
  onToggleSheet,
  assetCount,
  onOpenBindModal
}) => {
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  return (
    <header className="h-14 px-4 bg-zinc-950/95 border-b border-zinc-800/90 backdrop-blur-md flex items-center justify-between z-30 select-none shrink-0">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
          title="返回工作流库"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-zinc-100 truncate max-w-[200px] sm:max-w-[340px]" title={workflowName}>
            {workflowName}
          </h1>

          <button
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFavorite
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
            }`}
            title={isFavorite ? '取消收藏' : '加入收藏'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Middle: Layout & Undo/Redo Controls */}
      <div className="flex items-center gap-2">
        {/* Undo & Redo */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canUndo ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="撤销布局调整 (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canRedo ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="重做布局调整 (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Auto Layout Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-200 transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>自动布局</span>
            <span className="text-[10px] text-zinc-400 uppercase bg-zinc-800 px-1 py-0.2 rounded font-mono">
              {currentLayout}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isLayoutMenuOpen && (
            <div
              className="absolute top-full mt-1.5 left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 text-xs text-zinc-200"
              onMouseLeave={() => setIsLayoutMenuOpen(false)}
            >
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                选择布局算法
              </div>

              <button
                onClick={() => {
                  onApplyLayout('smart');
                  setIsLayoutMenuOpen(false);
                }}
                className={`w-full flex flex-col items-start px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer mb-1 ${
                  currentLayout === 'smart' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-zinc-800'
                }`}
              >
                <div className="font-semibold flex items-center justify-between w-full">
                  <span>Smart 分层 (推荐)</span>
                  <span className="text-[10px] font-mono text-zinc-400">Dagre</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  智能拓扑分层，计算真实节点宽高与跨级连线。
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyLayout('advanced');
                  setIsLayoutMenuOpen(false);
                }}
                className={`w-full flex flex-col items-start px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer mb-1 ${
                  currentLayout === 'advanced' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-zinc-800'
                }`}
              >
                <div className="font-semibold flex items-center justify-between w-full">
                  <span>Advanced 紧凑对齐</span>
                  <span className="text-[10px] font-mono text-zinc-400">Enhanced</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  主干拉直、Reroute 压缩与群组自适应吸附。
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyLayout('quick');
                  setIsLayoutMenuOpen(false);
                }}
                className={`w-full flex flex-col items-start px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer mb-1 ${
                  currentLayout === 'quick' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-zinc-800'
                }`}
              >
                <div className="font-semibold flex items-center justify-between w-full">
                  <span>Quick 轻量级分级</span>
                  <span className="text-[10px] font-mono text-zinc-400">Topological</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  快速依赖深层排布，结构直观简洁。
                </div>
              </button>

              <div className="border-t border-zinc-800 my-1 pt-1">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                  布局方向
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                  <button
                    onClick={() => {
                      onApplyLayout(currentLayout, 'LR');
                      setIsLayoutMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded font-medium cursor-pointer ${
                      currentDirection === 'LR' ? 'bg-zinc-700 text-white' : 'bg-zinc-800/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>左右 (LR)</span>
                  </button>
                  <button
                    onClick={() => {
                      onApplyLayout(currentLayout, 'TB');
                      setIsLayoutMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded font-medium cursor-pointer ${
                      currentDirection === 'TB' ? 'bg-zinc-700 text-white' : 'bg-zinc-800/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>上下 (TB)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Original Layout */}
        <button
          onClick={onResetOriginal}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 transition-colors cursor-pointer"
          title="恢复作者保存的原始节点坐标"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">恢复原始</span>
        </button>

        {/* Export JSON */}
        <button
          onClick={onExportWorkflow}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          title="导出工作流 JSON"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Quick Graph Statistics & Single Unified Sheet Trigger Button */}
      <div className="flex items-center gap-3">
        {/* Model stats */}
        <div className="hidden lg:flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1 text-xs font-mono">
          <span className="text-cyan-400 font-semibold">{modelInfo}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300 flex items-center gap-1">
            <Layers className="w-3 h-3 text-zinc-500" />
            {nodeCount} 节点
          </span>
          <span className="text-zinc-500">/ {linkCount} 连线</span>
        </div>

        {/* Direct 'Bind Asset' Quick Trigger Button */}
        {onOpenBindModal && (
          <button
            onClick={onOpenBindModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-cyan-500/50 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
            title="选择工作流节点与输入参数，绑定素材库素材"
          >
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">绑定素材</span>
          </button>
        )}

        {/* 隐藏式入口：单个优雅的“资料与沉淀”按钮，点击呼出 Sheet 对话框 */}
        <button
          onClick={onToggleSheet}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm border ${
            isSheetOpen
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-950/40'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700/80 hover:border-zinc-600'
          }`}
          title="打开工作流档案与知识备忘 (快捷键: I)"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>资料与备忘</span>
          {assetCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>
    </header>
  );
};
