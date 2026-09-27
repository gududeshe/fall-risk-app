import React, { useState, useEffect } from 'react';

/* ============================================================
   常量与量表配置
   ============================================================ */
const STORAGE_KEY = 'fall-risk-app-v4';
const DISCLAIMER = '本工具仅为跌倒风险初步筛查辅助工具，评估结果仅供参考，不可替代医护人员的专业诊断。如有健康问题，请及时就医。';

const MORSE_ITEMS = [
  {
    id: 'fallHistory', label: '跌倒史', help: '近 3 个月内有无跌倒', reason: '近3个月内有跌倒史者，再次跌倒风险显著增加，是Morse量表中权重最高的单项（25分）', options: [
      { label: '无', value: 0 }, { label: '有', value: 25 }
    ]
  },
  {
    id: 'secondaryDx', label: '次要诊断', help: '是否存在 2 个以上医学诊断', reason: '多种疾病共存（≥2个诊断）提示整体健康状态较差，影响活动能力和平衡控制', options: [
      { label: '无', value: 0 }, { label: '有', value: 15 }
    ]
  },
  {
    id: 'ambulatory', label: '行走辅助', help: '日常行走使用的辅助方式', reason: '需扶靠家具行走说明平衡功能严重受损，跌倒风险极高（30分）；使用拐杖/助行器为中度风险（15分）', options: [
      { label: '无 / 卧床 / 护士协助', value: 0 },
      { label: '拐杖 / 助行器', value: 15 },
      { label: '需扶靠家具', value: 30 },
    ]
  },
  {
    id: 'iv', label: '静脉治疗', help: '是否正在接受静脉输液', reason: '静脉输液限制活动范围，管路牵拉可能导致跌倒，需重点关注', options: [
      { label: '无', value: 0 }, { label: '有', value: 20 }
    ]
  },
  {
    id: 'gait', label: '步态', help: '步态表现', reason: '步态异常/功能障碍（20分）提示神经系统或骨骼肌肉系统病变；步态虚弱（10分）为中度风险', options: [
      { label: '正常 / 卧床', value: 0 },
      { label: '虚弱', value: 10 },
      { label: '异常 / 功能障碍', value: 20 },
    ]
  },
  {
    id: 'mental', label: '认知状态', help: '定向力情况', reason: '定向力障碍者可能忘记自身活动限制，做出危险行为，增加跌倒风险', options: [
      { label: '正常', value: 0 }, { label: '定向力障碍', value: 15 }
    ]
  },
];

const HENDRICH_ITEMS = [
  { id: 'tugFail', label: '起立-行走测试无法完成', value: 5, reason: '无法完成起立-行走测试提示下肢力量和平衡功能严重受损' },
  { id: 'confusion', label: '精神状态：混乱 / 定向障碍 / 冲动', value: 4, reason: '意识混乱或冲动行为是跌倒的重要独立危险因素' },
  { id: 'depression', label: '症状性抑郁', value: 2, reason: '抑郁导致活动减少、注意力下降，间接增加跌倒风险' },
  { id: 'orthostatic', label: '体位性血压变化', value: 2, reason: '体位性低血压可导致站立时头晕、眼前发黑，直接引发跌倒' },
  { id: 'urinary', label: '尿频 / 尿急 / 夜尿增多', value: 1, reason: '频繁如厕增加夜间起身次数，夜间光线不足时跌倒风险高' },
  { id: 'benzo', label: '使用苯二氮卓类药物', value: 1, reason: '苯二氮卓类药物（如地西泮）可引起嗜睡、肌肉松弛和平衡障碍' },
  { id: 'antidepressant', label: '使用抗抑郁药物', value: 1, reason: '部分抗抑郁药可引起体位性低血压和镇静作用' },
  { id: 'male', label: '男性', value: 1, reason: '多项研究显示男性是跌倒的独立危险因素' },
];

const BERG_ITEMS = [
  { label: '从坐到站', desc: '0=需要中度或较大帮助；1=需要较小帮助；2=用手帮助经几次努力后站起；3=用手帮助能自己站起；4=不用手帮助即能站起且稳定' },
  { label: '无支撑站立', desc: '0=不能站立2分钟；1=在监护下站2分钟；2=能站2分钟但需监护；3=能站2分钟但需监护；4=能安全站2分钟' },
  { label: '无支撑坐位', desc: '0=不能坐2分钟；1=能坐2分钟但需监护；2=能坐2分钟；3=能坐2分钟且稳定；4=能安全坐2分钟' },
  { label: '从站到坐', desc: '0=需要帮助；1=自己控制坐下但过程不平稳；2=用手帮助控制坐下；3=用手帮助控制坐下；4=安全坐下，无需手帮助' },
  { label: '床-椅转移', desc: '0=需要帮助；1=需要少量帮助；2=需要口头提示；3=需要监护；4=安全转移，无需帮助' },
  { label: '无支撑闭眼站立', desc: '0=闭眼不能站3秒；1=闭眼能站3秒但需监护；2=闭眼能站3秒；3=闭眼能站10秒但需监护；4=闭眼安全站10秒' },
  { label: '双足并拢站立', desc: '0=不能并拢站立；1=能并拢但需帮助；2=能并拢站1分钟；3=能并拢站1分钟但需监护；4=能安全并拢站1分钟' },
  { label: '站立位上肢前伸', desc: '0=前伸时失去平衡；1=前伸需帮助；2=前伸>5cm；3=前伸>12cm；4=前伸>25cm' },
  { label: '从地上拾物', desc: '0=不能拾物；1=需帮助拾物；2=能拾物但需监护；3=能拾物但需靠近；4=能安全轻松拾物' },
  { label: '转身向后看', desc: '0=需帮助转身；1=转身时需监护；2=能转身但重心不稳；3=能转身但需监护；4=能安全转身向后看' },
  { label: '转身一周', desc: '0=需帮助转身；1=转身需监护；2=能转身360°但缓慢；3=能转身360°但不稳；4=能安全转身360°' },
  { label: '双足交替踏台阶', desc: '0=不能踏台阶；1=需帮助踏台阶；2=能踏台阶但需监护；3=能踏台阶但需靠近；4=能安全交替踏台阶' },
  { label: '双足前后站立', desc: '0=不能前后站立；1=能前后站但需帮助；2=能前后站30秒；3=能前后站30秒但需监护；4=能安全前后站30秒' },
  { label: '单腿站立', desc: '0=不能单腿站；1=单腿站<3秒；2=单腿站3-5秒；3=单腿站5-10秒；4=单腿站>10秒' }
];

const TINETTI_BALANCE = [
  { id: 't1', label: '坐位平衡', max: 1, desc: '0=在椅子上倾斜或滑动；1=稳定安全' },
  { id: 't2', label: '站起', max: 2, desc: '0=必须借助他人帮助；1=能站起但需用手臂辅助；2=不用手臂辅助能站起' },
  { id: 't3', label: '即刻站立平衡', max: 2, desc: '0=站立时不稳定（摇晃、移动脚）；1=能站立但需扶持或使用辅助物；2=不用支持能稳定站立' },
  { id: 't4', label: '站立平衡', max: 2, desc: '0=不稳定；1=扶持下稳定但双脚增宽；2=不用支持，双脚并拢稳定站立' },
  { id: 't5', label: '轻推', max: 2, desc: '0=开始跌倒；1=摇晃、抓物但能自行恢复；2=稳定' },
  { id: 't6', label: '闭眼站立', max: 2, desc: '0=不稳定；1=稳定' },
  { id: 't7', label: '转身 360°', max: 2, desc: '0=步态不稳（抓物、摇晃）；1=稳定但步态不连贯；2=稳定连贯' },
  { id: 't8', label: '坐下', max: 2, desc: '0=不安全（判断错误、距离过远）；1=用胳膊辅助或动作不平稳；2=安全平稳坐下' },
  { id: 't9', label: '转身走回座位', max: 1, desc: '0=需扶持或步态不稳；1=不需扶持，步态稳定' },
];

const TINETTI_GAIT = [
  { id: 'g1', label: '步态启动', max: 1, desc: '0=犹豫或多次尝试开始；1=无犹豫' },
  { id: 'g2', label: '步长（右）', max: 1, desc: '0=右脚未超过左侧支撑腿；1=右脚超过左侧支撑腿' },
  { id: 'g3', label: '步高（右）', max: 1, desc: '0=右脚未完全离地（拖地）；1=右脚完全抬离地面' },
  { id: 'g4', label: '步长（左）', max: 1, desc: '0=左脚未超过右侧支撑腿；1=左脚超过右侧支撑腿' },
  { id: 'g5', label: '步高（左）', max: 1, desc: '0=左脚未完全离地（拖地）；1=左脚完全抬离地面' },
  { id: 'g6', label: '步态对称性', max: 1, desc: '0=左右步长不等；1=左右步长大致相等' },
  { id: 'g7', label: '步态连续性', max: 1, desc: '0=步伐间有停顿或不连贯；1=步伐间大致连贯' },
  { id: 'g8', label: '路径', max: 2, desc: '0=明显偏离；1=轻度偏离或使用步行辅助；2=无偏离，走直线' },
  { id: 'g9', label: '躯干稳定性', max: 2, desc: '0=明显摇摆或需使用步行辅助；1=行走时膝盖弯曲但无身体摇晃；2=无摇摆、无弯曲、双臂自然' },
  { id: 'g10', label: '行走时足间距', max: 1, desc: '0=两脚跟分得很远（增宽）；1=脚跟几乎接触（正常）' },
];

const HIGH_RISK_FACTORS = [
  '使用 4 种以上药物', '帕金森病', '卒中', '视力障碍', '认知障碍',
  '骨质疏松', '关节炎', '糖尿病', '慢性心肺疾病'
];

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
  const high =
    (morse >= 45) || (hendrich >= 5) || (berg <= 20) ||
    (tug > 20) || (tinetti <= 18);
  if (high) return 'high';
  const medium =
    (morse >= 25) || (hendrich >= 3) || (berg <= 40) ||
    (tug >= 12) || (tinetti <= 23);
  if (medium) return 'medium';
  return 'low';
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addMonths(dateStr, n) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function generateProfileNumber(existingCount) {
  const d = new Date();
  const prefix = `FRA-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}-${String(existingCount + 1).padStart(3, '0')}`;
}
function createProfile(data, existingCount) {
  return {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    profileNumber: generateProfileNumber(existingCount),
    name: data.name, age: data.age, sex: data.sex,
    hasChronic: data.hasChronic, hasFallHistory: data.hasFallHistory,
    createdAt: todayStr(),
    screening: null, assessment: null, envCheck: null,
    riskLevel: null, planItems: [], history: [],
  };
}
function defaultState() {
  return { profiles: [], currentProfileId: null, tab: 'home', screen: 'home', assessStep: 0 };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.profiles) return { ...defaultState(), ...parsed };
      if (parsed.profile) {
        const migratedProfile = {
          id: 'p_migrated_' + Date.now(),
          profileNumber: generateProfileNumber(0),
          name: parsed.profile.name, age: parsed.profile.age,
          sex: parsed.profile.sex || 'male',
          hasChronic: parsed.profile.hasChronic, hasFallHistory: parsed.profile.hasFallHistory,
          createdAt: parsed.profile.createdAt,
          screening: parsed.screening, assessment: parsed.assessment,
          envCheck: parsed.envCheck, riskLevel: parsed.riskLevel,
          planItems: parsed.planItems || [], history: parsed.history || [],
        };
        return {
          ...defaultState(), profiles: [migratedProfile],
          currentProfileId: migratedProfile.id,
          tab: parsed.tab || 'home', screen: parsed.screen || 'home',
          assessStep: parsed.assessStep || 0,
        };
      }
    }
  } catch (e) { /* ignore */ }
  return defaultState();
}

/* ============================================================
   个体化计划生成
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
    items.push({ cat: '运动', text: '每周 ≥150 分钟中等强度有氧运动（快走、太极拳、八段锦、广场舞）' });
    items.push({ cat: '运动', text: '每周 ≥3 天平衡训练（单脚站立、直线行走、侧向行走）' });
    items.push({ cat: '运动', text: '每周 ≥2 天力量训练（坐位伸膝、靠墙静蹲、提踵）' });
    items.push({ cat: '教育', text: '认识跌倒风险，了解自身平衡能力变化，掌握外出安全行为习惯' });
    items.push({ cat: '教育', text: '学习居家适老化知识：卫生间扶手、防滑垫、夜灯、地面整洁' });
    items.push({ cat: '随访', text: '每年复筛一次跌倒风险' });
  } else if (riskLevel === 'medium') {
    items.push({ cat: '运动', text: '由康复治疗师制定个体化平衡与力量训练方案，每周 ≥3 次，每次 ≥30 分钟，坚持 ≥12 周' });
    items.push({ cat: '运动', text: '坐-站转换训练：每日 10 次 × 3 组，注意不用手臂辅助' });
    items.push({ cat: '运动', text: '功能性移动训练：方向变换行走、跨越障碍物训练' });
    items.push({ cat: '教育', text: '学习跌倒后自我保护动作（如降低重心、保护头部）' });
    items.push({ cat: '随访', text: '每 6 个月复评一次风险等级' });
  } else {
    items.push({ cat: '运动', text: '由物理治疗师或康复治疗师制定个体化方案，每周 ≥3 次平衡功能锻炼，持续 ≥12 周' });
    items.push({ cat: '运动', text: '渐进性抗阻训练（Otago 方案或 Vivifrail 方案）' });
    items.push({ cat: '运动', text: '太极拳训练：每周 ≥2 次，每次 ≥30 分钟（研究显示可降低跌倒风险 40%）' });
    items.push({ cat: '运动', text: '行走训练：跨障碍步行、侧向行走、上下台阶训练' });
    items.push({ cat: '教育', text: '与家属共同学习防跌倒知识，签署跌倒风险知情同意' });
    items.push({ cat: '随访', text: '每月评估一次，30-90 天内密切随访' });
    items.push({ cat: '随访', text: '发生跌倒后立即重新评估' });
  }

  if (morse.fallHistory === 25) items.push({ cat: '环境', text: '排查上次跌倒的环境原因（地面、照明、障碍物、鞋履）' });
  if (morse.ambulatory === 15) items.push({ cat: '辅具', text: '检查拐杖/助行器高度是否合适（站立时手柄应与腕横纹平齐），培训正确使用方法' });
  if (morse.ambulatory === 30) items.push({ cat: '辅具', text: '评估是否需要适配助行器，减少扶家具行走，降低跌倒风险' });
  if (morse.gait === 20) items.push({ cat: '康复', text: '转诊康复科评估步态异常（可能存在神经系统或骨骼肌肉病变）' });
  if (morse.mental === 15) items.push({ cat: '照护', text: '认知障碍者需加强看护，避免独处行走，夜间安排陪护' });
  if (hendrich.benzo === 1) items.push({ cat: '用药', text: '请医生审查苯二氮卓类药物，评估减量或替代方案' });
  if (hendrich.antidepressant === 1) items.push({ cat: '用药', text: '请医生审查抗抑郁药物的跌倒风险，评估是否需要调整' });
  if (hendrich.orthostatic === 2) items.push({ cat: '用药', text: '监测体位性血压，起床时先坐 1 分钟再站起，避免突然站立' });
  if (hendrich.urinary === 1) items.push({ cat: '照护', text: '睡前减少饮水，床边放置便器，夜间起身有人陪同' });
  if (hendrich.confusion === 4) items.push({ cat: '照护', text: '意识混乱者需专人看护，床栏抬高，移除周围危险物品' });
  if (bergScore > 0 && bergScore <= 40) items.push({ cat: '康复', text: '静态平衡训练：双脚前后站立、单脚站立，每次 30 秒 × 5 组' });
  if (tugNum > 12) items.push({ cat: '康复', text: '功能性移动训练：坐-站转换、方向变换行走，每日练习' });
  if (tugNum > 20) items.push({ cat: '康复', text: '转诊康复科进行系统性步态与平衡训练' });
  if (tinettiScore > 0 && tinettiScore <= 23) items.push({ cat: '康复', text: '步态训练：增大步幅、抬高脚步、改善躯干稳定性' });

  if (envCheck) {
    if (envCheck.toiletRail === false) items.push({ cat: '环境', text: '卫生间安装 L 型扶手与防滑垫' });
    if (envCheck.nightLight === false) items.push({ cat: '环境', text: '卧室床头安装伸手可及的夜灯' });
    if (envCheck.floorSafe === false) items.push({ cat: '环境', text: '清理通道杂物，固定地毯边缘，保持地面干燥' });
    if (envCheck.shoes === false) items.push({ cat: '鞋履', text: '更换合脚、防滑、有后跟支撑的鞋' });
  } else {
    items.push({ cat: '环境', text: '卫生间安装 L 型扶手与防滑垫' });
    items.push({ cat: '环境', text: '卧室床头安装伸手可及的夜灯' });
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
   通用 UI 组件
   ============================================================ */
const RISK_META = {
  low: { label: '低风险', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  medium: { label: '中风险', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  high: { label: '高风险', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-500' },
};

function RiskBadge({ level, size = 'md' }) {
  const m = RISK_META[level] || RISK_META.low;
  const cls = size === 'lg' ? 'px-5 py-2.5 text-xl rounded-2xl' : 'px-3.5 py-1.5 text-base rounded-full';
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${m.bg} ${m.text} ${cls}`}>
      <span className={`w-3 h-3 rounded-full ${m.dot}`}></span>
      {m.label}
    </span>
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
function OptionGroup({ options, value, onChange }) {
  return (
    <div className="space-y-2.5">
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.label} onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition ${active ? 'border-blue-500 bg-blue-50 text-blue-800 font-bold' : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'
              }`}>
            <div className="flex items-center justify-between">
              <span className="text-base">{opt.label}</span>
              <span className={`text-sm ${active ? 'text-blue-600' : 'text-slate-400'}`}>{opt.value} 分</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
function ScaleBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 transition-all" style={{ width: pct + '%' }}></div>
    </div>
  );
}
function Empty({ icon, title, desc, action }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-6xl mb-4">{icon}</div>
      <div className="text-xl font-bold text-slate-700 mb-2">{title}</div>
      <div className="text-slate-500 mb-6 text-base">{desc}</div>
      {action && <div className="max-w-xs mx-auto"><BigButton onClick={action.onClick}>{action.label}</BigButton></div>}
    </div>
  );
}
function Disclaimer() {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 leading-relaxed">
      <div className="font-semibold mb-1">⚠️ 免责声明</div>
      {DISCLAIMER}
    </div>
  );
}

/* ============================================================
   页面：首页
   ============================================================ */
function HomeScreen({ currentProfile, profiles, go, onSwitch }) {
  const latest = currentProfile?.history?.length ? currentProfile.history[currentProfile.history.length - 1] : null;
  const planItems = currentProfile?.planItems || [];
  const doneCount = planItems.filter(p => p.done).length;

  return (
    <div className="space-y-4 fade-in">
      <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-5 text-white shadow-sm">
        <div className="text-base opacity-90">老年人跌倒风险管理</div>
        <div className="text-2xl font-bold mt-1">
          {currentProfile ? `您好，${currentProfile.name}` : '欢迎使用'}
        </div>
        <div className="text-sm opacity-80 mt-1">
          {currentProfile
            ? `档案号 ${currentProfile.profileNumber} · ${currentProfile.age} 岁 · ${currentProfile.sex === 'male' ? '男' : '女'}`
            : '先建立档案，开始风险评估'}
        </div>
      </div>

      {profiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-slate-800">档案列表</div>
            <div className="text-sm text-slate-500">共 {profiles.length} 人</div>
          </div>
          <div className="space-y-2">
            {profiles.slice(0, 3).map(p => (
              <button key={p.id} onClick={() => onSwitch(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition ${p.id === currentProfile?.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  }`}>
                <div className="font-semibold text-slate-800 text-sm">{p.name} <span className="text-xs text-slate-400 font-normal">· {p.profileNumber}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">{p.age} 岁 · {p.sex === 'male' ? '男' : '女'}</div>
              </button>
            ))}
            {profiles.length > 3 && (
              <div className="text-center text-sm text-slate-400 pt-1">还有 {profiles.length - 3} 个档案…</div>
            )}
          </div>
          <div className="mt-3">
            <BigButton variant="ghost" onClick={() => go('history')}>查看全部档案</BigButton>
          </div>
        </Card>
      )}

      {!currentProfile && (
        <Card>
          <div className="text-slate-600 mb-3 text-base">首次使用请先建立档案</div>
          <BigButton onClick={() => go('newProfile')}>建立档案</BigButton>
        </Card>
      )}

      {currentProfile && !currentProfile.screening && (
        <Card>
          <div className="text-slate-600 mb-3 text-base">{currentProfile.name} 的档案已建立，开始初次筛查</div>
          <BigButton onClick={() => go('screening')}>开始初筛</BigButton>
        </Card>
      )}

      {currentProfile && currentProfile.screening && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="text-slate-500 text-base">当前风险等级</div>
            {currentProfile.riskLevel ? <RiskBadge level={currentProfile.riskLevel} /> : <RiskBadge level="low" />}
          </div>
          <div className="text-slate-700 text-base">
            {currentProfile.screening.result === 'low'
              ? '初筛为低风险，注意每年复筛并保持运动'
              : currentProfile.assessment
                ? '已完成全面评估，查看个体化计划'
                : '初筛提示存在风险，建议尽快完成全面评估'}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BigButton variant="ghost" onClick={() => go(currentProfile.screening.result === 'low' ? 'lowBranch' : (currentProfile.assessment ? 'result' : 'assessment'))}>
              {currentProfile.screening.result === 'low' ? '查看建议' : (currentProfile.assessment ? '查看结果' : '去评估')}
            </BigButton>
            <BigButton onClick={() => go('plan')}>我的计划</BigButton>
          </div>
        </Card>
      )}

      {planItems.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-slate-700">计划完成情况</div>
            <div className="text-base text-slate-500">{doneCount} / {planItems.length}</div>
          </div>
          <ScaleBar value={doneCount} max={planItems.length} />
        </Card>
      )}

      {latest && (
        <Card>
          <div className="text-base text-slate-500 mb-2">最近一次评估</div>
          <div className="flex items-center justify-between">
            <div className="text-slate-700 text-base">{latest.date}</div>
            <RiskBadge level={latest.riskLevel} />
          </div>
        </Card>
      )}

      <Disclaimer />
    </div>
  );
}

/* ============================================================
   页面：新建档案
   ============================================================ */
function NewProfileScreen({ existingCount, onSave, onCancel }) {
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
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-slate-500 text-3xl leading-none px-2">‹</button>
        <div className="text-xl font-bold text-slate-800">建立档案</div>
      </div>
      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-800">
          本次将自动生成档案编号：<span className="font-bold">{generateProfileNumber(existingCount)}</span>
        </div>
      </Card>
      <Card>
        <label className="block text-base font-bold text-slate-700 mb-2">姓名</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名"
          className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-lg" />
      </Card>
      <Card>
        <label className="block text-base font-bold text-slate-700 mb-2">年龄</label>
        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="请输入年龄"
          className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-lg" />
      </Card>
      <Card>
        <div className="text-base font-bold text-slate-700 mb-3">性别</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setSex('male')} className={`h-14 rounded-xl border-2 font-bold text-lg ${sex === 'male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>男</button>
          <button onClick={() => setSex('female')} className={`h-14 rounded-xl border-2 font-bold text-lg ${sex === 'female' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>女</button>
        </div>
        <div className="text-sm text-slate-500 mt-2">研究显示男性是跌倒的独立危险因素</div>
      </Card>
      <Card>
        <div className="text-base font-bold text-slate-700 mb-3">是否有慢性病？</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasChronic(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasChronic === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>是</button>
          <button onClick={() => setHasChronic(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasChronic === false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>否</button>
        </div>
      </Card>
      <Card>
        <div className="text-base font-bold text-slate-700 mb-3">过去是否有跌倒史？</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasFallHistory(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasFallHistory === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>是</button>
          <button onClick={() => setHasFallHistory(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${hasFallHistory === false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>否</button>
        </div>
      </Card>
      {ageNum > 0 && (
        <div className={`rounded-xl p-4 text-base ${eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {eligible ? '✓ 符合本工具适用范围（≥65 岁，或 ≥60 岁且有慢性病/跌倒史）' : '⚠ 暂不符合纳入条件：需 ≥65 岁，或 ≥60 岁且有慢性病或跌倒史'}
        </div>
      )}
      <BigButton disabled={!canSubmit} onClick={() => onSave({ name: name.trim(), age: ageNum, sex, hasChronic, hasFallHistory })}>
        保存并开始初筛
      </BigButton>
    </div>
  );
}

/* ============================================================
   阶段一：初筛
   ============================================================ */
function ScreeningScreen({ profile, onDone, onCancel }) {
  const [q1, setQ1] = useState(null);
  const [q2, setQ2] = useState(null);
  const [q3, setQ3] = useState(null);
  const [factors, setFactors] = useState([]);

  const toggleFactor = f => setFactors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const allAnswered = q1 !== null && q2 !== null && q3 !== null;

  const handleSubmit = () => {
    const anyYes = q1 === true || q2 === true || q3 === true;
    const result = (anyYes || factors.length > 0) ? 'full' : 'low';
    onDone({ q1, q2, q3, factors, result, date: todayStr() });
  };

  const Question = ({ index, text, value, setValue }) => (
    <Card>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-base font-bold flex items-center justify-center flex-shrink-0">{index}</div>
        <div className="text-slate-800 font-bold text-base pt-1">{text}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setValue(true)} className={`h-14 rounded-xl border-2 font-bold text-lg ${value === true ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}>是</button>
        <button onClick={() => setValue(false)} className={`h-14 rounded-xl border-2 font-bold text-lg ${value === false ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>否</button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-slate-500 text-3xl leading-none px-2">‹</button>
        <div className="text-xl font-bold text-slate-800">阶段一 · 跌倒风险初筛</div>
      </div>
      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-800">当前评估对象：<span className="font-bold">{profile?.name}（{profile?.profileNumber}）</span></div>
      </Card>
      <div className="text-base text-slate-600">以下 3 个问题帮助快速判断是否需要进一步评估</div>
      <Question index="1" text="过去 1 年内是否跌倒过？" value={q1} setValue={setQ1} />
      <Question index="2" text="站立或行走时是否感觉不稳？" value={q2} setValue={setQ2} />
      <Question index="3" text="是否担心跌倒？" value={q3} setValue={setQ3} />
      <Card>
        <div className="text-slate-800 font-bold text-base mb-1">是否存在以下高危因素？</div>
        <div className="text-sm text-slate-500 mb-3">可多选，无则不选</div>
        <div className="flex flex-wrap gap-2">
          {HIGH_RISK_FACTORS.map(f => {
            const active = factors.includes(f);
            return (
              <button key={f} onClick={() => toggleFactor(f)}
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

/* ============================================================
   页面：低危分支
   ============================================================ */
function LowRiskScreen({ screening, onBack, onGoPlan }) {
  const nextDate = screening ? addMonths(screening.date, 12) : '';
  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-slate-500 text-3xl leading-none px-2">‹</button>
        <div className="text-xl font-bold text-slate-800">低风险管理</div>
      </div>
      <Card className="bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🌿</div>
          <div>
            <div className="font-bold text-emerald-800 text-lg">初筛结果为低风险</div>
            <div className="text-emerald-700 text-base mt-1">保持健康习惯，每年复筛即可</div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-2"><span className="text-2xl">📅</span><div className="font-bold text-slate-800 text-base">每年复筛</div></div>
        <div className="text-slate-600 text-base">下次建议复筛日期：<span className="font-bold text-slate-800">{nextDate}</span></div>
        <div className="text-slate-500 text-sm mt-2">低风险老年人未来一年仍有约 30% 概率发生跌倒，复筛不可省略</div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">📖</span><div className="font-bold text-slate-800 text-base">健康教育</div></div>
        <ul className="space-y-2 text-slate-600 text-base">
          <li className="flex gap-2"><span className="text-blue-500">•</span>正确认识衰老与跌倒风险的关系，不要因「怕摔」而减少活动</li>
          <li className="flex gap-2"><span className="text-blue-500">•</span>合理使用手杖等辅助器具，选择合脚防滑的鞋</li>
          <li className="flex gap-2"><span className="text-blue-500">•</span>养成外出时的安全行为习惯，注意台阶和湿滑地面</li>
          <li className="flex gap-2"><span className="text-blue-500">•</span>居家适老化：卫生间扶手、防滑垫、夜灯、保持通道畅通</li>
        </ul>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🏃</span><div className="font-bold text-slate-800 text-base">运动建议</div></div>
        <ul className="space-y-2 text-slate-600 text-base">
          <li className="flex gap-2"><span className="text-emerald-500">•</span>每周 ≥150 分钟中等强度有氧运动（快走、太极拳、八段锦）</li>
          <li className="flex gap-2"><span className="text-emerald-500">•</span>每周 ≥3 天平衡训练（单脚站立、直线行走）</li>
          <li className="flex gap-2"><span className="text-emerald-500">•</span>每周 ≥2 天力量训练（坐位伸膝、靠墙静蹲、提踵）</li>
        </ul>
      </Card>
      <BigButton onClick={onGoPlan}>生成我的运动计划</BigButton>
    </div>
  );
}

/* ============================================================
   阶段二：全面评估
   ============================================================ */
const ASSESS_STEPS = ['morse', 'hendrich', 'berg', 'tug', 'tinetti', 'env'];
const STEP_TITLES = {
  morse: 'Morse 跌倒评估量表', hendrich: 'Hendrich II 跌倒风险模型',
  berg: 'Berg 平衡量表', tug: 'TUG 计时起立行走测试',
  tinetti: 'Tinetti 平衡与步态评估', env: '认知情绪与环境',
};

function AssessmentScreen({ state, setState, profile, onComplete, onCancel }) {
  const step = state.assessStep || 0;
  const stepKey = ASSESS_STEPS[step];

  const [morse, setMorse] = useState({});
  const [hendrich, setHendrich] = useState({});
  const [berg, setBerg] = useState({});
  const [tug, setTug] = useState('');
  const [tinetti, setTinetti] = useState({ balance: {}, gait: {} });
  const [envCheck, setEnvCheck] = useState({ mood: null, interest: null, toiletRail: null, nightLight: null, floorSafe: null, shoes: null });

  const morseScore = sumValues(morse);
  const hendrichScore = sumValues(hendrich);
  const bergScore = sumValues(berg);
  const tinettiBalanceScore = sumValues(tinetti.balance);
  const tinettiGaitScore = sumValues(tinetti.gait);
  const tinettiScore = tinettiBalanceScore + tinettiGaitScore;

  const canNext = () => {
    if (stepKey === 'morse') return MORSE_ITEMS.every(it => morse[it.id] !== undefined);
    if (stepKey === 'berg') return BERG_ITEMS.every((_, i) => berg['b' + i] !== undefined);
    if (stepKey === 'tug') return tug !== '' && Number(tug) >= 0;
    if (stepKey === 'tinetti') {
      return TINETTI_BALANCE.every(it => tinetti.balance[it.id] !== undefined)
        && TINETTI_GAIT.every(it => tinetti.gait[it.id] !== undefined);
    }
    return true;
  };

  const goNext = () => {
    if (step < ASSESS_STEPS.length - 1) {
      setState(s => ({ ...s, assessStep: step + 1 }));
    } else {
      const assessment = { morse, hendrich, berg, tug: Number(tug), tinetti };
      const riskLevel = aggregateRisk({
        morse: morseScore, hendrich: hendrichScore, berg: bergScore,
        tug: Number(tug), tinetti: tinettiScore,
      });
      onComplete({ assessment, envCheck, riskLevel });
    }
  };

  const goPrev = () => { if (step > 0) setState(s => ({ ...s, assessStep: step - 1 })); else onCancel(); };

  const renderStepContent = () => {
    if (stepKey === 'morse') {
      return (
        <div className="space-y-4">
          <div className="text-base text-slate-500">共 6 个条目，总分 125 分。0-24 零风险，25-44 低度风险，≥45 高度风险</div>
          {MORSE_ITEMS.map(item => (
            <Card key={item.id}>
              <div className="font-bold text-slate-800 text-base">{item.label}</div>
              <div className="text-sm text-slate-500 mb-1">{item.help}</div>
              <div className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-3 leading-relaxed">📋 评分依据：{item.reason}</div>
              <OptionGroup options={item.options} value={morse[item.id]} onChange={v => setMorse(prev => ({ ...prev, [item.id]: v }))} />
            </Card>
          ))}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-blue-800 font-bold text-base">当前得分</div>
              <div className="text-3xl font-bold text-blue-700">{morseScore} <span className="text-base font-normal">/ 125</span></div>
            </div>
          </Card>
        </div>
      );
    }
    if (stepKey === 'hendrich') {
      return (
        <div className="space-y-4">
          <div className="text-base text-slate-500">勾选符合的项目，系统自动累加权重分。≥5 分为高风险</div>
          <Card>
            <div className="space-y-4">
              {HENDRICH_ITEMS.map(item => {
                const active = hendrich[item.id] === item.value;
                return (
                  <div key={item.id}>
                    <button onClick={() => setHendrich(prev => {
                      const next = { ...prev };
                      if (active) delete next[item.id]; else next[item.id] = item.value;
                      return next;
                    })} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition ${active ? 'border-blue-500 bg-blue-50 text-blue-800 font-bold' : 'border-slate-200 bg-white text-slate-700'}`}>
                      <span className="text-left text-base">{item.label}</span>
                      <span className={`text-base ${active ? 'text-blue-600' : 'text-slate-400'}`}>+{item.value}</span>
                    </button>
                    <div className="text-sm text-slate-500 mt-1.5 px-1 leading-relaxed">依据：{item.reason}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-blue-800 font-bold text-base">当前得分</div>
              <div className="text-3xl font-bold text-blue-700">{hendrichScore}</div>
            </div>
          </Card>
        </div>
      );
    }
    if (stepKey === 'berg') {
      return (
        <div className="space-y-4">
          <div className="text-base text-slate-500">14 个项目，每项 0-4 分，总分 56 分。0-20 高风险，21-40 中风险，41-56 低风险</div>
          {BERG_ITEMS.map((item, i) => {
            const id = 'b' + i;
            return (
              <Card key={id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-slate-800 text-base">{i + 1}. {item.label}</div>
                  <div className="text-sm text-slate-400">{berg[id] !== undefined ? `${berg[id]} 分` : '未评'}</div>
                </div>
                <div className="text-sm text-slate-500 mb-3 leading-relaxed">{item.desc}</div>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map(v => {
                    const active = berg[id] === v;
                    return (
                      <button key={v} onClick={() => setBerg(prev => ({ ...prev, [id]: v }))}
                        className={`h-12 rounded-xl border-2 font-bold text-base ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-blue-800 font-bold text-base">总分</div>
              <div className="text-3xl font-bold text-blue-700">{bergScore} <span className="text-base font-normal">/ 56</span></div>
            </div>
          </Card>
        </div>
      );
    }
    if (stepKey === 'tug') {
      return (
        <div className="space-y-4">
          <Card>
            <div className="text-slate-700 mb-3 text-base leading-relaxed">
              <div className="font-bold mb-1">操作流程</div>
              从标准椅子上站起 → 行走 3 米 → 转身返回 → 坐下，全程计时
            </div>
            <label className="block text-base font-bold text-slate-700 mb-2">用时（秒）</label>
            <input type="number" inputMode="decimal" value={tug} onChange={e => setTug(e.target.value)} placeholder="例如 12.5"
              className="w-full h-16 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none text-3xl font-bold text-center" />
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <div className="text-sm text-slate-600 space-y-1.5 leading-relaxed">
              <div className="font-bold text-slate-700">📋 评分依据：</div>
              <div>• &lt;10 秒：正常，可独立外出</div>
              <div>• 10-20 秒：步态良好，可独立外出（≥12秒提示跌倒风险增加）</div>
              <div>• 20-30 秒：移动能力受损，外出需协助</div>
              <div>• &gt;30 秒：严重移动障碍，不能独立外出</div>
            </div>
          </Card>
          {tug !== '' && (
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="text-blue-800 font-bold text-base">分级</div>
                <RiskBadge level={tugLevel(Number(tug))} />
              </div>
            </Card>
          )}
        </div>
      );
    }
    if (stepKey === 'tinetti') {
      const Section = ({ title, items, dataKey, max }) => (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-slate-800 text-base">{title}</div>
            <div className="text-base text-slate-500">{sumValues(tinetti[dataKey])} / {max}</div>
          </div>
          <div className="space-y-3">
            {items.map(item => (
              <Card key={item.id}>
                <div className="flex items-start justify-between mb-2">
                  <div className="font-bold text-slate-800 text-base">{item.label}</div>
                  <div className="text-sm text-slate-400 ml-2 flex-shrink-0">{tinetti[dataKey][item.id] !== undefined ? `${tinetti[dataKey][item.id]} 分` : '未评'}</div>
                </div>
                <div className="text-sm text-slate-500 mb-3 leading-relaxed">{item.desc}</div>
                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${item.max + 1}, minmax(0, 1fr))` }}>
                  {Array.from({ length: item.max + 1 }, (_, v) => v).map(v => {
                    const active = tinetti[dataKey][item.id] === v;
                    return (
                      <button key={v} onClick={() => setTinetti(prev => ({ ...prev, [dataKey]: { ...prev[dataKey], [item.id]: v } }))}
                        className={`h-12 rounded-xl border-2 font-bold text-base ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
      return (
        <div className="space-y-5">
          <div className="text-base text-slate-500">平衡 16 分 + 步态 12 分，总分 28 分。≤18 高风险，19-23 中风险，≥24 低风险</div>
          <Section title="平衡评估" items={TINETTI_BALANCE} dataKey="balance" max={16} />
          <Section title="步态评估" items={TINETTI_GAIT} dataKey="gait" max={12} />
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-blue-800 font-bold text-base">总分</div>
              <div className="text-3xl font-bold text-blue-700">{tinettiScore} <span className="text-base font-normal">/ 28</span></div>
            </div>
          </Card>
        </div>
      );
    }
    if (stepKey === 'env') {
      const YesNo = ({ label, value, onChange, reason }) => (
        <div className="py-3.5 border-b border-slate-100 last:border-0">
          <div className="flex items-center justify-between">
            <div className="text-slate-700 text-base pr-3">{label}</div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => onChange(true)} className={`px-4 h-11 rounded-lg border-2 text-base font-bold ${value === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>是</button>
              <button onClick={() => onChange(false)} className={`px-4 h-11 rounded-lg border-2 text-base font-bold ${value === false ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}>否</button>
            </div>
          </div>
          {reason && <div className="text-sm text-slate-500 mt-2 leading-relaxed">{reason}</div>}
        </div>
      );
      return (
        <div className="space-y-4">
          <div className="text-base text-slate-500">情绪筛查参考 PHQ-2，环境与鞋履为居家安全检查</div>
          <Card>
            <div className="font-bold text-slate-800 text-base mb-2">情绪筛查</div>
            <YesNo label="过去两周，是否经常感到情绪低落、沮丧或无望？" value={envCheck.mood} onChange={v => setEnvCheck(p => ({ ...p, mood: v }))} reason="抑郁导致活动减少、注意力下降，间接增加跌倒风险" />
            <YesNo label="过去两周，是否对事物失去兴趣或乐趣？" value={envCheck.interest} onChange={v => setEnvCheck(p => ({ ...p, interest: v }))} reason="对事物失去兴趣可能导致活动量下降，功能衰退" />
          </Card>
          <Card>
            <div className="font-bold text-slate-800 text-base mb-2">居家环境与鞋履</div>
            <YesNo label="卫生间是否安装有扶手？" value={envCheck.toiletRail} onChange={v => setEnvCheck(p => ({ ...p, toiletRail: v }))} reason="卫生间是跌倒高发区域，扶手可显著降低风险" />
            <YesNo label="夜间起床是否有足够照明？" value={envCheck.nightLight} onChange={v => setEnvCheck(p => ({ ...p, nightLight: v }))} reason="夜间视力下降，照明不足直接增加跌倒风险" />
            <YesNo label="地面是否防滑、无杂物、通道畅通？" value={envCheck.floorSafe} onChange={v => setEnvCheck(p => ({ ...p, floorSafe: v }))} reason="湿滑地面和障碍物是跌倒的常见环境因素" />
            <YesNo label="日常穿的鞋是否合脚、防滑、有后跟支撑？" value={envCheck.shoes} onChange={v => setEnvCheck(p => ({ ...p, shoes: v }))} reason="不合适的鞋履影响步态稳定性，增加跌倒风险" />
          </Card>
        </div>
      );
    }
    return null;
  };

  const progress = Math.round(((step + 1) / ASSESS_STEPS.length) * 100);
  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-2">
        <button onClick={goPrev} className="text-slate-500 text-3xl leading-none px-2">‹</button>
        <div className="text-lg font-bold text-slate-800 flex-1 truncate">阶段二 · {STEP_TITLES[stepKey]}</div>
        <div className="text-base text-slate-400">{step + 1}/{ASSESS_STEPS.length}</div>
      </div>
      {profile && (
        <div className="text-sm text-slate-500 px-1">评估对象：{profile.name}（{profile.profileNumber}）</div>
      )}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: progress + '%' }}></div>
      </div>
      {renderStepContent()}
      <BigButton disabled={!canNext()} onClick={goNext}>
        {step === ASSESS_STEPS.length - 1 ? '完成评估' : '下一步'}
      </BigButton>
    </div>
  );
}

/* ============================================================
   页面：结果
   ============================================================ */
function ResultScreen({ currentProfile, go, onReassess }) {
  const riskLevel = currentProfile?.riskLevel || 'low';
  const assessment = currentProfile?.assessment;
  const meta = RISK_META[riskLevel];
  const a = assessment || {};
  const morseScore = sumValues(a.morse);
  const hendrichScore = sumValues(a.hendrich);
  const bergScore = sumValues(a.berg);
  const tinettiScore = sumValues(a.tinetti && a.tinetti.balance) + sumValues(a.tinetti && a.tinetti.gait);
  const tugNum = Number(a.tug) || 0;

  const intervals = { low: 12, medium: 6, high: 1 };
  const nextDate = addMonths(todayStr(), intervals[riskLevel]);

  const advice = {
    low: [
      '每年复筛一次跌倒风险',
      '每周 ≥150 分钟中等强度运动（快走、太极拳、八段锦）',
      '每周 ≥3 天平衡训练 + ≥2 天力量训练',
      '注意居家适老化：卫生间扶手、防滑垫、夜灯',
      '选择合脚防滑的鞋，外出注意台阶和湿滑地面',
      '学习跌倒风险相关知识，了解自身平衡能力变化',
    ],
    medium: [
      '每 6 个月复评一次风险等级',
      '由康复治疗师制定个体化平衡与力量训练方案',
      '每周 ≥3 次平衡训练，每次 ≥30 分钟，坚持 ≥12 周',
      '功能性移动训练：坐-站转换、方向变换行走、跨越障碍',
      '学习跌倒后自我保护动作，与家属共同学习防跌倒知识',
      '关注用药调整与环境风险变化，及时报告新发不稳',
      '居家安全评估与改造（扶手、防滑垫、夜灯、通道畅通）',
    ],
    high: [
      '每月评估一次，30-90 天内密切随访',
      '多因素干预：运动 + 用药审查 + 环境改造 + 辅具适配',
      '由物理治疗师制定个体化方案，每周 ≥3 次平衡功能锻炼，持续 ≥12 周',
      '渐进性抗阻训练 + 太极拳训练（可降低跌倒风险 40%）',
      '药物审查：评估苯二氮卓类、抗抑郁药、降压药等',
      '居家环境改造：卫生间 L 型扶手、防滑垫、夜灯、移除障碍物',
      '辅具适配：拐杖/助行器评估与使用培训',
      '发生跌倒后立即重新评估，与家属签署知情同意',
    ],
  }[riskLevel];

  return (
    <div className="space-y-4 fade-in">
      <div className={`rounded-2xl p-5 ${meta.bg} border-2 ${meta.border}`}>
        <div className="text-base text-slate-600 mb-1">综合跌倒风险等级</div>
        <div className={`text-4xl font-bold ${meta.text}`}>{meta.label}</div>
        <div className="text-base text-slate-600 mt-3">下次复评日期：<span className="font-bold">{nextDate}</span></div>
        {currentProfile && (
          <div className="text-sm text-slate-500 mt-2">
            评估对象：{currentProfile.name}（{currentProfile.profileNumber}） · {currentProfile.sex === 'male' ? '男' : '女'}
          </div>
        )}
      </div>
      <Card>
        <div className="font-bold text-slate-800 text-base mb-3">各量表得分</div>
        <div className="space-y-3">
          {[
            { label: 'Morse 跌倒评估', score: morseScore, max: 125, level: morseLevel(morseScore) },
            { label: 'Hendrich II', score: hendrichScore, max: 16, level: hendrichLevel(hendrichScore) },
            { label: 'Berg 平衡量表', score: bergScore, max: 56, level: bergLevel(bergScore) },
            { label: 'TUG 计时', score: tugNum ? tugNum + ' 秒' : '—', max: null, level: tugLevel(tugNum) },
            { label: 'Tinetti 平衡与步态', score: tinettiScore, max: 28, level: tinettiLevel(tinettiScore) },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
              <div className="text-slate-700 text-base">{row.label}</div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold text-base">{row.score}{row.max ? <span className="text-sm text-slate-400 font-normal"> / {row.max}</span> : null}</span>
                <RiskBadge level={row.level} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="font-bold text-slate-800 text-base mb-3">风险建议</div>
        <ul className="space-y-2.5">
          {advice.map((t, i) => (
            <li key={i} className="flex gap-2 text-slate-600 text-base leading-relaxed">
              <span className={`${meta.text} flex-shrink-0 font-bold`}>•</span><span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Disclaimer />
      <div className="grid grid-cols-2 gap-3">
        <BigButton variant="ghost" onClick={onReassess}>重新评估</BigButton>
        <BigButton onClick={() => go('plan')}>查看计划</BigButton>
      </div>
    </div>
  );
}

/* ============================================================
   页面：计划
   ============================================================ */
const CAT_ICONS = {
  '运动': '🏃', '康复': '🦯', '用药': '💊', '环境': '🏠',
  '辅具': '🩼', '鞋履': '👟', '教育': '📖', '随访': '📅', '照护': '🤝',
};

function PlanScreen({ currentProfile, updateCurrentProfile, go }) {
  const planItems = currentProfile?.planItems || [];
  if (!planItems.length) {
    return (
      <Empty icon="📋" title="暂无计划"
        desc={currentProfile?.screening ? '请先完成评估以生成个体化计划' : '请先完成初筛'}
        action={{ label: currentProfile?.screening?.result === 'full' ? '去评估' : '去初筛', onClick: () => go(currentProfile?.screening?.result === 'full' ? 'assessment' : 'screening') }} />
    );
  }
  const toggle = id => {
    updateCurrentProfile(p => ({
      ...p,
      planItems: p.planItems.map(item => item.id === id ? { ...item, done: !item.done } : item),
    }));
  };
  const groups = {};
  planItems.forEach(p => { if (!groups[p.cat]) groups[p.cat] = []; groups[p.cat].push(p); });
  const doneCount = planItems.filter(p => p.done).length;

  return (
    <div className="space-y-4 fade-in">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-slate-800 text-base">计划完成进度</div>
          <div className="text-base text-slate-500">{doneCount} / {planItems.length}</div>
        </div>
        <ScaleBar value={doneCount} max={planItems.length} />
      </Card>
      {Object.entries(groups).map(([cat, items]) => (
        <Card key={cat}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{CAT_ICONS[cat] || '•'}</span>
            <div className="font-bold text-slate-800 text-base">{cat}</div>
          </div>
          <div className="space-y-2">
            {items.map(p => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`w-full flex items-start gap-3 px-3 py-3.5 rounded-xl border-2 text-left transition ${p.done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${p.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                  {p.done && <span className="text-sm">✓</span>}
                </div>
                <div className={`text-base leading-relaxed ${p.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{p.text}</div>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   页面：PDF 报告（打印视图）
   ============================================================ */
function ReportScreen({ currentProfile, onBack }) {
  if (!currentProfile) {
    return <Empty icon="📄" title="暂无报告" desc="请先建立档案并完成评估"
      action={{ label: '返回', onClick: onBack }} />;
  }

  const p = currentProfile;
  const a = p.assessment || {};
  const morseScore = sumValues(a.morse);
  const hendrichScore = sumValues(a.hendrich);
  const bergScore = sumValues(a.berg);
  const tinettiScore = sumValues(a.tinetti && a.tinetti.balance) + sumValues(a.tinetti && a.tinetti.gait);
  const tugNum = Number(a.tug) || 0;
  const riskLevel = p.riskLevel || 'low';
  const meta = RISK_META[riskLevel];
  const intervals = { low: 12, medium: 6, high: 1 };
  const nextDate = p.assessment ? addMonths(todayStr(), intervals[riskLevel]) : '';

  const advice = p.assessment ? {
    low: ['每年复筛一次跌倒风险', '每周 ≥150 分钟中等强度运动（快走、太极拳、八段锦）', '每周 ≥3 天平衡训练 + ≥2 天力量训练', '注意居家适老化：卫生间扶手、防滑垫、夜灯', '选择合脚防滑的鞋，外出注意台阶和湿滑地面'],
    medium: ['每 6 个月复评一次风险等级', '由康复治疗师制定个体化平衡与力量训练方案', '每周 ≥3 次平衡训练，每次 ≥30 分钟，坚持 ≥12 周', '功能性移动训练：坐-站转换、方向变换行走、跨越障碍', '学习跌倒后自我保护动作，与家属共同学习防跌倒知识', '居家安全评估与改造'],
    high: ['每月评估一次，30-90 天内密切随访', '多因素干预：运动 + 用药审查 + 环境改造 + 辅具适配', '每周 ≥3 次平衡功能锻炼，持续 ≥12 周', '渐进性抗阻训练 + 太极拳训练', '药物审查：评估苯二氮卓类、抗抑郁药、降压药等', '居家环境改造：卫生间 L 型扶手、防滑垫、夜灯、移除障碍物', '辅具适配：拐杖/助行器评估与使用培训', '发生跌倒后立即重新评估'],
  }[riskLevel] : [];

  const handlePrint = () => window.print();

  return (
    <div>
      <div className="no-print space-y-3 mb-4">
        <BigButton onClick={handlePrint}>🖨️ 打印 / 保存为 PDF</BigButton>
        <div className="text-sm text-slate-500 text-center leading-relaxed">
          点击上方按钮后，在打印对话框里将「目标打印机」改为<br />
          <span className="font-bold text-slate-700">「另存为 PDF」</span>，即可保存为 PDF 文件
        </div>
        <BigButton variant="ghost" onClick={onBack}>返回</BigButton>
      </div>

      <div id="report-content" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center border-b-2 border-slate-300 pb-4 mb-5">
          <h1 className="text-2xl font-bold text-slate-800">老年人跌倒风险评估报告</h1>
          <div className="text-sm text-slate-500 mt-1">Fall Risk Assessment Report</div>
        </div>

        <div className="avoid-break mb-5">
          <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">一、基本信息</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1.5 text-slate-500 w-32">档案编号</td><td className="py-1.5 text-slate-800 font-semibold">{p.profileNumber}</td></tr>
              <tr><td className="py-1.5 text-slate-500">姓名</td><td className="py-1.5 text-slate-800 font-semibold">{p.name}</td></tr>
              <tr><td className="py-1.5 text-slate-500">年龄</td><td className="py-1.5 text-slate-800">{p.age} 岁</td></tr>
              <tr><td className="py-1.5 text-slate-500">性别</td><td className="py-1.5 text-slate-800">{p.sex === 'male' ? '男' : '女'}</td></tr>
              <tr><td className="py-1.5 text-slate-500">慢性病</td><td className="py-1.5 text-slate-800">{p.hasChronic ? '有' : '无'}</td></tr>
              <tr><td className="py-1.5 text-slate-500">跌倒史</td><td className="py-1.5 text-slate-800">{p.hasFallHistory ? '有' : '无'}</td></tr>
              <tr><td className="py-1.5 text-slate-500">建档日期</td><td className="py-1.5 text-slate-800">{p.createdAt}</td></tr>
              <tr><td className="py-1.5 text-slate-500">报告生成日期</td><td className="py-1.5 text-slate-800">{todayStr()}</td></tr>
            </tbody>
          </table>
        </div>

        {p.screening && (
          <div className="avoid-break mb-5">
            <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">二、阶段一：初筛结果</div>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="py-1.5 text-slate-500 w-48">过去 1 年内是否跌倒过</td><td className="py-1.5 text-slate-800">{p.screening.q1 ? '是' : '否'}</td></tr>
                <tr><td className="py-1.5 text-slate-500">站立/行走是否感觉不稳</td><td className="py-1.5 text-slate-800">{p.screening.q2 ? '是' : '否'}</td></tr>
                <tr><td className="py-1.5 text-slate-500">是否担心跌倒</td><td className="py-1.5 text-slate-800">{p.screening.q3 ? '是' : '否'}</td></tr>
                <tr><td className="py-1.5 text-slate-500 align-top">高危因素</td><td className="py-1.5 text-slate-800">{p.screening.factors && p.screening.factors.length > 0 ? p.screening.factors.join('、') : '无'}</td></tr>
                <tr><td className="py-1.5 text-slate-500">初筛结论</td><td className="py-1.5 text-slate-800 font-semibold">{p.screening.result === 'low' ? '低风险（每年复筛）' : '需进入阶段二全面评估'}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {p.assessment && (
          <div className="mb-5">
            <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">三、阶段二：全面评估结果</div>
            <table className="w-full text-sm border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-2 px-3 text-left text-slate-700 font-semibold border-b border-slate-200">量表名称</th>
                  <th className="py-2 px-3 text-left text-slate-700 font-semibold border-b border-slate-200">得分</th>
                  <th className="py-2 px-3 text-left text-slate-700 font-semibold border-b border-slate-200">分级</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-2 px-3 border-b border-slate-100">Morse 跌倒评估</td><td className="py-2 px-3 border-b border-slate-100">{morseScore} / 125</td><td className="py-2 px-3 border-b border-slate-100">{morseLevel(morseScore) === 'high' ? '高度风险' : morseLevel(morseScore) === 'medium' ? '低度风险' : '零风险'}</td></tr>
                <tr><td className="py-2 px-3 border-b border-slate-100">Hendrich II 模型</td><td className="py-2 px-3 border-b border-slate-100">{hendrichScore}</td><td className="py-2 px-3 border-b border-slate-100">{hendrichLevel(hendrichScore) === 'high' ? '高风险' : hendrichLevel(hendrichScore) === 'medium' ? '中风险' : '低风险'}</td></tr>
                <tr><td className="py-2 px-3 border-b border-slate-100">Berg 平衡量表</td><td className="py-2 px-3 border-b border-slate-100">{bergScore} / 56</td><td className="py-2 px-3 border-b border-slate-100">{bergLevel(bergScore) === 'high' ? '高风险' : bergLevel(bergScore) === 'medium' ? '中风险' : '低风险'}</td></tr>
                <tr><td className="py-2 px-3 border-b border-slate-100">TUG 计时起立行走</td><td className="py-2 px-3 border-b border-slate-100">{tugNum ? tugNum + ' 秒' : '—'}</td><td className="py-2 px-3 border-b border-slate-100">{tugLevel(tugNum) === 'high' ? '高风险' : tugLevel(tugNum) === 'medium' ? '中风险' : '低风险'}</td></tr>
                <tr><td className="py-2 px-3">Tinetti 平衡与步态</td><td className="py-2 px-3">{tinettiScore} / 28</td><td className="py-2 px-3">{tinettiLevel(tinettiScore) === 'high' ? '高风险' : tinettiLevel(tinettiScore) === 'medium' ? '中风险' : '低风险'}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {p.assessment && (
          <div className="avoid-break mb-5">
            <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">四、综合风险等级</div>
            <div className={`p-4 rounded-lg border-2 ${meta.bg} ${meta.border}`}>
              <div className="text-sm text-slate-600">综合评定结果</div>
              <div className={`text-3xl font-bold mt-1 ${meta.text}`}>{meta.label}</div>
              <div className="text-sm text-slate-600 mt-2">建议复评日期：<span className="font-bold">{nextDate}</span></div>
            </div>
          </div>
        )}

        {advice.length > 0 && (
          <div className="avoid-break mb-5">
            <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">五、个体化干预建议</div>
            <ol className="space-y-1.5 text-sm text-slate-700">
              {advice.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-slate-500 flex-shrink-0">{i + 1}.</span>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {p.history.length > 0 && (
          <div className="avoid-break mb-5">
            <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">六、历史评估记录</div>
            <table className="w-full text-sm border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-2 px-3 text-left text-slate-700 font-semibold border-b border-slate-200">评估日期</th>
                  <th className="py-2 px-3 text-left text-slate-700 font-semibold border-b border-slate-200">评估类型</th>
                  <th className="py-2 px-3 text-left text-slate-700 font-semibold border-b border-slate-200">风险等级</th>
                </tr>
              </thead>
              <tbody>
                {[...p.history].reverse().map((h, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 border-b border-slate-100">{h.date}</td>
                    <td className="py-2 px-3 border-b border-slate-100">{h.type === 'full' ? '全面评估' : '初筛'}</td>
                    <td className="py-2 px-3 border-b border-slate-100">{RISK_META[h.riskLevel]?.label || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="avoid-break mt-6 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 leading-relaxed">
            <div className="font-bold mb-1">免责声明：</div>
            {DISCLAIMER}
          </div>
        </div>

        <div className="avoid-break mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="text-slate-500 mb-8">评估人签名：</div>
            <div className="border-b border-slate-400"></div>
          </div>
          <div>
            <div className="text-slate-500 mb-8">日期：</div>
            <div className="border-b border-slate-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   页面：我的
   ============================================================ */
function HistoryScreen({ state, go, currentProfile, switchProfile, deleteProfile, exportData, importData, resetAll }) {
  const { profiles } = state;
  const handleReset = () => { if (window.confirm('确定要清除全部数据吗？此操作不可恢复。')) resetAll(); };

  return (
    <div className="space-y-4 fade-in">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-slate-800 text-base">档案列表</div>
          <div className="text-sm text-slate-500">共 {profiles.length} 人</div>
        </div>
        {profiles.length === 0 ? (
          <div className="text-slate-400 text-base py-4 text-center">暂无档案</div>
        ) : (
          <div className="space-y-2">
            {profiles.map(p => (
              <div key={p.id} className={`rounded-xl border-2 transition ${p.id === currentProfile?.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <button onClick={() => switchProfile(p.id)} className="w-full text-left px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 text-base">{p.name}</div>
                    <div className="text-sm text-slate-500">{p.profileNumber}</div>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {p.age} 岁 · {p.sex === 'male' ? '男' : '女'} · {p.hasChronic ? '有慢性病' : '无慢性病'}
                    {p.riskLevel && <span className="ml-2">· 当前：{RISK_META[p.riskLevel].label}</span>}
                  </div>
                </button>
                <div className="flex justify-end px-2 pb-2">
                  <button onClick={() => deleteProfile(p.id)}
                    className="text-sm text-rose-500 px-3 py-1.5 rounded-lg active:bg-rose-50">
                    删除档案
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <BigButton onClick={() => go('newProfile')}>+ 新建档案</BigButton>
        </div>
      </Card>

      {currentProfile && (
        <>
          <Card>
            <div className="font-bold text-slate-800 text-base mb-3">当前档案详情</div>
            <div className="space-y-2 text-base text-slate-600">
              <div>姓名：<span className="font-bold text-slate-800">{currentProfile.name}</span></div>
              <div>档案号：<span className="font-bold text-slate-800">{currentProfile.profileNumber}</span></div>
              <div>年龄：{currentProfile.age} 岁 · 性别：{currentProfile.sex === 'male' ? '男' : '女'}</div>
              <div>建档日期：{currentProfile.createdAt}</div>
            </div>
          </Card>

          <Card>
            <div className="font-bold text-slate-800 text-base mb-3">评估记录</div>
            {currentProfile.history.length === 0 ? (
              <div className="text-slate-400 text-base py-4 text-center">暂无记录</div>
            ) : (
              <div className="space-y-3">
                {[...currentProfile.history].reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="text-slate-700 text-base font-bold">{h.date}</div>
                      <div className="text-sm text-slate-400 mt-0.5">{h.type === 'full' ? '全面评估' : '初筛'}</div>
                    </div>
                    <RiskBadge level={h.riskLevel} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Card>
        <div className="font-bold text-slate-800 text-base mb-3">数据管理</div>
        <div className="text-sm text-slate-500 mb-3 leading-relaxed">
          数据保存在本机浏览器中，建议定期导出备份。更换设备或清理浏览器缓存前请先导出。
        </div>
        <div className="space-y-3">
          {currentProfile && currentProfile.assessment && (
            <BigButton onClick={() => go('report')}>📄 导出 PDF 报告</BigButton>
          )}
          <BigButton onClick={exportData}>导出全部数据（JSON）</BigButton>
          <label className="block">
            <input type="file" accept=".json,application/json" onChange={importData} className="hidden" />
            <span className="block w-full h-14 leading-[3.5rem] text-center rounded-xl font-bold text-lg bg-white text-slate-700 border-2 border-slate-200 active:bg-slate-50 cursor-pointer">
              导入数据
            </span>
          </label>
        </div>
      </Card>

      <BigButton variant="danger" onClick={handleReset}>清除全部数据</BigButton>

      <Disclaimer />
    </div>
  );
}

/* ============================================================
   底部导航
   ============================================================ */
function TabBar({ tab, onTab }) {
  const tabs = [
    { id: 'home', label: '首页', icon: '🏠' },
    { id: 'assess', label: '评估', icon: '📊' },
    { id: 'plan', label: '计划', icon: '📋' },
    { id: 'history', label: '我的', icon: '👤' },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-20 no-print">
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)}
            className={`py-3 flex flex-col items-center gap-1 transition ${tab === t.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className="text-2xl leading-none">{t.icon}</span>
            <span className={`text-sm ${tab === t.id ? 'font-bold' : ''}`}>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ============================================================
   评估入口页
   ============================================================ */
function AssessEntry({ currentProfile, go }) {
  if (!currentProfile) {
    return <Empty icon="📊" title="尚未建立档案" desc="请先在首页或「我的」页建立老年人档案" action={{ label: '去建立档案', onClick: () => go('newProfile') }} />;
  }
  if (!currentProfile.screening) {
    return (
      <div className="space-y-4 fade-in">
        <Card>
          <div className="font-bold text-slate-800 text-base mb-1">{currentProfile.name}</div>
          <div className="text-slate-500 text-base">{currentProfile.age} 岁 · {currentProfile.sex === 'male' ? '男' : '女'} · {currentProfile.profileNumber}</div>
        </Card>
        <Card>
          <div className="text-slate-600 mb-3 text-base">请先完成阶段一初筛（3 个问题 + 高危因素），判断是否需要进入阶段二全面评估</div>
          <BigButton onClick={() => go('screening')}>开始阶段一初筛</BigButton>
        </Card>
      </div>
    );
  }
  if (currentProfile.screening.result === 'low') {
    return (
      <div className="space-y-4 fade-in">
        <Card className="bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-emerald-800 font-bold text-base">阶段一初筛结果为低风险</div>
              <div className="text-emerald-700 text-base mt-1">建议每年复筛 + 健康教育 + 运动</div>
            </div>
            <span className="text-4xl">🌿</span>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <BigButton variant="ghost" onClick={() => go('lowBranch')}>查看建议</BigButton>
          <BigButton onClick={() => go('screening')}>重新初筛</BigButton>
        </div>
      </div>
    );
  }
  if (!currentProfile.assessment) {
    return (
      <div className="space-y-4 fade-in">
        <Card className="bg-amber-50 border-amber-200">
          <div className="text-amber-800 font-bold text-base">阶段一初筛提示存在跌倒风险</div>
          <div className="text-amber-700 text-base mt-1">建议进入阶段二全面评估：Morse、Hendrich II、Berg、TUG、Tinetti</div>
        </Card>
        <BigButton onClick={() => go('assessment')}>开始阶段二全面评估</BigButton>
      </div>
    );
  }
  return (
    <div className="space-y-4 fade-in">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="text-slate-500 text-base">当前风险等级</div>
          <RiskBadge level={currentProfile.riskLevel || 'low'} />
        </div>
        <div className="text-slate-600 text-base">已完成阶段二全面评估，可查看结果或重新评估</div>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        <BigButton variant="ghost" onClick={() => go('result')}>查看结果</BigButton>
        <BigButton variant="ghost" onClick={() => go('report')}>导出报告</BigButton>
        <BigButton onClick={() => go('assessment')}>重新评估</BigButton>
      </div>
    </div>
  );
}

/* ============================================================
   主 App
   ============================================================ */
function App() {
  const [state, setState] = useState(loadState);
  const currentProfile = state.profiles.find(p => p.id === state.currentProfileId) || null;

  // 动态注入打印样式
  useEffect(() => {
    const styleId = 'print-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        body { background: #fff !important; font-size: 14px; }
        .no-print { display: none !important; }
        #report-content {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          background: #fff !important;
          border-radius: 0 !important;
        }
        .avoid-break { page-break-inside: avoid; }
        @page { margin: 15mm 12mm; size: A4; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
  }, [state]);

  const tabForScreen = screen => {
    if (screen === 'plan') return 'plan';
    if (screen === 'history' || screen === 'report') return 'history';
    if (['newProfile', 'screening', 'lowBranch', 'assessment', 'result'].includes(screen)) return 'assess';
    return 'home';
  };
  const go = screen => setState(s => ({ ...s, screen, tab: tabForScreen(screen) }));
  const onTab = tab => {
    if (tab === 'home') go('home');
    else if (tab === 'assess') go('assess');
    else if (tab === 'plan') go('plan');
    else go('history');
  };

  const updateCurrentProfile = updater => {
    setState(s => {
      if (!s.currentProfileId) return s;
      return {
        ...s,
        profiles: s.profiles.map(p => p.id === s.currentProfileId ? updater(p) : p),
      };
    });
  };

  const handleSaveProfile = data => {
    setState(s => {
      const newProfile = createProfile(data, s.profiles.length);
      return {
        ...s,
        profiles: [...s.profiles, newProfile],
        currentProfileId: newProfile.id,
        screen: 'screening', tab: 'assess', assessStep: 0,
      };
    });
  };

  const handleScreeningDone = result => {
    if (result.result === 'low') {
      const plan = generatePlan(null, null, 'low');
      updateCurrentProfile(p => ({
        ...p,
        screening: result, riskLevel: 'low', planItems: plan,
        history: [...p.history, { date: result.date, type: 'screen', riskLevel: 'low' }],
      }));
      setState(s => ({ ...s, screen: 'lowBranch', tab: 'assess' }));
    } else {
      updateCurrentProfile(p => ({ ...p, screening: result }));
      setState(s => ({ ...s, screen: 'assessment', tab: 'assess', assessStep: 0 }));
    }
  };

  const handleAssessmentComplete = ({ assessment, envCheck, riskLevel }) => {
    const plan = generatePlan(assessment, envCheck, riskLevel);
    const date = todayStr();
    updateCurrentProfile(p => ({
      ...p, assessment, envCheck, riskLevel, planItems: plan,
      history: [...p.history, { date, type: 'full', riskLevel }],
    }));
    setState(s => ({ ...s, screen: 'result', tab: 'assess', assessStep: 0 }));
  };

  const handleSwitchProfile = id => {
    setState(s => ({ ...s, currentProfileId: id, screen: 'home', tab: 'home', assessStep: 0 }));
  };

  const handleDeleteProfile = id => {
    if (!window.confirm('确定要删除这个档案吗？所有评估记录将一并删除，且不可恢复。')) return;
    setState(s => {
      const remaining = s.profiles.filter(p => p.id !== id);
      return {
        ...s,
        profiles: remaining,
        currentProfileId: s.currentProfileId === id ? (remaining[0]?.id || null) : s.currentProfileId,
      };
    });
  };

  const handleExportData = () => {
    try {
      const exportObj = { version: 4, exportedAt: new Date().toISOString(), profiles: state.profiles };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `跌倒风险评估档案_${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败：' + e.message);
    }
  };

  const handleImportData = event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        const incoming = Array.isArray(imported) ? imported : (imported.profiles || []);
        if (!Array.isArray(incoming) || incoming.length === 0) {
          alert('文件格式不正确或没有档案数据。');
          return;
        }
        setState(s => {
          const existingNumbers = new Set(s.profiles.map(p => p.profileNumber));
          const newProfiles = incoming
            .filter(p => p && p.id && p.name && !existingNumbers.has(p.profileNumber))
            .map(p => ({ ...p, id: 'p_imported_' + Math.random().toString(36).slice(2, 8) + '_' + Date.now() }));
          return {
            ...s,
            profiles: [...s.profiles, ...newProfiles],
            currentProfileId: s.currentProfileId || (newProfiles[0]?.id || null),
          };
        });
        alert(`导入成功！共添加 ${incoming.length} 个档案。`);
      } catch (err) {
        alert('解析失败：' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
  };

  const renderScreen = () => {
    switch (state.screen) {
      case 'newProfile':
        return <NewProfileScreen existingCount={state.profiles.length} onSave={handleSaveProfile} onCancel={() => go('home')} />;
      case 'screening':
        return <ScreeningScreen profile={currentProfile} onDone={handleScreeningDone} onCancel={() => go('home')} />;
      case 'lowBranch':
        return <LowRiskScreen screening={currentProfile?.screening} onBack={() => go('home')} onGoPlan={() => go('plan')} />;
      case 'assessment':
        return <AssessmentScreen state={state} setState={setState} profile={currentProfile} onComplete={handleAssessmentComplete} onCancel={() => go('assess')} />;
      case 'result':
        return <ResultScreen currentProfile={currentProfile} go={go} onReassess={() => setState(s => ({ ...s, screen: 'assessment', assessStep: 0 }))} />;
      case 'plan':
        return <PlanScreen currentProfile={currentProfile} updateCurrentProfile={updateCurrentProfile} go={go} />;
      case 'report':
        return <ReportScreen currentProfile={currentProfile} onBack={() => go('history')} />;
      case 'history':
        return (
          <HistoryScreen
            state={state} go={go} currentProfile={currentProfile}
            switchProfile={handleSwitchProfile} deleteProfile={handleDeleteProfile}
            exportData={handleExportData} importData={handleImportData} resetAll={resetAll}
          />
        );
      case 'assess':
        return <AssessEntry currentProfile={currentProfile} go={go} />;
      case 'home':
      default:
        return <HomeScreen currentProfile={currentProfile} profiles={state.profiles} go={go} onSwitch={handleSwitchProfile} />;
    }
  };

  const titles = {
    home: '首页', newProfile: '建立档案', screening: '阶段一 · 初筛',
    lowBranch: '低风险管理', assessment: '阶段二 · 全面评估', result: '评估结果',
    plan: '我的计划', history: '我的', assess: '评估', report: '评估报告',
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <div className="font-bold text-slate-800 text-lg">{titles[state.screen] || '跌倒风险管理'}</div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">{renderScreen()}</main>
      <TabBar tab={state.tab} onTab={onTab} />
    </div>
  );
}

export default App;