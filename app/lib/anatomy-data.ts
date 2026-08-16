// Meridian / Channel data — no external models required.
// All 3D positions use a normalized body coordinate system:
//   Y: +1 (crown) to -1 (feet),  origin at body center
//   X: +1 (right) to -1 (left)
//   Z: +0.8 (front) to -0.8 (back)

export type OrganId =
  | "lung" | "large-intestine" | "stomach" | "spleen"
  | "heart" | "small-intestine" | "bladder" | "kidney"
  | "pericardium" | "san-jiao" | "gallbladder" | "liver"
  | "ren" | "du" | "dai";

export type HotspotStructure = {
  id: string;
  /** TCM standard name */
  ta: string;
  position: [number, number, number];
  color: string;
};

export type OrganStructure = {
  id: OrganId;
  /** No GLB — rendered programmatically */
  model: "meridian";
  icon: string;
  accent: string;
  illustrated: false;
  scientificName: string;
  /** Yin channels = cooler tones; Yang channels = warmer tones */
  meridianType: "yin" | "yang" | "extra";
  /** Primary organ or function */
  organ: string;
  /** Which zang-fu or extraordinary organ */
  system: string;
  /** Body region the channel mainly traverses */
  region: string;
  /** Yuan-source point (key point) */
  yuanPoint: string;
  /** Luo-connecting point */
  luoPoint: string;
  hotspots: HotspotStructure[];
};

export const organStructures: OrganStructure[] = [
  // ─── 手太阴肺经 (LU) ───────────────────────────────────────────────
  {
    id: "lung",
    model: "meridian",
    icon: "☁",
    accent: "#7ec8e3",
    illustrated: false,
    scientificName: "Taiyin Lung Channel",
    meridianType: "yin",
    organ: "肺",
    system: "手太阴肺经",
    region: "胸→手臂内侧→拇指",
    yuanPoint: "LU9 太渊",
    luoPoint: "LU7 列缺",
    hotspots: [
      { id: "lu1", ta: "LU1 中府", position: [-1.25, 0.55, 0.55], color: "#7ec8e3" },
      { id: "lu2", ta: "LU2 云门", position: [-1.22, 0.52, 0.58], color: "#7ec8e3" },
      { id: "lu5", ta: "LU5 尺泽", position: [-1.08, -0.25, 0.52], color: "#5bb3cc" },
      { id: "lu7", ta: "LU7 列缺", position: [-1.05, -0.62, 0.62], color: "#5bb3cc" },
      { id: "lu9", ta: "LU9 太渊", position: [-1.02, -0.82, 0.65], color: "#3a9ab5" },
    ],
  },
  // ─── 手阳明大肠经 (LI) ─────────────────────────────────────────────
  {
    id: "large-intestine",
    model: "meridian",
    icon: "⿴",
    accent: "#f5a623",
    illustrated: false,
    scientificName: "Yangming Large Intestine Channel",
    meridianType: "yang",
    organ: "大肠",
    system: "手阳明大肠经",
    region: "食指→手臂外侧→面部",
    yuanPoint: "LI4 合谷",
    luoPoint: "LI6 偏历",
    hotspots: [
      { id: "li1", ta: "LI1 商阳", position: [-0.62, -0.92, 0.6], color: "#f5a623" },
      { id: "li4", ta: "LI4 合谷", position: [-0.68, -0.87, 0.65], color: "#f5a623" },
      { id: "li10", ta: "LI10 手三里", position: [-0.88, -0.35, 0.5], color: "#e08c1a" },
      { id: "li11", ta: "LI11 曲池", position: [-0.92, -0.12, 0.45], color: "#e08c1a" },
      { id: "li15", ta: "LI15 肩髃", position: [-0.95, 0.22, 0.4], color: "#c87410" },
      { id: "li20", ta: "LI20 迎香", position: [-0.55, 0.22, 0.78], color: "#c87410" },
    ],
  },
  // ─── 足阳明胃经 (ST) ───────────────────────────────────────────────
  {
    id: "stomach",
    model: "meridian",
    icon: "田",
    accent: "#f5c842",
    illustrated: false,
    scientificName: "Yangming Stomach Channel",
    meridianType: "yang",
    organ: "胃",
    system: "足阳明胃经",
    region: "眼下方→胸部→腿部前侧→足背",
    yuanPoint: "ST42 冲阳",
    luoPoint: "ST40 丰隆",
    hotspots: [
      { id: "st1", ta: "ST1 承泣", position: [-0.5, 0.32, 0.75], color: "#f5c842" },
      { id: "st6", ta: "ST6 下关", position: [-0.62, 0.18, 0.72], color: "#f5c842" },
      { id: "st25", ta: "ST25 天枢", position: [-0.55, -0.05, 0.62], color: "#e8b830" },
      { id: "st36", ta: "ST36 足三里", position: [-0.4, -0.52, 0.48], color: "#e8b830" },
      { id: "st41", ta: "ST41 解溪", position: [-0.32, -0.82, 0.55], color: "#d4a520" },
      { id: "st45", ta: "ST45 厉兑", position: [-0.28, -0.97, 0.62], color: "#d4a520" },
    ],
  },
  // ─── 足太阴脾经 (SP) ───────────────────────────────────────────────
  {
    id: "spleen",
    model: "meridian",
    icon: "� espiral",
    accent: "#f7d154",
    illustrated: false,
    scientificName: "Taiyin Spleen Channel",
    meridianType: "yin",
    organ: "脾",
    system: "足太阴脾经",
    region: "足大趾→腿内侧→胸腹部",
    yuanPoint: "SP3 太白",
    luoPoint: "SP4 公孙",
    hotspots: [
      { id: "sp1", ta: "SP1 隐白", position: [-0.22, -0.97, 0.5], color: "#f7d154" },
      { id: "sp3", ta: "SP3 太白", position: [-0.26, -0.88, 0.5], color: "#f7d154" },
      { id: "sp4", ta: "SP4 公孙", position: [-0.28, -0.82, 0.5], color: "#f0c840" },
      { id: "sp6", ta: "SP6 三阴交", position: [-0.3, -0.58, 0.45], color: "#f0c840" },
      { id: "sp10", ta: "SP10 血海", position: [-0.32, -0.42, 0.48], color: "#e8be30" },
      { id: "sp21", ta: "SP21 大横", position: [-0.58, -0.05, 0.6], color: "#e8be30" },
    ],
  },
  // ─── 手少阴心经 (HT) ───────────────────────────────────────────────
  {
    id: "heart",
    model: "meridian",
    icon: "♥",
    accent: "#c94a4a",
    illustrated: false,
    scientificName: "Shaoyin Heart Channel",
    meridianType: "yin",
    organ: "心",
    system: "手少阴心经",
    region: "腋下→手臂内侧→小指",
    yuanPoint: "HT7 神门",
    luoPoint: "HT5 通里",
    hotspots: [
      { id: "ht1", ta: "HT1 极泉", position: [-1.3, 0.25, 0.5], color: "#c94a4a" },
      { id: "ht3", ta: "HT3 少海", position: [-1.18, -0.18, 0.48], color: "#c94a4a" },
      { id: "ht5", ta: "HT5 通里", position: [-1.12, -0.38, 0.5], color: "#b84040" },
      { id: "ht7", ta: "HT7 神门", position: [-1.08, -0.68, 0.58], color: "#b84040" },
      { id: "ht9", ta: "HT9 少冲", position: [-1.0, -0.87, 0.65], color: "#a83535" },
    ],
  },
  // ─── 手太阳小肠经 (SI) ─────────────────────────────────────────────
  {
    id: "small-intestine",
    model: "meridian",
    icon: "◎",
    accent: "#e8b84b",
    illustrated: false,
    scientificName: "Taiyang Small Intestine Channel",
    meridianType: "yang",
    organ: "小肠",
    system: "手太阳小肠经",
    region: "小指→手臂外侧→耳部",
    yuanPoint: "SI4 腕骨",
    luoPoint: "SI7 支正",
    hotspots: [
      { id: "si1", ta: "SI1 少泽", position: [-0.58, -0.93, 0.55], color: "#e8b84b" },
      { id: "si3", ta: "SI3 后溪", position: [-0.62, -0.86, 0.55], color: "#e8b84b" },
      { id: "si8", ta: "SI8 小海", position: [-0.92, -0.18, 0.42], color: "#d4a438" },
      { id: "si10", ta: "SI10 臑俞", position: [-0.97, 0.1, 0.4], color: "#d4a438" },
      { id: "si19", ta: "SI19 听宫", position: [-0.65, 0.18, 0.72], color: "#c09028" },
    ],
  },
  // ─── 足太阳膀胱经 (BL) ─────────────────────────────────────────────
  {
    id: "bladder",
    model: "meridian",
    icon: "☵",
    accent: "#6a9fd4",
    illustrated: false,
    scientificName: "Taiyang Bladder Channel",
    meridianType: "yang",
    organ: "膀胱",
    system: "足太阳膀胱经",
    region: "眼内角→头顶→背部→腿后侧→小趾",
    yuanPoint: "BL64 京骨",
    luoPoint: "BL58 飞扬",
    hotspots: [
      { id: "bl1", ta: "BL1 睛明", position: [-0.42, 0.34, 0.77], color: "#6a9fd4" },
      { id: "bl10", ta: "BL10 天柱", position: [-0.82, 0.58, 0.42], color: "#6a9fd4" },
      { id: "bl13", ta: "BL13 肺俞", position: [-0.72, 0.18, -0.38], color: "#5a8fc4" },
      { id: "bl17", ta: "BL17 膈俞", position: [-0.62, 0.02, -0.38], color: "#5a8fc4" },
      { id: "bl23", ta: "BL23 肾俞", position: [-0.55, -0.2, -0.38], color: "#4a7fb4" },
      { id: "bl40", ta: "BL40 委中", position: [-0.38, -0.45, -0.35], color: "#4a7fb4" },
      { id: "bl57", ta: "BL57 承山", position: [-0.35, -0.65, -0.3], color: "#3a6fa4" },
      { id: "bl67", ta: "BL67 至阴", position: [-0.25, -0.97, 0.3], color: "#3a6fa4" },
    ],
  },
  // ─── 足少阴肾经 (KD) ───────────────────────────────────────────────
  {
    id: "kidney",
    model: "meridian",
    icon: "☰",
    accent: "#8b5fa8",
    illustrated: false,
    scientificName: "Shaoyin Kidney Channel",
    meridianType: "yin",
    organ: "肾",
    system: "足少阴肾经",
    region: "足底→腿内侧→胸部",
    yuanPoint: "KD3 太溪",
    luoPoint: "KD4 大钟",
    hotspots: [
      { id: "kd1", ta: "KD1 涌泉", position: [-0.2, -0.98, 0.45], color: "#8b5fa8" },
      { id: "kd3", ta: "KD3 太溪", position: [-0.25, -0.82, 0.45], color: "#8b5fa8" },
      { id: "kd4", ta: "KD4 大钟", position: [-0.28, -0.78, 0.45], color: "#7a5098" },
      { id: "kd6", ta: "KD6 照海", position: [-0.28, -0.68, 0.45], color: "#7a5098" },
      { id: "kd10", ta: "KD10 阴谷", position: [-0.32, -0.5, 0.42], color: "#694588" },
      { id: "kd27", ta: "KD27 俞府", position: [-1.08, 0.38, 0.52], color: "#694588" },
    ],
  },
  // ─── 手厥阴心包经 (PC) ─────────────────────────────────────────────
  {
    id: "pericardium",
    model: "meridian",
    icon: "✧",
    accent: "#d4688a",
    illustrated: false,
    scientificName: "Jueyin Pericardium Channel",
    meridianType: "yin",
    organ: "心包",
    system: "手厥阴心包经",
    region: "胸部→手臂内侧→中指",
    yuanPoint: "PC7 大陵",
    luoPoint: "PC6 内关",
    hotspots: [
      { id: "pc1", ta: "PC1 天池", position: [-1.28, 0.42, 0.55], color: "#d4688a" },
      { id: "pc3", ta: "PC3 曲泽", position: [-1.12, -0.15, 0.5], color: "#d4688a" },
      { id: "pc4", ta: "PC4 郄门", position: [-1.1, -0.28, 0.5], color: "#c45a78" },
      { id: "pc6", ta: "PC6 内关", position: [-1.08, -0.48, 0.52], color: "#c45a78" },
      { id: "pc7", ta: "PC7 大陵", position: [-1.05, -0.68, 0.58], color: "#b44c68" },
      { id: "pc9", ta: "PC9 中冲", position: [-1.0, -0.88, 0.65], color: "#b44c68" },
    ],
  },
  // ─── 手少阳三焦经 (SJ) ─────────────────────────────────────────────
  {
    id: "san-jiao",
    model: "meridian",
    icon: "⊕",
    accent: "#7eb87a",
    illustrated: false,
    scientificName: "Shaoyang San Jiao Channel",
    meridianType: "yang",
    organ: "三焦",
    system: "手少阳三焦经",
    region: "无名指→手臂外侧→耳部",
    yuanPoint: "SJ4 阳池",
    luoPoint: "SJ5 外关",
    hotspots: [
      { id: "sj1", ta: "SJ1 关冲", position: [-0.55, -0.93, 0.58], color: "#7eb87a" },
      { id: "sj3", ta: "SJ3 中渚", position: [-0.6, -0.85, 0.58], color: "#7eb87a" },
      { id: "sj5", ta: "SJ5 外关", position: [-0.92, -0.35, 0.42], color: "#6aa86a" },
      { id: "sj10", ta: "SJ10 天井", position: [-0.95, -0.05, 0.4], color: "#6aa86a" },
      { id: "sj17", ta: "SJ17 翳风", position: [-0.72, 0.2, 0.68], color: "#589858" },
      { id: "sj23", ta: "SJ23 丝竹空", position: [-0.58, 0.25, 0.75], color: "#589858" },
    ],
  },
  // ─── 足少阳胆经 (GB) ───────────────────────────────────────────────
  {
    id: "gallbladder",
    model: "meridian",
    icon: "☱",
    accent: "#6db36d",
    illustrated: false,
    scientificName: "Shaoyang Gallbladder Channel",
    meridianType: "yang",
    organ: "胆",
    system: "足少阳胆经",
    region: "眼外角→头部侧面→腿外侧→足四趾",
    yuanPoint: "GB40 丘墟",
    luoPoint: "GB37 光明",
    hotspots: [
      { id: "gb1", ta: "GB1 瞳子髎", position: [-0.48, 0.3, 0.78], color: "#6db36d" },
      { id: "gb20", ta: "GB20 风池", position: [-0.78, 0.58, 0.45], color: "#6db36d" },
      { id: "gb21", ta: "GB21 肩井", position: [-0.95, 0.22, 0.38], color: "#5da35d" },
      { id: "gb30", ta: "GB30 环跳", position: [-0.65, -0.28, -0.32], color: "#5da35d" },
      { id: "gb34", ta: "GB34 阳陵泉", position: [-0.38, -0.5, -0.28], color: "#4d934d" },
      { id: "gb40", ta: "GB40 丘墟", position: [-0.3, -0.88, 0.45], color: "#4d934d" },
      { id: "gb44", ta: "GB44 足窍阴", position: [-0.28, -0.97, 0.5], color: "#3d833d" },
    ],
  },
  // ─── 足厥阴肝经 (LV) ───────────────────────────────────────────────
  {
    id: "liver",
    model: "meridian",
    icon: "⿱",
    accent: "#48b846",
    illustrated: false,
    scientificName: "Jueyin Liver Channel",
    meridianType: "yin",
    organ: "肝",
    system: "足厥阴肝经",
    region: "足大趾→腿内侧→腹部→胁部",
    yuanPoint: "LV3 太冲",
    luoPoint: "LV5 蠡沟",
    hotspots: [
      { id: "lv1", ta: "LV1 大敦", position: [-0.18, -0.97, 0.52], color: "#48b846" },
      { id: "lv2", ta: "LV2 行间", position: [-0.22, -0.92, 0.52], color: "#48b846" },
      { id: "lv3", ta: "LV3 太冲", position: [-0.26, -0.85, 0.5], color: "#48b846" },
      { id: "lv5", ta: "LV5 蠡沟", position: [-0.3, -0.68, 0.45], color: "#38a838" },
      { id: "lv8", ta: "LV8 曲泉", position: [-0.33, -0.52, 0.42], color: "#38a838" },
      { id: "lv13", ta: "LV13 章门", position: [-0.65, -0.02, 0.58], color: "#289828" },
      { id: "lv14", ta: "LV14 期门", position: [-1.1, 0.12, 0.55], color: "#289828" },
    ],
  },
  // ─── 任脉 (Ren) ────────────────────────────────────────────────────
  {
    id: "ren",
    model: "meridian",
    icon: "☯",
    accent: "#e87d9e",
    illustrated: false,
    scientificName: "Ren Mai — Conception Vessel",
    meridianType: "extra",
    organ: "任脉",
    system: "任脉（奇经）",
    region: "会阴→腹部正中线→下巴",
    yuanPoint: "CV4 关元",
    luoPoint: "CV15 鸠尾",
    hotspots: [
      { id: "cv1", ta: "CV1 会阴", position: [-0.0, -0.62, 0.0], color: "#e87d9e" },
      { id: "cv3", ta: "CV3 中极", position: [-0.0, -0.42, 0.45], color: "#e87d9e" },
      { id: "cv4", ta: "CV4 关元", position: [-0.0, -0.28, 0.48], color: "#e87d9e" },
      { id: "cv6", ta: "CV6 气海", position: [-0.0, -0.15, 0.5], color: "#d86d8e" },
      { id: "cv8", ta: "CV8 神阙", position: [-0.0, -0.0, 0.55], color: "#d86d8e" },
      { id: "cv12", ta: "CV12 中脘", position: [-0.0, 0.12, 0.55], color: "#c85d7e" },
      { id: "cv17", ta: "CV17 膻中", position: [-0.0, 0.32, 0.55], color: "#c85d7e" },
      { id: "cv22", ta: "CV22 天突", position: [-0.0, 0.52, 0.6], color: "#b84d6e" },
      { id: "cv24", ta: "CV24 承浆", position: [-0.0, 0.2, 0.72], color: "#b84d6e" },
    ],
  },
  // ─── 督脉 (Du) ────────────────────────────────────────────────────
  {
    id: "du",
    model: "meridian",
    icon: "☰",
    accent: "#5b9bd5",
    illustrated: false,
    scientificName: "Du Mai — Governing Vessel",
    meridianType: "extra",
    organ: "督脉",
    system: "督脉（奇经）",
    region: "尾骨→背部正中线→头顶→上唇",
    yuanPoint: "GV4 命门",
    luoPoint: "GV1 长强",
    hotspots: [
      { id: "gv1", ta: "GV1 长强", position: [-0.0, -0.65, -0.2], color: "#5b9bd5" },
      { id: "gv3", ta: "GV3 腰俞", position: [-0.0, -0.42, -0.32], color: "#5b9bd5" },
      { id: "gv4", ta: "GV4 命门", position: [-0.0, -0.25, -0.35], color: "#5b9bd5" },
      { id: "gv6", ta: "GV6 脊中", position: [-0.0, -0.08, -0.36], color: "#4b8bc5" },
      { id: "gv9", ta: "GV9 至阳", position: [-0.0, 0.08, -0.38], color: "#4b8bc5" },
      { id: "gv14", ta: "GV14 大椎", position: [-0.0, 0.42, -0.3], color: "#3b7bb5" },
      { id: "gv20", ta: "GV20 百会", position: [-0.0, 0.82, 0.25], color: "#3b7bb5" },
      { id: "gv26", ta: "GV26 人中", position: [-0.0, 0.22, 0.75], color: "#2b6ba5" },
    ],
  },
  // ─── 带脉 (Dai) ────────────────────────────────────────────────────
  {
    id: "dai",
    model: "meridian",
    icon: "◎",
    accent: "#b07cc8",
    illustrated: false,
    scientificName: "Dai Mai — Belt Vessel",
    meridianType: "extra",
    organ: "带脉",
    system: "带脉（奇经）",
    region: "胁部环形，约束诸经",
    yuanPoint: "GB26 带脉",
    luoPoint: "GB25 维道",
    hotspots: [
      { id: "dai1", ta: "GB25 带脉", position: [-0.58, -0.12, 0.55], color: "#b07cc8" },
      { id: "dai2", ta: "GB26 维道", position: [-0.62, -0.12, 0.5], color: "#b07cc8" },
      { id: "dai3", ta: "GB41 足临泣", position: [-0.32, -0.82, 0.45], color: "#a06cb8" },
      { id: "dai4", ta: "SJ5 外关", position: [-0.92, -0.35, 0.42], color: "#a06cb8" },
    ],
  },
];

export const organIds = organStructures.map((organ) => organ.id);
export const structureById = Object.fromEntries(
  organStructures.map((organ) => [organ.id, organ]),
) as Record<OrganId, OrganStructure>;
