/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComfyNode } from '../types/workflow';

export interface CandidateNode {
  id: string;
  title: string;
  type: string;
  category: 'input' | 'output' | 'processor' | 'other';
  categoryLabel: string;
  paramPreview?: string;
  currentBoundAssetId?: string;
  currentBoundAssetName?: string;
}

const INPUT_LOADER_NODE_TYPES = new Set([
  'loadimage',
  'loadimagemask',
  'loadimagebase64',
  'loadaudio',
  'loadvideo',
  'vhs_loadvideo',
  'vhs_loadimages',
  'vhs_loadvideopath',
  'rh_posegallery',
  'posegallery'
]);

const OUTPUT_NODE_TYPES = new Set([
  'saveimage',
  'previewimage',
  'imagesave',
  'vhs_videocombine',
  'saveaudio',
  'saveanimatediff',
  'previewaudio',
  'previewvideo'
]);

/**
 * Media slot types in ComfyUI that accept asset binding
 */
const MEDIA_SLOT_TYPES = new Set([
  'image',
  'images',
  'mask',
  'masks',
  'video',
  'audio'
]);

/**
 * Common non-media combo values or keywords in ComfyUI that definitely aren't asset filenames
 */
const NON_ASSET_STRINGS = new Set([
  '原尺寸',
  '按长边缩放',
  '按短边缩放',
  '裁剪居中',
  '填充黑边',
  'nearest-exact',
  'bilinear',
  'area',
  'bicubic',
  'lanczos',
  'bislerp',
  'euler',
  'euler_ancestral',
  'heun',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpm_fast',
  'dpm_adaptive',
  'dpmpp_2s_ancestral',
  'dpmpp_sde',
  'dpmpp_sde_gpu',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_2m_sde_gpu',
  'dpmpp_3m_sde',
  'dpmpp_3m_sde_gpu',
  'ddim',
  'uni_pc',
  'uni_pc_bh2',
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
  'fixed',
  'increment',
  'decrement',
  'randomize',
  'enable',
  'disable',
  'true',
  'false',
  'auto',
  'none'
]);

/**
 * Node types and patterns that NEVER bind media assets in ComfyUI under any circumstances.
 * Intermediate processing/encoding nodes, model loaders, samplers, vae, clip/prompts, latent math, caches.
 */
const NON_BINDABLE_NODE_PATTERNS = [
  'textencode',    // TextEncodeQwenImage21, CLIPTextEncode
  'encode',        // Any intermediate encoder
  'decode',        // VAEDecode
  'sampler',       // KSampler, KSamplerAdvanced, SamplerCustom, etc.
  'ksampler',
  'checkpoint',    // CheckpointLoader, CheckpointLoaderSimple
  'unetloader',
  'lora',          // LoraLoader, LoraLoaderModelOnly
  'cache',         // Qwen 2.1 Cache, CacheNode
  'freeu',
  'hypertile',
  'sampling',
  'modelsampling',
  'vae',           // VAELoader, VAEDecode, VAEEncode
  'clip',          // CLIPTextEncode, CLIPLoader, DualCLIPLoader
  'conditioning',  // ConditioningCombine, ConditioningAverage, ConditioningSetArea
  'fluxguidance',
  'latent',        // EmptyLatentImage, LatentUpscale, LatentBlend
  'controlnet',    // ApplyControlNet, ControlNetApply, ControlNetLoader
  'ipadapter',     // IPAdapterApply
  'pulid',         // ApplyPulID
  'instantid',
  'photomaker',
  'reactor',
  'faceanalysis',
  'preprocessor',  // CannyEdgePreprocessor, LineArt, OpenPose
  'scale',         // ImageScale
  'resize',
  'crop',
  'blend',
  'composite',
  'masktoimage',
  'imagetomask',
  'rembg',
  'reroute',
  'note',
  'markdownnote',
  'primitive',
  'switch',
  'compare'
];

/**
 * Check if a slot type or name represents media data eligible for asset binding.
 * Note: LATENT / latent_image is strictly excluded because it represents internal VAE latent space tensors,
 * NOT an external media file/asset.
 */
export function isInputSlotBindable(slot: { name: string; type: string }): boolean {
  if (!slot) return false;
  const typeLower = (slot.type || '').trim().toLowerCase();
  const nameLower = (slot.name || '').trim().toLowerCase();

  // 1. Strictly blacklist Latent and all non-media types
  if (
    typeLower === 'latent' ||
    typeLower === 'latent_key' ||
    typeLower.includes('latent') ||
    nameLower.includes('latent') ||
    typeLower === 'model' ||
    typeLower === 'vae' ||
    typeLower === 'clip' ||
    typeLower === 'conditioning' ||
    typeLower === 'control_net' ||
    typeLower === 'ipadapter' ||
    typeLower === 'int' ||
    typeLower === 'float' ||
    typeLower === 'boolean' ||
    typeLower === 'combo' ||
    typeLower === 'string'
  ) {
    return false;
  }

  // 2. If type is explicitly a media type
  if (MEDIA_SLOT_TYPES.has(typeLower)) return true;

  // 3. Name indicates real media port (strictly exclude anything latent or model)
  if (
    nameLower === 'image' ||
    nameLower === 'pixels' ||
    nameLower === 'mask' ||
    nameLower === 'video' ||
    nameLower === 'audio' ||
    nameLower === 'source_image' ||
    nameLower === 'target_image' ||
    nameLower === 'reference_image' ||
    nameLower === 'pose_image'
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a widget parameter is eligible for asset binding.
 * In ComfyUI, only string widgets containing filenames/paths or primary media slots in loader nodes are bindable.
 * Numbers (width, height, steps, seed), Booleans (flip, enable), Model weights (.safetensors),
 * and Option Combos (resize_mode, sampler) are strictly NOT bindable.
 */
export function isWidgetBindable(
  widgetVal: any,
  widgetIndex: number,
  node: ComfyNode
): boolean {
  // If the node itself is a non-bindable node, its widgets are NEVER assets!
  const nodeType = (node?.type || '').toLowerCase();
  for (const pattern of NON_BINDABLE_NODE_PATTERNS) {
    if (nodeType.includes(pattern)) {
      return false;
    }
  }

  // 1. Primitive types check: Numbers and Booleans can NEVER be assets
  if (typeof widgetVal === 'number' || typeof widgetVal === 'boolean') {
    return false;
  }
  if (widgetVal === null || widgetVal === undefined) {
    return false;
  }

  // If it's an object or array, not a direct asset reference
  if (typeof widgetVal !== 'string') {
    return false;
  }

  const str = widgetVal.trim();
  if (str.length === 0) return false;

  const lower = str.toLowerCase();

  // Reject model and neural network weights
  if (
    lower.endsWith('.safetensors') ||
    lower.endsWith('.ckpt') ||
    lower.endsWith('.pt') ||
    lower.endsWith('.bin') ||
    lower.endsWith('.pth')
  ) {
    return false;
  }

  // 2. Reject known non-asset combos
  if (NON_ASSET_STRINGS.has(str) || NON_ASSET_STRINGS.has(lower)) {
    return false;
  }

  // Reject pure numbers formatted as strings
  if (!isNaN(Number(str))) {
    return false;
  }

  // 3. Known media file extensions (always bindable)
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.ogg')
  ) {
    return true;
  }

  // 4. Check node type: is this node a source media loader/gallery node where widget[0] is the asset identifier?
  const nodeTitle = (node?.title || '').toLowerCase();

  const isMediaSourceNode =
    nodeType.includes('loadimage') ||
    nodeType.includes('loadvideo') ||
    nodeType.includes('loadaudio') ||
    nodeType.includes('pose') ||
    nodeType.includes('gallery') ||
    nodeType.includes('rh_pose') ||
    nodeTitle.includes('图库') ||
    nodeTitle.includes('姿势图库') ||
    nodeTitle.includes('参考图') ||
    nodeTitle.includes('垫图') ||
    nodeTitle.includes('输入图');

  // In media source nodes, only widget index 0 (the primary asset filename / pose ID) is bindable!
  // Subsequent widgets are resize_mode, width, height, flip, etc.
  if (isMediaSourceNode && widgetIndex === 0) {
    return true;
  }

  return false;
}

/**
 * Check if a ComfyNode as a whole can be bound to media assets.
 * In ComfyUI workflow architecture, asset binding is strictly restricted to:
 * 1. Source Media Loaders / Upload Nodes (where external media files enter the graph)
 * 2. Terminal Media Output / Save Nodes (where generated deliverables exit the graph)
 *
 * ALL intermediate processing nodes (e.g. Multimodal Text/Prompt Encoders like TextEncodeQwenImage21,
 * ControlNet Apply, Image Scalers, VAE Decode, Samplers) are strictly NON-BINDABLE.
 */
export function isNodeBindable(node: ComfyNode): boolean {
  if (!node) return false;

  const nodeType = (node.type || '').trim().toLowerCase();
  const nodeTitle = (node.title || '').trim().toLowerCase();

  // 1. Strict blacklist: any intermediate or compute pattern is disqualified immediately
  for (const pattern of NON_BINDABLE_NODE_PATTERNS) {
    if (nodeType.includes(pattern)) {
      return false;
    }
  }

  // 2. Strict title blacklist: Any title containing intermediate concepts
  if (
    nodeTitle.includes('提示词') ||
    nodeTitle.includes('prompt') ||
    nodeTitle.includes('编码') ||
    nodeTitle.includes('encode') ||
    nodeTitle.includes('采样') ||
    nodeTitle.includes('sampler') ||
    nodeTitle.includes('模型') ||
    nodeTitle.includes('lora') ||
    nodeTitle.includes('cache') ||
    nodeTitle.includes('缓存') ||
    nodeTitle.includes('潜空间') ||
    nodeTitle.includes('latent') ||
    nodeTitle.includes('vae') ||
    nodeTitle.includes('预处理') ||
    nodeTitle.includes('缩放') ||
    nodeTitle.includes('裁剪') ||
    nodeTitle.includes('混合') ||
    nodeTitle.includes('融合') ||
    nodeTitle.includes('controlnet') ||
    nodeTitle.includes('ipadapter')
  ) {
    // Only allow if it is explicitly an input gallery/uploader or final save
    if (
      !nodeTitle.includes('图库') &&
      !nodeTitle.includes('上传') &&
      !nodeTitle.includes('保存') &&
      !nodeTitle.includes('成果')
    ) {
      return false;
    }
  }

  // 3. Known source media loader types
  if (INPUT_LOADER_NODE_TYPES.has(nodeType)) {
    return true;
  }

  // 4. Known terminal media output types
  if (OUTPUT_NODE_TYPES.has(nodeType)) {
    return true;
  }

  // 5. Title specifies genuine source media loader (and not an intermediate node)
  if (
    (nodeTitle.includes('输入图') ||
     nodeTitle.includes('参考图') ||
     nodeTitle.includes('姿势图库') ||
     nodeTitle.includes('姿势图') ||
     nodeTitle.includes('线稿图') ||
     nodeTitle.includes('上传图') ||
     nodeTitle.includes('垫图')) &&
    !nodeType.includes('encode') &&
    !nodeType.includes('text') &&
    !nodeType.includes('clip') &&
    !nodeType.includes('apply')
  ) {
    return true;
  }

  // 6. Title specifies genuine output deliverable
  if (
    nodeTitle.includes('成果图') ||
    nodeTitle.includes('最终输出') ||
    nodeTitle.includes('保存图') ||
    nodeTitle.includes('最终成果')
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts human-friendly parameter summary (e.g. original filename or format)
 */
export function extractNodeParamPreview(node: ComfyNode): string | undefined {
  const widgets = node.widgets_values || [];
  if (widgets.length === 0) return undefined;

  // 1. Look for bindable asset filenames first
  for (let idx = 0; idx < widgets.length; idx++) {
    const w = widgets[idx];
    if (isWidgetBindable(w, idx, node)) {
      return `素材参数: ${w}`;
    }
  }

  // 2. Specific node types
  const typeLower = (node.type || '').toLowerCase();
  if (typeLower.includes('vhs_videocombine')) {
    const format = widgets.find(w => typeof w === 'string' && (w.includes('video') || w.includes('h264') || w.includes('mp4')));
    if (format) return `格式: ${format}`;
  }

  if (typeLower.includes('saveimage')) {
    const prefix = widgets[0];
    if (typeof prefix === 'string' && prefix.length > 0) {
      return `前缀: ${prefix}`;
    }
  }

  return undefined;
}

/**
 * Filter and categorize nodes in a workflow to find candidates for asset binding
 */
export function filterCandidateNodes(
  nodes: ComfyNode[],
  boundMap?: Map<string, { assetId: string; assetName: string }>
): {
  inputNodes: CandidateNode[];
  outputNodes: CandidateNode[];
  otherNodes: CandidateNode[];
  allCandidates: CandidateNode[];
} {
  const inputNodes: CandidateNode[] = [];
  const outputNodes: CandidateNode[] = [];
  const otherNodes: CandidateNode[] = [];

  for (const node of nodes) {
    const id = String(node.id);
    const title = node.title || node.type || `Node #${id}`;
    const typeLower = (node.type || '').toLowerCase();
    const titleLower = title.toLowerCase();

    const paramPreview = extractNodeParamPreview(node);
    const boundInfo = boundMap?.get(id);

    // Strictly evaluate if the node is capable of binding media assets
    const bindable = isNodeBindable(node);

    let category: CandidateNode['category'] = 'other';
    let categoryLabel = '非素材节点';

    if (bindable) {
      const isOutput =
        OUTPUT_NODE_TYPES.has(typeLower) ||
        titleLower.includes('输出') ||
        titleLower.includes('保存') ||
        titleLower.includes('预览') ||
        titleLower.includes('最终') ||
        titleLower.includes('save') ||
        titleLower.includes('preview') ||
        titleLower.includes('output');

      if (isOutput) {
        category = 'output';
        categoryLabel = '成果输出节点';
      } else {
        category = 'input';
        categoryLabel = '媒体输入节点';
      }
    } else {
      category = 'processor';
      categoryLabel = '逻辑/生成节点 (无需素材)';
    }

    const candidate: CandidateNode = {
      id,
      title,
      type: node.type,
      category,
      categoryLabel,
      paramPreview,
      currentBoundAssetId: boundInfo?.assetId,
      currentBoundAssetName: boundInfo?.assetName
    };

    if (category === 'input') {
      inputNodes.push(candidate);
    } else if (category === 'output') {
      outputNodes.push(candidate);
    } else {
      otherNodes.push(candidate);
    }
  }

  // All eligible candidates: only real media input/output nodes
  const allCandidates = [...inputNodes, ...outputNodes];

  return {
    inputNodes,
    outputNodes,
    otherNodes,
    allCandidates
  };
}
