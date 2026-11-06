# FlowLens 项目演进与产品复盘时间线 (Project Evolution Timeline)

> 本文档用于完整沉淀 FlowLens 项目从零启动、需求演进、Bug 诊断与 UI/UX 架构重塑的全部轮次记录。后续每个迭代轮次均持续同步沉淀，确保产品设计与技术决策脉络清晰可溯。

---

## 轮次脉络总览 (Rounds Summary)

| 轮次 | 阶段主题 | 核心诉求 / 报错 / 痛点 | 关键解法与架构决策 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **Round 1** | 项目初始化与克隆起点 | 基于 GitHub `FlowLens` 仓库启动，建立本地构建运行环境 | 搭建 Vite + React + Tailwind + TSX 架构，初始化 ComfyUI 工作流解析渲染引擎 | ✅ 完成 |
| **Round 2** | 素材库 (AssetHub) 架构引入 | 提出工作流需要资产库/素材库闭环，支持跨工作流素材复用与封面设置 | 建立 IndexedDB `assets` 实体表与 `workflow_assets` 关系表，完成素材库视图 | ✅ 完成 |
| **Round 3** | IndexedDB 事务Bug修复 | 报 `TransactionInactiveError: getAll on IDBObjectStore` | 修复多异步 Promise.all 跨事务等待导致的事务失效，确保连接安全 | ✅ 完成 |
| **Round 4** | 画布动效与节点信息交互 | 连线流光不够高级、顶部异常留白、双击看节点详情逻辑纠偏 | 引入高级光子能量脉冲动画（Photon Pulse SVG Filter），规范双击唤起节点逻辑 | ✅ 完成 |
| **Round 5** | 弹窗标签溢出与交互纠偏 | 关联弹窗在多标签/状态下出现视觉溢出 | 优化弹窗内部布局与弹性徽章计算，完善封面状态联动与解绑反馈 | ✅ 完成 |
| **Round 6** | 节点级参数素材精准绑定 | 提出节点绑定只能激活单一素材，需要过滤候选节点与参数端口 | 扩展数据结构支持 `nodeId`、`paramName`、`slotIndex`，完成素材至节点映射数据流 | ✅ 完成 |
| **Round 7** | 绑定落库事务失效修复 | 绑定素材报 `TransactionInactiveError: put on IDBObjectStore` | 诊断出内部调用跨表读取导致原事务提前 commit，将读取前置并使用同步回调修复 | ✅ 完成 |
| **Round 8** | 素材绑定弹窗信息过载治理 | 用户反馈双栏 3 步弹窗内容过多、认知摩擦大 | 废弃 420px 臃肿左栏，改为顶置紧凑上下文条（Context Bar）+ 100% 满屏素材画廊 | ✅ 完成 |
| **Round 9** | 无遮罩停靠侧边栏重构 (方案A) | 用户指出右侧抽屉加黑遮罩打断看画布，极其不符合专业工具规范 | 彻底移除 Backdrop Dim 遮罩，改为左画布与右工作台并排无缝停靠，双模合一 | ✅ 完成 |
| **Round 10** | 规范真实场景绑定资格 & 时间线机制 | 节点参数无脑全部加 `🔗` 绑定（如 768、false、尺寸），不符合 ComfyUI 真实场景 | 建立严格的节点与参数绑定判定引擎（Eligibility Engine），仅开放真实媒体路径；建立本文档 | ✅ 完成 |
| **Round 11** | 彻底肃清非媒体节点素材误显 (KSampler/LoRA/Cache) | 画布上 LoraLoader、Qwen Cache、KSampler 等节点赫然显示了图片预览；用户强调 KSampler 的 latent_image 并非素材参数 | 诊断出 NodeView 的 Base64 模糊匹配 Bug 与 latent_image 端口误判，确立 ComfyUI 纯算子/模型节点绝对白名单防御，接入 isNodeBindable 强守卫 | ✅ 完成 |
| **Round 12** | 明确“源头加载与成果输出”双端绑定原则，排除中间节点 | 用户发现多模态编码节点（#9 TextEncodeQwenImage21）因有 IMAGE 输入端口而错误出现绑定与图片展示；强调中间节点无需绑定，仅上传/加载源头与成果输出节点需要 | 确立“源头输入（Source Loader）与终端输出（Terminal Output）”双端专属模型，中间传递节点全面禁绑与禁显，端口按节点白名单联动屏蔽 | ✅ 完成 |

---

## 详细迭代历程 (Detailed Changelog)

### [Round 1] 代码库初始化与基线建立
- **用户诉求**：以 `https://github.com/Glauy/FlowLens.git` 为基础构建应用，确保环境跑通。
- **工程交付**：
  - 构建 React + TypeScript + Tailwind 运行时环境；
  - 引入 ComfyUI JSON 解析器，提取 nodes、links、groups、widgets。

---

### [Round 2] 素材资产库 (AssetHub) 核心闭环
- **用户诉求**：评估是否需要素材库/资产库，实现同一素材跨工作流复用、上传与封面绑定。
- **架构决策**：
  - 设计多对多资产引用模型：`AssetRecord`（全局资产池）+ `WorkflowAssetRecord`（关联关系）；
  - 支持图片、视频、音频三种媒体格式；
  - 建立 AssetHub 全局资产管理视图。

---

### [Round 3] IndexedDB 事务异步中断修复
- **报错定位**：`TransactionInactiveError: Failed to execute 'getAll' on 'IDBObjectStore': The transaction has finished.`
- **根因分析**：在单次读取循环中进行了 await 微任务等待，导致 IndexedDB 自动 commit。
- **解决方案**：批量预取资产列表，避免在事务生命周期内插入外部 await。

---

### [Round 4] 画布视觉工程：连线流光、布局与双击交互
- **用户痛点**：边的流光效果粗糙、双击查看节点信息不顺畅、顶部留白生硬。
- **视觉优化**：
  - 实现基于 SVG 自定义滤镜的能量光子流光动画（Photon Glow Filter），提供 3 档速度与关闭选项；
  - 纠正顶部导航栏与画布边距，适配视口居中；
  - 规范单击（高亮拓扑）与双击（呼出节点详情）操作边界。

---

### [Round 5] 关联弹窗响应式与排版优化
- **用户痛点**：工作流关联素材列表中，状态徽章与操作按钮在窄视口下产生水平溢出。
- **解决方案**：重构弹性响应式卡片，优化多文字换行与封面设置标识。

---

### [Round 6] 节点级素材绑定体系设计
- **用户痛点**：工作流中的素材必须能与具体节点绑定并在画布上激活展示，且同一节点只能激活一个主素材。
- **方案落地**：
  - 数据层扩充 `nodeId`、`paramName`、`slotIndex`；
  - 实现 `StorageService.bindAssetToNode`，保证单节点唯一激活素材约束；
  - 节点视图支持直观预览所绑定的输入图。

---

### [Round 7] 绑定操作中的事务失效 Bug 解决
- **报错定位**：`TransactionInactiveError: Failed to execute 'put' on 'IDBObjectStore' at bindAssetToNode`。
- **根因分析**：在 `readwrite` 事务中调用 `this.getAssetById` 开启了新只读事务，微任务等待导致原写事务失效。
- **解决方案**：将元数据拉取提前至事务开启前，重构 `req.onsuccess` 同步回调执行写入。

---

### [Round 8] 绑定弹窗 UI 瘦身与体验重塑
- **用户痛点**：全屏大黑弹窗内容太多，左侧节点筛选与右侧素材库割裂。
- **重构方案**：
  - 移除 420px 的左侧大边栏；
  - 改为顶置轻量下拉 Context Bar（目标节点 + 槽位）；
  - 全屏 100% 释放给素材库网格浏览。

---

### [Round 9] 右侧停靠式工作台重塑 (Dockable Zero-Overlay Panel)
- **用户痛点**：右侧抽屉自带暗化遮罩，打断看画布，极其不符合专业工具 UI/UX。
- **高级设计落地**：
  - 彻底干掉黑遮罩，左画布与右面板平级 Dock 停靠；
  - 画布保持 100% 可操作，用户可对照笔记拖动画布查看节点；
  - 统一双模分流：`[ 📖 工作流档案 ]` 与 `[ ⚙️ 节点详情 #ID ]`。

---

### [Round 10] 节点与参数绑定资格判定引擎 (Eligibility Engine)
- **用户痛点与截图分析**：
  - 用户反馈 `#2 姿势图库 image 1 (RH_PoseGallery)` 节点中，参数 `[0]: full_sexy_P004_front` 是唯一需要绑定的素材文件名，而 `[1]: 原尺寸`（下拉模式）、`[2]: 768`（宽整型）、`[3]: 1024`（高整型）、`[4]: false`（翻转布尔）全都无脑出现了 `🔗` 按钮；
  - 输入端口中，`resize_mode (COMBO)` 等非媒体端口也出现了 `🔗` 按钮；
  - 在真实 ComfyUI 生产场景中，一个拥有几十个节点的工作流，仅有 2~4 个媒体输入/输出节点（如 LoadImage, RH_PoseGallery, ControlNet, SaveImage）需要且能够挂载素材；纯计算节点（KSampler, VAE, CLIP, Latent, Logic）不应该提供任何素材绑定入口。
- **核心判定架构落地 (`src/utils/nodeCandidateUtils.ts`)**：
  1. **`isNodeBindable(node: ComfyNode): boolean`**：
     - 白名单匹配媒体输入输出类型（LoadImage, RH_PoseGallery, ControlNet, IPAdapter, SaveImage 等）；
     - 严格过滤纯计算节点（KSampler, VAELoader, CheckpointLoader, CLIPTextEncode, EmptyLatent 等）；
     - 对于非媒体节点，完全隐藏“节点展示素材绑定”卡片与关联按钮，恢复纯粹干净的参数面板。
  2. **`isWidgetBindable(widgetVal, widgetIndex, node): boolean`**：
     - **数值与布尔强阻断**：`typeof val === 'number'`（如 768, 1024, 0.75）、`typeof val === 'boolean'`（如 false, true）严禁绑定；
     - **非媒体下拉枚举拦截**：过滤 `原尺寸`、`nearest-exact`、`euler`、`karras` 等 ComfyUI 常见参数字符串；
     - **真实媒体路径放行**：识别媒体后缀（`.png`, `.jpg`, `.webp`, `.mp4` 等）；针对媒体源节点（如 RH_PoseGallery, LoadImage），仅放行 index 为 0 的首位素材文件名/标识槽位。
  3. **`isInputSlotBindable(slot: { name, type }): boolean`**：
     - 仅放行媒体流端口（`IMAGE`, `MASK`, `VIDEO`, `AUDIO`）；
     - 坚决屏蔽 `MODEL`, `VAE`, `CLIP`, `CONDITIONING`, `INT`, `FLOAT`, `COMBO` 端口的绑定入口。
  4. **全链路组件联动**：
     - `NodeDetailDrawer.tsx`：仅合格参数与合格端口显示 `🔗`；仅合格节点显示素材卡片；
     - `BindAssetModal.tsx`：槽位下拉菜单（Slot Popover）仅列出过滤合格的媒体端口与素材参数，防止误绑数值或非媒体选项；
  5. **持续时间线沉淀机制**：建立本文档，所有后续轮次均按照统一格式沉淀。

---

### [Round 11] 彻底肃清非媒体节点（KSampler / LoRA / Cache）素材误显与判定严密化
- **用户痛点与截图分析 (`image_69166745.png`)**：
  - 画布上原本属于模型权重的 `#18 LoraLoaderModelOnly`、算子缓存的 `#8 Qwen 2.1 Cache`、采样计算的 `#15 KSampler` 竟然全都在卡片下方展示了同一张素材图（`仓库速递员-搭配参考.png`）；
  - 用户明确点醒：“虽然 KSampler 中有 `latent_image`，但它不是素材参数，根本不需要素材，没必要进行绑定”。
- **两大隐蔽技术根因定位**：
  1. **Base64 字符串全包含 Bug**：
     - 在原 `NodeView.tsx` 自动匹配逻辑中，包含了一行代码：`(asset.dataUrl && asset.dataUrl.toLowerCase().includes(w))`；
     - 由于 `asset.dataUrl` 是长度数十万字节的 Base64 字符串，天然随机包含了常见短词；而 LoRA 节点的参数有 `1`，Cache 节点的参数有 `auto`，KSampler 的参数有 `1`、`simple`、`euler`；
     - 导致只要节点参数中包含 `1` 或常见词汇，全部命中 `dataUrl.includes(w)`，瞬间将全工作流节点都映射上了第一张素材！
  2. **`latent_image` 端口概念混淆**：
     - 之前的端口识别仅匹配 `nameLower.includes('image')`，而 `latent_image` 端口数据类型为 `LATENT`（潜在空间张量，由 `EmptyLatentImage` 或 `VAEEncode` 产生），**绝不是外部图片素材**，用户无法直接把 PNG/JPG 喂给 LATENT 端口；
     - 因此它被错误放行，使得 KSampler 被判定为了“可绑素材节点”。
- **ComfyUI 生产级核心重构方案**：
  1. **绝对黑名单防御 (`NON_BINDABLE_NODE_PATTERNS`)**：
     - 明确将 `sampler`, `ksampler`, `checkpoint`, `unetloader`, `lora`, `cache`, `freeu`, `hypertile`, `sampling`, `vae`, `clip`, `conditioning`, `fluxguidance`, `latent`, `reroute`, `note`, `primitive`, `switch` 等全部算子与控制节点列入最高优先级禁入名单；
     - 只要节点类型或功能命中禁入名单，`isNodeBindable(node)` 一票否决返回 `false`。
  2. **精准排除 `LATENT` 潜在空间**：
     - `isInputSlotBindable` 将 `LATENT`、`latent_image`、`latent_key`、`samples` 彻底阻断，只有真正的像素媒体流（`IMAGE`、`MASK`、`VIDEO`、`AUDIO`）才可作为素材槽位。
  3. **NodeView 强守卫与废除 Base64 扫描**：
     - 在 `NodeView.tsx` 中引入 `isNodeBindable(node)` 强前置守卫：非媒体节点 `matchedAsset` 强制为 `null`，且不渲染任何素材占位符或容器；
     - 彻底删除危险的 `dataUrl.includes(w)`，改为对经过 `isWidgetBindable` 验证的真实媒体文件名进行精确或有意义的主干匹配。
  4. **候选绑定弹窗纯净度提升**：
     - `filterCandidateNodes` 中的候选节点列表仅收敛输出真实媒体输入节点（如 `LoadImage`, `RH_PoseGallery`, `ControlNet`）与成果输出节点（如 `SaveImage`, `PreviewImage`），彻底过滤无关节点，避免认知干扰。

---

### [Round 12] 确立“源头加载与成果输出”双端绑定专属原则，排除中间节点
- **用户痛点与截图分析 (`image_ec81e731.png`)**：
  - 用户选中国产 Qwen 多模态条件编码节点 `#9 姿势 image1 + 真人 image2 (TextEncodeQwenImage21)`，发现：
    1. 画布节点内部依然错误渲染了真人图片的展示；
    2. 右侧抽屉“输入端口”列表中，已连线的 `images.image_1 (from #2)`、`images.image_2 (from #4)` 以及未连线的 `images.image_3` 后面全都出现了 `🔗` 绑定按钮；
  - **用户精准定调**：“像这种节点不需要绑定，它虽然有图片输入，但是自己不需要绑定素材展示。绑定的角色是上传/加载素材节点，以及输出节点有必要，中间节点都不需要绑定素材”。
- **ComfyUI 架构与产品场景本质**：
  - 在 ComfyUI 流程中，中间节点（如多模态 Prompt 编码器、ControlNet Apply、ImageScale 缩放、ImageCrop 裁剪、VAEDecode 等）即使拥有 `IMAGE` 输入槽位，也只是管线内部的数据消费者和传递者（通过连线 `from #2` 动态流动而来）；
  - 真正需要“与素材库资产绑定”并展示的，只有流程的**始末两端**：
    1. **源头输入节点 (Source Loaders)**：如 `LoadImage`, `RH_PoseGallery`, `LoadVideo`, `LoadAudio`（用户在这里上传或选取外部资产进入流程）；
    2. **终端输出节点 (Terminal Outputs)**：如 `SaveImage`, `PreviewImage`, `VHS_VideoCombine`（工作流在这里生成可交付的成果物）。
  - 输入端口本质是拓扑连线插槽，绝不是资产挂载点，输入端口绝不应该出现 `🔗` 按钮。
- **架构重构与治理方案**：
  1. **彻底废除“凭有 IMAGE 端口即可绑定”的判定逻辑**：
     - 从 `isNodeBindable` 中删除 `node.inputs?.some(isInputSlotBindable)` 兜底放行代码；
     - 将所有中间编码（`textencode`, `encode`）、条件应用（`controlnet`, `ipadapter`, `pulid`, `instantid`）、图像处理（`scale`, `crop`, `blend`, `composite`, `rembg`）全部纳入绝对禁止名单。
  2. **收敛源头加载与成果输出白名单**：
     - 输入白名单限定为真正的源头加载器：`INPUT_LOADER_NODE_TYPES` (`loadimage`, `loadimagemask`, `loadvideo`, `loadaudio`, `rh_posegallery` 等)；
     - 输出白名单限定为成果导出器：`OUTPUT_NODE_TYPES` (`saveimage`, `previewimage`, `videocombine` 等)。
  3. **净化输入端口列表 (`NodeDetailDrawer.tsx`)**：
     - 彻底移除输入端口上的 `🔗` 按钮，输入端口仅承担连线状态展示（`from #2 ->` 跳转前序节点或 `未连线`），还给用户极其清爽的专业视图。
  4. **参数与卡片严格受限于 `isBindable`**：
     - 若节点不是源头或输出节点，参数列表禁止显示 `🔗`，且顶部绝对不显示素材绑定卡片；
     - 画布 (`NodeView.tsx`) 对非源头/输出节点强制不渲染任何素材图片与拖拽区域。


