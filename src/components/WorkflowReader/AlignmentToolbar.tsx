/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter
} from 'lucide-react';

interface AlignmentToolbarProps {
  selectedCount: number;
  onAlignLeft: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignBottom: () => void;
  onAlignCenterX: () => void;
  onAlignCenterY: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
  selectedCount,
  onAlignLeft,
  onAlignRight,
  onAlignTop,
  onAlignBottom,
  onAlignCenterX,
  onAlignCenterY,
  onDistributeHorizontal,
  onDistributeVertical
}) => {
  if (selectedCount < 2) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/95 border border-zinc-700/80 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-zinc-300">
      <div className="text-[11px] font-medium text-amber-400 font-mono pr-2 border-r border-zinc-700">
        已选 {selectedCount} 节点
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onAlignLeft}
          title="左对齐 (Align Left)"
          className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <AlignHorizontalJustifyStart className="w-4 h-4" />
        </button>
        <button
          onClick={onAlignCenterX}
          title="水平居中对齐 (Align Center Horizontal)"
          className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <AlignHorizontalJustifyCenter className="w-4 h-4" />
        </button>
        <button
          onClick={onAlignRight}
          title="右对齐 (Align Right)"
          className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <AlignHorizontalJustifyEnd className="w-4 h-4" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-700 mx-0.5" />

      <div className="flex items-center gap-1">
        <button
          onClick={onAlignTop}
          title="顶部对齐 (Align Top)"
          className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <AlignVerticalJustifyStart className="w-4 h-4" />
        </button>
        <button
          onClick={onAlignCenterY}
          title="垂直居中对齐 (Align Center Vertical)"
          className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <AlignVerticalJustifyCenter className="w-4 h-4" />
        </button>
        <button
          onClick={onAlignBottom}
          title="底部对齐 (Align Bottom)"
          className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <AlignVerticalJustifyEnd className="w-4 h-4" />
        </button>
      </div>

      {selectedCount >= 3 && (
        <>
          <div className="w-[1px] h-4 bg-zinc-700 mx-0.5" />
          <div className="flex items-center gap-1">
            <button
              onClick={onDistributeHorizontal}
              title="水平等间距分布 (Distribute Horizontally)"
              className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <AlignHorizontalDistributeCenter className="w-4 h-4" />
            </button>
            <button
              onClick={onDistributeVertical}
              title="垂直等间距分布 (Distribute Vertically)"
              className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <AlignVerticalDistributeCenter className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
