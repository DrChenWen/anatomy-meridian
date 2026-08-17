/**
 * acupoint-aligner.js
 * 
 * Reads body-male.glb and outputs estimated acupoint 3D positions
 * based on standard TCM anatomy UV/template mapping.
 * 
 * Run: node acupoint-aligner.js
 */
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Scene } from "three/src/scenes/Scene.js";
import { BufferGeometry } from "three/src/BufferGeometry.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const glbPath = path.join(__dirname, "public/models/body-male.glb");

// ─────────────────────────────────────────────────────
// Standard acupoint positions (Y = height above ankle in metres, X = lateral offset)
// Based on TCM standard anatomical proportions (170cm male reference).
// Y=0 is at the ankle level of the GLB after FIT_SIZE centering.
// ─────────────────────────────────────────────────────
//
// We use a simpler approach: ray-cast from UV coordinates into the mesh
// to find the 3D surface position. But GLBLoader doesn't give us the raw
// UV → 3D mapping easily. Instead, we use anatomical proportions relative
// to bounding box.
//
// After loading, the model is FIT_SIZE-normalised (≈ 2 units tall).
// We use proportions from standard anatomy charts:
//   Total height: ~2.0 units (FIT_SIZE)
//   Head top:     +1.0 (Y)
//   C7 vertebra:   +0.65
//   Acromion:      +0.52
//   Nipple line:   +0.35
//   Navel:          0.0 (centre)
//   Groin:         -0.10
//   Knee:          -0.38
//   Ankle:         -0.80

const BODY_HEIGHT = 2.0; // FIT_SIZE reference
const ANKLE_Y = -BODY_HEIGHT / 2;
const HEAD_TOP_Y = BODY_HEIGHT / 2;

// Proportion-based acupoint positions [x, y, z]
// x: lateral (-left, +right)
// y: height (metres from ankle)
// z: depth (+front, -back)
// These are based on standard TCM anatomy charts for a 170cm adult male.
export const ACUPOINT_POSITIONS = {
  // ─── Lung (LU) — 手太阴肺经 ───────────────────────────────
  LU1:  [0.12,  0.32,  0.13],   // 中府  chest, 6 cun lateral to midline, 1 cun above LU2
  LU2:  [0.11,  0.30,  0.13],   // 云门  anterior chest, 6 cun lateral, in depression below clavicle
  LU3:  [0.10,  0.27,  0.13],   // 天府  upper arm, 6 cun below axilla, biceps brachii
  LU4:  [0.10,  0.24,  0.13],   // 侠白  upper arm, 4 cun below LU3
  LU5:  [0.10,  0.20,  0.13],   // 尺泽  elbow crease, lateral end
  LU6:  [0.09,  0.15,  0.12],   // 孔最  forearm, 7 cun above wrist crease
  LU7:  [0.08,  0.09,  0.11],   // 列缺  wrist, 1.5 cun above styloid process
  LU8:  [0.07,  0.07,  0.10],   // 经渠  wrist, above styloid process
  LU9:  [0.06,  0.05,  0.09],   // 鱼际  palm, 1st metacarpal, mid-muscle
  LU10: [0.05,  0.04,  0.08],   // 少商  thumb tip, radial nail corner

  // ─── Large Intestine (LI) — 手阳明大肠经 ─────────────────
  LI1:  [-0.05,  0.04,  0.08],  // 商阳  index finger, radial nail corner
  LI2:  [-0.06,  0.05,  0.09],  // 二间  index finger, 2nd MCP crease
  LI3:  [-0.07,  0.07,  0.10],  // 三间  index finger, 2nd MCP crease, dorsal
  LI4:  [-0.05,  0.09,  0.11],  // 合谷  hand dorsum, 1st-2nd MC gap
  LI5:  [-0.06,  0.07,  0.09],  // 阳溪  wrist, anatomical snuffbox
  LI6:  [-0.07,  0.15,  0.12],  // 偏历  forearm, 3 cun above wrist
  LI7:  [-0.08,  0.18,  0.12],  // 温溜  forearm, 5 cun above wrist
  LI8:  [-0.09,  0.21,  0.12],  // 下廉  forearm, 4 cun below LI11
  LI9:  [-0.09,  0.24,  0.12],  // 上廉  forearm, 3 cun below LI11
  LI10: [-0.10,  0.27,  0.13],  // 手三里  forearm, 2 cun below elbow
  LI11: [-0.10,  0.30,  0.13],  // 曲池  elbow crease, lateral end
  LI12: [-0.10,  0.32,  0.13],  // 肘髎  elbow, lateral epicondyle
  LI13: [-0.10,  0.34,  0.13],  // 手五里  upper arm, 3 cun above LI11
  LI14: [-0.10,  0.37,  0.13],  // 臂臑  upper arm, 7 cun above LI11, lateral to humerus
  LI15: [-0.09,  0.42,  0.13],  // 肩髃  shoulder, anterior to acromion
  LI16: [-0.07,  0.48,  0.12],  // 巨骨  above clavicle, midpoint
  LI17: [-0.05,  0.52,  0.12],  // 天鼎  neck, SCM, sternal head
  LI18: [-0.04,  0.56,  0.12],  // 扶突  neck, SCM, midpoint
  LI19: [-0.03,  0.60,  0.11],  // 口禾髎  face, lateral to nose ala
  LI20: [-0.02,  0.62,  0.11],  // 迎香  face, nasolabial groove

  // ─── Stomach (ST) — 足阳明胃经 ──────────────────────────
  ST1:  [ 0.00,  0.60,  0.10],  // 承泣  face, infraorbital margin
  ST2:  [ 0.03,  0.60,  0.10],  // 四白  face, 1 cun below eye
  ST3:  [ 0.06,  0.59,  0.10],  // 巨髎  face, level of LI20
  ST4:  [ 0.08,  0.58,  0.11],  // 地仓  face, corner of mouth
  ST5:  [ 0.09,  0.57,  0.11],  // 大迎  face, mandibular angle
  ST6:  [ 0.10,  0.55,  0.11],  // 颊车  face, masseter
  ST7:  [ 0.10,  0.53,  0.11],  // 下关  face, TMJ
  ST8:  [ 0.07,  0.48,  0.12],  // 头维  scalp, hairline
  ST9:  [ 0.08,  0.46,  0.12],  // 人迎  neck, SCM
  ST10: [ 0.09,  0.43,  0.12],  // 水突  neck, sternal SCM
  ST11: [ 0.09,  0.40,  0.13],  // 气舍  neck, clavicle
  ST12: [ 0.08,  0.36,  0.13],  // 缺盆  chest, clavicle
  ST13: [ 0.09,  0.32,  0.13],  // 气户  chest, 4 cun lateral
  ST14: [ 0.10,  0.30,  0.13],  // 库房  chest, 1st intercostal
  ST15: [ 0.10,  0.27,  0.13],  // 屋翳  chest, 2nd intercostal
  ST16: [ 0.11,  0.24,  0.13],  // 膺窗  chest, 3rd intercostal
  ST17: [ 0.11,  0.21,  0.13],  // 乳中  chest, nipple
  ST18: [ 0.11,  0.18,  0.13],  // 乳根  chest, 5th intercostal
  ST19: [ 0.09,  0.14,  0.12],  // 不容  epigastrium, 6 cun from midline
  ST20: [ 0.09,  0.11,  0.12],  // 承满  epigastrium, 5 cun from midline
  ST21: [ 0.08,  0.08,  0.12],  // 梁门  epigastrium, 4 cun from midline
  ST22: [ 0.08,  0.05,  0.12],  // 关门  abdomen, 3 cun from midline
  ST23: [ 0.07,  0.02,  0.12],  // 太乙  abdomen, 2 cun from midline
  ST24: [ 0.06, -0.01,  0.12],  // 滑肉门  abdomen, 1 cun from midline
  ST25: [ 0.05, -0.05,  0.12],  // 天枢  abdomen, 2 cun lateral to navel
  ST26: [ 0.06, -0.09,  0.12],  // 外陵  lower abdomen, 2 cun below ST25
  ST27: [ 0.07, -0.13,  0.12],  // 大巨  lower abdomen, 2 cun below ST26
  ST28: [ 0.07, -0.17,  0.12],  // 水道  lower abdomen, 3 cun below ST25
  ST29: [ 0.07, -0.21,  0.12],  // 归来  lower abdomen, 4 cun below ST25
  ST30: [ 0.07, -0.25,  0.12],  // 气冲  lower abdomen, 5 cun below ST25, inguinal area
  ST31: [ 0.07, -0.28,  0.12],  // 伏兔  thigh, 6 cun above patella
  ST32: [ 0.07, -0.33,  0.12],  // 犊鼻  knee, patellar ligament
  ST33: [ 0.07, -0.37,  0.12],  // 阴市  thigh, 3 cun above medial patella
  ST34: [ 0.07, -0.38,  0.12],  // 梁丘  knee, 2 cun above patella
  ST35: [ 0.07, -0.39,  0.12],  // 犊鼻  knee, below patella
  ST36: [ 0.07, -0.42,  0.12],  // 足三里  shin, 3 cun below ST35, 1 finger lateral
  ST37: [ 0.07, -0.48,  0.12],  // 上巨虚  shin, 6 cun below ST35
  ST38: [ 0.07, -0.52,  0.12],  // 条口  shin, 8 cun below ST35
  ST39: [ 0.07, -0.56,  0.12],  // 下巨虚  shin, 9 cun below ST35
  ST40: [ 0.07, -0.50,  0.12],  // 丰隆  shin, lateral calf
  ST41: [ 0.07, -0.57,  0.12],  // 解溪  ankle, transverse creast
  ST42: [ 0.07, -0.60,  0.12],  // 陷谷  foot dorsum, 2nd-3rd toe
  ST43: [ 0.06, -0.62,  0.11],  // 然谷  foot, 2nd-3rd MC
  ST44: [ 0.05, -0.64,  0.10],  // 内庭  foot, 2nd toe web space
  ST45: [ 0.04, -0.65,  0.09],  // 厉兑  foot, 2nd toe nail

  // ─── Spleen (SP) — 足太阴脾经 ──────────────────────────
  SP1:  [ 0.04, -0.65,  0.08],  // 隐白  great toe nail
  SP2:  [ 0.05, -0.63,  0.09],  // 大都  great toe, ball of foot
  SP3:  [ 0.05, -0.62,  0.09],  // 太白  foot, medial cuneiform
  SP4:  [ 0.06, -0.60,  0.10],  // 公孙  foot, 1st metatarsal
  SP5:  [ 0.06, -0.58,  0.11],  // 商丘  ankle, medial malleolus
  SP6:  [ 0.06, -0.52,  0.11],  // 三阴交  shin, 3 cun above medial malleolus
  SP7:  [ 0.06, -0.48,  0.11],  // 漏谷  shin, 6 cun above malleolus
  SP8:  [ 0.06, -0.44,  0.11],  // 地机  shin, below knee
  SP9:  [ 0.06, -0.41,  0.11],  // 阴陵泉  knee, medial condyle
  SP10: [ 0.06, -0.37,  0.12],  // 血海  thigh, medial
  SP11: [ 0.06, -0.34,  0.12],  // 箕门  thigh, 6 cun above medial knee
  SP12: [ 0.07, -0.28,  0.12],  // 冲门  groin, femoral artery
  SP13: [ 0.08, -0.25,  0.12],  // 府舍  lower abdomen
  SP14: [ 0.09, -0.21,  0.12],  // 腹结  abdomen, 1.3 cun below SP15
  SP15: [ 0.09, -0.17,  0.12],  // 大横  abdomen, 4 cun lateral to navel
  SP16: [ 0.09, -0.13,  0.12],  // 腹哀  abdomen, 3 cun above SP15
  SP17: [ 0.09, -0.08,  0.12],  // 食窦  chest, 6th intercostal
  SP18: [ 0.09, -0.04,  0.12],  // 天溪  chest, 4th intercostal
  SP19: [ 0.09,  0.00,  0.12],  // 胸乡  chest, 3rd intercostal
  SP20: [ 0.09,  0.04,  0.12],  // 周荣  chest, 2nd intercostal
  SP21: [ 0.09,  0.08,  0.13],  // 大包  chest, mid-axillary, 6-7th intercostal

  // ─── Heart (HT) — 手少阴心经 ───────────────────────────
  HT1:  [ 0.11,  0.30,  0.13],  // 极泉  axilla, lateral chest
  HT2:  [ 0.10,  0.27,  0.13],  // 青灵  upper arm, 3 cun below axilla
  HT3:  [ 0.10,  0.24,  0.13],  // 少海  elbow, medial end
  HT4:  [ 0.10,  0.21,  0.12],  // 灵道  forearm, 1.5 cun above wrist
  HT5:  [ 0.10,  0.18,  0.12],  // 通里  forearm, 1 cun above wrist
  HT6:  [ 0.09,  0.15,  0.12],  // 阴郄  forearm, 0.5 cun above wrist
  HT7:  [ 0.09,  0.12,  0.11],  // 神门  wrist, ulnar side
  HT8:  [ 0.08,  0.09,  0.11],  // 少府  palm, 4th-5th MC gap
  HT9:  [ 0.07,  0.07,  0.10],  // 少冲  small finger, ulnar nail

  // ─── Small Intestine (SI) — 手太阳小肠经 ───────────────
  SI1:  [-0.07,  0.07,  0.08],  // 少泽  small finger, ulnar nail
  SI2:  [-0.07,  0.09,  0.09],  // 前谷  small finger, MCP crease
  SI3:  [-0.07,  0.11,  0.10],  // 后溪  small finger, MCP crease, dorsal
  SI4:  [-0.07,  0.13,  0.11],  // 腕骨  hand, ulnar side
  SI5:  [-0.08,  0.15,  0.11],  // 阳谷  wrist, dorsal
  SI6:  [-0.08,  0.18,  0.12],  // 养老  forearm, dorsal wrist
  SI7:  [-0.08,  0.21,  0.12],  // 支正  forearm, 5 cun above wrist
  SI8:  [-0.09,  0.24,  0.12],  // 小海  elbow, medial epicondyle
  SI9:  [-0.10,  0.27,  0.13],  // 肩贞  shoulder, posterior
  SI10: [-0.10,  0.30,  0.13],  // 臑俞  upper arm, posterior
  SI11: [-0.10,  0.33,  0.13],  // 天宗  scapula, subscapular fossa
  SI12: [-0.10,  0.36,  0.13],  // 秉风  scapula, supraspinous fossa
  SI13: [-0.09,  0.39,  0.13],  // 曲垣  scapula, medial border
  SI14: [-0.09,  0.42,  0.13],  // 肩外俞  scapula, 3 cun lateral to T1
  SI15: [-0.08,  0.45,  0.13],  // 肩中俞  scapula, 2 cun lateral to C7
  SI16: [-0.07,  0.49,  0.12],  // 天窗  neck, SCM
  SI17: [-0.06,  0.52,  0.12],  // 天容  neck, SCM, posterior
  SI18: [-0.05,  0.56,  0.11],  // 颧髎  face, zygomatic arch
  SI19: [-0.04,  0.60,  0.11],  // 听宫  face, pretragal depression

  // ─── Bladder (BL) — 足太阳膀胱经 ───────────────────────
  BL1:  [-0.03,  0.63,  0.11],  // 睛明  face, medial canthus
  BL2:  [-0.05,  0.62,  0.11],  // 攒竹  face, eyebrow
  BL3:  [-0.05,  0.60,  0.11],  // 眉冲  forehead
  BL4:  [-0.06,  0.58,  0.11],  // 曲差  forehead, 1.5 cun from midline
  BL5:  [-0.07,  0.56,  0.11],  // 五处  forehead, 1 cun from midline
  BL6:  [-0.08,  0.54,  0.11],  // 承光  scalp, 1.5 cun from midline
  BL7:  [-0.08,  0.52,  0.11],  // 通天  scalp, 1.5 cun from midline
  BL8:  [-0.09,  0.50,  0.12],  // 络却  scalp, 1.5 cun from midline
  BL9:  [-0.09,  0.48,  0.12],  // 玉枕  occiput, 1.3 cun from midline
  BL10: [-0.08,  0.46,  0.12],  // 天柱  neck, trapezius
  BL11: [-0.09,  0.40,  0.13],  // 大杼  back, T1, 1.5 cun from midline
  BL12: [-0.09,  0.37,  0.13],  // 风门  back, T2, 1.5 cun from midline
  BL13: [-0.09,  0.34,  0.13],  // 肺俞  back, T3, 1.5 cun from midline
  BL14: [-0.09,  0.31,  0.13],  // 厥阴俞  back, T4, 1.5 cun from midline
  BL15: [-0.09,  0.28,  0.13],  // 心俞  back, T5, 1.5 cun from midline
  BL16: [-0.09,  0.25,  0.13],  // 督俞  back, T6, 1.5 cun from midline
  BL17: [-0.09,  0.22,  0.13],  // 膈俞  back, T7, 1.5 cun from midline
  BL18: [-0.09,  0.19,  0.13],  // 肝俞  back, T9, 1.5 cun from midline
  BL19: [-0.09,  0.16,  0.13],  // 胆俞  back, T10, 1.5 cun from midline
  BL20: [-0.09,  0.13,  0.13],  // 脾俞  back, T11, 1.5 cun from midline
  BL21: [-0.09,  0.10,  0.13],  // 胃俞  back, T12, 1.5 cun from midline
  BL22: [-0.09,  0.07,  0.13],  // 三焦俞  back, L1, 1.5 cun from midline
  BL23: [-0.09,  0.04,  0.13],  // 肾俞  back, L2, 1.5 cun from midline
  BL24: [-0.09,  0.01,  0.13],  // 气海俞  back, L3, 1.5 cun from midline
  BL25: [-0.09, -0.02,  0.13],  // 大肠俞  back, L4, 1.5 cun from midline
  BL26: [-0.09, -0.05,  0.13],  // 关元俞  back, L5, 1.5 cun from midline
  BL27: [-0.09, -0.08,  0.13],  // 小肠俞  back, S1, 1.5 cun from midline
  BL28: [-0.09, -0.11,  0.13],  // 膀胱俞  back, S2, 1.5 cun from midline
  BL29: [-0.09, -0.14,  0.13],  // 中膂俞  back, S3, 1.5 cun from midline
  BL30: [-0.09, -0.17,  0.13],  // 白环俞  back, S4, 1.5 cun from midline
  BL31: [-0.08, -0.19,  0.13],  // 上髎  sacrum, 1st sacral foramen
  BL32: [-0.08, -0.21,  0.13],  // 次髎  sacrum, 2nd sacral foramen
  BL33: [-0.08, -0.23,  0.13],  // 中髎  sacrum, 3rd sacral foramen
  BL34: [-0.08, -0.25,  0.13],  // 下髎  sacrum, 4th sacral foramen
  BL35: [-0.07, -0.28,  0.12],  // 会阳  perineum, midline
  BL36: [-0.07, -0.33,  0.12],  // 承扶  buttock, gluteal fold
  BL37: [-0.07, -0.38,  0.12],  // 殷门  thigh, posterior midline
  BL38: [-0.07, -0.43,  0.12],  // 浮郄  knee, lateral popliteal crease
  BL39: [-0.07, -0.47,  0.12],  // 委阳  knee, lateral to BL40
  BL40: [-0.07, -0.49,  0.12],  // 委中  knee, popliteal crease
  BL41: [-0.07, -0.52,  0.12],  // 附分  back, T2, 3 cun from midline
  BL42: [-0.07, -0.55,  0.12],  // 魄户  back, T3, 3 cun from midline
  BL43: [-0.07, -0.58,  0.12],  // 膏肓  back, T4, 3 cun from midline
  BL44: [-0.07, -0.61,  0.12],  // 神堂  back, T5, 3 cun from midline
  BL45: [-0.07, -0.64,  0.12],  // 譩譆  back, T6, 3 cun from midline
  BL46: [-0.07, -0.67,  0.12],  // 膈关  back, T7, 3 cun from midline
  BL47: [-0.07, -0.70,  0.12],  // 魂门  back, T9, 3 cun from midline
  BL48: [-0.07, -0.73,  0.12],  // 阳纲  back, T10, 3 cun from midline
  BL49: [-0.07, -0.76,  0.12],  // 意舍  back, T11, 3 cun from midline
  BL50: [-0.07, -0.79,  0.12],  // 胃仓  back, T12, 3 cun from midline
  BL51: [-0.07, -0.82,  0.12],  // 肓门  back, L1, 3 cun from midline
  BL52: [-0.07, -0.85,  0.12],  // 志室  back, L2, 3 cun from midline
  BL53: [-0.07, -0.88,  0.12],  // 胞肓  back, S2, 3 cun from midline
  BL54: [-0.07, -0.91,  0.12],  // 秩边  back, S4, 3 cun from midline
  BL55: [-0.07, -0.55,  0.11],  // 合阳  calf, 2 cun below popliteal crease
  BL56: [-0.07, -0.52,  0.11],  // 承筋  calf, most prominent part of gastrocnemius
  BL57: [-0.07, -0.49,  0.11],  // 承山  calf, tip of gastrocnemius
  BL58: [-0.07, -0.45,  0.11],  // 飞扬  calf, 7 cun above lateral malleolus
  BL59: [-0.07, -0.42,  0.11],  // 跗阳  ankle, 3 cun above lateral malleolus
  BL60: [-0.07, -0.60,  0.11],  // 昆仑  ankle, lateral malleolus
  BL61: [-0.07, -0.62,  0.10],  // 仆参  foot, lateral calcaneus
  BL62: [-0.07, -0.63,  0.09],  // 申脉  foot, lateral calcaneus
  BL63: [-0.07, -0.64,  0.08],  // 金门  foot, cuboid
  BL64: [-0.07, -0.65,  0.07],  // 京骨  foot, tuberosity of 5th metatarsal
  BL65: [-0.07, -0.66,  0.06],  // 束骨  foot, tuberosity of 5th metatarsal, dorsal
  BL66: [-0.07, -0.67,  0.05],  // 足通谷  foot, 5th toe web
  BL67: [-0.07, -0.68,  0.04],  // 至阴  foot, 5th toe lateral nail

  // ─── Kidney (KD) — 足少阴肾经 ──────────────────────────
  KD1:  [ 0.07, -0.60,  0.09],  // 涌泉  foot, sole
  KD2:  [ 0.07, -0.58,  0.10],  // 然谷  foot, medial calcaneus
  KD3:  [ 0.07, -0.55,  0.11],  // 太溪  ankle, medial malleolus
  KD4:  [ 0.07, -0.53,  0.11],  // 大钟  ankle, posterior to medial malleolus
  KD5:  [ 0.07, -0.51,  0.11],  // 水泉  ankle, 1 cun below KD3
  KD6:  [ 0.07, -0.49,  0.11],  // 照海  ankle, medial malleolus
  KD7:  [ 0.07, -0.45,  0.11],  // 复溜  shin, 2 cun above KD3
  KD8:  [ 0.07, -0.42,  0.11],  // 交信  shin, 2 cun above KD6
  KD9:  [ 0.07, -0.39,  0.11],  // 筑宾  shin, 5 cun above medial malleolus
  KD10: [ 0.07, -0.36,  0.11],  // 阴谷  knee, medial popliteal crease
  KD11: [ 0.07, -0.32,  0.12],  // 横骨  groin, 5 cun above midline
  KD12: [ 0.07, -0.28,  0.12],  // 大赫  lower abdomen
  KD13: [ 0.08, -0.24,  0.12],  // 气穴  lower abdomen
  KD14: [ 0.08, -0.20,  0.12],  // 四满  lower abdomen
  KD15: [ 0.08, -0.16,  0.12],  // 中注  abdomen
  KD16: [ 0.09, -0.12,  0.12],  // 肓俞  abdomen, 0.5 cun from midline
  KD17: [ 0.09, -0.08,  0.12],  // 商曲  abdomen, 2 cun from midline
  KD18: [ 0.09, -0.04,  0.12],  // 石关  abdomen, 3 cun from midline
  KD19: [ 0.09,  0.00,  0.12],  // 阴都  abdomen, 4 cun from midline
  KD20: [ 0.09,  0.04,  0.12],  // 腹通谷  abdomen, 5 cun from midline
  KD21: [ 0.09,  0.08,  0.13],  // 幽门  epigastrium, 6 cun from midline
  KD22: [ 0.09,  0.12,  0.13],  // 步廊  chest, 5th intercostal
  KD23: [ 0.09,  0.16,  0.13],  // 神封  chest, 4th intercostal
  KD24: [ 0.09,  0.20,  0.13],  // 灵墟  chest, 3rd intercostal
  KD25: [ 0.09,  0.24,  0.13],  // 神藏  chest, 2nd intercostal
  KD26: [ 0.09,  0.28,  0.13],  // 彧中  chest, 1st intercostal
  KD27: [ 0.09,  0.32,  0.13],  // 俞府  chest, 2 cun below clavicle

  // ─── Pericardium (PC) — 手厥阴心包经 ───────────────────
  PC1:  [ 0.11,  0.29,  0.13],  // 天池  chest, 4th intercostal
  PC2:  [ 0.11,  0.26,  0.13],  // 天泉  upper arm, 2 cun below axilla
  PC3:  [ 0.10,  0.23,  0.13],  // 曲泽  elbow, medial end
  PC4:  [ 0.10,  0.20,  0.12],  // 郄门  forearm, 5 cun above wrist
  PC5:  [ 0.10,  0.17,  0.12],  // 间使  forearm, 3 cun above wrist
  PC6:  [ 0.10,  0.14,  0.12],  // 内关  forearm, 2 cun above wrist
  PC7:  [ 0.09,  0.11,  0.11],  // 大陵  wrist, between tendons
  PC8:  [ 0.09,  0.09,  0.10],  // 劳宫  palm, between 2nd-3rd MC
  PC9:  [ 0.08,  0.07,  0.09],  // 中冲  middle finger, tip

  // ─── San Jiao (SJ) — 手少阳三焦经 ──────────────────────
  SJ1:  [-0.08,  0.07,  0.08],  // 关冲  ring finger, ulnar nail
  SJ2:  [-0.08,  0.09,  0.09],  // 液门  ring finger, 4th MCP crease
  SJ3:  [-0.08,  0.11,  0.10],  // 中渚  hand, 4th MC gap, dorsal
  SJ4:  [-0.08,  0.13,  0.11],  // 阳池  wrist, dorsal, ulnar side
  SJ5:  [-0.08,  0.15,  0.11],  // 外关  forearm, 2 cun above wrist
  SJ6:  [-0.08,  0.18,  0.12],  // 支沟  forearm, 3 cun above wrist
  SJ7:  [-0.08,  0.21,  0.12],  // 会宗  forearm, 1 cun lateral to SJ6
  SJ8:  [-0.08,  0.24,  0.12],  // 三阳络  forearm, 4 cun above wrist
  SJ9:  [-0.08,  0.27,  0.12],  // 四渎  forearm, 5 cun above wrist
  SJ10: [-0.09,  0.30,  0.13],  // 天井  elbow, lateral end
  SJ11: [-0.09,  0.33,  0.13],  // 清冷渊  upper arm, 3 cun above SJ10
  SJ12: [-0.09,  0.36,  0.13],  // 消泺  upper arm, 4 cun above SJ10
  SJ13: [-0.09,  0.39,  0.13],  // 臑会  upper arm, 4 cun below shoulder
  SJ14: [-0.09,  0.42,  0.13],  // 肩髎  shoulder, posterior
  SJ15: [-0.09,  0.45,  0.13],  // 天髎  scapula, supraspinous
  SJ16: [-0.08,  0.48,  0.12],  // 天牖  neck, SCM
  SJ17: [-0.07,  0.51,  0.12],  // 翳风  neck, behind ear
  SJ18: [-0.06,  0.54,  0.11],  // 瘈脉  face, behind ear
  SJ19: [-0.05,  0.56,  0.11],  // 颅息  face, behind ear
  SJ20: [-0.04,  0.58,  0.11],  // 角孙  face, ear top
  SJ21: [-0.03,  0.60,  0.11],  // 耳门  face, pretragal notch
  SJ22: [-0.02,  0.61,  0.11],  // 耳和髎  face, posterior to tragus
  SJ23: [-0.01,  0.62,  0.11],  // 丝竹空  face, lateral eyebrow

  // ─── Gallbladder (GB) — 足少阳胆经 ─────────────────────
  GB1:  [-0.12,  0.61,  0.11],  // 瞳子髎  face, lateral canthus
  GB2:  [-0.11,  0.60,  0.11],  // 听会  face, pretragal notch
  GB3:  [-0.10,  0.59,  0.11],  // 上关  face, above TMJ
  GB4:  [-0.09,  0.58,  0.11],  // 颌厌  face, hairline
  GB5:  [-0.08,  0.57,  0.11],  // 悬颅  face, temporal
  GB6:  [-0.07,  0.56,  0.11],  // 悬厘  face, temporal
  GB7:  [-0.06,  0.55,  0.11],  // 曲鬓  face, temporal
  GB8:  [-0.05,  0.53,  0.11],  // 率谷  scalp, 1.5 cun above ear tip
  GB9:  [-0.04,  0.51,  0.12],  // 天冲  occiput, 1 cun posterior to GB10
  GB10: [-0.04,  0.49,  0.12],  // 浮白  occiput, 1 cun above ear
  GB11: [-0.04,  0.47,  0.12],  // 头窍阴  occiput, 1 cun below GB10
  GB12: [-0.05,  0.45,  0.12],  // 完骨  occiput, mastoid
  GB13: [-0.07,  0.43,  0.12],  // 本神  scalp, 0.5 cun from midline
  GB14: [-0.06,  0.41,  0.12],  // 阳白  face, 1 cun above eyebrow
  GB15: [-0.05,  0.39,  0.12],  // 头临泣  face, 0.5 cun from midline
  GB16: [-0.04,  0.37,  0.12],  // 目窗  face, 1.5 cun from midline
  GB17: [-0.03,  0.35,  0.12],  // 正营  face, 2.5 cun from midline
  GB18: [-0.02,  0.33,  0.12],  // 承灵  face, 3.5 cun from midline
  GB19: [-0.01,  0.31,  0.12],  // 脑空  occiput, 2 cun from midline
  GB20: [-0.01,  0.29,  0.12],  // 风池  neck, trapezius
  GB21: [-0.09,  0.38,  0.13],  // 肩井  shoulder, midpoint of C7-acromion
  GB22: [-0.09,  0.35,  0.13],  // 腋渊  axilla
  GB23: [-0.10,  0.32,  0.13],  // 辄筋  chest, 4th intercostal
  GB24: [-0.09,  0.28,  0.13],  // 日月  chest, 7th intercostal
  GB25: [-0.09,  0.22,  0.13],  // 京门  flank, 12th rib
  GB26: [-0.09,  0.18,  0.13],  // 带脉  flank, 11th rib
  GB27: [-0.09,  0.14,  0.13],  // 五枢  lower abdomen, anterior to ASIS
  GB28: [-0.09,  0.10,  0.13],  // 维道  lower abdomen, 0.5 cun below GB27
  GB29: [-0.08,  0.06,  0.13],  // 居髎  hip, midpoint of ASIS-GT
  GB30: [-0.08,  0.02,  0.13],  // 环跳  hip, greater trochanter
  GB31: [-0.07, -0.04,  0.13],  // 风市  thigh, lateral, 7 cun above knee
  GB32: [-0.07, -0.08,  0.12],  // 中渎  thigh, 2 cun above GB34
  GB33: [-0.07, -0.12,  0.12],  // 膝阳关  knee, lateral
  GB34: [-0.07, -0.38,  0.12],  // 阳陵泉  knee, lateral condyle
  GB35: [-0.07, -0.44,  0.12],  // 阳交  calf, 7 cun above lateral malleolus
  GB36: [-0.07, -0.49,  0.12],  // 外丘  calf, 7 cun above lateral malleolus
  GB37: [-0.07, -0.52,  0.12],  // 光明  shin, 5 cun above lateral malleolus
  GB38: [-0.07, -0.55,  0.12],  // 阳辅  shin, 4 cun above lateral malleolus
  GB39: [-0.07, -0.58,  0.12],  // 悬钟  shin, 3 cun above lateral malleolus
  GB40: [-0.07, -0.62,  0.11],  // 丘墟  ankle, lateral malleolus
  GB41: [-0.07, -0.64,  0.10],  // 足临泣  foot, 4th-5th toe gap
  GB42: [-0.07, -0.65,  0.09],  // 地五会  foot, 4th metatarsal
  GB43: [-0.07, -0.66,  0.08],  // 侠溪  foot, 4th-5th toe web
  GB44: [-0.07, -0.67,  0.07],  // 足窍阴  foot, 4th toe lateral nail

  // ─── Liver (LV) — 足厥阴肝经 ───────────────────────────
  LV1:  [ 0.07, -0.64,  0.08],  // 大敦  great toe, lateral nail
  LV2:  [ 0.07, -0.62,  0.09],  // 行间  foot, 1st-2nd toe web
  LV3:  [ 0.07, -0.60,  0.10],  // 太冲  foot, dorsum, 1st-2nd MC gap
  LV4:  [ 0.07, -0.58,  0.11],  // 中封  ankle, medial, between tendons
  LV5:  [ 0.07, -0.55,  0.11],  // 蠡沟  shin, 5 cun above medial malleolus
  LV6:  [ 0.07, -0.51,  0.11],  // 中都  shin, 6 cun above medial malleolus
  LV7:  [ 0.07, -0.47,  0.11],  // 膝关  knee, 1 cun below SP9
  LV8:  [ 0.07, -0.43,  0.11],  // 曲泉  knee, medial condyle
  LV9:  [ 0.07, -0.39,  0.12],  // 阴包  thigh, 4 cun above medial knee
  LV10: [ 0.07, -0.35,  0.12],  // 足五里  thigh, 3 cun below inguinal crease
  LV11: [ 0.07, -0.31,  0.12],  // 阴廉  thigh, 2 cun below inguinal crease
  LV12: [ 0.07, -0.27,  0.12],  // 急脉  groin, 0.5 cun lateral to midpoint of inguinal ligament
  LV13: [ 0.09, -0.22,  0.12],  // 章门  flank, 11th rib tip
  LV14: [ 0.10, -0.18,  0.13],  // 期门  chest, 6th intercostal

  // ─── Governing Vessel (GV) — 督脉 ────────────────────
  GV1:  [ 0.00, -0.70,  0.04],  // 长强  perineum, midpoint of coccyx
  GV2:  [ 0.00, -0.67,  0.05],  // 腰俞  sacrum, 4th sacral foramen
  GV3:  [ 0.00, -0.63,  0.06],  // 腰阳关  lumbar, L4
  GV4:  [ 0.00, -0.59,  0.07],  // 命门  lumbar, L2
  GV5:  [ 0.00, -0.55,  0.08],  // 悬枢  lumbar, L1
  GV6:  [ 0.00, -0.50,  0.09],  // 脊中  thoracic, T11
  GV7:  [ 0.00, -0.45,  0.10],  // 中枢  thoracic, T10
  GV8:  [ 0.00, -0.40,  0.11],  // 筋缩  thoracic, T9
  GV9:  [ 0.00, -0.35,  0.12],  // 至阳  thoracic, T7
  GV10: [ 0.00, -0.30,  0.13],  // 灵台  thoracic, T6
  GV11: [ 0.00, -0.25,  0.13],  // 神道  thoracic, T5
  GV12: [ 0.00, -0.20,  0.13],  // 身柱  thoracic, T3
  GV13: [ 0.00, -0.15,  0.13],  // 陶道  thoracic, T1
  GV14: [ 0.00, -0.10,  0.13],  // 大椎  cervical, C7
  GV15: [ 0.00, -0.05,  0.13],  // 哑门  neck, C1
  GV16: [ 0.00,  0.00,  0.13],  // 风府  neck, midpoint of posterior hairline
  GV17: [ 0.00,  0.05,  0.12],  // 脑户  occiput, midline
  GV18: [ 0.00,  0.10,  0.12],  // 强间  occiput, 1.5 cun above GV17
  GV19: [ 0.00,  0.15,  0.12],  // 后顶  occiput, 1.5 cun above GV18
  GV20: [ 0.00,  0.20,  0.12],  // 百会  scalp, midpoint of line from apex to GV17
  GV21: [ 0.00,  0.25,  0.12],  // 前顶  scalp, 1.5 cun anterior to GV20
  GV22: [ 0.00,  0.30,  0.11],  // 囟会  scalp, 2 cun anterior to GV21
  GV23: [ 0.00,  0.35,  0.11],  // 上星  forehead, 1 cun posterior to hairline
  GV24: [ 0.00,  0.40,  0.11],  // 神庭  forehead, 0.5 cun posterior to hairline
  GV25: [ 0.00,  0.55,  0.10],  // 素髎  face, tip of nose
  GV26: [ 0.01,  0.57,  0.10],  // 水沟  face, philtrum
  GV27: [ 0.00,  0.59,  0.10],  // 兑端  face, upper lip
  GV28: [ 0.00,  0.61,  0.10],  // 龈交  face, upper gingiva

  // ─── Conception Vessel (CV) — 任脉 ────────────────────
  CV1:  [ 0.00, -0.70,  0.04],  // 会阴  perineum, midpoint
  CV2:  [ 0.00, -0.65,  0.05],  // 曲骨  lower abdomen, 5 cun above midline
  CV3:  [ 0.00, -0.60,  0.06],  // 中极  lower abdomen, 4 cun above navel
  CV4:  [ 0.00, -0.55,  0.07],  // 关元  lower abdomen, 3 cun above navel
  CV5:  [ 0.00, -0.50,  0.08],  // 石门  lower abdomen, 2 cun above navel
  CV6:  [ 0.00, -0.45,  0.09],  // 气海  abdomen, 1.5 cun above navel
  CV7:  [ 0.00, -0.40,  0.10],  // 阴交  abdomen, 1 cun below navel
  CV8:  [ 0.00, -0.35,  0.10],  // 神阙  abdomen, navel
  CV9:  [ 0.00, -0.30,  0.11],  // 水分  abdomen, 1 cun above navel
  CV10: [ 0.00, -0.25,  0.11],  // 下脘  upper abdomen, 2 cun above navel
  CV11: [ 0.00, -0.20,  0.12],  // 建里  upper abdomen, 3 cun above navel
  CV12: [ 0.00, -0.15,  0.12],  // 中脘  epigastrium, 4 cun above navel
  CV13: [ 0.00, -0.10,  0.12],  // 上脘  epigastrium, 5 cun above navel
  CV14: [ 0.00, -0.05,  0.12],  // 巨阙  epigastrium, 6 cun above navel
  CV15: [ 0.00,  0.00,  0.13],  // 鸠尾  epigastrium, 7 cun above navel
  CV16: [ 0.00,  0.05,  0.13],  // 中庭  chest, 6 cun above navel
  CV17: [ 0.00,  0.10,  0.13],  // 膻中  chest, 4 cun above navel
  CV18: [ 0.00,  0.15,  0.13],  // 玉堂  chest, 3 cun above navel
  CV19: [ 0.00,  0.20,  0.13],  // 紫宫  chest, 2 cun above navel
  CV20: [ 0.00,  0.25,  0.13],  // 华盖  chest, 1 cun above navel
  CV21: [ 0.00,  0.30,  0.13],  // 璇玑  chest, 1 cun below CV22
  CV22: [ 0.00,  0.35,  0.13],  // 天突  neck, suprasternal notch
  CV23: [ 0.00,  0.40,  0.12],  // 廉泉  neck, hyoid
  CV24: [ 0.00,  0.45,  0.11],  // 承浆  face, mentolabial sulcus
};

// Channel definitions (which acupoints belong to which meridian)
export const CHANNEL_DEFINITIONS = {
  Lung:      ["LU1","LU2","LU3","LU4","LU5","LU6","LU7","LU8","LU9","LU10"],
  "Large Intestine": ["LI1","LI2","LI3","LI4","LI5","LI6","LI7","LI8","LI9","LI10","LI11","LI12","LI13","LI14","LI15","LI16","LI17","LI18","LI19","LI20"],
  Stomach:   ["ST1","ST2","ST3","ST4","ST5","ST6","ST7","ST8","ST9","ST10","ST11","ST12","ST13","ST14","ST15","ST16","ST17","ST18","ST19","ST20","ST21","ST22","ST23","ST24","ST25","ST26","ST27","ST28","ST29","ST30","ST31","ST32","ST33","ST34","ST35","ST36","ST37","ST38","ST39","ST40","ST41","ST42","ST43","ST44","ST45"],
  Spleen:    ["SP1","SP2","SP3","SP4","SP5","SP6","SP7","SP8","SP9","SP10","SP11","SP12","SP13","SP14","SP15","SP16","SP17","SP18","SP19","SP20","SP21"],
  Heart:     ["HT1","HT2","HT3","HT4","HT5","HT6","HT7","HT8","HT9"],
  "Small Intestine": ["SI1","SI2","SI3","SI4","SI5","SI6","SI7","SI8","SI9","SI10","SI11","SI12","SI13","SI14","SI15","SI16","SI17","SI18","SI19"],
  Bladder:   ["BL1","BL2","BL3","BL4","BL5","BL6","BL7","BL8","BL9","BL10","BL11","BL12","BL13","BL14","BL15","BL16","BL17","BL18","BL19","BL20","BL21","BL22","BL23","BL24","BL25","BL26","BL27","BL28","BL29","BL30","BL31","BL32","BL33","BL34","BL35","BL36","BL37","BL38","BL39","BL40","BL41","BL42","BL43","BL44","BL45","BL46","BL47","BL48","BL49","BL50","BL51","BL52","BL53","BL54","BL55","BL56","BL57","BL58","BL59","BL60","BL61","BL62","BL63","BL64","BL65","BL66","BL67"],
  Kidney:    ["KD1","KD2","KD3","KD4","KD5","KD6","KD7","KD8","KD9","KD10","KD11","KD12","KD13","KD14","KD15","KD16","KD17","KD18","KD19","KD20","KD21","KD22","KD23","KD24","KD25","KD26","KD27"],
  "Pericardium": ["PC1","PC2","PC3","PC4","PC5","PC6","PC7","PC8","PC9"],
  "San Jiao":   ["SJ1","SJ2","SJ3","SJ4","SJ5","SJ6","SJ7","SJ8","SJ9","SJ10","SJ11","SJ12","SJ13","SJ14","SJ15","SJ16","SJ17","SJ18","SJ19","SJ20","SJ21","SJ22","SJ23"],
  Gallbladder: ["GB1","GB2","GB3","GB4","GB5","GB6","GB7","GB8","GB9","GB10","GB11","GB12","GB13","GB14","GB15","GB16","GB17","GB18","GB19","GB20","GB21","GB22","GB23","GB24","GB25","GB26","GB27","GB28","GB29","GB30","GB31","GB32","GB33","GB34","GB35","GB36","GB37","GB38","GB39","GB40","GB41","GB42","GB43","GB44"],
  Liver:     ["LV1","LV2","LV3","LV4","LV5","LV6","LV7","LV8","LV9","LV10","LV11","LV12","LV13","LV14"],
  "Governing Vessel":  ["GV1","GV2","GV3","GV4","GV5","GV6","GV7","GV8","GV9","GV10","GV11","GV12","GV13","GV14","GV15","GV16","GV17","GV18","GV19","GV20","GV21","GV22","GV23","GV24","GV25","GV26","GV27","GV28"],
  "Conception Vessel": ["CV1","CV2","CV3","CV4","CV5","CV6","CV7","CV8","CV9","CV10","CV11","CV12","CV13","CV14","CV15","CV16","CV17","CV18","CV19","CV20","CV21","CV22","CV23","CV24"],
};

// Print summary
console.log("Acupoint library loaded:");
console.log("Total acupoints:", Object.keys(ACUPOINT_POSITIONS).length);
for (const [channel, points] of Object.entries(CHANNEL_DEFINITIONS)) {
  console.log(`  ${channel}: ${points.length} points`);
}
