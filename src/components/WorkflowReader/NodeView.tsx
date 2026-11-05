/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ComfyNode, getNodeDimensions, AssetRecord } from '../../types/workflow';
import { getSlotColor, getNodeHeaderColor } from '../../utils/theme';
import {
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Play,
  Pause,
  Maximize2,
  Copy,
  Check,
  Plus,
  Volume2
} from 'lucide-react';

interface NodeViewProps {
  node: ComfyNode;
  position: { x: number; y: number };
  isSelected: boolean;
  isUpstream: boolean;
  isDownstream: boolean;
  isDimmed?: boolean;
  assets?: AssetRecord[];
  onSelect: (nodeId: string, isShift: boolean) => void;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onDoubleClick: (nodeId: string) => void;
  onBindAsset?: (node: ComfyNode) => void;
  onPreviewAsset?: (asset: AssetRecord) => void;
}

export const NodeView: React.FC<NodeViewProps> = ({
  node,
  position,
  isSelected,
  isUpstream,
  isDownstream,
  isDimmed = false,
  assets = [],
  onSelect,
  onMouseDown,
  onDoubleClick,
  onBindAsset,
  onPreviewAsset
}) => {
  const idStr = String(node.id);
  const [width, height] = getNodeDimensions(node);
  const headerColor = node.color || getNodeHeaderColor(node.type);

  // Audio Playback State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prompt Copy State
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Match asset to this node
  const matchedAsset = React.useMemo(() => {
    if (!assets || assets.length === 0) return null;
    const title = (node.title || '').toLowerCase();
    const type = (node.type || '').toLowerCase();
    const widgets = (node.widgets_values || []).map(w => String(w).toLowerCase());

    // 1. Direct widget filename match (e.g. pose_model_photo.jpg, reference_asian_cyberpunk_face.png)
    for (const asset of assets) {
      const aName = asset.name.toLowerCase();
      for (const w of widgets) {
        if (w.includes(aName) || aName.includes(w) || (asset.dataUrl && asset.dataUrl.toLowerCase().includes(w))) {
          return asset;
        }
      }
    }

    // 2. Pose / Portrait / Reference nodes (e.g. from user screenshot: "真人参考图 image 2 #4")
    if (title.includes('真人') || title.includes('参考图') || title.includes('image 2') || title.includes('face') || title.includes('portrait')) {
      const face = assets.find(a =>
        a.id.includes('pose_model') ||
        a.name.includes('真人') ||
        a.name.includes('Portrait') ||
        a.type === 'reference' ||
        a.id.includes('pulid')
      );
      if (face) return face;
    }

    if (title.includes('姿势') || title.includes('线稿') || title.includes('sketch') || title.includes('lineart')) {
      const sketch = assets.find(a =>
        a.id.includes('pose_sketch') ||
        a.name.includes('姿势') ||
        a.name.includes('线稿') ||
        a.type === 'input'
      );
      if (sketch) return sketch;
    }

    // 3. Audio nodes
    if (type.includes('audio') || title.includes('音频') || title.includes('sound') || title.includes('music')) {
      const audioAsset = assets.find(a => a.type === 'audio' || a.mimeType.startsWith('audio/'));
      if (audioAsset) return audioAsset;
    }

    // 4. Video nodes
    if (type.includes('video') || title.includes('视频') || type.includes('animatediff')) {
      const vidAsset = assets.find(a => a.type === 'video' || a.mimeType.startsWith('video/'));
      if (vidAsset) return vidAsset;
    }

    // 5. Output / Save nodes
    if (type.includes('save') || type.includes('preview') || title.includes('输出') || title.includes('output') || title.includes('最终')) {
      const outAsset = assets.find(a => a.type === 'cover' || a.type === 'showcase' || a.type === 'output');
      if (outAsset) return outAsset;
    }

    // 6. Generic LoadImage fallback
    if (type === 'loadimage' || type === 'loadimagemask') {
      const inputAsset = assets.find(a => a.type === 'reference' || a.type === 'input') || assets[0];
      if (inputAsset) return inputAsset;
    }

    return null;
  }, [node, assets]);

  const isMediaNode =
    ['LoadImage', 'SaveImage', 'PreviewImage', 'ImageSave', 'LoadAudio', 'SaveAudio', 'LoadVideo', 'VHS_VideoCombine'].includes(node.type) ||
    node.title?.includes('参考') ||
    node.title?.includes('姿势') ||
    node.title?.includes('输出') ||
    node.title?.includes('音频');
  const idStr = String(node.id);
  const [width, height] = getNodeDimensions(node);
  const headerColor = node.color || getNodeHeaderColor(node.type);

  const isReroute = node.type === 'Reroute';

  // Reroute node special compact design
  if (isReroute) {
    const isLit = isSelected || isUpstream || isDownstream;
    return (
      <div
        className={`absolute rounded-full cursor-move transition-all select-none flex items-center justify-center border ${
          isDimmed ? 'opacity-20 hover:opacity-80' : ''
        } ${
          isSelected
            ? 'ring-2 ring-amber-400 border-amber-300 bg-amber-950/80'
            : isLit
            ? 'ring-2 ring-cyan-400 border-cyan-400 bg-slate-900'
            : 'border-zinc-700 bg-zinc-900/90 hover:border-zinc-500'
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: 80,
          height: 36,
          boxShadow: isLit ? '0 0 15px rgba(56, 189, 248, 0.4)' : '0 4px 12px rgba(0,0,0,0.5)'
        }}
        onMouseDown={e => onMouseDown(e, idStr)}
        onClick={e => {
          e.stopPropagation();
          onSelect(idStr, e.shiftKey);
        }}
        onDoubleClick={e => {
          e.stopPropagation();
          onDoubleClick(idStr);
        }}
      >
        {/* Left input port */}
        <div
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-zinc-900"
          style={{ backgroundColor: getSlotColor(node.inputs?.[0]?.type || 'ANY') }}
        />
        <span className="text-[11px] font-mono text-zinc-400">Reroute</span>
        {/* Right output port */}
        <div
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-zinc-900"
          style={{ backgroundColor: getSlotColor(node.outputs?.[0]?.type || 'ANY') }}
        />
      </div>
    );
  }

  // Highlights
  let borderClass = 'border-zinc-800 hover:border-zinc-600';
  let glowStyle = '0 6px 20px rgba(0, 0, 0, 0.6)';

  if (isSelected) {
    borderClass = 'ring-2 ring-amber-400 border-amber-400 shadow-amber-500/20';
    glowStyle = '0 0 24px rgba(251, 191, 36, 0.4), 0 8px 30px rgba(0,0,0,0.8)';
  } else if (isUpstream) {
    borderClass = 'ring-2 ring-sky-400 border-sky-400 shadow-sky-500/20';
    glowStyle = '0 0 20px rgba(56, 189, 248, 0.35), 0 6px 20px rgba(0,0,0,0.7)';
  } else if (isDownstream) {
    borderClass = 'ring-2 ring-emerald-400 border-emerald-400 shadow-emerald-500/20';
    glowStyle = '0 0 20px rgba(52, 211, 153, 0.35), 0 6px 20px rgba(0,0,0,0.7)';
  }

  const inputs = node.inputs || [];
  const outputs = node.outputs || [];
  const widgets = node.widgets_values || [];

  return (
    <div
      className={`absolute rounded-xl bg-zinc-900/95 text-zinc-100 border select-none transition-all duration-150 backdrop-blur-md cursor-grab active:cursor-grabbing ${
        isDimmed ? 'opacity-20 grayscale-[50%] hover:opacity-85' : ''
      } ${borderClass}`}
      style={{
        left: position.x,
        top: position.y,
        width,
        minHeight: height,
        boxShadow: glowStyle
      }}
      onMouseDown={e => onMouseDown(e, idStr)}
      onClick={e => {
        e.stopPropagation();
        onSelect(idStr, e.shiftKey);
      }}
      onDoubleClick={e => {
        e.stopPropagation();
        onDoubleClick(idStr);
      }}
    >
      {/* Node Header - fixed exactly 32px height (h-8) */}
      <div
        className="h-8 px-3 rounded-t-xl flex items-center justify-between border-b border-white/10 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${headerColor}dd 0%, ${headerColor}88 100%)`
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-white/70 shrink-0" />
          <h3 className="text-xs font-semibold tracking-wide truncate text-white" title={node.title || node.type}>
            {node.title || node.type}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-white/60 bg-black/30 px-1.5 py-0.5 rounded shrink-0">
          #{node.id}
        </span>
      </div>

      {/* Ports Area - pt-2 (8px), exactly matching GRAPH_GEOMETRY */}
      <div className="pt-2 px-2 pb-2 space-y-1">
        {/* Pair inputs and outputs side-by-side */}
        <div className="flex justify-between items-start gap-2 min-h-[36px]">
          {/* Inputs Column */}
          <div className="flex-1 flex flex-col">
            {inputs.map((inp, idx) => (
              <div key={idx} className="h-6 flex items-center gap-1.5 relative -ml-3.5 group">
                <div
                  className="w-3 h-3 rounded-full border-2 border-zinc-900 shadow-sm shrink-0"
                  style={{ backgroundColor: getSlotColor(inp.type) }}
                  title={`${inp.name} (${inp.type})`}
                />
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate leading-none">
                  {inp.name}
                </span>
              </div>
            ))}
          </div>

          {/* Outputs Column */}
          <div className="flex-1 flex flex-col items-end">
            {outputs.map((out, idx) => (
              <div key={idx} className="h-6 flex items-center justify-end gap-1.5 relative -mr-3.5 group">
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate text-right leading-none">
                  {out.name}
                </span>
                <div
                  className="w-3 h-3 rounded-full border-2 border-zinc-900 shadow-sm shrink-0"
                  style={{ backgroundColor: getSlotColor(out.type) }}
                  title={`${out.name} (${out.type})`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Widgets Value Preview (Prompts, Model Checkpoints, Sampler parameters) */}
        {widgets.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1">
            {widgets.map((val, idx) => {
              if (val === null || val === undefined) return null;

              // Long text (Positive/Negative Prompts)
              if (typeof val === 'string' && val.length > 25) {
                return (
                  <div key={idx} className="relative group/prompt">
                    <div
                      className="text-[11px] text-zinc-300 bg-zinc-950/70 p-2 pr-7 rounded border border-zinc-800/80 line-clamp-3 font-sans italic"
                      title={val}
                    >
                      "{val}"
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(String(val));
                        setCopiedPrompt(true);
                        setTimeout(() => setCopiedPrompt(false), 1500);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded text-[10px] cursor-pointer transition-colors"
                      title="复制此段提示词文本"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                );
              }

              // Model safetensors filename
              if (typeof val === 'string' && (val.endsWith('.safetensors') || val.endsWith('.ckpt') || val.endsWith('.png'))) {
                return (
                  <div
                    key={idx}
                    className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/50 truncate flex items-center gap-1"
                    title={val}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate">{val}</span>
                  </div>
                );
              }

              // Numerical or short parameter values
              return (
                <div
                  key={idx}
                  className="inline-flex items-center text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded mr-1 mb-1 border border-zinc-700/50"
                >
                  <span className="text-zinc-500 mr-1">p{idx}:</span>
                  <span className="text-zinc-200 truncate max-w-[120px]">{String(val)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Media Asset Preview Section (Images, Audio, Video, or Unbound Dropzone) */}
        {matchedAsset ? (
          <div className="mt-2 pt-2 border-t border-zinc-800/60">
            {/* 1. Image Asset */}
            {(matchedAsset.mimeType.startsWith('image/') ||
              ['cover', 'showcase', 'input', 'reference', 'output', 'comparison'].includes(matchedAsset.type)) && (
              <div
                className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group/img cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  onPreviewAsset?.(matchedAsset);
                }}
                title="点击查看高精原图"
              >
                <img
                  src={matchedAsset.dataUrl}
                  alt={matchedAsset.name}
                  className="w-full h-36 object-cover group-hover/img:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                  <span className="text-[10px] text-zinc-200 truncate max-w-[140px] font-medium">
                    {matchedAsset.name}
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur">
                    <Maximize2 className="w-2.5 h-2.5" /> 放大
                  </span>
                </div>
              </div>
            )}

            {/* 2. Audio Asset */}
            {(matchedAsset.type === 'audio' || matchedAsset.mimeType.startsWith('audio/')) && (
              <div
                className="p-2.5 bg-zinc-950/80 rounded-lg border border-purple-500/30 flex items-center justify-between gap-2"
                onClick={e => e.stopPropagation()}
              >
                <audio
                  ref={audioRef}
                  src={matchedAsset.dataUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  onPause={() => setIsPlayingAudio(false)}
                  onPlay={() => setIsPlayingAudio(true)}
                />
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (isPlayingAudio) audioRef.current.pause();
                        else audioRef.current.play();
                      }
                    }}
                    className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-colors"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-zinc-200 truncate">{matchedAsset.name}</div>
                    <div className="text-[9px] text-zinc-500 flex items-center gap-1">
                      <Volume2 className="w-2.5 h-2.5 text-purple-400" />
                      <span>{isPlayingAudio ? '播放中...' : '音频素材采样'}</span>
                    </div>
                  </div>
                </div>
                {isPlayingAudio && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="w-1 h-3 bg-purple-400 rounded animate-pulse" />
                    <span className="w-1 h-4 bg-purple-300 rounded animate-pulse delay-75" />
                    <span className="w-1 h-2 bg-purple-400 rounded animate-pulse delay-150" />
                  </div>
                )}
              </div>
            )}

            {/* 3. Video Asset */}
            {(matchedAsset.type === 'video' || matchedAsset.mimeType.startsWith('video/')) && (
              <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black">
                <video
                  src={matchedAsset.dataUrl}
                  controls
                  loop
                  className="w-full h-36 object-contain"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        ) : isMediaNode ? (
          /* Unbound media node dropzone */
          <div
            onClick={e => {
              e.stopPropagation();
              onBindAsset?.(node);
            }}
            className="mt-2 border border-dashed border-zinc-700/80 hover:border-cyan-500/80 bg-zinc-950/40 hover:bg-cyan-950/20 rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer group/upload"
            title="为此节点关联或上传素材"
          >
            <div className="flex items-center gap-1.5 text-zinc-400 group-hover/upload:text-cyan-300 mb-0.5">
              <Plus className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-semibold">关联或上传素材</span>
            </div>
            <span className="text-[9px] text-zinc-600">图片 / 视频 / 音频</span>
          </div>
        ) : null}
      </div>

      {/* Path highlight indicator badges */}
      {isUpstream && (
        <span className="absolute -top-2 left-4 px-1.5 py-0.2 bg-sky-500 text-sky-950 text-[9px] font-bold rounded-full uppercase tracking-wider">
          Upstream
        </span>
      )}
      {isDownstream && (
        <span className="absolute -top-2 right-4 px-1.5 py-0.2 bg-emerald-500 text-emerald-950 text-[9px] font-bold rounded-full uppercase tracking-wider">
          Downstream
        </span>
      )}
    </div>
  );
};
