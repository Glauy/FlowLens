/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WorkflowRecord,
  TagCategory,
  Tag,
  WorkflowTagRecord,
  AssetRecord,
  WorkflowAssetRecord,
  WorkflowNoteRecord,
  WorkflowLayoutRecord,
  ComfyWorkflowRaw,
  AssetType,
  LayoutAlgorithm,
  LayoutDirection
} from '../types/workflow';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TAGS,
  SAMPLE_WORKFLOWS_DATA
} from './sampleData';
import { computeSmartLayout } from './layout';

const DB_NAME = 'flowlens_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('workflows')) {
        db.createObjectStore('workflows', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagStore.createIndex('categoryId', 'categoryId', { unique: false });
      }
      if (!db.objectStoreNames.contains('workflow_tags')) {
        const wfTagStore = db.createObjectStore('workflow_tags', { keyPath: ['workflowId', 'tagId'] });
        wfTagStore.createIndex('workflowId', 'workflowId', { unique: false });
        wfTagStore.createIndex('tagId', 'tagId', { unique: false });
      }
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('workflow_assets')) {
        const wfAssetStore = db.createObjectStore('workflow_assets', { keyPath: ['workflowId', 'assetId'] });
        wfAssetStore.createIndex('workflowId', 'workflowId', { unique: false });
        wfAssetStore.createIndex('assetId', 'assetId', { unique: false });
      }
      if (!db.objectStoreNames.contains('workflow_notes')) {
        db.createObjectStore('workflow_notes', { keyPath: 'workflowId' });
      }
      if (!db.objectStoreNames.contains('workflow_layouts')) {
        db.createObjectStore('workflow_layouts', { keyPath: 'workflowId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Generic transaction helpers
async function getStore(
  storeName: string,
  mode: IDBTransactionMode = 'readonly'
): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return { store: tx.objectStore(storeName), tx };
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const StorageService = {
  /**
   * Initializes database and seeds sample workflows if empty, or upgrades old SVG assets to real assets
   */
  async initialize(): Promise<void> {
    const { store } = await getStore('workflows', 'readonly');
    const count = await reqToPromise(store.count());

    if (count === 0) {
      await this.seedInitialData();
      return;
    }

    // Check if assets contain outdated SVG placeholders and upgrade to real sample assets
    const { store: assetStore } = await getStore('assets', 'readonly');
    const assets = (await reqToPromise(assetStore.getAll())) as AssetRecord[];
    const hasOnlyOldSvg = assets.length > 0 && assets.some(a => a.dataUrl && a.dataUrl.startsWith('data:image/svg+xml'));

    if (hasOnlyOldSvg) {
      await this.seedInitialData();
    }
  },

  /**
   * Seeds initial sample workflows, categories, tags, notes, assets, and layouts
   */
  async seedInitialData(): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(
      [
        'categories',
        'tags',
        'workflows',
        'workflow_tags',
        'assets',
        'workflow_assets',
        'workflow_notes',
        'workflow_layouts'
      ],
      'readwrite'
    );

    // 1. Categories
    const catStore = tx.objectStore('categories');
    DEFAULT_CATEGORIES.forEach(c => catStore.put(c));

    // 2. Tags
    const tagStore = tx.objectStore('tags');
    DEFAULT_TAGS.forEach(t => tagStore.put(t));

    // 3. Workflows and associations
    const wfStore = tx.objectStore('workflows');
    const wfTagStore = tx.objectStore('workflow_tags');
    const assetStore = tx.objectStore('assets');
    const wfAssetStore = tx.objectStore('workflow_assets');
    const noteStore = tx.objectStore('workflow_notes');
    const layoutStore = tx.objectStore('workflow_layouts');

    for (const sample of SAMPLE_WORKFLOWS_DATA) {
      // Set cover asset ID to first asset by default
      if (sample.assets && sample.assets.length > 0) {
        sample.record.coverAssetId = `asset_${sample.id}_0`;
      }

      // Put workflow
      wfStore.put(sample.record);

      // Put note
      noteStore.put({
        workflowId: sample.id,
        markdown: sample.note,
        updatedAt: sample.record.updatedAt
      });

      // Put layout (Default Smart Dagre Layout)
      const smart = computeSmartLayout(sample.raw, 'LR');
      layoutStore.put({
        workflowId: sample.id,
        layoutType: 'smart',
        direction: 'LR',
        nodePositions: smart.nodePositions,
        groupPositions: smart.groupPositions,
        viewport: { x: 40, y: 40, zoom: 0.8 },
        updatedAt: sample.record.updatedAt
      });

      // Put tags
      for (const tInfo of sample.tags) {
        // Find matching tag in default tags or create
        const cat = DEFAULT_CATEGORIES.find(c => c.key === tInfo.categoryKey);
        if (cat) {
          let foundTag = DEFAULT_TAGS.find(t => t.name === tInfo.tagName && t.categoryId === cat.id);
          if (!foundTag) {
            const newTagId = 'tag_' + Math.random().toString(36).substring(2, 8);
            foundTag = { id: newTagId, categoryId: cat.id, name: tInfo.tagName };
            tagStore.put(foundTag);
          }
          wfTagStore.put({
            workflowId: sample.id,
            tagId: foundTag.id,
            isAutoDetected: false
          });
        }
      }

      // Put assets
      let assetIdx = 0;
      for (const assetInfo of sample.assets) {
        const assetId = `asset_${sample.id}_${assetIdx++}`;
        let mimeType = 'image/jpeg';
        if (assetInfo.dataUrl.endsWith('.wav')) mimeType = 'audio/wav';
        else if (assetInfo.dataUrl.endsWith('.mp3')) mimeType = 'audio/mpeg';
        else if (assetInfo.dataUrl.endsWith('.txt')) mimeType = 'text/plain';
        else if (assetInfo.dataUrl.endsWith('.json')) mimeType = 'application/json';
        else if (assetInfo.dataUrl.endsWith('.png')) mimeType = 'image/png';
        else if (assetInfo.dataUrl.startsWith('data:image/svg+xml')) mimeType = 'image/svg+xml';
        else if (assetInfo.dataUrl.startsWith('data:audio/')) mimeType = 'audio/wav';

        const assetRecord: AssetRecord = {
          id: assetId,
          name: assetInfo.name,
          type: assetInfo.type,
          mimeType,
          dataUrl: assetInfo.dataUrl,
          size: assetInfo.dataUrl.length,
          createdAt: Date.now()
        };
        assetStore.put(assetRecord);

        const wfAssetLink: WorkflowAssetRecord = {
          workflowId: sample.id,
          assetId,
          assetType: assetInfo.type,
          caption: assetInfo.caption,
          order: assetIdx
        };
        wfAssetStore.put(wfAssetLink);
      }
    }

    // Also store reusable global Pose assets into assetStore
    const globalPoseAssets: AssetRecord[] = [
      {
        id: 'asset_pose_model',
        name: '真人参考图 (Lookbook Photo)',
        type: 'reference',
        mimeType: 'image/jpeg',
        dataUrl: '/sample-assets/pose_model_photo.jpg',
        size: 142000,
        createdAt: Date.now()
      },
      {
        id: 'asset_pose_sketch',
        name: '姿势线稿图 (Pose Lineart Sketch)',
        type: 'input',
        mimeType: 'image/jpeg',
        dataUrl: '/sample-assets/pose_sketch_lineart.jpg',
        size: 98000,
        createdAt: Date.now()
      }
    ];
    globalPoseAssets.forEach(pa => assetStore.put(pa));

    await txToPromise(tx);
  },

  // ----------------- WORKFLOWS -----------------

  async getAllWorkflows(): Promise<WorkflowRecord[]> {
    const { store } = await getStore('workflows', 'readonly');
    const records = await reqToPromise(store.getAll());
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getWorkflowById(id: string): Promise<WorkflowRecord | null> {
    const { store } = await getStore('workflows', 'readonly');
    const record = await reqToPromise(store.get(id));
    return record || null;
  },

  async saveWorkflow(record: WorkflowRecord): Promise<void> {
    const { store, tx } = await getStore('workflows', 'readwrite');
    store.put(record);
    await txToPromise(tx);
  },

  async deleteWorkflow(id: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(
      ['workflows', 'workflow_tags', 'workflow_assets', 'workflow_notes', 'workflow_layouts'],
      'readwrite'
    );
    tx.objectStore('workflows').delete(id);
    tx.objectStore('workflow_notes').delete(id);
    tx.objectStore('workflow_layouts').delete(id);

    // Delete workflow_tags
    const tagStore = tx.objectStore('workflow_tags');
    const tagIdx = tagStore.index('workflowId');
    const tagReq = tagIdx.getAllKeys(id);
    tagReq.onsuccess = () => {
      tagReq.result.forEach(k => tagStore.delete(k));
    };

    // Delete workflow_assets
    const assetStore = tx.objectStore('workflow_assets');
    const assetIdx = assetStore.index('workflowId');
    const assetReq = assetIdx.getAllKeys(id);
    assetReq.onsuccess = () => {
      assetReq.result.forEach(k => assetStore.delete(k));
    };

    await txToPromise(tx);
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const wf = await this.getWorkflowById(id);
    if (!wf) return false;
    wf.isFavorite = !wf.isFavorite;
    wf.updatedAt = Date.now();
    await this.saveWorkflow(wf);
    return wf.isFavorite;
  },

  // ----------------- TAGS & CATEGORIES -----------------

  async getAllCategories(): Promise<TagCategory[]> {
    const { store } = await getStore('categories', 'readonly');
    return reqToPromise(store.getAll());
  },

  async saveCategory(cat: TagCategory): Promise<void> {
    const { store, tx } = await getStore('categories', 'readwrite');
    store.put(cat);
    await txToPromise(tx);
  },

  async getAllTags(): Promise<Tag[]> {
    const { store } = await getStore('tags', 'readonly');
    return reqToPromise(store.getAll());
  },

  async saveTag(tag: Tag): Promise<void> {
    const { store, tx } = await getStore('tags', 'readwrite');
    store.put(tag);
    await txToPromise(tx);
  },

  async deleteTag(tagId: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(['tags', 'workflow_tags'], 'readwrite');
    tx.objectStore('tags').delete(tagId);

    const wfTagStore = tx.objectStore('workflow_tags');
    const idx = wfTagStore.index('tagId');
    const req = idx.getAllKeys(tagId);
    req.onsuccess = () => {
      req.result.forEach(k => wfTagStore.delete(k));
    };
    await txToPromise(tx);
  },

  async getWorkflowTags(workflowId: string): Promise<{ tag: Tag; category: TagCategory; isAutoDetected: boolean }[]> {
    const [allCats, allTags] = await Promise.all([
      this.getAllCategories(),
      this.getAllTags()
    ]);

    const catMap = new Map(allCats.map(c => [c.id, c]));
    const tagMap = new Map(allTags.map(t => [t.id, t]));

    const { store } = await getStore('workflow_tags', 'readonly');
    const idx = store.index('workflowId');
    const links: WorkflowTagRecord[] = await reqToPromise(idx.getAll(workflowId));

    const result: { tag: Tag; category: TagCategory; isAutoDetected: boolean }[] = [];
    links.forEach(l => {
      const tag = tagMap.get(l.tagId);
      if (tag) {
        const cat = catMap.get(tag.categoryId) || {
          id: tag.categoryId,
          key: 'custom',
          name: '其他',
          description: '',
          color: '#6b7280',
          isSystem: false
        };
        result.push({ tag, category: cat, isAutoDetected: l.isAutoDetected });
      }
    });

    return result;
  },

  async setWorkflowTags(
    workflowId: string,
    tags: { tagId: string; isAutoDetected?: boolean }[]
  ): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('workflow_tags', 'readwrite');
    const store = tx.objectStore('workflow_tags');
    const idx = store.index('workflowId');

    const existingKeys = await reqToPromise(idx.getAllKeys(workflowId));
    existingKeys.forEach(k => store.delete(k));

    tags.forEach(t => {
      store.put({
        workflowId,
        tagId: t.tagId,
        isAutoDetected: !!t.isAutoDetected
      });
    });

    await txToPromise(tx);
  },

  // ----------------- ASSETS -----------------

  async getWorkflowAssets(workflowId: string): Promise<{ link: WorkflowAssetRecord; asset: AssetRecord }[]> {
    const { store: linkStore } = await getStore('workflow_assets', 'readonly');
    const idx = linkStore.index('workflowId');
    const links: WorkflowAssetRecord[] = await reqToPromise(idx.getAll(workflowId));

    if (links.length === 0) return [];

    const { store: assetStore } = await getStore('assets', 'readonly');
    const results: { link: WorkflowAssetRecord; asset: AssetRecord }[] = [];

    for (const link of links.sort((a, b) => a.order - b.order)) {
      const asset: AssetRecord = await reqToPromise(assetStore.get(link.assetId));
      if (asset) {
        results.push({ link, asset });
      }
    }

    return results;
  },

  async getAllAssets(): Promise<AssetRecord[]> {
    const { store } = await getStore('assets', 'readonly');
    return reqToPromise(store.getAll());
  },

  async getAssetById(assetId: string): Promise<AssetRecord | null> {
    const { store } = await getStore('assets', 'readonly');
    const asset = await reqToPromise(store.get(assetId));
    return asset || null;
  },

  async setWorkflowCover(workflowId: string, assetId: string | null): Promise<void> {
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) return;
    wf.coverAssetId = assetId || undefined;
    wf.updatedAt = Date.now();
    await this.saveWorkflow(wf);
  },

  async saveAsset(asset: AssetRecord): Promise<void> {
    const { store, tx } = await getStore('assets', 'readwrite');
    store.put(asset);
    await txToPromise(tx);
  },

  async linkAssetToWorkflow(link: WorkflowAssetRecord): Promise<void> {
    const { store, tx } = await getStore('workflow_assets', 'readwrite');
    store.put(link);
    await txToPromise(tx);
  },

  async unlinkAssetFromWorkflow(workflowId: string, assetId: string): Promise<void> {
    const { store, tx } = await getStore('workflow_assets', 'readwrite');
    store.delete([workflowId, assetId] as any);
    await txToPromise(tx);
  },

  async deleteAsset(assetId: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(['assets', 'workflow_assets'], 'readwrite');
    tx.objectStore('assets').delete(assetId);

    const linkStore = tx.objectStore('workflow_assets');
    const idx = linkStore.index('assetId');
    const keys = await reqToPromise(idx.getAllKeys(assetId));
    keys.forEach(k => linkStore.delete(k));

    await txToPromise(tx);
  },

  // ----------------- NOTES -----------------

  async getWorkflowNote(workflowId: string): Promise<string> {
    const { store } = await getStore('workflow_notes', 'readonly');
    const record: WorkflowNoteRecord = await reqToPromise(store.get(workflowId));
    return record ? record.markdown : '';
  },

  async saveWorkflowNote(workflowId: string, markdown: string): Promise<void> {
    const { store, tx } = await getStore('workflow_notes', 'readwrite');
    store.put({
      workflowId,
      markdown,
      updatedAt: Date.now()
    });
    await txToPromise(tx);
  },

  // ----------------- LAYOUT -----------------

  async getWorkflowLayout(workflowId: string): Promise<WorkflowLayoutRecord | null> {
    const { store } = await getStore('workflow_layouts', 'readonly');
    const record = await reqToPromise(store.get(workflowId));
    return record || null;
  },

  async saveWorkflowLayout(layout: WorkflowLayoutRecord): Promise<void> {
    const { store, tx } = await getStore('workflow_layouts', 'readwrite');
    store.put(layout);
    await txToPromise(tx);
  },

  // ----------------- FULL BACKUP EXPORT & IMPORT -----------------

  async exportFullBackup(): Promise<string> {
    const db = await openDB();
    const storeNames = [
      'categories',
      'tags',
      'workflows',
      'workflow_tags',
      'assets',
      'workflow_assets',
      'workflow_notes',
      'workflow_layouts'
    ];

    const backup: Record<string, any> = {
      version: 1,
      exportedAt: Date.now()
    };

    const tx = db.transaction(storeNames, 'readonly');
    for (const name of storeNames) {
      backup[name] = await reqToPromise(tx.objectStore(name).getAll());
    }

    return JSON.stringify(backup, null, 2);
  },

  async importFullBackup(jsonStr: string): Promise<{ importedCount: number }> {
    const data = JSON.parse(jsonStr);
    const db = await openDB();
    const storeNames = [
      'categories',
      'tags',
      'workflows',
      'workflow_tags',
      'assets',
      'workflow_assets',
      'workflow_notes',
      'workflow_layouts'
    ];

    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      if (Array.isArray(data[name])) {
        const store = tx.objectStore(name);
        for (const item of data[name]) {
          store.put(item);
        }
      }
    }
    await txToPromise(tx);

    return { importedCount: (data.workflows || []).length };
  }
};
