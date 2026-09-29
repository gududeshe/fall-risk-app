import React, { useState, useEffect } from 'react';

/* ============================================================
   高德地图 Web 服务 Key
   ============================================================ */
const AMAP_KEY = 'b3ef210b81486f2a82d84de8b6af5f36';

/* ============================================================
   语音朗读（浏览器原生 TTS）
   ============================================================ */
function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.85;
  utter.pitch = 1.0;
  window.speechSynthesis.speak(utter);
}
function stopSpeak() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}
function buildReadText(label, options) {
  const optText = options.map((o, i) => `${i + 1}，${o.label}`).join('。');
  return `${label}。${optText}`;
}

/* ============================================================
   通用组件
   ============================================================ */
function SpeakButton({ text, size = 'md' }) {
  const fontSize = size === 'lg' ? 28 : size === 'sm' ? 16 : 22;
  return (
    <button type="button" onClick={() => speak(text)}
      style={{
        width: 44, height: 44, borderRadius: 22, background: '#eff6ff', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        fontSize, flexShrink: 0
      }}>
      🔊
    </button>
  );
}

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${className}`}>{children}</div>;
}

function BigButton({ children, onClick, variant = 'primary', disabled = false, className = '' }) {
  const variants = {
    primary: 'bg-blue-600 text-white active:bg-blue-700 shadow-sm',
    success: 'bg-emerald-600 text-white active:bg-emerald-700 shadow-sm',
    danger: 'bg-rose-600 text-white active:bg-rose-700 shadow-sm',
    ghost: 'bg-white text-slate-700 border-2 border-slate-200 active:bg-slate-50',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full h-14 rounded-xl font-bold text-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function RiskBadge({ level, size = 'md' }) {
  const meta = {
    low: { label: '低风险', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    medium: { label: '中风险', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    high: { label: '高风险', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  };
  const m = meta[level] || meta.low;
  const cls = size === 'lg' ? 'px-5 py-2.5 text-xl rounded-2xl' : 'px-3.5 py-1.5 text-base rounded-full';
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${m.bg} ${m.text} ${cls}`}>
      <span className={`w-3 h-3 rounded-full ${m.dot}`}></span>
      {m.label}
    </span>
  );
}

/* ============================================================
   工具函数
   ============================================================ */
function sumValues(obj) {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}
function morseLevel(score) {
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}
function hendrichLevel(score) {
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}
function bergLevel(score) {
  if (score <= 20) return 'high';
  if (score <= 40) return 'medium';
  return 'low';
}
function tugLevel(sec) {
  if (sec > 20) return 'high';
  if (sec >= 12) return 'medium';
  return 'low';
}
function tinettiLevel(score) {
  if (score <= 18) return 'high';
  if (score <= 23) return 'medium';
  return 'low';
}
function aggregateRisk({ morse, hendrich, berg, tug, tinetti }) {
  const high = (morse >= 45) || (hendrich >= 5) || (berg <= 20) || (tug > 20) || (tinetti <= 18);
  if (high) return 'high';
  const medium = (morse >= 25) || (hendrich >= 3) || (berg <= 40) || (tug >= 12) || (tinetti <= 23);
  if (medium) return 'medium';
  return 'low';
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDistance(meters) {
  if (!meters && meters !== 0) return '';
  const km = Number(meters) / 1000;
  if (km < 1) return `${Math.round(meters)} 米`;
  return `${km.toFixed(1)} 公里`;
}

/* ============================================================
   量表数据
   ============================================================ */
const MORSE_ITEMS = [
  {
    id: 'fallHistory', label: '跌倒史', help: '最近 3 个月内是否跌倒过', options: [
      { label: '没有跌倒过', value: 0 }, { label: '跌倒过', value: 25 },
    ]
  },
  {
    id: 'secondaryDx', label: '疾病情况', help: '医生诊断的疾病种类', options: [
      { label: '只有 1 种疾病', value: 0 }, { label: '有 2 种及以上疾病', value: 15 },
    ]
  },
  {
    id: 'ambulatory', label: '走路方式', help: '平时走路需要什么帮助', options: [
      { label: '自己走路，不用辅助', value: 0 },
      { label: '使用拐杖或助行器', value: 15 },
      { label: '需要扶着家具或墙壁', value: 30 },
    ]
  },
  {
    id: 'iv', label: '输液情况', help: '目前是否在接受静脉输液', options: [
      { label: '没有输液', value: 0 }, { label: '正在输液', value: 20 },
    ]
  },
  {
    id: 'gait', label: '走路样子', help: '家属观察老人走路的样子', options: [
      { label: '走路平稳正常', value: 0 },
      { label: '走路有点摇晃', value: 10 },
      { label: '走路明显不稳、需搀扶', value: 20 },
    ]
  },
  {
    id: 'mental', label: '意识状态', help: '是否清楚自己在哪、今天几号', options: [
      { label: '意识清楚', value: 0 }, { label: '有时迷糊，搞不清方向', value: 15 },
    ]
  },
];

const HENDRICH_ITEMS = [
  { id: 'tugFail', label: '从椅子上站起走 3 米走不了', value: 5 },
  { id: 'confusion', label: '意识混乱、记不清事、坐不住', value: 4 },
  { id: 'depression', label: '情绪低落、不想说话、不想动', value: 2 },
  { id: 'orthostatic', label: '站起来会头晕、眼前发黑', value: 2 },
  { id: 'urinary', label: '尿频、尿急、夜里总起床上厕所', value: 1 },
  { id: 'benzo', label: '正在服用安眠类药物', value: 1 },
  { id: 'antidepressant', label: '正在服用抗抑郁药物', value: 1 },
  { id: 'male', label: '男性', value: 1 },
];

const BERG_ITEMS = [
  {
    label: '从椅子上站起来', options: [
      { label: '完全站不起来', value: 0 }, { label: '需要别人搀扶才能站起', value: 1 },
      { label: '自己用手扶椅子能站起', value: 2 }, { label: '扶着东西能站稳', value: 3 },
      { label: '不用扶就能站起站稳', value: 4 },
    ]
  },
  {
    label: '站着不动（2 分钟）', options: [
      { label: '站不住 2 分钟', value: 0 }, { label: '需要人扶着才能站', value: 1 },
      { label: '能站住但需要有人在旁', value: 2 }, { label: '能站 2 分钟，稍有不稳', value: 3 },
      { label: '稳稳站 2 分钟没问题', value: 4 },
    ]
  },
  {
    label: '坐着不动（2 分钟）', options: [
      { label: '坐不住 2 分钟', value: 0 }, { label: '坐着有点晃，需要人扶着', value: 1 },
      { label: '能坐住但不太稳', value: 2 }, { label: '坐得比较稳', value: 3 },
      { label: '稳稳坐 2 分钟没问题', value: 4 },
    ]
  },
  {
    label: '从站着坐下', options: [
      { label: '不会自己坐下', value: 0 }, { label: '坐下过程不稳，需要人扶', value: 1 },
      { label: '用手扶着椅子慢慢坐下', value: 2 }, { label: '自己能坐下但有点晃', value: 3 },
      { label: '稳稳当当坐下', value: 4 },
    ]
  },
  {
    label: '从床上移到椅子', options: [
      { label: '完全需要人帮助', value: 0 }, { label: '需要别人扶一下', value: 1 },
      { label: '需要有人在旁边提醒', value: 2 }, { label: '自己能完成，不太稳', value: 3 },
      { label: '自己能安全完成', value: 4 },
    ]
  },
  {
    label: '闭着眼睛站着', options: [
      { label: '闭眼站不住', value: 0 }, { label: '闭眼能站 1-3 秒', value: 1 },
      { label: '闭眼能站 3 秒', value: 2 }, { label: '闭眼能站 10 秒，有点晃', value: 3 },
      { label: '闭眼稳稳站 10 秒', value: 4 },
    ]
  },
  {
    label: '双脚并齐站着不动', options: [
      { label: '双脚并齐就站不住', value: 0 }, { label: '需要人扶着才能并脚站', value: 1 },
      { label: '能并脚站，但需要人在旁', value: 2 }, { label: '能并脚站 1 分钟，有点不稳', value: 3 },
      { label: '稳稳并脚站 1 分钟', value: 4 },
    ]
  },
  {
    label: '站着伸手够前面的东西', options: [
      { label: '一伸手就要倒', value: 0 }, { label: '伸手时需要人扶着', value: 1 },
      { label: '只能往前伸一点点（5 厘米）', value: 2 }, { label: '能往前伸 12 厘米', value: 3 },
      { label: '能稳稳往前伸 25 厘米', value: 4 },
    ]
  },
  {
    label: '从地上捡东西', options: [
      { label: '完全捡不了', value: 0 }, { label: '需要别人帮忙捡', value: 1 },
      { label: '能自己捡但需要人在旁', value: 2 }, { label: '能捡起来但有点吃力', value: 3 },
      { label: '轻松弯腰捡起来', value: 4 },
    ]
  },
  {
    label: '转过身往后看', options: [
      { label: '转不了身', value: 0 }, { label: '转身需要人帮忙', value: 1 },
      { label: '能转身但重心不稳', value: 2 }, { label: '能转身往后看，稍有不稳', value: 3 },
      { label: '转身自然、稳稳往后看', value: 4 },
    ]
  },
  {
    label: '原地转一圈（360 度）', options: [
      { label: '完全转不了', value: 0 }, { label: '转身需要人扶', value: 1 },
      { label: '能转，但转得很慢', value: 2 }, { label: '能转一圈，但有点晃', value: 3 },
      { label: '稳稳转一圈没问题', value: 4 },
    ]
  },
  {
    label: '双脚交替踩台阶', options: [
      { label: '完全踩不了', value: 0 }, { label: '需要人扶着才能踩', value: 1 },
      { label: '能踩，但需要人在旁看着', value: 2 }, { label: '能踩但有点吃力', value: 3 },
      { label: '稳稳交替踩没问题', value: 4 },
    ]
  },
  {
    label: '一只脚在前、一只脚在后站着', options: [
      { label: '站不了', value: 0 }, { label: '需要人扶着才能站', value: 1 },
      { label: '能站 30 秒，需要人在旁', value: 2 }, { label: '能站 30 秒，有点不稳', value: 3 },
      { label: '稳稳站 30 秒', value: 4 },
    ]
  },
  {
    label: '单腿站着', options: [
      { label: '站不了 1 秒', value: 0 }, { label: '只能站 1-3 秒', value: 1 },
      { label: '能站 3-5 秒', value: 2 }, { label: '能站 5-10 秒', value: 3 },
      { label: '能站 10 秒以上', value: 4 },
    ]
  },
];

const TINETTI_BALANCE = [
  {
    id: 't1', label: '坐位平衡', options: [
      { label: '在椅子上倾斜或滑动', value: 0 }, { label: '坐得稳稳当当', value: 1 },
    ]
  },
  {
    id: 't2', label: '从椅子上站起', options: [
      { label: '必须有人帮忙才能站起', value: 0 }, { label: '需要用手扶着才能站起', value: 1 },
      { label: '不用手扶就能站起', value: 2 },
    ]
  },
  {
    id: 't3', label: '刚站起来时的平衡', options: [
      { label: '站起来不稳，需要扶', value: 0 }, { label: '需要扶着东西才能站稳', value: 1 },
      { label: '不用扶就能站稳', value: 2 },
    ]
  },
  {
    id: 't4', label: '站着时的平衡', options: [
      { label: '站不稳', value: 0 }, { label: '需要扶着，双脚分开站', value: 1 },
      { label: '不用扶，双脚并拢站得稳', value: 2 },
    ]
  },
  {
    id: 't5', label: '轻轻推一下', options: [
      { label: '一推就要倒', value: 0 }, { label: '摇晃、抓东西但能稳住', value: 1 },
      { label: '推一下也很稳', value: 2 },
    ]
  },
  {
    id: 't6', label: '闭着眼睛站着', options: [
      { label: '闭眼站不稳', value: 0 }, { label: '闭眼能站稳', value: 1 },
    ]
  },
  {
    id: 't7', label: '原地转一圈（360 度）', options: [
      { label: '转身不稳（抓东西、摇晃）', value: 0 }, { label: '能转但脚步不连贯', value: 1 },
      { label: '转身稳定连贯', value: 2 },
    ]
  },
  {
    id: 't8', label: '坐下动作', options: [
      { label: '坐下不安全（判断错误）', value: 0 }, { label: '用胳膊辅助或动作不平稳', value: 1 },
      { label: '安全平稳坐下', value: 2 },
    ]
  },
  {
    id: 't9', label: '转身走回座位', options: [
      { label: '需要扶持或步态不稳', value: 0 }, { label: '不需扶持，走得稳', value: 1 },
    ]
  },
];

const TINETTI_GAIT = [
  {
    id: 'g1', label: '走路启动', options: [
      { label: '犹豫或多次尝试才开始走', value: 0 }, { label: '无犹豫，直接开始走', value: 1 },
    ]
  },
  {
    id: 'g2', label: '右脚迈步长度', options: [
      { label: '右脚没有超过左脚', value: 0 }, { label: '右脚超过左脚', value: 1 },
    ]
  },
  {
    id: 'g3', label: '右脚抬脚高度', options: [
      { label: '右脚拖地，没离地', value: 0 }, { label: '右脚完全抬离地面', value: 1 },
    ]
  },
  {
    id: 'g4', label: '左脚迈步长度', options: [
      { label: '左脚没有超过右脚', value: 0 }, { label: '左脚超过右脚', value: 1 },
    ]
  },
  {
    id: 'g5', label: '左脚抬脚高度', options: [
      { label: '左脚拖地，没离地', value: 0 }, { label: '左脚完全抬离地面', value: 1 },
    ]
  },
  {
    id: 'g6', label: '左右步态对称性', options: [
      { label: '左右步长不一样', value: 0 }, { label: '左右步长差不多', value: 1 },
    ]
  },
  {
    id: 'g7', label: '走路连续性', options: [
      { label: '走路有停顿、不连贯', value: 0 }, { label: '走路连贯、不停顿', value: 1 },
    ]
  },
  {
    id: 'g8', label: '走路路线', options: [
      { label: '明显偏离（走歪）', value: 0 }, { label: '轻微偏离或需要辅助', value: 1 },
      { label: '走直线不偏离', value: 2 },
    ]
  },
  {
    id: 'g9', label: '走路时躯干稳定性', options: [
      { label: '明显摇晃或需要扶', value: 0 }, { label: '膝盖弯曲但没有摇晃', value: 1 },
      { label: '走得很稳，双臂自然', value: 2 },
    ]
  },
  {
    id: 'g10', label: '走路时两脚间距', options: [
      { label: '两脚分得很开', value: 0 }, { label: '两脚间距正常', value: 1 },
    ]
  },
];

const HIGH_RISK_FACTORS = ['使用 4 种以上药物', '帕金森病', '卒中', '视力障碍', '认知障碍', '骨质疏松', '关节炎', '糖尿病', '慢性心肺疾病'];

/* ============================================================
   计划生成
   ============================================================ */
function generatePlan(assessment, envCheck, riskLevel) {
  const items = [];
  const a = assessment || {};
  const morse = a.morse || {};
  const hendrich = a.hendrich || {};
  const berg = a.berg || {};
  const tinetti = a.tinetti || {};
  const tugNum = Number(a.tug) || 0;
  const bergScore = sumValues(berg);
  const tinettiScore = sumValues(tinetti.balance) + sumValues(tinetti.gait);

  if (riskLevel === 'low') {
    items.push({ cat: '运动', text: '每周 ≥150 分钟中等强度有氧运动（快走、太极拳、八段锦）' });
    items.push({ cat: '运动', text: '每周 ≥3 天平衡训练（单脚站立、直线行走）' });
    items.push({ cat: '运动', text: '每周 ≥2 天力量训练（坐位伸膝、靠墙静蹲）' });
    items.push({ cat: '教育', text: '学习居家适老化知识与外出安全行为' });
    items.push({ cat: '随访', text: '每年复筛一次跌倒风险' });
  } else if (riskLevel === 'medium') {
    items.push({ cat: '运动', text: '由康复治疗师制定个体化平衡与力量训练方案' });
    items.push({ cat: '运动', text: '坐-站转换训练：每日 10 次 × 3 组' });
    items.push({ cat: '教育', text: '学习跌倒后自我保护动作' });
    items.push({ cat: '随访', text: '每 6 个月复评一次风险等级' });
  } else {
    items.push({ cat: '运动', text: '由物理治疗师制定个体化平衡功能锻炼方案，持续 ≥12 周' });
    items.push({ cat: '运动', text: '渐进性抗阻训练 + 太极拳训练' });
    items.push({ cat: '运动', text: '行走训练：跨障碍步行、侧向行走、上下台阶' });
    items.push({ cat: '教育', text: '与家属共同学习防跌倒知识' });
    items.push({ cat: '随访', text: '每月评估一次，30-90 天内密切随访' });
    items.push({ cat: '随访', text: '发生跌倒后立即重新评估' });
  }

  if (morse.fallHistory === 25) items.push({ cat: '环境', text: '排查上次跌倒的环境原因' });
  if (morse.ambulatory === 15) items.push({ cat: '辅具', text: '检查拐杖/助行器高度，培训正确使用方法' });
  if (morse.ambulatory === 30) items.push({ cat: '辅具', text: '评估是否需要适配助行器' });
  if (morse.gait === 20) items.push({ cat: '康复', text: '转诊康复科评估步态异常' });
  if (morse.mental === 15) items.push({ cat: '照护', text: '认知障碍者需加强看护，夜间安排陪护' });
  if (hendrich.benzo === 1) items.push({ cat: '用药', text: '请医生审查苯二氮卓类药物' });
  if (hendrich.antidepressant === 1) items.push({ cat: '用药', text: '请医生审查抗抑郁药物' });
  if (hendrich.orthostatic === 2) items.push({ cat: '用药', text: '监测体位性血压，起床时先坐 1 分钟' });
  if (hendrich.urinary === 1) items.push({ cat: '照护', text: '睡前减少饮水，床边放置便器' });
  if (hendrich.confusion === 4) items.push({ cat: '照护', text: '意识混乱者需专人看护' });
  if (bergScore > 0 && bergScore <= 40) items.push({ cat: '康复', text: '静态平衡训练：双脚前后站立、单脚站立' });
  if (tugNum > 12) items.push({ cat: '康复', text: '功能性移动训练：坐-站转换、方向变换行走' });
  if (tinettiScore > 0 && tinettiScore <= 23) items.push({ cat: '康复', text: '步态训练：增大步幅、抬高脚步' });

  if (envCheck) {
    if (envCheck.toiletRail === false) items.push({ cat: '环境', text: '卫生间安装 L 型扶手与防滑垫' });
    if (envCheck.nightLight === false) items.push({ cat: '环境', text: '卧室床头安装夜灯' });
    if (envCheck.floorSafe === false) items.push({ cat: '环境', text: '清理通道杂物，保持地面干燥' });
    if (envCheck.shoes === false) items.push({ cat: '鞋履', text: '更换合脚、防滑、有后跟支撑的鞋' });
  } else {
    items.push({ cat: '环境', text: '卫生间安装 L 型扶手与防滑垫' });
    items.push({ cat: '环境', text: '卧室床头安装夜灯' });
    items.push({ cat: '鞋履', text: '选择合脚、防滑、有后跟支撑的鞋' });
  }

  const seen = new Set();
  const unique = [];
  items.forEach(it => {
    const k = it.cat + '|' + it.text;
    if (!seen.has(k)) { seen.add(k); unique.push(it); }
  });
  return unique.map((it, i) => ({ ...it, id: 'p_' + Date.now() + '_' + i, done: false }));
}

/* ============================================================
   主 App
   ============================================================ */
export default function App() {
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState('home');
  const [editTargetId, setEditTargetId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const currentProfile = profiles.find(p => p.id === currentProfileId) || null;

  const [step, setStep] = useState(0);
  const [morse, setMorse] = useState({});
  const [hendrich, setHendrich] = useState({});
  const [berg, setBerg] = useState({});
  const [tug, setTug] = useState('');
  const [tinetti, setTinetti] = useState({ balance: {}, gait: {} });
  const [env, setEnv] = useState({ mood: null, interest: null, toiletRail: null, nightLight: null, floorSafe: null, shoes: null });

  // 附近医院相关
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [hospitals, setHospitals] = useState([]);
  const [hospitalType, setHospitalType] = useState('医院');
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [hospitalError, setHospitalError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fall-risk-web-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfiles(parsed.profiles || []);
        setCurrentProfileId(parsed.currentProfileId || null);
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('fall-risk-web-v1', JSON.stringify({ profiles, currentProfileId }));
    } catch (e) { }
  }, [profiles, currentProfileId]);

  const updateProfile = (updater) => {
    setProfiles(prev => prev.map(p => p.id === currentProfileId ? updater(p) : p));
  };

  const handleCall120 = () => {
    if (window.confirm('是否拨打 120 急救电话？')) {
      window.location.href = 'tel:120';
    }
  };

  /* ---------- 定位 + 高德 API 搜索 ---------- */
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('success');
        // 定位成功后自动搜索
        searchNearby(loc.lat, loc.lng, hospitalType);
      },
      (err) => {
        console.warn('定位失败：', err.message);
        setLocationStatus('denied');
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  const searchNearby = async (lat, lng, type) => {
    setHospitalLoading(true);
    setHospitalError('');
    setHospitals([]);
    try {
      // 高德周边搜索 API
      // 关键词：医院 / 养老院 / 敬老院 / 护理院
      const keywords = type === '医院' ? '医院' : '养老院|敬老院|护理院|养老服务中心';
      const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}`
        + `&location=${lng},${lat}`
        + `&keywords=${encodeURIComponent(keywords)}`
        + `&radius=10000`
        + `&offset=25`
        + `&page=1`
        + `&extensions=all`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== '1' || data.infocode !== '10000') {
        setHospitalError(`搜索失败：${data.info || '未知错误'}（${data.infocode || ''}）`);
        setHospitalLoading(false);
        return;
      }

      const pois = (data.pois || []).map(p => {
        let phone = '';
        if (p.tel) {
          phone = Array.isArray(p.tel) ? p.tel[0] : String(p.tel).split(';')[0];
        }
        // 过滤掉无效电话
        if (phone && !/^[\d\-+() ]+$/.test(phone)) phone = '';
        return {
          id: p.id,
          name: p.name,
          address: typeof p.address === 'string' ? p.address : '',
          distance: Number(p.distance) || 0,
          phone,
          type: p.type ? p.type.split(';')[0] : '',
          location: p.location,
        };
      }).filter(p => p.name && p.name.length > 0);

      setHospitals(pois);
      setHospitalLoading(false);
    } catch (err) {
      console.error(err);
      setHospitalError('网络请求失败，请检查网络连接后重试');
      setHospitalLoading(false);
    }
  };

  const switchHospitalType = (type) => {
    setHospitalType(type);
    if (userLocation) {
      searchNearby(userLocation.lat, userLocation.lng, type);
    }
  };

  /* ---------- 编辑档案 ---------- */
  const goEditProfile = (id) => {
    stopSpeak();
    setEditTargetId(id);
    setScreen('editProfile');
    setTab('history');
  };

  /* ---------- 修改评估 ---------- */
  const goEditAssessment = () => {
    if (!currentProfile || !currentProfile.assessment) return;
    stopSpeak();
    const a = currentProfile.assessment;
    setMorse(a.morse || {});
    setHendrich(a.hendrich || {});
    setBerg(a.berg || {});
    setTug(a.tug !== undefined && a.tug !== null ? String(a.tug) : '');
    setTinetti(a.tinetti || { balance: {}, gait: {} });
    setEnv(currentProfile.envCheck || { mood: null, interest: null, toiletRail: null, nightLight: null, floorSafe: null, shoes: null });
    setStep(0);
    setIsEditing(true);
    setScreen('editAssessment');
    setTab('assess');
  };

  const go = (s) => {
    stopSpeak();
    setScreen(s);
    setTab(s === 'plan' ? 'plan'
      : (s === 'history' || s === 'about' || s === 'agreement' || s === 'contact' || s === 'nearby' || s === 'editProfile') ? 'history'
        : ['newProfile', 'screening', 'lowBranch', 'assessment', 'editAssessment', 'result'].includes(s) ? 'assess'
          : 'home');
  };

  const handleAssessmentComplete = () => {
    const morseScore = sumValues(morse);
    const hendrichScore = sumValues(hendrich);
    const bergScore = sumValues(berg);
    const tugNum = Number(tug) || 0;
    const tinettiScore = sumValues(tinetti.balance) + sumValues(tinetti.gait);

    const riskLevel = aggregateRisk({ morse: morseScore, hendrich: hendrichScore, berg: bergScore, tug: tugNum, tinetti: tinettiScore });
    const plan = generatePlan({ morse, hendrich, berg, tug: tugNum, tinetti }, env, riskLevel);

    updateProfile(p => {
      let newHistory = [...(p.history || [])];
      if (isEditing && p.assessment && newHistory.length > 0) {
        const lastIdx = newHistory.length - 1;
        newHistory[lastIdx] = { ...newHistory[lastIdx], isModified: true };
      }
      newHistory.push({ date: todayStr(), type: 'full', riskLevel });

      return {
        ...p,
        assessment: { morse, hendrich, berg, tug: tugNum, tinetti },
        envCheck: env,
        riskLevel,
        planItems: plan,
        history: newHistory,
      };
    });
    setIsEditing(false);
    go('result');
  };

  /* ============================================================
     页面渲染
     ============================================================ */
  const STEPS = ['morse', 'hendrich', 'berg', 'tug', 'tinetti', 'env'];
  const STEP_TITLES = { morse: 'Morse 跌倒评估', hendrich: 'Hendrich II 模型', berg: 'Berg 平衡量表', tug: 'TUG 计时测试', tinetti: 'Tinetti 平衡与步态', env: '认知情绪与环境' };
  const stepKey = STEPS[step];

  const canNext = () => {
    if (stepKey === 'morse') return MORSE_ITEMS.every(it => morse[it.id] !== undefined);
    if (stepKey === 'hendrich') return HENDRICH_ITEMS.every(it => hendrich[it.id] !== undefined);
    if (stepKey === 'berg') return BERG_ITEMS.every((_, i) => berg['b' + i] !== undefined);
    if (stepKey === 'tug') return tug !== '' && Number(tug) >= 0;
    if (stepKey === 'tinetti') return TINETTI_BALANCE.every(it => tinetti.balance[it.id] !== undefined) && TINETTI_GAIT.every(it => tinetti.gait[it.id] !== undefined);
    return true;
  };

  /* ---------- 首页 ---------- */
  const renderHome = () => (
    <div className="space-y-4 fade-in">
      <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-base opacity-90">老年人跌倒风险管理</div>
            <div className="text-2xl font-bold mt-1">{currentProfile ? `您好，${currentProfile.name}` : '欢迎使用'}</div>
            <div className="text-sm opacity-80 mt-1">
              {currentProfile ? `档案号 ${currentProfile.profileNumber} · ${currentProfile.age} 岁 · ${currentProfile.sex === 'male' ? '男' : '女'}` : '先建立档案，开始风险评估'}
            </div>
          </div>
          {currentProfile && <SpeakButton text={`您好，${currentProfile.name}。欢迎使用老年人跌倒风险管理系统。`} />}
        </div>
      </div>

      <button onClick={handleCall120}
        className="w-full flex items-center gap-3 bg-red-50 border-2 border-red-500 rounded-2xl p-4 text-left">
        <span className="text-3xl">🚨</span>
        <div>
          <div className="text-lg font-bold text-red-600">紧急拨打 120</div>
          <div className="text-sm text-red-800 mt-0.5">发生跌倒或紧急情况时，点击此处</div>
        </div>
      </button>

      {!currentProfile && (
        <Card>
          <div className="text-slate-600 mb-3 text-base">首次使用请先建立档案</div>
          <BigButton onClick={() => go('newProfile')}>+ 建立档案</BigButton>
        </Card>
      )}

      {currentProfile && (
        <>
          <Card>
            <div className="font-bold text-slate-800 mb-3">当前档案</div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">姓名</span>
              <span className="text-slate-800 font-semibold">{currentProfile.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">档案号</span>
              <span className="text-slate-800 font-semibold">{currentProfile.profileNumber}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">慢性病 / 跌倒史</span>
              <span className="text-slate-800 font-semibold">{currentProfile.hasChronic ? '有慢病' : '无慢病'} · {currentProfile.hasFallHistory ? '有跌倒史' : '无跌倒史'}</span>
            </div>
          </Card>

          {!currentProfile.screening && (
            <Card>
              <div className="text-slate-600 mb-3">档案已建立，开始初筛</div>
              <BigButton onClick={() => go('screening')}>开始初筛</BigButton>
            </Card>
          )}

          {currentProfile.screening && (
            <Card>
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500">当前风险等级</span>
                {currentProfile.riskLevel && <RiskBadge level={currentProfile.riskLevel} />}
              </div>
              <div className="text-slate-700 mb-3">
                {currentProfile.screening.result === 'low' ? '初筛为低风险，注意每年复筛' : currentProfile.assessment ? '已完成全面评估' : '初筛提示存在风险，建议尽快完成全面评估'}
              </div>
              <BigButton onClick={() => go(currentProfile.screening.result === 'low' ? 'lowBranch' : (currentProfile.assessment ? 'result' : 'assessment'))}>
                {currentProfile.screening.result === 'low' ? '查看建议' : (currentProfile.assessment ? '查看结果' : '去评估')}
              </BigButton>
              {currentProfile.assessment && (
                <BigButton variant="ghost" className="mt-3" onClick={() => go('plan')}>📋 我的防跌倒计划</BigButton>
              )}
            </Card>
          )}

          <BigButton variant="ghost" onClick={() => go('newProfile')}>新建另一个档案</BigButton>
        </>
      )}
    </div>
  );

  /* ---------- 建立档案 ---------- */
  const renderNewProfile = () => (
    <NewProfileForm onSave={(data) => {
      const count = profiles.length;
      const d = new Date();
      const prefix = `FRA-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      const newP = {
        id: 'p_' + Date.now(),
        profileNumber: `${prefix}-${String(count + 1).padStart(3, '0')}`,
        ...data,
        createdAt: todayStr(),
        screening: null, assessment: null, envCheck: null, riskLevel: null, planItems: [], history: [],
      };
      setProfiles(prev => [...prev, newP]);
      setCurrentProfileId(newP.id);
      go('home');
    }} onCancel={() => go('home')} />
  );

  /* ---------- 编辑档案 ---------- */
  const renderEditProfile = () => {
    const target = profiles.find(p => p.id === editTargetId);
    if (!target) {
      return (
        <div className="text-center py-10">
          <div className="text-slate-500 mb-4">未找到档案</div>
          <BigButton onClick={() => go('history')}>返回</BigButton>
        </div>
      );
    }
    return <EditProfileForm
      profile={target}
      onSave={(data) => {
        setProfiles(prev => prev.map(p => p.id === editTargetId ? { ...p, ...data } : p));
        setEditTargetId(null);
        go('history');
      }}
      onCancel={() => { setEditTargetId(null); go('history'); }}
    />;
  };

  /* ---------- 初筛 ---------- */
  const renderScreening = () => <ScreeningForm onDone={(result) => {
    updateProfile(p => ({ ...p, screening: result }));
    if (result.result === 'low') go('lowBranch');
    else go('assessment');
  }} onCancel={() => go('home')} />;

  /* ---------- 低风险 ---------- */
  const renderLowRisk = () => (
    <div className="space-y-4 fade-in">
      <Card className="bg-emerald-50 border-emerald-200">
        <div className="text-center">
          <div className="text-5xl mb-2">🌿</div>
          <div className="font-bold text-emerald-800 text-xl">初筛结果为低风险</div>
          <div className="text-emerald-700 mt-1">保持健康习惯，每年复筛即可</div>
        </div>
      </Card>
      <Card>
        <div className="font-bold text-slate-800 mb-3">📖 健康教育</div>
        <ul className="space-y-2 text-slate-600">
          <li>• 正确认识衰老与跌倒风险的关系</li>
          <li>• 合理使用手杖等辅助器具</li>
          <li>• 养成外出时的安全行为习惯</li>
          <li>• 居家适老化：扶手、防滑垫、夜灯</li>
        </ul>
      </Card>
      <Card>
        <div className="font-bold text-slate-800 mb-3">🏃 运动建议</div>
        <ul className="space-y-2 text-slate-600">
          <li>• 每周 ≥150 分钟中等强度有氧运动</li>
          <li>• 每周 ≥3 天平衡训练</li>
          <li>• 每周 ≥2 天力量训练</li>
        </ul>
      </Card>
      <BigButton onClick={() => go('home')}>返回首页</BigButton>
    </div>
  );

  /* ---------- 全面评估 ---------- */
  const renderAssessment = () => {
    const renderStep = () => {
      if (stepKey === 'morse') {
        return (
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-600">请选择最符合现状的一项</div>
              <SpeakButton size="sm" text={'跌倒风险评估。' + MORSE_ITEMS.map(i => i.label).join('，')} />
            </div>
            {MORSE_ITEMS.map((item, i) => (
              <Card key={item.id}>
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-slate-800">{i + 1}. {item.label}</div>
                  <SpeakButton text={buildReadText(`第 ${i + 1} 项，${item.label}`, item.options)} />
                </div>
                <div className="text-sm text-slate-500 mb-3">{item.help}</div>
                {item.options.map((opt, j) => {
                  const active = morse[item.id] === opt.value;
                  return (
                    <button key={j} onClick={() => setMorse(prev => ({ ...prev, [item.id]: opt.value }))}
                      className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 mb-2 text-left transition ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <span className={`font-bold ${active ? 'text-blue-700' : 'text-blue-500'}`}>{j + 1}.</span>
                      <span className={`flex-1 ${active ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </Card>
            ))}
          </div>
        );
      }

      if (stepKey === 'hendrich') {
        return (
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-600">请回答以下每个问题</div>
              <SpeakButton size="sm" text={'请回答以下问题：' + HENDRICH_ITEMS.map((i, idx) => `第${idx + 1}项：${i.label}`).join('，')} />
            </div>
            {HENDRICH_ITEMS.map((item, i) => {
              const currentValue = hendrich[item.id];
              return (
                <Card key={item.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-slate-800">{i + 1}. {item.label}</div>
                    <SpeakButton text={`第 ${i + 1} 项，${item.label}。1，有。2，没有。`} />
                  </div>
                  <button onClick={() => setHendrich(prev => ({ ...prev, [item.id]: item.value }))}
                    className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 mb-2 text-left transition ${currentValue === item.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <span className={`font-bold ${currentValue === item.value ? 'text-blue-700' : 'text-blue-500'}`}>1.</span>
                    <span className={`flex-1 ${currentValue === item.value ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>有</span>
                  </button>
                  <button onClick={() => setHendrich(prev => ({ ...prev, [item.id]: 0 }))}
                    className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 text-left transition ${currentValue === 0 ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <span className={`font-bold ${currentValue === 0 ? 'text-blue-700' : 'text-blue-500'}`}>2.</span>
                    <span className={`flex-1 ${currentValue === 0 ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>没有</span>
                  </button>
                </Card>
              );
            })}
          </div>
        );
      }

      if (stepKey === 'berg') {
        return (
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-600">共 14 项，请选择最符合现状的一项</div>
              <SpeakButton size="sm" text={'平衡量表，共 14 项。' + BERG_ITEMS.map((i, idx) => `第${idx + 1}项：${i.label}`).join('，')} />
            </div>
            {BERG_ITEMS.map((item, i) => {
              const id = 'b' + i;
              return (
                <Card key={id}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-slate-800">{i + 1}. {item.label}</div>
                    <SpeakButton text={buildReadText(`第 ${i + 1} 项，${item.label}`, item.options)} />
                  </div>
                  {item.options.map((opt, j) => {
                    const active = berg[id] === opt.value;
                    return (
                      <button key={j} onClick={() => setBerg(prev => ({ ...prev, [id]: opt.value }))}
                        className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 mb-2 text-left transition ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                        <span className={`font-bold ${active ? 'text-blue-700' : 'text-blue-500'}`}>{j + 1}.</span>
                        <span className={`flex-1 ${active ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>{opt.label}</span>
                      </button>
                    );
                  })}
                </Card>
              );
            })}
          </div>
        );
      }

      if (stepKey === 'tug') {
        return (
          <Card>
            <div className="flex justify-between items-start mb-3">
              <div className="font-bold text-slate-800">计时起立行走测试</div>
              <SpeakButton text="计时起立行走测试。请让老人从椅子上站起来，走 3 米，转身走回来，再坐下。用秒表记录整个过程的时间。" />
            </div>
            <div className="text-sm text-slate-500 mb-4">
              让老人：从椅子上站起来 → 走 3 米 → 转身走回来 → 坐下<br />
              用秒表记录整个过程的时间
            </div>
            <label className="block text-base font-bold text-slate-700 mb-2">用时（秒）</label>
            <input type="number" value={tug} onChange={e => setTug(e.target.value)} placeholder="例如 12"
              className="w-full h-16 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-3xl font-bold text-center" />
          </Card>
        );
      }

      if (stepKey === 'tinetti') {
        const Section = ({ title, items, dataKey }) => (
          <div className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <div className="font-bold text-slate-800 text-lg">{title}</div>
              <SpeakButton size="sm" text={`${title}。${items.map((i, idx) => `第${idx + 1}项：${i.label}`).join('，')}`} />
            </div>
            {items.map(item => (
              <Card key={item.id}>
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-slate-800">{item.label}</div>
                  <SpeakButton text={buildReadText(item.label, item.options)} />
                </div>
                {item.options.map((opt, j) => {
                  const active = tinetti[dataKey][item.id] === opt.value;
                  return (
                    <button key={j} onClick={() => setTinetti(prev => ({ ...prev, [dataKey]: { ...prev[dataKey], [item.id]: opt.value } }))}
                      className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 mb-2 text-left transition ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <span className={`font-bold ${active ? 'text-blue-700' : 'text-blue-500'}`}>{j + 1}.</span>
                      <span className={`flex-1 ${active ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </Card>
            ))}
          </div>
        );
        return (
          <div>
            <div className="text-slate-600 mb-3">共 19 项，请选择最符合现状的一项</div>
            <Section title="平衡评估" items={TINETTI_BALANCE} dataKey="balance" />
            <Section title="步态评估" items={TINETTI_GAIT} dataKey="gait" />
          </div>
        );
      }

      if (stepKey === 'env') {
        const YesNo = ({ label, field }) => (
          <div className="py-3 border-b border-slate-100 last:border-0">
            <div className="flex justify-between items-start mb-3">
              <div className="text-slate-700 flex-1">{label}</div>
              <SpeakButton size="sm" text={`${label}。1，是。2，否。`} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEnv(p => ({ ...p, [field]: true }))}
                className={`flex-1 h-12 rounded-xl border-2 font-bold transition ${env[field] === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                1. 是
              </button>
              <button onClick={() => setEnv(p => ({ ...p, [field]: false }))}
                className={`flex-1 h-12 rounded-xl border-2 font-bold transition ${env[field] === false ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}>
                2. 否
              </button>
            </div>
          </div>
        );
        return (
          <div>
            <Card>
              <div className="flex justify-between items-start mb-3">
                <div className="font-bold text-slate-800">情绪筛查</div>
                <SpeakButton size="sm" text="情绪筛查。过去两周经常情绪低落、沮丧或无望吗？1，是。2，否。过去两周对事物失去兴趣或乐趣吗？1，是。2，否。" />
              </div>
              <YesNo label="过去两周经常情绪低落、沮丧或无望？" field="mood" />
              <YesNo label="过去两周对事物失去兴趣或乐趣？" field="interest" />
            </Card>
            <Card>
              <div className="flex justify-between items-start mb-3">
                <div className="font-bold text-slate-800">居家环境与鞋履</div>
                <SpeakButton size="sm" text="居家环境与鞋履检查。每题回答 1 是，或 2 否。卫生间安装有扶手吗？夜间起床有足够照明吗？地面防滑、无杂物、通道畅通吗？日常鞋合脚、防滑、有后跟支撑吗？" />
              </div>
              <YesNo label="卫生间安装有扶手？" field="toiletRail" />
              <YesNo label="夜间起床有足够照明？" field="nightLight" />
              <YesNo label="地面防滑、无杂物、通道畅通？" field="floorSafe" />
              <YesNo label="日常鞋合脚、防滑、有后跟支撑？" field="shoes" />
            </Card>
          </div>
        );
      }
      return null;
    };

    const progress = Math.round(((step + 1) / STEPS.length) * 100);

    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => { stopSpeak(); if (step > 0) setStep(step - 1); else go('home'); }} className="text-blue-600 text-lg font-semibold">‹ 上一步</button>
          <div className="text-slate-400">{step + 1}/{STEPS.length}</div>
        </div>
        <div className="text-2xl font-bold text-slate-800 mb-4">
          阶段二 · {STEP_TITLES[stepKey]}
          {isEditing && <span className="text-base text-amber-600 ml-2">（修改中）</span>}
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-blue-600 transition-all" style={{ width: progress + '%' }}></div>
        </div>
        {currentProfile && <div className="text-sm text-slate-500 mb-4">评估对象：{currentProfile.name}（{currentProfile.profileNumber}）</div>}
        {renderStep()}
        <BigButton disabled={!canNext()} onClick={() => {
          stopSpeak();
          if (step < STEPS.length - 1) setStep(step + 1);
          else handleAssessmentComplete();
        }}>
          {step === STEPS.length - 1 ? (isEditing ? '保存修改' : '完成评估') : '下一步'}
        </BigButton>
      </div>
    );
  };

  /* ---------- 结果 ---------- */
  const renderResult = () => {
    if (!currentProfile || !currentProfile.assessment) return <div className="text-center py-10">暂无评估结果</div>;
    const a = currentProfile.assessment;
    const riskLevel = currentProfile.riskLevel || 'low';
    const morseScore = sumValues(a.morse);
    const hendrichScore = sumValues(a.hendrich);
    const bergScore = sumValues(a.berg);
    const tinettiScore = sumValues(a.tinetti?.balance) + sumValues(a.tinetti?.gait);
    const tugNum = Number(a.tug) || 0;
    const meta = { low: { label: '低风险', color: 'text-emerald-700', bg: 'bg-emerald-50' }, medium: { label: '中风险', color: 'text-amber-700', bg: 'bg-amber-50' }, high: { label: '高风险', color: 'text-rose-700', bg: 'bg-rose-50' } }[riskLevel];

    const adviceMap = {
      low: ['每年复筛一次跌倒风险', '每周 ≥150 分钟中等强度运动', '每周 ≥3 天平衡训练 + ≥2 天力量训练', '注意居家适老化：扶手、防滑垫、夜灯'],
      medium: ['每 6 个月复评一次风险等级', '由康复治疗师制定个体化训练方案', '每周 ≥3 次平衡训练，坚持 ≥12 周', '功能性移动训练：坐-站转换、方向变换行走'],
      high: ['每月评估一次，30-90 天内密切随访', '多因素干预：运动 + 用药 + 环境 + 辅具', '每周 ≥3 次平衡功能锻炼，持续 ≥12 周', '药物审查 + 居家改造 + 辅具适配'],
    }[riskLevel];

    return (
      <div className="space-y-4 fade-in">
        <div className={`rounded-2xl p-5 ${meta.bg}`}>
          <div className="text-slate-600">综合跌倒风险等级</div>
          <div className={`text-4xl font-bold ${meta.color} mt-1`}>{meta.label}</div>
          <div className="text-sm text-slate-500 mt-2">评估对象：{currentProfile.name}（{currentProfile.profileNumber}）</div>
        </div>

        <Card>
          <div className="font-bold text-slate-800 mb-3">各量表得分</div>
          {[
            { label: 'Morse 跌倒评估', score: `${morseScore} / 125`, level: morseLevel(morseScore) },
            { label: 'Hendrich II', score: `${hendrichScore}`, level: hendrichLevel(hendrichScore) },
            { label: 'Berg 平衡量表', score: `${bergScore} / 56`, level: bergLevel(bergScore) },
            { label: 'TUG 计时', score: tugNum ? `${tugNum} 秒` : '—', level: tugLevel(tugNum) },
            { label: 'Tinetti 平衡与步态', score: `${tinettiScore} / 28`, level: tinettiLevel(tinettiScore) },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-700">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{row.score}</span>
                <RiskBadge level={row.level} size="sm" />
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div className="font-bold text-slate-800 mb-3">风险建议</div>
          {adviceMap.map((t, i) => (
            <div key={i} className="flex gap-2 text-slate-600 mb-2">
              <span className={`${meta.color} font-bold`}>•</span><span>{t}</span>
            </div>
          ))}
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <div className="font-bold text-amber-800 mb-1">⚠️ 免责声明</div>
          <div className="text-sm text-amber-800 leading-relaxed">本工具仅为跌倒风险初步筛查辅助工具，评估结果仅供参考，不可替代医护人员的专业诊断。如有健康问题，请及时就医。</div>
        </Card>

        <BigButton onClick={() => go('plan')}>查看计划</BigButton>
        <BigButton variant="ghost" onClick={goEditAssessment}>✏️ 修改评估</BigButton>
        <BigButton variant="ghost" onClick={() => go('home')}>返回首页</BigButton>
      </div>
    );
  };

  /* ---------- 计划 ---------- */
  const renderPlan = () => {
    if (!currentProfile || !currentProfile.planItems || currentProfile.planItems.length === 0) {
      return <div className="text-center py-10 text-slate-500">暂无计划，请先完成评估</div>;
    }
    const planItems = currentProfile.planItems;
    const doneCount = planItems.filter(p => p.done).length;
    const groups = {};
    planItems.forEach(p => {
      if (!groups[p.cat]) groups[p.cat] = [];
      groups[p.cat].push(p);
    });
    const CAT_ICONS = { '运动': '🏃', '康复': '🦯', '用药': '💊', '环境': '🏠', '辅具': '🩼', '鞋履': '👟', '教育': '📖', '随访': '📅', '照护': '🤝' };

    return (
      <div className="space-y-4 fade-in">
        <div className="text-2xl font-bold text-slate-800">我的防跌倒计划</div>
        <Card>
          <div className="flex justify-between mb-2">
            <span className="font-bold text-slate-700">完成进度</span>
            <span className="text-slate-500">{doneCount} / {planItems.length}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: Math.round((doneCount / planItems.length) * 100) + '%' }}></div>
          </div>
        </Card>
        {Object.entries(groups).map(([cat, items]) => (
          <Card key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{CAT_ICONS[cat] || '•'}</span>
              <span className="font-bold text-slate-800 text-lg">{cat}</span>
            </div>
            {items.map(p => (
              <button key={p.id} onClick={() => {
                updateProfile(prof => ({ ...prof, planItems: prof.planItems.map(item => item.id === p.id ? { ...item, done: !item.done } : item) }));
              }}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border-2 mb-2 text-left transition ${p.done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${p.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                  {p.done ? '✓' : ''}
                </span>
                <span className={`text-base ${p.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{p.text}</span>
              </button>
            ))}
          </Card>
        ))}
      </div>
    );
  };

  /* ---------- 历史 ---------- */
  const renderHistory = () => (
    <div className="space-y-4 fade-in">
      <div className="text-2xl font-bold text-slate-800">我的</div>
      <Card>
        <div className="flex justify-between mb-3">
          <span className="font-bold text-slate-800">档案列表</span>
          <span className="text-sm text-slate-500">共 {profiles.length} 人</span>
        </div>
        {profiles.length === 0 && (
          <div className="text-center py-6 text-slate-400">暂无档案</div>
        )}
        {profiles.map(p => (
          <div key={p.id} className={`rounded-xl border-2 mb-2 overflow-hidden ${p.id === currentProfileId ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
            <button onClick={() => { setCurrentProfileId(p.id); go('home'); }} className="w-full text-left px-4 py-3">
              <div className="flex justify-between">
                <span className="font-bold text-slate-800">{p.name}</span>
                <span className="text-sm text-slate-500">{p.profileNumber}</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">
                {p.age} 岁 · {p.sex === 'male' ? '男' : '女'} · {p.hasChronic ? '有慢病' : '无慢病'}
                {p.riskLevel && <span className="ml-2">· 当前：{{ low: '低风险', medium: '中风险', high: '高风险' }[p.riskLevel]}</span>}
              </div>
            </button>
            <div className="flex border-t border-slate-200">
              <button onClick={() => goEditProfile(p.id)}
                className="flex-1 py-2.5 text-sm text-blue-600 font-semibold border-r border-slate-200 active:bg-blue-50">
                ✏️ 编辑
              </button>
              <button onClick={() => {
                if (!window.confirm(`确定删除「${p.name}」的档案吗？所有记录将被清除。`)) return;
                setProfiles(prev => {
                  const remaining = prev.filter(x => x.id !== p.id);
                  if (currentProfileId === p.id) {
                    setCurrentProfileId(remaining[0]?.id || null);
                  }
                  return remaining;
                });
              }}
                className="flex-1 py-2.5 text-sm text-rose-500 font-semibold active:bg-rose-50">
                🗑 删除
              </button>
            </div>
          </div>
        ))}
        <BigButton onClick={() => go('newProfile')}>+ 新建档案</BigButton>
      </Card>

      {currentProfile && (currentProfile.history || []).length > 0 && (
        <Card>
          <div className="font-bold text-slate-800 mb-3">评估记录</div>
          {[...(currentProfile.history || [])].reverse().map((h, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
              <div>
                <div className="text-slate-700 font-bold">
                  {h.date}
                  {h.isModified && <span className="ml-2 text-xs text-amber-600 font-normal">（修改前）</span>}
                </div>
                <div className="text-sm text-slate-400 mt-0.5">{h.type === 'full' ? '全面评估' : '初筛'}</div>
              </div>
              <RiskBadge level={h.riskLevel} size="sm" />
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div className="font-bold text-slate-800 mb-3">更多</div>
        <button onClick={() => go('nearby')}
          className="w-full flex justify-between items-center py-3.5 border-b border-slate-100 active:bg-slate-50">
          <span className="text-slate-700">📍 附近医院 / 养老院</span>
          <span className="text-slate-300">›</span>
        </button>
        <button onClick={() => go('about')}
          className="w-full flex justify-between items-center py-3.5 border-b border-slate-100 active:bg-slate-50">
          <span className="text-slate-700">📖 关于我们</span>
          <span className="text-slate-300">›</span>
        </button>
        <button onClick={() => go('agreement')}
          className="w-full flex justify-between items-center py-3.5 border-b border-slate-100 active:bg-slate-50">
          <span className="text-slate-700">📄 我的协议</span>
          <span className="text-slate-300">›</span>
        </button>
        <button onClick={() => go('contact')}
          className="w-full flex justify-between items-center py-3.5 border-b border-slate-100 active:bg-slate-50">
          <span className="text-slate-700">💬 联系客服</span>
          <span className="text-slate-300">›</span>
        </button>
        <div className="w-full flex justify-between items-center py-3.5">
          <span className="text-slate-500 text-sm">版本</span>
          <span className="text-slate-400 text-sm">V1.0.0</span>
        </div>
      </Card>
    </div>
  );

  /* ---------- 附近医院 / 养老院（高德 API） ---------- */
  const renderNearbyHospitals = () => (
    <div className="space-y-4 fade-in">
      <button onClick={() => go('history')} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">附近医院与养老院</div>

      {/* 定位卡片 */}
      <Card>
        {locationStatus === 'idle' && (
          <div>
            <div className="text-slate-600 mb-3">点击下方按钮获取您的位置，系统会显示附近 10 公里内的医疗机构</div>
            <BigButton onClick={requestLocation}>📍 获取我的位置并搜索</BigButton>
          </div>
        )}
        {locationStatus === 'loading' && (
          <div className="text-center py-3 text-slate-500">📍 正在定位…</div>
        )}
        {locationStatus === 'success' && (
          <div className="flex justify-between items-center">
            <div>
              <div className="text-emerald-700 font-bold">📍 已定位</div>
              <div className="text-xs text-slate-500 mt-1">
                纬度 {userLocation.lat.toFixed(4)}，经度 {userLocation.lng.toFixed(4)}
              </div>
            </div>
            <button onClick={requestLocation} className="text-blue-600 text-sm font-semibold">重新定位</button>
          </div>
        )}
        {locationStatus === 'denied' && (
          <div>
            <div className="text-amber-700 font-bold mb-2">⚠️ 未能获取您的位置</div>
            <div className="text-sm text-slate-600 mb-3">请在浏览器设置中允许位置权限后重试</div>
            <BigButton onClick={requestLocation}>重新定位</BigButton>
          </div>
        )}
        {locationStatus === 'unsupported' && (
          <div className="text-slate-600 text-sm">当前浏览器不支持定位功能，请使用 Chrome / Safari / Edge 等现代浏览器</div>
        )}
      </Card>

      {/* 定位成功后显示内容 */}
      {locationStatus === 'success' && (
        <>
          {/* 类型切换 */}
          <div className="flex gap-2">
            {[{ v: '医院', l: '🏥 医院' }, { v: '养老院', l: '🏠 养老院' }].map(opt => (
              <button key={opt.v} onClick={() => switchHospitalType(opt.v)}
                className={`flex-1 h-12 rounded-xl border-2 font-bold transition ${hospitalType === opt.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                {opt.l}
              </button>
            ))}
          </div>

          {/* 加载中 */}
          {hospitalLoading && (
            <Card>
              <div className="text-center py-4 text-slate-500">正在搜索附近的{hospitalType}…</div>
            </Card>
          )}

          {/* 错误提示 */}
          {hospitalError && !hospitalLoading && (
            <Card className="bg-rose-50 border-rose-200">
              <div className="text-rose-700 font-bold mb-1">搜索失败</div>
              <div className="text-sm text-rose-600">{hospitalError}</div>
            </Card>
          )}

          {/* 无结果 */}
          {!hospitalLoading && !hospitalError && hospitals.length === 0 && (
            <Card>
              <div className="text-center py-4 text-slate-500">
                附近 10 公里内未找到{hospitalType}，<br />
                请尝试切换类型或扩大搜索范围
              </div>
            </Card>
          )}

          {/* 结果列表 */}
          {!hospitalLoading && hospitals.length > 0 && (
            <>
              <div className="text-sm text-slate-500">
                共找到 {hospitals.length} 家{hospitalType}，按距离排序：
              </div>
              {hospitals.map(h => (
                <Card key={h.id}>
                  <div className="font-bold text-slate-800 text-base">
                    {hospitalType === '医院' ? '🏥' : '🏠'} {h.name}
                  </div>
                  <div className="text-sm text-blue-600 font-semibold mt-1">
                    距离约 {formatDistance(h.distance)}
                  </div>
                  {h.address && (
                    <div className="text-sm text-slate-500 mt-1">📍 {h.address}</div>
                  )}
                  {h.type && (
                    <div className="text-xs text-slate-400 mt-1">类型：{h.type}</div>
                  )}
                  <div className="flex gap-2 mt-3">
                    {h.phone ? (
                      <a href={`tel:${h.phone}`}
                        className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center active:bg-blue-700">
                        📞 {h.phone}
                      </a>
                    ) : (
                      <div className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center">
                        暂无电话
                      </div>
                    )}
                    <a href={`https://uri.amap.com/marker?position=${h.location}&name=${encodeURIComponent(h.name)}`}
                      target="_blank" rel="noreferrer"
                      className="flex-1 h-11 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold flex items-center justify-center active:bg-slate-50">
                      🗺 导航
                    </a>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      <Card className="bg-amber-50 border-amber-200">
        <div className="text-sm text-amber-800 leading-relaxed">
          <div className="font-bold mb-1">⚠️ 温馨提示</div>
          以上信息由高德地图实时提供，仅供参考。具体地址、电话、营业时间以机构官方公布为准。<br />
          <span className="font-bold">如遇紧急情况，请立即拨打 120。</span>
        </div>
      </Card>
    </div>
  );

  /* ---------- 关于我们 ---------- */
  const renderAbout = () => (
    <div className="space-y-4 fade-in">
      <button onClick={() => go('history')} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">关于我们</div>

      <Card>
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🏥</div>
          <div className="text-xl font-bold text-slate-800">老年人跌倒风险评估与管理系统</div>
          <div className="text-sm text-slate-500 mt-1">V1.0.0</div>
        </div>
        <div className="text-base text-slate-700 leading-relaxed">
          本系统是一款面向社区医疗机构、养老机构和家庭的移动端健康管理应用，
          为 65 岁以上老年人，或 60 岁以上且有慢性病/跌倒史的老年人提供跌倒风险快速筛查、
          综合评估与个体化干预管理服务。
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-2">🎯 核心功能</div>
        <div className="text-base text-slate-700 leading-relaxed">
          • 两阶段筛查评估：快速初筛 + 五大量表综合评估<br />
          • 智能风险分级：Morse、Hendrich II、Berg、TUG、Tinetti 多工具聚合<br />
          • 个体化干预计划：根据评估结果自动生成运动、用药、环境改造建议<br />
          • 附近医院查询：基于高德地图 API 实时搜索周边医疗机构<br />
          • 隐私保护：数据本地存储，支持指纹/面容解锁
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-2">💡 技术特点</div>
        <div className="text-base text-slate-700 leading-relaxed">
          1. 采用国际标准化量表进行多工具综合评估<br />
          2. 基于评估异常项自动生成个体化干预计划<br />
          3. 集成高德地图 Web 服务 API 实现附近机构查询<br />
          4. 纯本地化存储，支持 PDF 报告导出与历史记录追踪
        </div>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-800 leading-relaxed">
          <div className="font-bold mb-1">📌 适用范围</div>
          本工具仅作跌倒风险初步筛查辅助，不替代医护人员的专业诊断。
          如有健康问题，请及时就医。
        </div>
      </Card>

      <BigButton variant="ghost" onClick={() => go('history')}>返回</BigButton>
    </div>
  );

  /* ---------- 我的协议 ---------- */
  const renderAgreement = () => (
    <div className="space-y-4 fade-in">
      <button onClick={() => go('history')} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">我的协议</div>

      <Card>
        <div className="font-bold text-slate-800 mb-3">📄 用户服务协议</div>
        <div className="text-sm text-slate-600 leading-relaxed">
          1. 本系统为老年人跌倒风险评估辅助工具，评估结果仅供参考，不构成医疗诊断。<br /><br />
          2. 用户在使用本系统过程中，应如实填写老年人健康信息，不得虚报或隐瞒。<br /><br />
          3. 本系统不对因用户自行使用评估结果进行的任何医疗行为承担责任。<br /><br />
          4. 用户应妥善保管个人账号信息及设备安全，因设备丢失或泄露造成的损失由用户自行承担。
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-3">🔒 隐私政策</div>
        <div className="text-sm text-slate-600 leading-relaxed">
          1. 本系统所有数据均保存在用户设备本地（浏览器 localStorage / 手机本地存储），不上传至任何服务器。<br /><br />
          2. 系统不收集任何个人信息用于商业用途。<br /><br />
          3. 用户可随时通过"我的-清除全部数据"功能删除所有本地数据。<br /><br />
          4. 系统支持指纹/面容解锁功能，用于防止未授权访问，生物特征信息由设备系统管理，本系统不存储任何生物特征数据。<br /><br />
          5. 使用"附近医院"功能时，系统会将您的临时定位信息加密传输至高德地图服务器，仅用于本次查询，不存储、不关联个人身份。
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-3">⚠️ 免责声明</div>
        <div className="text-sm text-slate-600 leading-relaxed">
          本工具仅为跌倒风险初步筛查辅助工具，评估结果仅供参考，不可替代医护人员的专业诊断。
          如有健康问题，请及时就医。使用者应结合专业医护人员的意见，做出医疗决策。
          本系统开发方不对因使用本工具产生的任何直接或间接损失承担责任。
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-3">📊 数据安全说明</div>
        <div className="text-sm text-slate-600 leading-relaxed">
          1. 数据存储：所有评估数据仅保存在本机，卸载应用或清除浏览器缓存后数据将丢失。<br /><br />
          2. 数据备份：建议定期通过"导出数据"功能备份档案信息。<br /><br />
          3. 数据分享：如需将评估报告分享给医护人员，请通过"导出 PDF 报告"功能手动分享。
        </div>
      </Card>

      <BigButton variant="ghost" onClick={() => go('history')}>返回</BigButton>
    </div>
  );

  /* ---------- 联系客服 ---------- */
  const renderContact = () => (
    <div className="space-y-4 fade-in">
      <button onClick={() => go('history')} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">联系客服</div>

      <Card>
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">💬</div>
          <div className="text-base text-slate-700">
            如在使用过程中遇到问题或有建议，<br />
            欢迎通过以下方式联系我们
          </div>
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-3">📮 联系方式</div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-2xl">📧</span>
            <div className="flex-1">
              <div className="text-sm text-slate-500">反馈邮箱</div>
              <div className="text-base text-slate-800 font-semibold">support@fallrisk.app</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-2xl">💬</span>
            <div className="flex-1">
              <div className="text-sm text-slate-500">客服微信</div>
              <div className="text-base text-slate-800 font-semibold">fallrisk_service</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <div className="text-sm text-slate-500">反馈电话</div>
              <div className="text-base text-slate-800 font-semibold">400-000-0000</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <span className="text-2xl">🕐</span>
            <div className="flex-1">
              <div className="text-sm text-slate-500">服务时间</div>
              <div className="text-base text-slate-800 font-semibold">9:00 - 18:00（工作日）</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="font-bold text-slate-800 mb-3">❓ 常见问题</div>
        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <div>
            <div className="font-bold text-slate-700">Q：数据会丢失吗？</div>
            <div>A：数据保存在本机，卸载应用或清除浏览器缓存后数据会丢失。建议定期导出备份。</div>
          </div>
          <div>
            <div className="font-bold text-slate-700">Q：评估结果准确吗？</div>
            <div>A：本系统采用国际标准化量表，但仅作初步筛查辅助，不能替代医生的专业诊断。</div>
          </div>
          <div>
            <div className="font-bold text-slate-700">Q：可以多人使用吗？</div>
            <div>A：可以。在"我的"页面点击"+新建档案"可以为多个老年人建立独立档案。</div>
          </div>
        </div>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-800 leading-relaxed">
          <div className="font-bold mb-1">⚠️ 紧急情况提醒</div>
          如遇老年人跌倒等紧急情况，请立即拨打 <span className="font-bold">120</span> 急救电话。
        </div>
      </Card>

      <BigButton variant="ghost" onClick={() => go('history')}>返回</BigButton>
    </div>
  );

  /* ---------- 底部导航 ---------- */
  const TabBar = () => (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-20">
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {[
          { id: 'home', label: '首页', icon: '🏠' },
          { id: 'assess', label: '评估', icon: '📊' },
          { id: 'plan', label: '计划', icon: '📋' },
          { id: 'history', label: '我的', icon: '👤' },
        ].map(t => (
          <button key={t.id} onClick={() => { go(t.id === 'home' ? 'home' : t.id === 'assess' ? (currentProfile ? (currentProfile.assessment ? 'result' : 'assessment') : 'home') : t.id); }}
            className={`py-3 flex flex-col items-center gap-1 transition ${tab === t.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className="text-2xl">{t.icon}</span>
            <span className={`text-sm ${tab === t.id ? 'font-bold' : ''}`}>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  /* ---------- 主渲染 ---------- */
  const renderScreen = () => {
    if (screen === 'home') return renderHome();
    if (screen === 'newProfile') return renderNewProfile();
    if (screen === 'editProfile') return renderEditProfile();
    if (screen === 'screening') return renderScreening();
    if (screen === 'lowBranch') return renderLowRisk();
    if (screen === 'assessment') return renderAssessment();
    if (screen === 'editAssessment') return renderAssessment();
    if (screen === 'result') return renderResult();
    if (screen === 'plan') return renderPlan();
    if (screen === 'history') return renderHistory();
    if (screen === 'nearby') return renderNearbyHospitals();
    if (screen === 'about') return renderAbout();
    if (screen === 'agreement') return renderAgreement();
    if (screen === 'contact') return renderContact();
    return renderHome();
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <div className="font-bold text-slate-800 text-lg">
            {screen === 'home' ? '首页'
              : (screen === 'assessment' || screen === 'editAssessment') ? '阶段二 · 全面评估'
                : screen === 'result' ? '评估结果'
                  : screen === 'editProfile' ? '编辑档案'
                    : screen === 'plan' ? '我的计划'
                      : screen === 'nearby' ? '附近医院'
                        : screen === 'about' ? '关于我们'
                          : screen === 'agreement' ? '我的协议'
                            : screen === 'contact' ? '联系客服'
                              : '跌倒风险管理'}
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">{renderScreen()}</main>
      <TabBar />
    </div>
  );
}

/* ============================================================
   子组件
   ============================================================ */
function NewProfileForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState(null);
  const [hasChronic, setHasChronic] = useState(null);
  const [hasFallHistory, setHasFallHistory] = useState(null);
  const ageNum = Number(age);
  const eligible = (ageNum >= 65) || (ageNum >= 60 && (hasChronic === true || hasFallHistory === true));
  const canSubmit = name.trim() && ageNum > 0 && sex !== null && hasChronic !== null && hasFallHistory !== null && eligible;

  return (
    <div className="space-y-4 fade-in">
      <button onClick={onCancel} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">建立档案</div>
      <Card>
        <label className="block font-bold text-slate-700 mb-2">姓名</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名"
          className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-lg" />
      </Card>
      <Card>
        <label className="block font-bold text-slate-700 mb-2">年龄</label>
        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="请输入年龄"
          className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-lg" />
      </Card>
      <Card>
        <div className="font-bold text-slate-700 mb-3">性别</div>
        <div className="grid grid-cols-2 gap-3">
          {[{ v: 'male', l: '男' }, { v: 'female', l: '女' }].map(o => (
            <button key={o.v} onClick={() => setSex(o.v)}
              className={`h-14 rounded-xl border-2 font-bold text-lg ${sex === o.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{o.l}</button>
          ))}
        </div>
      </Card>
      <Card>
        <div className="font-bold text-slate-700 mb-3">是否有慢性病？</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasChronic(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasChronic === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>是</button>
          <button onClick={() => setHasChronic(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasChronic === false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>否</button>
        </div>
      </Card>
      <Card>
        <div className="font-bold text-slate-700 mb-3">过去是否有跌倒史？</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasFallHistory(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasFallHistory === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>是</button>
          <button onClick={() => setHasFallHistory(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasFallHistory === false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>否</button>
        </div>
      </Card>
      {ageNum > 0 && (
        <div className={`rounded-xl p-4 ${eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {eligible ? '✓ 符合本工具适用范围' : '⚠ 暂不符合纳入条件：需 ≥65 岁，或 ≥60 岁且有慢性病/跌倒史'}
        </div>
      )}
      <BigButton disabled={!canSubmit} onClick={() => onSave({ name: name.trim(), age: ageNum, sex, hasChronic, hasFallHistory })}>
        保存并开始初筛
      </BigButton>
    </div>
  );
}

function EditProfileForm({ profile, onSave, onCancel }) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [sex, setSex] = useState(profile.sex);
  const [hasChronic, setHasChronic] = useState(profile.hasChronic);
  const [hasFallHistory, setHasFallHistory] = useState(profile.hasFallHistory);

  const ageNum = Number(age);
  const eligible = (ageNum >= 65) || (ageNum >= 60 && (hasChronic === true || hasFallHistory === true));
  const canSubmit = name.trim() && ageNum > 0 && eligible;

  return (
    <div className="space-y-4 fade-in">
      <button onClick={onCancel} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">编辑档案</div>

      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-800">
          档案号：<span className="font-bold">{profile.profileNumber}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">修改基本信息不会影响已有评估记录</div>
      </Card>

      <Card>
        <label className="block font-bold text-slate-700 mb-2">姓名</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名"
          className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-lg" />
      </Card>
      <Card>
        <label className="block font-bold text-slate-700 mb-2">年龄</label>
        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="请输入年龄"
          className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-lg" />
      </Card>
      <Card>
        <div className="font-bold text-slate-700 mb-3">性别</div>
        <div className="grid grid-cols-2 gap-3">
          {[{ v: 'male', l: '男' }, { v: 'female', l: '女' }].map(o => (
            <button key={o.v} onClick={() => setSex(o.v)}
              className={`h-14 rounded-xl border-2 font-bold text-lg ${sex === o.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{o.l}</button>
          ))}
        </div>
      </Card>
      <Card>
        <div className="font-bold text-slate-700 mb-3">是否有慢性病？</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasChronic(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasChronic === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>是</button>
          <button onClick={() => setHasChronic(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasChronic === false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>否</button>
        </div>
      </Card>
      <Card>
        <div className="font-bold text-slate-700 mb-3">过去是否有跌倒史？</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasFallHistory(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasFallHistory === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>是</button>
          <button onClick={() => setHasFallHistory(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasFallHistory === false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>否</button>
        </div>
      </Card>
      {ageNum > 0 && (
        <div className={`rounded-xl p-4 ${eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {eligible ? '✓ 符合本工具适用范围' : '⚠ 暂不符合纳入条件'}
        </div>
      )}
      <BigButton disabled={!canSubmit} onClick={() => onSave({
        name: name.trim(), age: ageNum, sex, hasChronic, hasFallHistory,
      })}>
        保存修改
      </BigButton>
    </div>
  );
}

function ScreeningForm({ onDone, onCancel }) {
  const [q1, setQ1] = useState(null);
  const [q2, setQ2] = useState(null);
  const [q3, setQ3] = useState(null);
  const [factors, setFactors] = useState([]);
  const allAnswered = q1 !== null && q2 !== null && q3 !== null;

  const handleSubmit = () => {
    const anyYes = q1 === true || q2 === true || q3 === true;
    const result = (anyYes || factors.length > 0) ? 'full' : 'low';
    onDone({ q1, q2, q3, factors, result, date: todayStr() });
  };

  const Q = ({ index, text, value, setValue }) => (
    <Card>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0">{index}</span>
          <span className="font-bold text-slate-800 pt-1">{text}</span>
        </div>
        <SpeakButton size="sm" text={`${text}。1，是。2，否。`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setValue(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${value === true ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}>1. 是</button>
        <button onClick={() => setValue(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${value === false ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>2. 否</button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 fade-in">
      <button onClick={onCancel} className="text-blue-600 text-lg">‹ 返回</button>
      <div className="text-2xl font-bold text-slate-800">阶段一 · 跌倒风险初筛</div>
      <div className="text-slate-600">以下 3 个问题帮助快速判断是否需要进一步评估</div>
      <Q index="1" text="过去 1 年内是否跌倒过？" value={q1} setValue={setQ1} />
      <Q index="2" text="站立或行走时是否感觉不稳？" value={q2} setValue={setQ2} />
      <Q index="3" text="是否担心跌倒？" value={q3} setValue={setQ3} />
      <Card>
        <div className="font-bold text-slate-800 mb-3">是否存在以下高危因素？（可多选）</div>
        <div className="flex flex-wrap gap-2">
          {HIGH_RISK_FACTORS.map(f => {
            const active = factors.includes(f);
            return (
              <button key={f} onClick={() => setFactors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                className={`px-3.5 py-2.5 rounded-full text-base border-2 transition ${active ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'}`}>
                {f}
              </button>
            );
          })}
        </div>
      </Card>
      <BigButton disabled={!allAnswered} onClick={handleSubmit}>提交初筛结果</BigButton>
    </div>
  );
}
