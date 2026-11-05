/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComfyWorkflowRaw,
  ComfyNode,
  ComfyLink,
  ComfyGroup,
  ExtractedMeta,
  WorkflowRecord
} from '../types/workflow';

// Simple deterministic string hash for fingerprints
export function computeFingerprint(raw: ComfyWorkflowRaw): string {
  try {
    const nodeSignatures = raw.nodes
      .map(n => `${n.type}:${(n.inputs || []).map(i => `${i.name}:${i.type}`).join(',')}`)
      .sort()
      .join('|');
    const linkSignatures = raw.links
      .map(l => `${l[1]}-${l[2]}->${l[3]}-${l[4]}`)
      .sort()
      .join(';');
    
    let hash = 0;
    const str = `${nodeSignatures}#${linkSignatures}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'fp_' + Math.abs(hash).toString(16).padStart(8, '0');
  } catch {
    return 'fp_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Normalizes node size to [width, height]
 */
export function getNodeDimensions(node: ComfyNode): [number, number] {
  if (Array.isArray(node.size)) {
    return [Math.max(160, node.size[0] || 220), Math.max(80, node.size[1] || 120)];
  } else if (node.size && typeof node.size === 'object') {
    const s = node.size as { 0: number; 1: number };
    return [Math.max(160, s[0] || 220), Math.max(80, s[1] || 120)];
  }
  return [220, 120];
}

/**
 * Extracts comprehensive metadata from ComfyUI nodes & widgets
 */
export function extractMetadata(raw: ComfyWorkflowRaw): {
  modelInfo: string;
  meta: ExtractedMeta;
  suggestedTags: { categoryKey: string; tagName: string }[];
} {
  const checkpoints = new Set<string>();
  const loras = new Set<string>();
  const controlnets = new Set<string>();
  const samplers = new Set<string>();
  const vaes = new Set<string>();
  const upscalers = new Set<string>();
  const customNodeTypes = new Set<string>();

  let hasInpaint = false;
  let hasVideo = false;
  let hasFaceRestore = false;
  let isFlux = false;
  let isSDXL = false;
  let isSD15 = false;
  let isHunyuan = false;
  let isQwen = false;
  let isWan = false;
  let hasPuLID = false;
  let hasIPAdapter = false;
  let hasControlNet = false;
  let hasImageToImage = false;

  for (const node of raw.nodes) {
    const type = node.type || '';
    const typeLower = type.toLowerCase();
    const titleLower = (node.title || '').toLowerCase();
    const widgets = node.widgets_values || [];

    // Detect checkpoints
    if (typeLower.includes('checkpoint') || typeLower.includes('ckptloader')) {
      for (const w of widgets) {
        if (typeof w === 'string' && (w.endsWith('.safetensors') || w.endsWith('.ckpt'))) {
          checkpoints.add(w);
          const wLower = w.toLowerCase();
          if (wLower.includes('flux')) isFlux = true;
          if (wLower.includes('sdxl') || wLower.includes('xl')) isSDXL = true;
          if (wLower.includes('1.5') || wLower.includes('v1-5')) isSD15 = true;
          if (wLower.includes('hunyuan')) isHunyuan = true;
          if (wLower.includes('qwen')) isQwen = true;
          if (wLower.includes('wan')) isWan = true;
        }
      }
    }

    // Detect LoRA
    if (typeLower.includes('lora')) {
      for (const w of widgets) {
        if (typeof w === 'string' && (w.endsWith('.safetensors') || w.endsWith('.ckpt') || w.includes('lora'))) {
          loras.add(w);
        }
      }
    }

    // Detect ControlNet
    if (typeLower.includes('controlnet')) {
      hasControlNet = true;
      for (const w of widgets) {
        if (typeof w === 'string' && (w.endsWith('.safetensors') || w.includes('controlnet') || w.includes('depth') || w.includes('canny'))) {
          controlnets.add(w);
        }
      }
    }

    // Detect Samplers
    if (typeLower.includes('ksampler')) {
      for (const w of widgets) {
        if (typeof w === 'string' && ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_sde', 'ddim', 'unipc'].some(s => w.toLowerCase().includes(s))) {
          samplers.add(w);
        }
      }
    }

    // Detect VAE
    if (typeLower.includes('vae') && (typeLower.includes('loader') || typeLower.includes('decode'))) {
      for (const w of widgets) {
        if (typeof w === 'string' && (w.endsWith('.safetensors') || w.endsWith('.pt') || w.includes('vae'))) {
          vaes.add(w);
        }
      }
    }

    // Detect Upscale
    if (typeLower.includes('upscale') || typeLower.includes('esrgan')) {
      for (const w of widgets) {
        if (typeof w === 'string' && (w.includes('4x') || w.includes('ultrasharp') || w.includes('nmkd'))) {
          upscalers.add(w);
        }
      }
    }

    // Detect specialized workflows
    if (typeLower.includes('inpaint') || titleLower.includes('inpaint') || typeLower.includes('mask')) {
      hasInpaint = true;
    }
    if (typeLower.includes('video') || typeLower.includes('animate') || typeLower.includes('vhs') || typeLower.includes('hunyuan')) {
      hasVideo = true;
    }
    if (typeLower.includes('facedetailer') || typeLower.includes('reactor') || typeLower.includes('pulid') || typeLower.includes('insightface')) {
      hasFaceRestore = true;
    }
    if (typeLower.includes('pulid')) {
      hasPuLID = true;
    }
    if (typeLower.includes('ipadapter')) {
      hasIPAdapter = true;
    }
    if (typeLower.includes('loadimage') && raw.nodes.some(n => n.type.toLowerCase().includes('vaeen'))) {
      hasImageToImage = true;
    }

    // Custom nodes (non standard basic ones)
    const standardPrefixes = ['ksampler', 'checkpointloader', 'cliptextencode', 'vaedecode', 'vaeencode', 'saveimage', 'emptylatent', 'previewimage', 'loadimage'];
    if (!standardPrefixes.some(p => typeLower.startsWith(p))) {
      customNodeTypes.add(type);
    }
  }

  // Determine Primary Model Architecture
  let modelInfo = 'Universal';
  if (isFlux) modelInfo = 'Flux.1';
  else if (isQwen) modelInfo = 'Qwen Image';
  else if (isHunyuan) modelInfo = 'HunyuanVideo';
  else if (isWan) modelInfo = 'Wan 2.1';
  else if (isSDXL) modelInfo = 'SDXL';
  else if (isSD15) modelInfo = 'SD 1.5';
  else if (checkpoints.size > 0) {
    const firstCkpt = Array.from(checkpoints)[0];
    modelInfo = firstCkpt.replace(/\.[^/.]+$/, '').split(/[-_]/)[0];
  }

  const meta: ExtractedMeta = {
    checkpoints: Array.from(checkpoints),
    loras: Array.from(loras),
    controlnets: Array.from(controlnets),
    samplers: Array.from(samplers),
    vaes: Array.from(vaes),
    upscalers: Array.from(upscalers),
    customNodeTypes: Array.from(customNodeTypes),
    hasInpaint,
    hasVideo,
    hasFaceRestore
  };

  // Suggest tags across dimensions
  const suggestedTags: { categoryKey: string; tagName: string }[] = [];

  // 1. Model Dimension
  suggestedTags.push({ categoryKey: 'model', tagName: modelInfo });

  // 2. Workflow Type Dimension
  if (raw.nodes.length > 12) {
    suggestedTags.push({ categoryKey: 'type', tagName: '完整工作流' });
  } else if (hasInpaint || upscalers.size > 0) {
    suggestedTags.push({ categoryKey: 'type', tagName: '后处理放大' });
  } else {
    suggestedTags.push({ categoryKey: 'type', tagName: '局部微调' });
  }

  // 3. Task Dimension
  if (hasVideo) {
    suggestedTags.push({ categoryKey: 'task', tagName: '视频生成' });
  } else if (hasInpaint) {
    suggestedTags.push({ categoryKey: 'task', tagName: '局部重绘' });
  } else if (hasImageToImage) {
    suggestedTags.push({ categoryKey: 'task', tagName: '图生图' });
  } else {
    suggestedTags.push({ categoryKey: 'task', tagName: '文生图' });
  }

  // 4. Technique Dimension
  if (hasPuLID) suggestedTags.push({ categoryKey: 'technique', tagName: 'PuLID' });
  if (hasIPAdapter) suggestedTags.push({ categoryKey: 'technique', tagName: 'IP-Adapter' });
  if (hasControlNet) suggestedTags.push({ categoryKey: 'technique', tagName: 'ControlNet' });
  if (loras.size > 0) suggestedTags.push({ categoryKey: 'technique', tagName: 'LoRA' });

  // 5. Scenario Dimension (heuristics)
  if (hasFaceRestore || hasPuLID) {
    suggestedTags.push({ categoryKey: 'scenario', tagName: '人像写真' });
  }

  return { modelInfo, meta, suggestedTags };
}

/**
 * Parses ComfyUI workflow JSON string (supports Web UI format and API format)
 */
export function parseComfyUIWorkflow(
  jsonStr: string,
  fileName?: string
): {
  raw: ComfyWorkflowRaw;
  record: WorkflowRecord;
  suggestedTags: { categoryKey: string; tagName: string }[];
} {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err: any) {
    throw new Error('无效的 JSON 格式: ' + err.message);
  }

  let raw: ComfyWorkflowRaw;

  // Case A: ComfyUI Web UI standard format with `nodes` and `links`
  if (parsed && Array.isArray(parsed.nodes)) {
    raw = {
      last_node_id: parsed.last_node_id || parsed.nodes.length,
      last_link_id: parsed.last_link_id || (parsed.links ? parsed.links.length : 0),
      nodes: parsed.nodes.map((n: any, idx: number) => ({
        id: n.id ?? idx + 1,
        type: n.type || 'UnknownNode',
        pos: Array.isArray(n.pos) ? [Number(n.pos[0]) || 0, Number(n.pos[1]) || 0] : [0, 0],
        size: getNodeDimensions(n),
        flags: n.flags || {},
        order: n.order ?? idx,
        mode: n.mode ?? 0,
        inputs: Array.isArray(n.inputs) ? n.inputs : [],
        outputs: Array.isArray(n.outputs) ? n.outputs : [],
        properties: n.properties || {},
        widgets_values: Array.isArray(n.widgets_values) ? n.widgets_values : [],
        title: n.title || n.type,
        color: n.color,
        bgcolor: n.bgcolor
      })),
      links: Array.isArray(parsed.links) ? parsed.links : [],
      groups: Array.isArray(parsed.groups)
        ? parsed.groups.map((g: any) => ({
            title: g.title || 'Group',
            bounding: Array.isArray(g.bounding) && g.bounding.length === 4 ? g.bounding : [0, 0, 400, 300],
            color: g.color || '#3f3f46',
            font_size: g.font_size || 24
          }))
        : [],
      config: parsed.config || {},
      extra: parsed.extra || {}
    };
  }
  // Case B: ComfyUI API Prompt format (object where keys are node IDs, and values have class_type, inputs)
  else if (typeof parsed === 'object' && parsed !== null) {
    const nodes: ComfyNode[] = [];
    const links: ComfyLink[] = [];
    let linkIdCounter = 1;

    const entries = Object.entries(parsed);
    entries.forEach(([idStr, nodeData]: [string, any], index) => {
      const classType = nodeData.class_type || 'Unknown';
      const inputsObj = nodeData.inputs || {};
      const nodeInputs: any[] = [];
      const widgetsValues: any[] = [];

      Object.entries(inputsObj).forEach(([inputName, val]: [string, any]) => {
        if (Array.isArray(val) && val.length === 2) {
          // Link to another node: [source_node_id, slot_index]
          const sourceNodeId = val[0];
          const sourceSlot = Number(val[1]) || 0;
          const currentLinkId = linkIdCounter++;
          links.push([currentLinkId, sourceNodeId, sourceSlot, idStr, nodeInputs.length, 'ANY']);
          nodeInputs.push({
            name: inputName,
            type: 'ANY',
            link: currentLinkId,
            slot_index: nodeInputs.length
          });
        } else {
          // Normal widget input
          widgetsValues.push(val);
          nodeInputs.push({
            name: inputName,
            type: typeof val === 'number' ? 'FLOAT' : 'STRING',
            link: null,
            slot_index: nodeInputs.length
          });
        }
      });

      nodes.push({
        id: idStr,
        type: classType,
        pos: [index * 280, 100],
        size: [240, 140],
        inputs: nodeInputs,
        outputs: [
          { name: 'OUTPUT', type: 'ANY', links: [], slot_index: 0 }
        ],
        widgets_values: widgetsValues,
        title: classType
      });
    });

    raw = {
      nodes,
      links,
      groups: []
    };
  } else {
    throw new Error('未识别的 ComfyUI 工作流格式');
  }

  const { modelInfo, meta, suggestedTags } = extractMetadata(raw);
  const fingerprint = computeFingerprint(raw);
  const derivedName = fileName
    ? fileName.replace(/\.json$/i, '')
    : `${modelInfo} ${suggestedTags.find(t => t.categoryKey === 'task')?.tagName || 'Workflow'}`;

  const id = 'wf_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  const record: WorkflowRecord = {
    id,
    name: derivedName,
    description: `包含 ${raw.nodes.length} 个节点和 ${raw.links.length} 条连接的 ${modelInfo} 工作流。`,
    source: fileName || 'Imported File',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    fingerprint,
    nodeCount: raw.nodes.length,
    linkCount: raw.links.length,
    modelInfo,
    extractedMeta: meta,
    rawJson: jsonStr
  };

  return { raw, record, suggestedTags };
}
