(function () {
  const today = LM.todayStr();
  document.getElementById('date-header').textContent = LM.formatDateHeader(today);

  renderSchedules();
  renderBelongings();
  renderTasks();
  renderShift();
  renderEvents();
  renderNotifyBanner();
  LM.renderNav(document.getElementById('nav-container'));

  /* ---------- 通知の有効化バナー ---------- */
  function renderNotifyBanner() {
    const el = document.getElementById('notify-banner');
    if (!('Notification' in window)) {
      el.innerHTML = '';
      return;
    }
    if (Notification.permission === 'granted') {
      LM.startNotificationLoop();
      el.innerHTML = '';
      return;
    }
    if (Notification.permission === 'denied') {
      el.innerHTML = '<p class="lm-empty">通知がブロックされています(端末の設定から許可できます)</p>';
      return;
    }
    el.innerHTML = '<button type="button" id="enable-notify" class="lm-btn secondary" style="margin-bottom:8px;">通知を有効にする</button>';
    document.getElementById('enable-notify').addEventListener('click', async () => {
      const result = await LM.requestNotificationPermission();
      renderNotifyBanner();
      if (result === 'granted') LM.startNotificationLoop();
    });
  }

  /* ---------- 今日の予定 ---------- */
  function renderSchedules() {
    const el = document.getElementById('schedule-list');
    const schedules = LM.get(LM.KEYS.SCHEDULES, [])
      .filter((s) => s.date === today)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (schedules.length === 0) {
      el.innerHTML = '<p class="lm-empty">今日の予定はありません</p>';
      return;
    }

    el.innerHTML = '';
    schedules.forEach((s) => {
      const row = document.createElement('a');
      row.className = 'lm-schedule-item';
      row.href = `./schedule.html?id=${encodeURIComponent(s.id)}`;

      const departureHtml = renderDepartureLine(s);

      row.innerHTML = `
        <span class="lm-schedule-time">${s.start}</span>
        <span>
          <div>${escapeHtml(s.name)}</div>
          ${departureHtml}
        </span>
      `;
      el.appendChild(row);
    });
  }

  /* ---------- 今日の持ちもの ---------- */
  function renderBelongings() {
    const el = document.getElementById('belongings-list');
    const countEl = document.getElementById('belongings-count');

    const schedules = LM.get(LM.KEYS.SCHEDULES, []).filter((s) => s.date === today && s.belongingSetId);
    const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
    const usedSetIds = [...new Set(schedules.map((s) => s.belongingSetId))];
    const items = [];
    usedSetIds.forEach((setId) => {
      const set = sets.find((x) => x.id === setId);
      if (set) items.push(...set.items.map((it) => ({ ...it, setName: set.name })));
    });

    if (items.length === 0) {
      countEl.textContent = '';
      el.innerHTML = '<p class="lm-empty">今日呼び出す持ちものセットはありません</p>';
      return;
    }

    const checks = LM.get(LM.KEYS.DAILY_CHECKS, {});
    const todayCheck = checks[today] || { checkedItemIds: [] };
    const checkedSet = new Set(todayCheck.checkedItemIds);

    const doneCount = items.filter((it) => checkedSet.has(it.id)).length;
    countEl.textContent = `${doneCount}/${items.length}`;

    const ul = document.createElement('ul');
    ul.className = 'lm-check-list';
    items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'lm-check-item' + (checkedSet.has(it.id) ? ' done' : '');
      li.innerHTML = `
        <input type="checkbox" ${checkedSet.has(it.id) ? 'checked' : ''} data-item-id="${it.id}" />
        <span>${escapeHtml(it.name)}</span>
      `;
      ul.appendChild(li);
    });
    el.innerHTML = '';
    el.appendChild(ul);

    ul.addEventListener('change', (e) => {
      const checkbox = e.target;
      if (checkbox.type !== 'checkbox') return;
      const itemId = checkbox.dataset.itemId;
      const checks = LM.get(LM.KEYS.DAILY_CHECKS, {});
      const entry = checks[today] || { checkedItemIds: [] };
      const set = new Set(entry.checkedItemIds);
      if (checkbox.checked) set.add(itemId);
      else set.delete(itemId);
      entry.checkedItemIds = [...set];
      checks[today] = entry;
      LM.set(LM.KEYS.DAILY_CHECKS, checks);
      renderBelongings();
    });
  }

  /* ---------- 今日のタスク ---------- */
  function renderTasks() {
    const el = document.getElementById('tasks-list');
    const countEl = document.getElementById('tasks-count');
    const allTasks = LM.get(LM.KEYS.TASKS, {});
    const tasks = allTasks[today] || [];

    if (tasks.length === 0) {
      countEl.textContent = '';
      el.innerHTML = '<p class="lm-empty">今日のタスクはありません</p>';
      return;
    }

    const doneCount = tasks.filter((t) => t.done).length;
    countEl.textContent = `${doneCount}/${tasks.length}`;

    const ul = document.createElement('ul');
    ul.className = 'lm-check-list';
    tasks.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'lm-check-item' + (t.done ? ' done' : '');
      li.innerHTML = `
        <input type="checkbox" ${t.done ? 'checked' : ''} data-task-id="${t.id}" />
        <span>${escapeHtml(t.text)}</span>
      `;
      ul.appendChild(li);
    });
    el.innerHTML = '';
    el.appendChild(ul);

    ul.addEventListener('change', (e) => {
      const checkbox = e.target;
      if (checkbox.type !== 'checkbox') return;
      const taskId = checkbox.dataset.taskId;
      const allTasks = LM.get(LM.KEYS.TASKS, {});
      const list = allTasks[today] || [];
      const task = list.find((t) => t.id === taskId);
      if (task) task.done = checkbox.checked;
      allTasks[today] = list;
      LM.set(LM.KEYS.TASKS, allTasks);
      renderTasks();
    });
  }

  /* ---------- 今日の勤務 ---------- */
  function renderShift() {
    const el = document.getElementById('shift-box');
    const shift = LM.get(LM.KEYS.SHIFTS, []).find((s) => s.date === today);

    if (!shift) {
      el.innerHTML = '<p class="lm-empty">今日の勤務はありません</p>';
      return;
    }

    const wageSettings = LM.get(LM.KEYS.WAGE_SETTINGS, { hourlyWage: 0, transportFee: 0 });
    const { workMin, pay } = LM.calcShiftPay(shift, wageSettings);
    const h = Math.floor(workMin / 60);
    const m = workMin % 60;

    el.innerHTML = `
      <div class="lm-shift-box">
        <span>勤務時間 ${shift.start}〜${shift.end}(休憩${shift.breakMin || 0}分)</span>
        <span>実働 ${h}時間${m}分</span>
        <span class="lm-shift-pay">見込み給与 ¥${pay.toLocaleString()}</span>
      </div>
    `;
  }

  /* ---------- 今日のイベント ---------- */
  function renderEvents() {
    const el = document.getElementById('events-list');
    const events = LM.get(LM.KEYS.EVENTS, []).filter((ev) => ev.start <= today && today <= ev.end);

    if (events.length === 0) {
      el.innerHTML = '<p class="lm-empty">開催中のイベントはありません</p>';
      return;
    }

    el.innerHTML = '';
    events.forEach((ev) => {
      const { remain, remainDays, perDay, rate } = LM.calcEventProgress(ev, today);
      const box = document.createElement('div');
      box.className = 'lm-event';
      box.innerHTML = `
        <div class="lm-event-top">
          <span>${escapeHtml(ev.name)}</span>
          <span>${rate}%</span>
        </div>
        <div class="lm-progress-track">
          <div class="lm-progress-fill" style="width:${rate}%"></div>
        </div>
        <div class="lm-event-remain">残り${remainDays}日 ・ 残り${remain.toLocaleString()}${escapeHtml(ev.unit || '')} ・ 1日あたり${perDay.toLocaleString()}${escapeHtml(ev.unit || '')}必要</div>
      `;
      el.appendChild(box);
    });
  }

  function renderDepartureLine(s) {
    const r = LM.calcDeparture(s);
    return `<div class="lm-schedule-departure">準備開始 <strong>${r.prepStart}</strong> ・ 出発 <strong>${r.depart}</strong></div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
