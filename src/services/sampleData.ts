/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TagCategory,
  Tag,
  ComfyWorkflowRaw,
  WorkflowRecord,
  AssetType
} from '../types/workflow';

export const DEFAULT_CATEGORIES: TagCategory[] = [
  {
    id: 'cat_model',
    key: 'model',
    name: '模型 / 架构',
    description: '基础大模型与架构类型',
    color: '#8b5cf6', // purple
    isSystem: true
  },
  {
    id: 'cat_type',
    key: 'type',
    name: '工作流类型',
    description: '完整生产流、模块微调或放大管线',
    color: '#3b82f6', // blue
    isSystem: true
  },
  {
    id: 'cat_task',
    key: 'task',
    name: '任务 / 功能',
    description: '文生图、图生图、重绘、视频等目标',
    color: '#10b981', // emerald
    isSystem: true
  },
  {
    id: 'cat_scenario',
    key: 'scenario',
    name: '应用场景',
    description: '写真、二次元、电商、概念设计等场景',
    color: '#f59e0b', // amber
    isSystem: true
  },
  {
    id: 'cat_technique',
    key: 'technique',
    name: '技术 / 方法',
    description: 'PuLID, ControlNet, LoRA, IC-Light 等特化方案',
    color: '#ec4899', // pink
    isSystem: true
  },
  {
    id: 'cat_custom',
    key: 'custom',
    name: '自定义标签',
    description: '个性化标记与业务分类',
    color: '#6366f1', // indigo
    isSystem: true
  }
];

export const DEFAULT_TAGS: Tag[] = [
  // Model
  { id: 'tag_flux', categoryId: 'cat_model', name: 'Flux.1' },
  { id: 'tag_qwen', categoryId: 'cat_model', name: 'Qwen Image' },
  { id: 'tag_sdxl', categoryId: 'cat_model', name: 'SDXL' },
  { id: 'tag_sd15', categoryId: 'cat_model', name: 'SD 1.5' },
  { id: 'tag_hunyuan', categoryId: 'cat_model', name: 'HunyuanVideo' },
  { id: 'tag_wan', categoryId: 'cat_model', name: 'Wan 2.1' },
  // Type
  { id: 'tag_full_wf', categoryId: 'cat_type', name: '完整工作流' },
  { id: 'tag_finetune', categoryId: 'cat_type', name: '局部微调' },
  { id: 'tag_upscale', categoryId: 'cat_type', name: '后处理放大' },
  { id: 'tag_template', categoryId: 'cat_type', name: '节点组模板' },
  // Task
  { id: 'tag_t2i', categoryId: 'cat_task', name: '文生图' },
  { id: 'tag_i2i', categoryId: 'cat_task', name: '图生图' },
  { id: 'tag_inpaint', categoryId: 'cat_task', name: '局部重绘' },
  { id: 'tag_t2v', categoryId: 'cat_task', name: '视频生成' },
  { id: 'tag_faceswap', categoryId: 'cat_task', name: '换脸修复' },
  // Scenario
  { id: 'tag_portrait', categoryId: 'cat_scenario', name: '人像写真' },
  { id: 'tag_ecommerce', categoryId: 'cat_scenario', name: '电商商拍' },
  { id: 'tag_anime', categoryId: 'cat_scenario', name: '二次元动漫' },
  { id: 'tag_landscape', categoryId: 'cat_scenario', name: '场景概念' },
  // Technique
  { id: 'tag_pulid', categoryId: 'cat_technique', name: 'PuLID' },
  { id: 'tag_controlnet', categoryId: 'cat_technique', name: 'ControlNet' },
  { id: 'tag_lora', categoryId: 'cat_technique', name: 'LoRA' },
  { id: 'tag_iclight', categoryId: 'cat_technique', name: 'IC-Light' },
  { id: 'tag_facedetailer', categoryId: 'cat_technique', name: 'FaceDetailer' },
  // Custom
  { id: 'tag_starred', categoryId: 'cat_custom', name: '标杆典藏' },
  { id: 'tag_production', categoryId: 'cat_custom', name: '生产就绪' },
  { id: 'tag_highspeed', categoryId: 'cat_custom', name: '秒级极速' }
];

// Helper to generate dynamic aesthetic SVG preview images as data URLs
function createGraphicSvgDataUrl(
  title: string,
  subtitle: string,
  primaryColor: string,
  secondaryColor: string,
  badgeText: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="40%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="${secondaryColor}" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)" />
    <rect width="100%" height="100%" fill="url(#grid)" />
    <circle cx="480" cy="260" r="320" fill="url(#glow)" />
    
    <g transform="translate(80, 70)">
      <rect x="0" y="0" width="130" height="32" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <text x="65" y="21" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#f8fafc" text-anchor="middle">${badgeText}</text>
    </g>

    <!-- Visual abstract node graph art in background -->
    <g opacity="0.38" stroke="url(#accent)" stroke-width="2" fill="none">
      <path d="M 120 400 C 260 300, 320 480, 480 340 C 640 200, 700 380, 840 280" />
      <path d="M 160 480 C 300 460, 420 320, 560 390 C 700 460, 760 220, 880 240" stroke-dasharray="6 6"/>
      <circle cx="120" cy="400" r="8" fill="${primaryColor}" />
      <circle cx="480" cy="340" r="10" fill="${secondaryColor}" />
      <circle cx="840" cy="280" r="8" fill="${primaryColor}" />
    </g>

    <!-- Foreground Typography & Card Frame -->
    <g transform="translate(80, 240)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">${title}</text>
      <text x="0" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="400" fill="#94a3b8">${subtitle}</text>
      
      <rect x="0" y="75" width="220" height="4" rx="2" fill="url(#accent)" />
      
      <g transform="translate(0, 110)">
        <text x="0" y="0" font-family="monospace" font-size="14" fill="#64748b">FlowLens Visual Output Benchmark &bull; ComfyUI Architecture</text>
      </g>
    </g>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// 1. Qwen Portrait PuLID & FaceDetailer Workflow
const rawWf1: ComfyWorkflowRaw = {
  last_node_id: 11,
  last_link_id: 14,
  nodes: [
    {
      id: 1,
      type: 'CheckpointLoaderSimple',
      pos: [60, 80],
      size: [280, 100],
      outputs: [
        { name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 },
        { name: 'CLIP', type: 'CLIP', links: [2, 3], slot_index: 1 },
        { name: 'VAE', type: 'VAE', links: [4], slot_index: 2 }
      ],
      widgets_values: ['qwen_image_portrait_v2.safetensors']
    },
    {
      id: 2,
      type: 'PuLIDModelLoader',
      pos: [60, 240],
      size: [260, 80],
      outputs: [{ name: 'PULID', type: 'PULID', links: [5], slot_index: 0 }],
      widgets_values: ['pulid_flux_v1.safetensors']
    },
    {
      id: 3,
      type: 'LoadImage',
      pos: [60, 360],
      size: [260, 200],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [6], slot_index: 0 }],
      widgets_values: ['reference_asian_cyberpunk_face.png', 'image']
    },
    {
      id: 4,
      type: 'ApplyPuLID',
      pos: [400, 140],
      size: [260, 140],
      inputs: [
        { name: 'model', type: 'MODEL', link: 1 },
        { name: 'pulid', type: 'PULID', link: 5 },
        { name: 'image', type: 'IMAGE', link: 6 }
      ],
      outputs: [{ name: 'MODEL', type: 'MODEL', links: [7], slot_index: 0 }],
      widgets_values: [0.85, 0.0, 1.0, 'fidelity']
    },
    {
      id: 5,
      type: 'CLIPTextEncode',
      title: 'Positive Prompt',
      pos: [400, 320],
      size: [320, 140],
      inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [8], slot_index: 0 }],
      widgets_values: ['Masterpiece, close-up photographic studio portrait of a woman with sleek silver hair, subtle cybernetic circuitry glow, 85mm portrait lens, ultra high resolution, cinematic lighting']
    },
    {
      id: 6,
      type: 'CLIPTextEncode',
      title: 'Negative Prompt',
      pos: [400, 500],
      size: [320, 100],
      inputs: [{ name: 'clip', type: 'CLIP', link: 3 }],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [9], slot_index: 0 }],
      widgets_values: ['low quality, blurry, deformed eyes, extra fingers, cartoonish, plastic texture']
    },
    {
      id: 7,
      type: 'EmptyLatentImage',
      pos: [400, 640],
      size: [240, 110],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [10], slot_index: 0 }],
      widgets_values: [1024, 1536, 1]
    },
    {
      id: 8,
      type: 'KSampler',
      pos: [780, 220],
      size: [280, 260],
      inputs: [
        { name: 'model', type: 'MODEL', link: 7 },
        { name: 'positive', type: 'CONDITIONING', link: 8 },
        { name: 'negative', type: 'CONDITIONING', link: 9 },
        { name: 'latent_image', type: 'LATENT', link: 10 }
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [11], slot_index: 0 }],
      widgets_values: [7481923, 'fixed', 28, 6.5, 'dpmpp_2m', 'karras', 1.0]
    },
    {
      id: 9,
      type: 'VAEDecode',
      pos: [1120, 220],
      size: [200, 100],
      inputs: [
        { name: 'samples', type: 'LATENT', link: 11 },
        { name: 'vae', type: 'VAE', link: 4 }
      ],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [12], slot_index: 0 }]
    },
    {
      id: 10,
      type: 'FaceDetailer',
      pos: [1360, 200],
      size: [300, 280],
      inputs: [
        { name: 'image', type: 'IMAGE', link: 12 },
        { name: 'model', type: 'MODEL', link: 7 }
      ],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [13], slot_index: 0 }],
      widgets_values: [1024, true, 20, 4.5, 'euler', 'normal', 0.35]
    },
    {
      id: 11,
      type: 'SaveImage',
      pos: [1720, 220],
      size: [280, 240],
      inputs: [{ name: 'images', type: 'IMAGE', link: 13 }],
      widgets_values: ['Qwen_PuLID_StudioPortrait']
    }
  ],
  links: [
    [1, 1, 0, 4, 0, 'MODEL'],
    [2, 1, 1, 5, 0, 'CLIP'],
    [3, 1, 1, 6, 0, 'CLIP'],
    [4, 1, 2, 9, 1, 'VAE'],
    [5, 2, 0, 4, 1, 'PULID'],
    [6, 3, 0, 4, 2, 'IMAGE'],
    [7, 4, 0, 8, 0, 'MODEL'],
    [8, 5, 0, 8, 1, 'CONDITIONING'],
    [9, 6, 0, 8, 2, 'CONDITIONING'],
    [10, 7, 0, 8, 3, 'LATENT'],
    [11, 8, 0, 9, 0, 'LATENT'],
    [12, 9, 0, 10, 0, 'IMAGE'],
    [13, 10, 0, 11, 0, 'IMAGE']
  ],
  groups: [
    {
      title: '01 - 模型与 PuLID 人脸特征注入',
      bounding: [40, 20, 650, 750],
      color: '#3b82f6',
      font_size: 20
    },
    {
      title: '02 - 基础潜空间扩散采样 (Base KSampler)',
      bounding: [740, 160, 360, 360],
      color: '#10b981',
      font_size: 20
    },
    {
      title: '03 - 高精微表面 FaceDetailer 局部修缮',
      bounding: [1320, 140, 720, 400],
      color: '#f59e0b',
      font_size: 20
    }
  ]
};

// 2. SDXL Anime Landscape Master Workflow
const rawWf2: ComfyWorkflowRaw = {
  last_node_id: 10,
  last_link_id: 12,
  nodes: [
    {
      id: 1,
      type: 'CheckpointLoaderSimple',
      pos: [60, 100],
      size: [280, 100],
      outputs: [
        { name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 },
        { name: 'CLIP', type: 'CLIP', links: [2], slot_index: 1 },
        { name: 'VAE', type: 'VAE', links: [3], slot_index: 2 }
      ],
      widgets_values: ['animagine_xl_v3.1.safetensors']
    },
    {
      id: 2,
      type: 'LoraLoaderModelOnly',
      pos: [380, 80],
      size: [260, 100],
      inputs: [{ name: 'model', type: 'MODEL', link: 1 }],
      outputs: [{ name: 'MODEL', type: 'MODEL', links: [4], slot_index: 0 }],
      widgets_values: ['ghibli_style_scenery_sdxl.safetensors', 0.8]
    },
    {
      id: 3,
      type: 'ControlNetLoader',
      pos: [60, 260],
      size: [260, 80],
      outputs: [{ name: 'CONTROL_NET', type: 'CONTROL_NET', links: [5], slot_index: 0 }],
      widgets_values: ['controlnet_sdxl_lineart.safetensors']
    },
    {
      id: 4,
      type: 'LoadImage',
      pos: [60, 380],
      size: [260, 200],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [6], slot_index: 0 }],
      widgets_values: ['island_rough_sketch.png', 'image']
    },
    {
      id: 5,
      type: 'CLIPTextEncode',
      title: 'Positive Prompt (Anime Scenery)',
      pos: [380, 240],
      size: [320, 140],
      inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [7], slot_index: 0 }],
      widgets_values: ['Masterpiece, 1landscape, floating sky kingdom, ethereal cloud ocean, glowing ruins, cherry blossoms blooming, dramatic sunset lighting, Studio Ghibli style, Makoto Shinkai artwork']
    },
    {
      id: 6,
      type: 'ControlNetApplyAdvanced',
      pos: [740, 160],
      size: [280, 180],
      inputs: [
        { name: 'positive', type: 'CONDITIONING', link: 7 },
        { name: 'control_net', type: 'CONTROL_NET', link: 5 },
        { name: 'image', type: 'IMAGE', link: 6 }
      ],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [8], slot_index: 0 }],
      widgets_values: [0.75, 0.0, 0.85]
    },
    {
      id: 7,
      type: 'EmptyLatentImage',
      pos: [740, 380],
      size: [240, 100],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [9], slot_index: 0 }],
      widgets_values: [1344, 768, 1]
    },
    {
      id: 8,
      type: 'KSampler',
      pos: [1080, 180],
      size: [280, 260],
      inputs: [
        { name: 'model', type: 'MODEL', link: 4 },
        { name: 'positive', type: 'CONDITIONING', link: 8 },
        { name: 'latent_image', type: 'LATENT', link: 9 }
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [10], slot_index: 0 }],
      widgets_values: [884129, 'fixed', 32, 7.0, 'euler_ancestral', 'karras', 1.0]
    },
    {
      id: 9,
      type: 'VAEDecode',
      pos: [1420, 200],
      size: [200, 100],
      inputs: [
        { name: 'samples', type: 'LATENT', link: 10 },
        { name: 'vae', type: 'VAE', link: 3 }
      ],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [11], slot_index: 0 }]
    },
    {
      id: 10,
      type: 'SaveImage',
      pos: [1680, 200],
      size: [280, 240],
      inputs: [{ name: 'images', type: 'IMAGE', link: 11 }],
      widgets_values: ['Anime_Floating_SkyKingdom']
    }
  ],
  links: [
    [1, 1, 0, 2, 0, 'MODEL'],
    [2, 1, 1, 5, 0, 'CLIP'],
    [3, 1, 2, 9, 1, 'VAE'],
    [4, 2, 0, 8, 0, 'MODEL'],
    [5, 3, 0, 6, 1, 'CONTROL_NET'],
    [6, 4, 0, 6, 2, 'IMAGE'],
    [7, 5, 0, 6, 0, 'CONDITIONING'],
    [8, 6, 0, 8, 1, 'CONDITIONING'],
    [9, 7, 0, 8, 2, 'LATENT'],
    [10, 8, 0, 9, 0, 'LATENT'],
    [11, 9, 0, 10, 0, 'IMAGE']
  ],
  groups: [
    {
      title: '动漫风景 LoRA + 线稿 ControlNet 组合',
      bounding: [40, 40, 1000, 560],
      color: '#8b5cf6',
      font_size: 20
    }
  ]
};

// 3. Flux.1 Schnell Turbo 4-Step Workflow
const rawWf3: ComfyWorkflowRaw = {
  last_node_id: 8,
  last_link_id: 10,
  nodes: [
    {
      id: 1,
      type: 'UNETLoader',
      pos: [60, 80],
      size: [280, 80],
      outputs: [{ name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 }],
      widgets_values: ['flux1-schnell.safetensors', 'fp8_e4m3fn']
    },
    {
      id: 2,
      type: 'DualCLIPLoader',
      pos: [60, 200],
      size: [280, 110],
      outputs: [{ name: 'CLIP', type: 'CLIP', links: [2], slot_index: 0 }],
      widgets_values: ['t5xxl_fp8_e4m3fn.safetensors', 'clip_l.safetensors', 'flux']
    },
    {
      id: 3,
      type: 'VAELoader',
      pos: [60, 350],
      size: [280, 80],
      outputs: [{ name: 'VAE', type: 'VAE', links: [3], slot_index: 0 }],
      widgets_values: ['ae.safetensors']
    },
    {
      id: 4,
      type: 'CLIPTextEncode',
      pos: [400, 140],
      size: [320, 140],
      inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [4], slot_index: 0 }],
      widgets_values: ['Street photography, woman in bright yellow raincoat under neon rain in Shinjuku, highly reflective tarmac puddles, cinematic film still, sharp bokeh, 35mm f/1.4']
    },
    {
      id: 5,
      type: 'EmptyLatentImage',
      pos: [400, 320],
      size: [260, 110],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [5], slot_index: 0 }],
      widgets_values: [1024, 1024, 1]
    },
    {
      id: 6,
      type: 'KSampler',
      pos: [780, 160],
      size: [280, 240],
      inputs: [
        { name: 'model', type: 'MODEL', link: 1 },
        { name: 'positive', type: 'CONDITIONING', link: 4 },
        { name: 'latent_image', type: 'LATENT', link: 5 }
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [6], slot_index: 0 }],
      widgets_values: [439218, 'fixed', 4, 1.0, 'euler', 'simple', 1.0]
    },
    {
      id: 7,
      type: 'VAEDecode',
      pos: [1120, 180],
      size: [200, 100],
      inputs: [
        { name: 'samples', type: 'LATENT', link: 6 },
        { name: 'vae', type: 'VAE', link: 3 }
      ],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [7], slot_index: 0 }]
    },
    {
      id: 8,
      type: 'SaveImage',
      pos: [1380, 180],
      size: [280, 240],
      inputs: [{ name: 'images', type: 'IMAGE', link: 7 }],
      widgets_values: ['Flux_Schnell_RainyTokyo']
    }
  ],
  links: [
    [1, 1, 0, 6, 0, 'MODEL'],
    [2, 2, 0, 4, 0, 'CLIP'],
    [3, 3, 0, 7, 1, 'VAE'],
    [4, 4, 0, 6, 1, 'CONDITIONING'],
    [5, 5, 0, 6, 2, 'LATENT'],
    [6, 6, 0, 7, 0, 'LATENT'],
    [7, 7, 0, 8, 0, 'IMAGE']
  ],
  groups: [
    {
      title: 'Flux.1 Schnell 4-Step Turbo Pipeline',
      bounding: [40, 40, 1680, 480],
      color: '#10b981',
      font_size: 22
    }
  ]
};

// 4. HunyuanVideo Cinematic Workflow
const rawWf4: ComfyWorkflowRaw = {
  last_node_id: 7,
  last_link_id: 8,
  nodes: [
    {
      id: 1,
      type: 'HunyuanVideoModelLoader',
      pos: [60, 100],
      size: [280, 90],
      outputs: [
        { name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 },
        { name: 'VAE', type: 'VAE', links: [2], slot_index: 1 }
      ],
      widgets_values: ['hunyuan_video_720p_bf16.safetensors']
    },
    {
      id: 2,
      type: 'HunyuanVideoTextEncode',
      pos: [60, 240],
      size: [320, 140],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [3], slot_index: 0 }],
      widgets_values: ['Cinematic drone flyover through misty Norwegian fjord, sunset golden hour, crystal clear water reflections, dramatic mountain scale, 4k 60fps cinematic film']
    },
    {
      id: 3,
      type: 'EmptyHunyuanLatentVideo',
      pos: [60, 420],
      size: [260, 110],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [4], slot_index: 0 }],
      widgets_values: [1280, 720, 85, 1]
    },
    {
      id: 4,
      type: 'KSampler',
      pos: [440, 160],
      size: [280, 250],
      inputs: [
        { name: 'model', type: 'MODEL', link: 1 },
        { name: 'positive', type: 'CONDITIONING', link: 3 },
        { name: 'latent_image', type: 'LATENT', link: 4 }
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [5], slot_index: 0 }],
      widgets_values: [1940294, 'fixed', 30, 6.0, 'euler', 'normal', 1.0]
    },
    {
      id: 5,
      type: 'VAEDecode',
      pos: [780, 180],
      size: [200, 100],
      inputs: [
        { name: 'samples', type: 'LATENT', link: 5 },
        { name: 'vae', type: 'VAE', link: 2 }
      ],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [6], slot_index: 0 }]
    },
    {
      id: 6,
      type: 'VHS_VideoCombine',
      pos: [1040, 160],
      size: [280, 260],
      inputs: [{ name: 'images', type: 'IMAGE', link: 6 }],
      widgets_values: [24, 0, 'Hunyuan_Fjord_Cinematic', 'video/h264-mp4', false]
    }
  ],
  links: [
    [1, 1, 0, 4, 0, 'MODEL'],
    [2, 1, 1, 5, 1, 'VAE'],
    [3, 2, 0, 4, 1, 'CONDITIONING'],
    [4, 3, 0, 4, 2, 'LATENT'],
    [5, 4, 0, 5, 0, 'LATENT'],
    [6, 5, 0, 6, 0, 'IMAGE']
  ],
  groups: [
    {
      title: 'HunyuanVideo 时空潜空间生成与流媒体封包',
      bounding: [30, 40, 1340, 520],
      color: '#f59e0b',
      font_size: 20
    }
  ]
};

// 5. Product Background Inpainting & Relight Workflow
const rawWf5: ComfyWorkflowRaw = {
  last_node_id: 8,
  last_link_id: 9,
  nodes: [
    {
      id: 1,
      type: 'CheckpointLoaderSimple',
      pos: [60, 80],
      size: [280, 100],
      outputs: [
        { name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 },
        { name: 'CLIP', type: 'CLIP', links: [2], slot_index: 1 },
        { name: 'VAE', type: 'VAE', links: [3], slot_index: 2 }
      ],
      widgets_values: ['sdxl_iclight_relight_v1.safetensors']
    },
    {
      id: 2,
      type: 'LoadImage',
      pos: [60, 230],
      size: [260, 180],
      outputs: [
        { name: 'IMAGE', type: 'IMAGE', links: [4], slot_index: 0 },
        { name: 'MASK', type: 'MASK', links: [5], slot_index: 1 }
      ],
      widgets_values: ['perfume_isolated_cutout.png', 'image']
    },
    {
      id: 3,
      type: 'CLIPTextEncode',
      pos: [400, 100],
      size: [320, 130],
      inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
      outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [6], slot_index: 0 }],
      widgets_values: ['Commercial luxury perfume glass bottle, dramatic right-side rim light, pristine wet obsidian podium, gentle water rippling, elegant studio atmosphere, ray tracing']
    },
    {
      id: 4,
      type: 'VAEEncodeForInpaint',
      pos: [400, 280],
      size: [260, 140],
      inputs: [
        { name: 'pixels', type: 'IMAGE', link: 4 },
        { name: 'vae', type: 'VAE', link: 3 },
        { name: 'mask', type: 'MASK', link: 5 }
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [7], slot_index: 0 }],
      widgets_values: [6]
    },
    {
      id: 5,
      type: 'KSampler',
      pos: [740, 160],
      size: [280, 240],
      inputs: [
        { name: 'model', type: 'MODEL', link: 1 },
        { name: 'positive', type: 'CONDITIONING', link: 6 },
        { name: 'latent_image', type: 'LATENT', link: 7 }
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', links: [8], slot_index: 0 }],
      widgets_values: [558291, 'fixed', 26, 7.5, 'dpmpp_2m', 'karras', 0.85]
    },
    {
      id: 6,
      type: 'VAEDecode',
      pos: [1080, 180],
      size: [200, 100],
      inputs: [
        { name: 'samples', type: 'LATENT', link: 8 },
        { name: 'vae', type: 'VAE', link: 3 }
      ],
      outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [9], slot_index: 0 }]
    },
    {
      id: 7,
      type: 'SaveImage',
      pos: [1340, 180],
      size: [280, 240],
      inputs: [{ name: 'images', type: 'IMAGE', link: 9 }],
      widgets_values: ['Perfume_ICLight_Relighted']
    }
  ],
  links: [
    [1, 1, 0, 5, 0, 'MODEL'],
    [2, 1, 1, 3, 0, 'CLIP'],
    [3, 1, 2, 4, 1, 'VAE'],
    [4, 2, 0, 4, 0, 'IMAGE'],
    [5, 2, 1, 4, 2, 'MASK'],
    [6, 3, 0, 5, 1, 'CONDITIONING'],
    [7, 4, 0, 5, 2, 'LATENT'],
    [8, 5, 0, 6, 0, 'LATENT'],
    [9, 6, 0, 7, 0, 'IMAGE']
  ],
  groups: [
    {
      title: 'IC-Light 商业静物光影重构与背景生成',
      bounding: [30, 40, 1640, 440],
      color: '#ec4899',
      font_size: 20
    }
  ]
};

export interface SampleWorkflowData {
  id: string;
  raw: ComfyWorkflowRaw;
  record: WorkflowRecord;
  tags: { categoryKey: string; tagName: string }[];
  note: string;
  assets: {
    name: string;
    type: AssetType;
    dataUrl: string;
    caption: string;
  }[];
}

export const SAMPLE_WORKFLOWS_DATA: SampleWorkflowData[] = [
  {
    id: 'wf_qwen_pulid',
    raw: rawWf1,
    record: {
      id: 'wf_qwen_pulid',
      name: 'Qwen Portrait PuLID & FaceDetailer',
      description: '工业级高精肖像工作流。结合 Qwen Image 模型架构与 PuLID 零样本人脸特征嵌入，末端挂载 FaceDetailer 微细节多尺度重采样。',
      source: 'Civitai / Pro Creator Pack',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
      updatedAt: Date.now() - 1000 * 60 * 60 * 12,
      isFavorite: true,
      fingerprint: 'fp_qwen_pulid_882a',
      nodeCount: rawWf1.nodes.length,
      linkCount: rawWf1.links.length,
      modelInfo: 'Qwen Image',
      extractedMeta: {
        checkpoints: ['qwen_image_portrait_v2.safetensors'],
        loras: [],
        controlnets: [],
        samplers: ['dpmpp_2m'],
        vaes: [],
        upscalers: [],
        customNodeTypes: ['PuLIDModelLoader', 'ApplyPuLID', 'FaceDetailer'],
        hasInpaint: false,
        hasVideo: false,
        hasFaceRestore: true
      },
      rawJson: JSON.stringify(rawWf1, null, 2)
    },
    tags: [
      { categoryKey: 'model', tagName: 'Qwen Image' },
      { categoryKey: 'type', tagName: '完整工作流' },
      { categoryKey: 'task', tagName: '文生图' },
      { categoryKey: 'scenario', tagName: '人像写真' },
      { categoryKey: 'technique', tagName: 'PuLID' },
      { categoryKey: 'technique', tagName: 'FaceDetailer' },
      { categoryKey: 'custom', tagName: '标杆典藏' },
      { categoryKey: 'custom', tagName: '生产就绪' }
    ],
    note: `### 📌 工作流设计要点与参数心得

1. **PuLID 人脸相似度与画质平衡**：
   - 当前 \`ApplyPuLID\` 的权重设置为 **0.85**。当原图光影与 Prompt 冲突时，可下调至 0.72~0.78。
   - 保留了 \`fidelity\` 模式，能精准还原下颌轮廓与虹膜纹理。

2. **FaceDetailer 关键参数**：
   - 降噪步数（Denoise）建议控制在 **0.32 ~ 0.38** 之间。超过 0.45 易破坏原五官特征，产生过拟合磨皮。
   - 采样器选 \`euler\` + \`normal\`，避免高阶采样器在极小裁剪框内出现波纹伪影。

3. **推荐分辨率**：
   - 基础生成：\`1024 x 1536\` (2:3 标准写真比例)。
   - 显存占用：约 14.8 GB VRAM。`,
    assets: [
      {
        name: 'Cyberpunk Portrait Masterpiece',
        type: 'cover',
        dataUrl: '/sample-assets/qwen_portrait_cover.jpg',
        caption: '最终渲染效果：冷调银发赛博肖像，微发丝与皮肤微孔清晰可见'
      },
      {
        name: 'PuLID Identity Reference Face',
        type: 'reference',
        dataUrl: '/sample-assets/pose_model_photo.jpg',
        caption: '输入参考肖像素材，自然光照无遮挡正脸写真'
      },
      {
        name: 'Studio Cinematic Master Prompt',
        type: 'text',
        dataUrl: '/sample-assets/positive_prompt_cinematic.txt',
        caption: '高精度正向提示词配置文件与 85mm 镜头参数'
      }
    ]
  },
  {
    id: 'wf_sdxl_anime',
    raw: rawWf2,
    record: {
      id: 'wf_sdxl_anime',
      name: 'SDXL Anime Landscape Master',
      description: '吉卜力与新海诚唯美风光概念大图工作流。集成 Animagine XL 底模、风光特化 LoRA 与线稿 ControlNet 结构约束。',
      source: 'GitHub / ComfyUI-Community',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      isFavorite: true,
      fingerprint: 'fp_sdxl_anime_771b',
      nodeCount: rawWf2.nodes.length,
      linkCount: rawWf2.links.length,
      modelInfo: 'SDXL',
      extractedMeta: {
        checkpoints: ['animagine_xl_v3.1.safetensors'],
        loras: ['ghibli_style_scenery_sdxl.safetensors'],
        controlnets: ['controlnet_sdxl_lineart.safetensors'],
        samplers: ['euler_ancestral'],
        vaes: [],
        upscalers: [],
        customNodeTypes: ['ControlNetApplyAdvanced', 'LoraLoaderModelOnly'],
        hasInpaint: false,
        hasVideo: false,
        hasFaceRestore: false
      },
      rawJson: JSON.stringify(rawWf2, null, 2)
    },
    tags: [
      { categoryKey: 'model', tagName: 'SDXL' },
      { categoryKey: 'type', tagName: '完整工作流' },
      { categoryKey: 'task', tagName: '文生图' },
      { categoryKey: 'scenario', tagName: '二次元动漫' },
      { categoryKey: 'scenario', tagName: '场景概念' },
      { categoryKey: 'technique', tagName: 'ControlNet' },
      { categoryKey: 'technique', tagName: 'LoRA' },
      { categoryKey: 'custom', tagName: '经典推荐' }
    ],
    note: `### 🌲 二次元场景透视与云层控制

- **LoRA 强度配比**：\`ghibli_style_scenery_sdxl\` 设在 **0.75 ~ 0.85** 效果最佳，超过 0.9 容易出现色彩溢出。
- **ControlNet Lineart 技巧**：
  - 结束步数设置在 **0.85**，留出最后 15% 的步数给模型自由融合大气透视与光晕扩散。
  - 画幅比例采用 16:9 宽屏 (\`1344 x 768\`)，极其适合电脑壁纸与场景概念展示。`,
    assets: [
      {
        name: 'Floating Shrine Sunset Horizon',
        type: 'cover',
        dataUrl: '/sample-assets/anime_landscape_cover.jpg',
        caption: '浮空遗迹夕阳全景，云层具有丰富的体积感与丁达尔光效'
      },
      {
        name: 'Twilight Lo-Fi Ambient Soundtrack',
        type: 'audio',
        dataUrl: '/sample-assets/sample_ambient_soundtrack.wav',
        caption: '伴奏氛围音轨 - 舒缓五声音阶合成器采样'
      }
    ]
  },
  {
    id: 'wf_flux_schnell',
    raw: rawWf3,
    record: {
      id: 'wf_flux_schnell',
      name: 'Flux.1 Schnell Ultra-Realistic Turbo',
      description: '极速 4 步出图写实摄影流。利用 Flux.1 Schnell 蒸馏架构，在 3 秒内生成单反级质感与复杂雨夜街景光追反射。',
      source: 'Black Forest Labs Official ComfyUI Sample',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
      updatedAt: Date.now() - 1000 * 60 * 60 * 4,
      isFavorite: false,
      fingerprint: 'fp_flux_schnell_339c',
      nodeCount: rawWf3.nodes.length,
      linkCount: rawWf3.links.length,
      modelInfo: 'Flux.1',
      extractedMeta: {
        checkpoints: ['flux1-schnell.safetensors'],
        loras: [],
        controlnets: [],
        samplers: ['euler'],
        vaes: ['ae.safetensors'],
        upscalers: [],
        customNodeTypes: ['UNETLoader', 'DualCLIPLoader'],
        hasInpaint: false,
        hasVideo: false,
        hasFaceRestore: false
      },
      rawJson: JSON.stringify(rawWf3, null, 2)
    },
    tags: [
      { categoryKey: 'model', tagName: 'Flux.1' },
      { categoryKey: 'type', tagName: '完整工作流' },
      { categoryKey: 'task', tagName: '文生图' },
      { categoryKey: 'scenario', tagName: '人像写真' },
      { categoryKey: 'custom', tagName: '秒级极速' }
    ],
    note: `### ⚡ Flux.1 Schnell 极速优化备忘

- **CFG 与步数固定**：
  - Schnell 是针对 **4 步（Step 4）** 和 **CFG 1.0** 蒸馏训练的模型，绝对不能开 CFG > 1.0 或加长步数，否则画面崩坏！
  - 调度器必须选 \`simple\`，采样器选 \`euler\`。
- **提示词自然语言能力**：
  - 双 CLIP（T5XXL + CLIP-L）对长句上下文理解极强，多用电影镜头术语如 *35mm f/1.4*, *kodak portra 400*, *neon puddle reflections*。`,
    assets: [
      {
        name: 'Rainy Tokyo Cyberpunk Street',
        type: 'cover',
        dataUrl: '/sample-assets/flux_cyberpunk_street.jpg',
        caption: '雨夜新宿街头，水坑倒影与霓虹光晕渲染准确度极高'
      }
    ]
  },
  {
    id: 'wf_hunyuan_video',
    raw: rawWf4,
    record: {
      id: 'wf_hunyuan_video',
      name: 'HunyuanVideo Cinematic Scene Creator',
      description: '混元开源视频大模型工作流。原生支持 720p 60fps 时空潜空间采样，影视级航拍大片运镜生成。',
      source: 'Tencent Hunyuan Open Source',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
      updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
      isFavorite: false,
      fingerprint: 'fp_hunyuan_vid_192d',
      nodeCount: rawWf4.nodes.length,
      linkCount: rawWf4.links.length,
      modelInfo: 'HunyuanVideo',
      extractedMeta: {
        checkpoints: ['hunyuan_video_720p_bf16.safetensors'],
        loras: [],
        controlnets: [],
        samplers: ['euler'],
        vaes: [],
        upscalers: [],
        customNodeTypes: ['HunyuanVideoModelLoader', 'HunyuanVideoTextEncode', 'EmptyHunyuanLatentVideo', 'VHS_VideoCombine'],
        hasInpaint: false,
        hasVideo: true,
        hasFaceRestore: false
      },
      rawJson: JSON.stringify(rawWf4, null, 2)
    },
    tags: [
      { categoryKey: 'model', tagName: 'HunyuanVideo' },
      { categoryKey: 'type', tagName: '完整工作流' },
      { categoryKey: 'task', tagName: '视频生成' },
      { categoryKey: 'scenario', tagName: '场景概念' }
    ],
    note: `### 🎬 HunyuanVideo 显存与帧率配置

- **显存保护建议**：
  - 默认帧数 85 帧 (~3.5秒 @ 24fps)。建议开开启 \`fp8_e4m3fn\` 量化，显存消耗约 18GB。
  - 使用 \`VHS_VideoCombine\` 导出 H.264 mp4 格式，兼容全平台浏览器播放。`,
    assets: [
      {
        name: 'Icelandic Volcanic Coast Aerial Frame',
        type: 'cover',
        dataUrl: '/sample-assets/hunyuan_video_coast.jpg',
        caption: '冰岛黑沙滩与海浪航拍全景关键帧截取，水面动态与晨光流转连贯'
      },
      {
        name: 'Coast Ocean Ambient Audio',
        type: 'audio',
        dataUrl: '/sample-assets/sample_ambient_soundtrack.wav',
        caption: '海潮与环境声伴奏'
      }
    ]
  },
  {
    id: 'wf_product_iclight',
    raw: rawWf5,
    record: {
      id: 'wf_product_iclight',
      name: 'Product Background Inpainting & Relight',
      description: '电商静物打光重构工作流。基于 IC-Light 架构，将白底抠图产品无缝融入湿润黑曜石水波台面，重构高光反射与真实环境遮蔽。',
      source: 'IC-Light Research Labs',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
      updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
      isFavorite: true,
      fingerprint: 'fp_iclight_relight_550e',
      nodeCount: rawWf5.nodes.length,
      linkCount: rawWf5.links.length,
      modelInfo: 'SDXL',
      extractedMeta: {
        checkpoints: ['sdxl_iclight_relight_v1.safetensors'],
        loras: [],
        controlnets: [],
        samplers: ['dpmpp_2m'],
        vaes: [],
        upscalers: [],
        customNodeTypes: ['VAEEncodeForInpaint'],
        hasInpaint: true,
        hasVideo: false,
        hasFaceRestore: false
      },
      rawJson: JSON.stringify(rawWf5, null, 2)
    },
    tags: [
      { categoryKey: 'model', tagName: 'SDXL' },
      { categoryKey: 'type', tagName: '局部微调' },
      { categoryKey: 'task', tagName: '局部重绘' },
      { categoryKey: 'scenario', tagName: '电商商拍' },
      { categoryKey: 'technique', tagName: 'IC-Light' },
      { categoryKey: 'custom', tagName: '生产就绪' }
    ],
    note: `### 💎 电商香水瓶打光技巧

- **Alpha Mask 边缘羽化**：
  - 务必在 \`VAEEncodeForInpaint\` 中设置 Mask Feathering 为 6~8 像素，使玻璃瓶底的阴影能自然过渡到黑曜石水面上。
  - 降噪步数设置在 **0.85**，能够重绘背景的同时牢牢保持香水瓶本身的文字标签不糊。`,
    assets: [
      {
        name: 'Aurora Perfume Luxury Relight',
        type: 'cover',
        dataUrl: '/sample-assets/perfume_product_iclight.jpg',
        caption: '最终重打光商拍照：玻璃瓶折射黑曜石台面与水波涟漪，商业质感拉满'
      }
    ]
  }
];
