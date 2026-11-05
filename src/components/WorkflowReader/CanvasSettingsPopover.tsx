/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  EyeOff,
  Eye,
  GitFork,
  Sparkles,
  Spline,
  Grid3X3,
  RotateCcw,
  X,
  Zap,
  Check
} from 'lucide-react';
import {
  CanvasSettings,
  FlowAnimationMode,
  FlowSpeed,
  WireStyle,
  DEFAULT_CANVAS_SETTINGS
} from '../../types/canvasSettings';

interface CanvasSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CanvasSettings;
  onUpdateSettings: (updated: Partial<CanvasSettings>) => void;
  onResetDefaults: () => void;
}

export const CanvasSettingsPopover: React.FC<CanvasSettingsPopoverProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-16 left-5 z-40 w-80 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-4 backdrop-blur-xl text-zinc-200 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white tracking-wide">画布显示偏好设置</h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetDefaults}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            title="恢复默认设置"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* 1. 全局隐藏连线 */}
        <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800/60">
          <div className="flex items-center gap-2">
            {settings.hideAllEdges ? (
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-zinc-200">隐藏所有连线</div>
              <div className="text-[10px] text-zinc-500 leading-tight">
                不绘制边，仅高亮上下游节点
              </div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ hideAllEdges: !settings.hideAllEdges })}
            className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              settings.hideAllEdges ? 'bg-amber-500' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                settings.hideAllEdges ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2. 点击节点展示上下游模式 */}
        <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800/60">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="font-semibold text-zinc-200">上下游拓扑聚焦</div>
              <div className="text-[10px] text-zinc-500 leading-tight">
                点击节点高亮上下游，淡化无关节点
              </div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ focusMode: !settings.focusMode })}
            className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              settings.focusMode ? 'bg-cyan-500' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                settings.focusMode ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. 聚焦时仅展示关联边 */}
        {!settings.hideAllEdges && settings.focusMode && (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
            <div>
              <div className="font-medium text-zinc-300 text-[11px]">聚焦时仅保留关联边</div>
              <div className="text-[10px] text-zinc-500">隐藏非当前链路的其他连线</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ focusOnlyActiveEdges: !settings.focusOnlyActiveEdges })}
              className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                settings.focusOnlyActiveEdges ? 'bg-cyan-600' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                  settings.focusOnlyActiveEdges ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* 4. 流光动效模式 */}
        {!settings.hideAllEdges && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>连线流光动效</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Stream Glow</span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-[10px]">
              {(
                [
                  { id: 'active_only', label: '仅上下游' },
                  { id: 'always', label: '全图常开' },
                  { id: 'off', label: '关闭' }
                ] as { id: FlowAnimationMode; label: string }[]
              ).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateSettings({ flowAnimation: opt.id })}
                  className={`py-1 rounded-lg font-medium transition-all cursor-pointer text-center ${
                    settings.flowAnimation === opt.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 流光速度调节 */}
            {settings.flowAnimation !== 'off' && (
              <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>流光速率:</span>
                </span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'slow', label: '舒缓' },
                      { id: 'normal', label: '标准' },
                      { id: 'fast', label: '极速' }
                    ] as { id: FlowSpeed; label: string }[]
                  ).map(spd => (
                    <button
                      key={spd.id}
                      onClick={() => onUpdateSettings({ flowSpeed: spd.id })}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        settings.flowSpeed === spd.id
                          ? 'bg-zinc-800 text-white font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. 连线风格选择 */}
        {!settings.hideAllEdges && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Spline className="w-3.5 h-3.5 text-purple-400" />
                <span>连线风格</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-[10px]">
              {(
                [
                  { id: 'bezier', label: '平滑曲线' },
                  { id: 'step', label: '直角折线' },
                  { id: 'straight', label: '直线' }
                ] as { id: WireStyle; label: string }[]
              ).map(st => (
                <button
                  key={st.id}
                  onClick={() => onUpdateSettings({ wireStyle: st.id })}
                  className={`py-1 rounded-lg font-medium transition-all cursor-pointer text-center ${
                    settings.wireStyle === st.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. 背景点阵 */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <Grid3X3 className="w-3.5 h-3.5 text-zinc-500" />
            <span>背景点阵网格</span>
          </span>
          <button
            onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
            className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              settings.showGrid ? 'bg-zinc-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${
                settings.showGrid ? 'translate-x-3' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
