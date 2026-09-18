(function () {
  const wageInput = document.getElementById('f-wage');
  const transportInput = document.getElementById('f-transport');
  const shiftForm = document.getElementById('shift-form');
  const fields = {
    date: document.getElementById('f-date'),
    start: document.getElementById('f-start'),
    end: document.getElementById('f-end'),
    breakMin: document.getElementById('f-break'),
  };
  const preview = document.getElementById('calc-preview');
  const listEl = document.getElementById('shift-list');
  const monthLabel = document.getElementById('month-label');
  const monthSummary = document.getElementById('month-summary');

  loadWageSettings();
  fields.date.value = LM.todayStr();
  renderList();
  renderMonthSummary();
  updatePreview();
  LM.renderNav(document.getElementById('nav-container'));

  wageInput.addEventListener('input', saveWageSettings);
  transportInput.addEventListener('input', saveWageSettings);
  [fields.start, fields.end, fields.breakMin].forEach((el) => el.addEventListener('input', updatePreview));

  shiftForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const shifts = LM.get(LM.KEYS.SHIFTS, []);
    shifts.push({
      id: LM.uid(),
      date: fields.date.value,
      start: fields.start.value,
      end: fields.end.value,
      breakMin: Number(fields.breakMin.value) || 0,
    });
    LM.set(LM.KEYS.SHIFTS, shifts);
    fields.start.value = '';
    fields.end.value = '';
    fields.breakMin.value = 0;
    updatePreview();
    renderList();
    renderMonthSummary();
  });

  listEl.addEventListener('click', (e) => {
    const deleteId = e.target.dataset.delete;
    if (!deleteId) return;
    if (!confirm('このシフトを削除しますか?')) return;
    const shifts = LM.get(LM.KEYS.SHIFTS, []).filter((s) => s.id !== deleteId);
    LM.set(LM.KEYS.SHIFTS, shifts);
    renderList();
    renderMonthSummary();
  });

  function loadWageSettings() {
    const settings = LM.get(LM.KEYS.WAGE_SETTINGS, { hourlyWage: 0, transportFee: 0 });
    wageInput.value = settings.hourlyWage || '';
    transportInput.value = settings.transportFee || '';
  }

  function saveWageSettings() {
    LM.set(LM.KEYS.WAGE_SETTINGS, {
      hourlyWage: Number(wageInput.value) || 0,
      transportFee: Number(transportInput.value) || 0,
    });
    renderList();
    renderMonthSummary();
  }

  function getWageSettings() {
    return LM.get(LM.KEYS.WAGE_SETTINGS, { hourlyWage: 0, transportFee: 0 });
  }

  function updatePreview() {
    if (!fields.start.value || !fields.end.value) {
      preview.textContent = '';
      return;
    }
    const { workMin, pay } = LM.calcShiftPay(
      { start: fields.start.value, end: fields.end.value, breakMin: Number(fields.breakMin.value) || 0 },
      getWageSettings()
    );
    const h = Math.floor(workMin / 60);
    const m = workMin % 60;
    preview.innerHTML = `実働 <strong>${h}時間${m}分</strong> ・ 見込み給与 <strong>¥${pay.toLocaleString()}</strong>`;
  }

  function renderList() {
    const shifts = LM.get(LM.KEYS.SHIFTS, []).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const wageSettings = getWageSettings();

    if (shifts.length === 0) {
      listEl.innerHTML = '<p class="lm-empty">シフトはまだ登録されていません</p>';
      return;
    }

    listEl.innerHTML = '';
    shifts.forEach((s) => {
      const { workMin, pay } = LM.calcShiftPay(s, wageSettings);
      const h = Math.floor(workMin / 60);
      const m = workMin % 60;
      const row = document.createElement('div');
      row.className = 'lm-schedule-item';
      row.style.cursor = 'default';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.innerHTML = `
        <span>
          <span class="lm-schedule-time">${LM.formatDateHeader(s.date).slice(0, -3)}</span>
          <span>${s.start}〜${s.end}(休憩${s.breakMin}分)・ 実働${h}h${m}m ・ ¥${pay.toLocaleString()}</span>
        </span>
        <button type="button" data-delete="${s.id}" class="lm-btn secondary" style="padding:6px 10px; font-size:12px;">削除</button>
      `;
      listEl.appendChild(row);
    });
  }

  function renderMonthSummary() {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthLabel.textContent = `${now.getMonth() + 1}月`;

    const shifts = LM.get(LM.KEYS.SHIFTS, []).filter((s) => s.date.startsWith(ym));
    const wageSettings = getWageSettings();

    if (shifts.length === 0) {
      monthSummary.innerHTML = '<span class="lm-empty">今月のシフトはまだありません</span>';
      return;
    }

    let totalPay = 0;
    shifts.forEach((s) => {
      totalPay += LM.calcShiftPay(s, wageSettings).pay;
    });
    const totalTransport = shifts.length * (wageSettings.transportFee || 0);

    monthSummary.innerHTML = `
      <span>勤務日数 ${shifts.length}日</span>
      <span class="lm-shift-pay">給与合計 ¥${totalPay.toLocaleString()}</span>
      <span>交通費合計 ¥${totalTransport.toLocaleString()}</span>
    `;
  }
})();
