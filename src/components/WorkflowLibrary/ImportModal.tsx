/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Download,
  Database
} from 'lucide-react';
import { parseComfyUIWorkflow } from '../../services/parser';
import { StorageService } from '../../services/storage';
import { WorkflowRecord } from '../../types/workflow';

interface ImportModalProps {
  existingWorkflows: WorkflowRecord[];
  onImportSuccess: () => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  existingWorkflows,
  onImportSuccess,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'backup'>('upload');
  const [jsonText, setJsonText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const existingFingerprints = new Set(existingWorkflows.map(w => w.fingerprint));

  // Process JSON content
  const processWorkflowString = async (content: string, fileName?: string) => {
    try {
      const { raw, record, suggestedTags } = parseComfyUIWorkflow(content, fileName);

      // Check duplicate
      const isDuplicate = existingFingerprints.has(record.fingerprint);
      if (isDuplicate) {
        setResultMessage({
          type: 'warning',
          text: `检测到已存在结构相同的工作流（指纹: ${record.fingerprint}）。已为您更新收录。`
        });
      }

      // Save workflow
      await StorageService.saveWorkflow(record);

      // Save initial smart layout
      await StorageService.saveWorkflowLayout({
        workflowId: record.id,
        layoutType: 'smart',
        direction: 'LR',
        nodePositions: {},
        groupPositions: {},
        viewport: { x: 40, y: 40, zoom: 0.8 },
        updatedAt: Date.now()
      });

      // Save default note
      await StorageService.saveWorkflowNote(
        record.id,
        `### 📥 工作流导入备忘\n\n- 来源: ${record.source || '本地导入'}\n- 包含节点数: ${raw.nodes.length}\n- 识别模型: ${record.modelInfo}\n\n在此记录您的第一印象与使用心得...`
      );

      // Apply suggested auto-detected tags
      const allCats = await StorageService.getAllCategories();
      const allTags = await StorageService.getAllTags();
      const tagsToLink: { tagId: string; isAutoDetected: boolean }[] = [];

      for (const st of suggestedTags) {
        const cat = allCats.find(c => c.key === st.categoryKey);
        if (cat) {
          let foundTag = allTags.find(t => t.name === st.tagName && t.categoryId === cat.id);
          if (!foundTag) {
            const newId = 'tag_' + Math.random().toString(36).substring(2, 8);
            foundTag = { id: newId, categoryId: cat.id, name: st.tagName, isAutoDetected: true };
            await StorageService.saveTag(foundTag);
          }
          tagsToLink.push({ tagId: foundTag.id, isAutoDetected: true });
        }
      }

      if (tagsToLink.length > 0) {
        await StorageService.setWorkflowTags(record.id, tagsToLink);
      }

      setResultMessage({
        type: 'success',
        text: `成功导入工作流: "${record.name}" (${record.modelInfo}, ${raw.nodes.length} 节点)`
      });

      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: '导入失败: ' + (err.message || '文件解析错误')
      });
    }
  };

  // Handle file select
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setResultMessage(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        await processWorkflowString(text, file.name);
      } catch (e: any) {
        setResultMessage({ type: 'error', text: '读取文件出错: ' + e.message });
      }
    }
    setIsProcessing(false);
  };

  // Full backup export
  const handleFullBackupExport = async () => {
    try {
      const backupJson = await StorageService.exportFullBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FlowLens_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('导出备份失败: ' + err.message);
    }
  };

  // Full backup import
  const handleFullBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const text = await e.target.files[0].text();
      const res = await StorageService.importFullBackup(text);
      alert(`全量备份恢复成功！共恢复 ${res.importedCount} 个工作流及关联数据。`);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      alert('恢复备份失败，请检查文件是否为有效的 FlowLens 备份包: ' + err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">收录 ComfyUI 工作流</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'upload' ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON 文件上传</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'paste' ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>粘贴 JSON 文本</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'backup' ? 'border-purple-400 text-purple-400 bg-zinc-900/60' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>全量数据备份</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
                }`}
              >
                <Upload className="w-8 h-8 text-cyan-400 mb-3 animate-bounce" />
                <div className="text-sm font-semibold text-white">
                  点击选择或拖拽 ComfyUI 工作流 JSON 到此处
                </div>
                <div className="text-xs text-zinc-400 mt-1 max-w-sm">
                  支持标准 Web UI 导出的工作流 JSON 及 API Prompt 格式
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  multiple
                  onChange={e => handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <textarea
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                placeholder="直接粘贴 ComfyUI 工作流的原始 JSON 代码..."
                rows={9}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-zinc-200 font-mono outline-none resize-none leading-relaxed"
              />
              <button
                disabled={!jsonText.trim() || isProcessing}
                onClick={() => processWorkflowString(jsonText)}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {isProcessing ? '正在解析工作流...' : '解析并收录'}
              </button>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>导出 FlowLens 完整数据库</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  将所有工作流、多维标签、个人整理布局、使用心得笔记与关联素材打包备份为单文件。
                </p>
                <button
                  onClick={handleFullBackupExport}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  立即下载全量备份 (.json)
                </button>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>恢复数据库备份</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  选择之前导出的 FlowLens 备份文件进行一键还原。
                </p>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFullBackupImport}
                  className="hidden"
                />
                <button
                  onClick={() => backupInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  选择备份文件还原
                </button>
              </div>
            </div>
          )}

          {/* Feedback Result Message */}
          {resultMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                  : resultMessage.type === 'warning'
                  ? 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
                  : 'bg-red-950/60 border border-red-800/60 text-red-300'
              }`}
            >
              {resultMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
