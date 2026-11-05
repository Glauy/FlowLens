/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SLOT_COLORS: Record<string, string> = {
  MODEL: '#a855f7',
  CLIP: '#eab308',
  VAE: '#ef4444',
  LATENT: '#ec4899',
  IMAGE: '#3b82f6',
  CONDITIONING: '#f97316',
  MASK: '#06b6d4',
  CONTROL_NET: '#14b8a6',
  PULID: '#6366f1',
  INT: '#10b981',
  FLOAT: '#10b981',
  STRING: '#8b5cf6',
  BOOLEAN: '#84cc16',
  ANY: '#94a3b8'
};

export function getSlotColor(type: string = ''): string {
  const t = type.toUpperCase().trim();
  return SLOT_COLORS[t] || '#94a3b8';
}

export function getNodeHeaderColor(type: string = ''): string {
  const t = type.toLowerCase();
  if (t.includes('checkpoint') || t.includes('unet')) return '#7c3aed';
  if (t.includes('clip') || t.includes('textencode')) return '#d97706';
  if (t.includes('ksampler') || t.includes('sampler')) return '#059669';
  if (t.includes('vae')) return '#dc2626';
  if (t.includes('latent')) return '#db2777';
  if (t.includes('save') || t.includes('preview')) return '#2563eb';
  if (t.includes('controlnet')) return '#0d9488';
  if (t.includes('pulid') || t.includes('face')) return '#4f46e5';
  if (t.includes('lora')) return '#9333ea';
  if (t.includes('inpaint')) return '#e11d48';
  if (t.includes('video') || t.includes('animate')) return '#ca8a04';
  return '#334155';
}
