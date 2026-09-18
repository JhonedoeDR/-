/* =========================================================
   生活管理ツール - 共通データレイヤー / ユーティリティ
   全ページ(index.html, schedule.html, ...)から <script src="./app.js"> で読み込む。
   ========================================================= */

const LM = {};

/* ---------- localStorage キー一覧 ----------
 * lm_schedules      : 予定 [{id, name, date, start, end, place, travelMin, prepMin, arriveBeforeMin, belongingSetId, memo}]
 * lm_belongingSets   : 持ちものセット [{id, name, items:[{id, name}]}]
 * lm_dailyChecks     : 日付ごとの持ちものチェック { "2026-09-18": { checkedItemIds: [...] } }
 * lm_tasks           : 日付ごとのタスク { "2026-09-18": [{id, text, done}] }
 * lm_shifts          : シフト [{id, date, start, end, breakMin}]
 * lm_wageSettings    : 給与設定 {hourlyWage, transportFee}
 * lm_events          : イベント [{id, name, start, end, target, current, unit}]
 * lm_wishlist        : 欲しいものリスト [{id, name, category, price, url, desire, planThisMonth, purchased, memo}]
 * -------------------------------------------- */

LM.KEYS = {
  SCHEDULES: 'lm_schedules',
  BELONGING_SETS: 'lm_belongingSets',
  DAILY_CHECKS: 'lm_dailyChecks',
  TASKS: 'lm_tasks',
  SHIFTS: 'lm_shifts',
  WAGE_SETTINGS: 'lm_wageSettings',
  EVENTS: 'lm_events',
  WISHLIST: 'lm_wishlist',
};

/* ---------- 汎用 get/set ---------- */
LM.get = function (key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('LM.get failed for', key, e);
    return fallback;
  }
};

LM.set = function (key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('LM.set failed for', key, e);
    return false;
  }
};

LM.uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

/* ---------- 日付ユーティリティ ---------- */
LM.todayStr = function () {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

LM.formatDateHeader = function (dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekdays[d.getDay()]})`;
};

LM.daysBetween = function (fromStr, toStr) {
  const from = new Date(fromStr + 'T00:00:00');
  const to = new Date(toStr + 'T00:00:00');
  return Math.round((to - from) / 86400000);
};

LM.minutesToClock = function (totalMin) {
  const h = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
  const m = ((totalMin % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

LM.clockToMinutes = function (hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/* ---------- 予定・逆算計算 ---------- */
// 出発/準備開始時刻を算出する
LM.calcDeparture = function (schedule) {
  const arriveMin = LM.clockToMinutes(schedule.start) - (schedule.arriveBeforeMin || 0);
  const departMin = arriveMin - (schedule.travelMin || 0);
  const prepStartMin = departMin - (schedule.prepMin || 0);
  return {
    arrive: LM.minutesToClock(arriveMin),
    depart: LM.minutesToClock(departMin),
    prepStart: LM.minutesToClock(prepStartMin),
  };
};

/* ---------- 給与計算 ---------- */
LM.calcShiftPay = function (shift, wageSettings) {
  const workMin = LM.clockToMinutes(shift.end) - LM.clockToMinutes(shift.start) - (shift.breakMin || 0);
  const pay = Math.max(0, Math.round((workMin / 60) * (wageSettings.hourlyWage || 0)));
  return { workMin, pay };
};

/* ---------- イベント進捗計算 ---------- */
LM.calcEventProgress = function (ev, todayStr) {
  const remain = Math.max(0, (ev.target || 0) - (ev.current || 0));
  const remainDays = Math.max(0, LM.daysBetween(todayStr, ev.end));
  const perDay = remainDays > 0 ? Math.ceil(remain / remainDays) : remain;
  const rate = ev.target > 0 ? Math.min(100, Math.round((ev.current / ev.target) * 100)) : 0;
  return { remain, remainDays, perDay, rate };
};

/* ---------- 通知(Notification API・ページが開いている間のみ動作) ----------
 * iOSのWeb/PWAはアプリを閉じた状態でのプッシュ通知に強い制約があるため、
 * ここでは「ページを開いた時/開いている間にチェックして通知する」方式のみを実装する。
 * 対象: (1)今日の予定の開始前 (2)予定の準備開始時刻 (3)イベント終了3日前以内
 * ------------------------------------------------------------------------- */
LM.NOTIFIED_KEY = 'lm_notifiedKeys';

LM.requestNotificationPermission = async function () {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
};

LM.notify = function (title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: './icons/icon-192.png' });
  } catch (e) {
    console.error('notify failed', e);
  }
};

// 一度通知したキーは繰り返し通知しないよう記録する
LM._alreadyNotified = function (key) {
  const notified = LM.get(LM.NOTIFIED_KEY, []);
  return notified.includes(key);
};
LM._markNotified = function (key) {
  const notified = LM.get(LM.NOTIFIED_KEY, []);
  notified.push(key);
  // 古くなりすぎないよう直近500件のみ保持
  LM.set(LM.NOTIFIED_KEY, notified.slice(-500));
};

LM.checkAndNotify = function () {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const today = LM.todayStr();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // (1)(2) 今日の予定: 開始10分前、準備開始10分前
  const schedules = LM.get(LM.KEYS.SCHEDULES, []).filter((s) => s.date === today);
  schedules.forEach((s) => {
    const startMin = LM.clockToMinutes(s.start);
    if (Math.abs(startMin - nowMin) <= 2) {
      const key = `start:${s.id}:${today}`;
      if (!LM._alreadyNotified(key)) {
        LM.notify('まもなく予定の時間です', `${s.name}(${s.start}〜)`);
        LM._markNotified(key);
      }
    }
    if (s.prepMin || s.travelMin || s.arriveBeforeMin) {
      const { prepStart } = LM.calcDeparture(s);
      const prepStartMin = LM.clockToMinutes(prepStart);
      if (Math.abs(prepStartMin - nowMin) <= 2) {
        const key = `prep:${s.id}:${today}`;
        if (!LM._alreadyNotified(key)) {
          LM.notify('準備を始める時間です', `${s.name}の準備開始時刻です`);
          LM._markNotified(key);
        }
      }
    }
  });

  // (3) イベント終了3日前以内、かつ1日1回だけ通知
  const events = LM.get(LM.KEYS.EVENTS, []).filter((ev) => ev.end >= today);
  events.forEach((ev) => {
    const remainDays = LM.daysBetween(today, ev.end);
    if (remainDays <= 3) {
      const key = `event:${ev.id}:${today}`;
      if (!LM._alreadyNotified(key)) {
        LM.notify('イベント終了が近づいています', `${ev.name}(残り${remainDays}日)`);
        LM._markNotified(key);
      }
    }
  });
};

// ページ表示時とその後1分ごとにチェック(ページを開いている間のみ動作)
LM.startNotificationLoop = function () {
  LM.checkAndNotify();
  setInterval(LM.checkAndNotify, 60 * 1000);
};

/* ---------- Service Worker登録(PWA・オフライン対応) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.error('SW registration failed', e));
  });
}

/* ---------- ナビゲーション(共通フッターボタン)描画 ---------- */
LM.renderNav = function (container) {
  const nav = document.createElement('nav');
  nav.className = 'lm-nav';
  const items = [
    { href: './schedule.html', label: '予定・逆算' },
    { href: './belongings.html', label: '持ちもの' },
    { href: './time-calc.html', label: '時間計算' },
    { href: './shift.html', label: '給与・シフト' },
    { href: './wishlist.html', label: '欲しいもの' },
    { href: './event.html', label: 'イベント' },
  ];
  items.forEach((it) => {
    const a = document.createElement('a');
    a.href = it.href;
    a.className = 'lm-nav-btn';
    a.textContent = it.label;
    nav.appendChild(a);
  });
  container.appendChild(nav);
};
