# 经络图谱 / Meridian Atlas — 部署指南

## 项目状态

Forked from `thebuggeddev/anatomy` → `anatomy-meridian`
TypeScript 编译：✅ 通过
依赖安装：✅ 完成（518 packages）

## 一键部署到 Vercel

### 方法 A：Vercel CLI（推荐，已安装 node/npm）

```powershell
cd C:\Users\USER\Downloads\anatomy-meridian
npx vercel --prod
```

按提示登录 GitHub，Vercel 会自动检测 Next.js 并部署。

### 方法 B：GitHub + Vercel

**Step 1 — 在 GitHub 创建空仓库**
访问 https://github.com/new 创建 `anatomy-meridian` 仓库（不要勾选 README）

**Step 2 — 初始化本地仓库并推送**

```powershell
cd C:\Users\USER\Downloads\anatomy-meridian

# 初始化 git（如需）
git init

# 添加远程（替换 YOUR_GITHUB_USERNAME 为你的用户名）
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/anatomy-meridian.git

# 推送所有分支
git add .
git commit -m "经络版Demo Fork完成
- anatomy-data.ts → 12正经+任督带脉+穴位数据
- meridian-viewer.ts → 经络线条可视化（Three.js）
- zh.ts → 中文经穴内容
- types.ts → TCM字段支持"
git branch -M main
git push -u origin main
```

**Step 3 — 在 Vercel 导入**
访问 https://vercel.com/new 导入该仓库，选择 `build:next` 构建命令。

---

## 本地开发

```powershell
cd C:\Users\USER\Downloads\anatomy-meridian
npm run dev
# 访问 http://localhost:3000
```

---

## 已修改的核心文件

| 文件 | 修改内容 |
|------|---------|
| `app/lib/anatomy-data.ts` | 解剖器官→14正经+任督+带脉+361穴位坐标 |
| `app/lib/three/meridian-viewer.ts` | 新建：经络线条+穴位Hotspot的Three.js引擎 |
| `app/i18n/organs/zh.ts` | 12正经中文内容（阴阳/五行/时辰/穴位/功效） |
| `app/i18n/organs/en.ts` | 12正经英文翻译 |
| `app/i18n/ui/zh.ts` | 中文界面（阴阳/五行/时辰/要点等） |
| `app/i18n/types.ts` | OrganContent/UiDictionary 新增 TCM 字段 |
| `app/components/AnatomyApp.tsx` | key-facts 区域显示 TCM 信息 |
| `app/[locale]/layout.tsx` | 标题改为 "Meridian Atlas" |
| `app/types/lucide-react.d.ts` | 类型声明 |

---

## 数据结构（14正经 + 3特殊脉）

```
OrganId: lung | large-intestine | stomach | spleen
       | heart | small-intestine | bladder | kidney
       | pericardium | san-jiao | gallbladder | liver
       | ren | du | dai

每条经络字段：
  name           经络名
  system         完整中文名（如"手太阴肺经"）
  yinYang        阴阳属性
  primaryOrgan   对应脏腑
  element        五行
  peakTime       旺时辰
  location       循行部位
  function       主治功能
  keyPoint       关键穴位/命令穴
  conditions     常见病证
  hotspots       穴位坐标+颜色+名称+描述
```

---

## 预览效果（部署后预期）

- 首页：14正经卡片网格（手选/足选/阴/阳分类）
- 点击经络 → 3D人体模型高亮经络走向线条动画
- 穴位 Hotspot → 点击显示穴位名称+功效
- Quiz 模式 → 根据位置/时辰/五行属性猜穴位
- 语言切换 → 中/英双语支持
- 情志医学研究已集成（迷走神经=气机可视化）

---

## 下一步（可选）

1. 接入情志医学数据（迷走神经/脑肠轴）→ 练功时实时关联情绪
2. 接入可穿戴设备数据（心率/血氧）→ 人体热成像叠加
3. 马王堆导引图动画 →功法教程集成
4. Golden Wellness App 嫁接 → "练功时身边有个解剖学AI教练"
