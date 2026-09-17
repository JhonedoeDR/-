(function () {
  const form = document.getElementById('schedule-form');
  const fields = {
    name: document.getElementById('f-name'),
    date: document.getElementById('f-date'),
    start: document.getElementById('f-start'),
    end: document.getElementById('f-end'),
    place: document.getElementById('f-place'),
    travel: document.getElementById('f-travel'),
    prep: document.getElementById('f-prep'),
    arrive: document.getElementById('f-arrive'),
    belonging: document.getElementById('f-belonging'),
    memo: document.getElementById('f-memo'),
  };
  const preview = document.getElementById('calc-preview');
  const formTitle = document.getElementById('form-title');
  const cancelBtn = document.getElementById('cancel-edit');

  let editingId = null;

  populateBelongingOptions();
  fields.date.value = LM.todayStr();
  updatePreview();
  renderList();
  document.getElementById('schedule-list').addEventListener('click', onListClick);
  LM.renderNav(document.getElementById('nav-container'));

  // URLの ?id= があれば編集モードで開く
  const params = new URLSearchParams(location.search);
  const openId = params.get('id');
  if (openId) startEdit(openId);

  Object.values(fields).forEach((el) => {
    el.addEventListener('input', updatePreview);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const schedules = LM.get(LM.KEYS.SCHEDULES, []);

    const data = {
      id: editingId || LM.uid(),
      name: fields.name.value.trim(),
      date: fields.date.value,
      start: fields.start.value,
      end: fields.end.value || '',
      place: fields.place.value.trim(),
      travelMin: Number(fields.travel.value) || 0,
      prepMin: Number(fields.prep.value) || 0,
      arriveBeforeMin: Number(fields.arrive.value) || 0,
      belongingSetId: fields.belonging.value || null,
      memo: fields.memo.value.trim(),
    };

    if (editingId) {
      const idx = schedules.findIndex((s) => s.id === editingId);
      if (idx !== -1) schedules[idx] = data;
    } else {
      schedules.push(data);
    }
    LM.set(LM.KEYS.SCHEDULES, schedules);
    resetForm();
    renderList();
  });

  cancelBtn.addEventListener('click', resetForm);

  function startEdit(id) {
    const schedule = LM.get(LM.KEYS.SCHEDULES, []).find((s) => s.id === id);
    if (!schedule) return;
    editingId = id;
    fields.name.value = schedule.name;
    fields.date.value = schedule.date;
    fields.start.value = schedule.start;
    fields.end.value = schedule.end || '';
    fields.place.value = schedule.place || '';
    fields.travel.value = schedule.travelMin || 0;
    fields.prep.value = schedule.prepMin || 0;
    fields.arrive.value = schedule.arriveBeforeMin || 0;
    fields.belonging.value = schedule.belongingSetId || '';
    fields.memo.value = schedule.memo || '';
    formTitle.textContent = '予定を編集';
    cancelBtn.style.display = 'inline-block';
    updatePreview();
    form.scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    editingId = null;
    form.reset();
    fields.date.value = LM.todayStr();
    fields.travel.value = 0;
    fields.prep.value = 0;
    fields.arrive.value = 0;
    formTitle.textContent = '予定を登録';
    cancelBtn.style.display = 'none';
    history.replaceState(null, '', location.pathname);
    updatePreview();
  }

  function updatePreview() {
    if (!fields.start.value) {
      preview.textContent = '';
      return;
    }
    const result = LM.calcDeparture({
      start: fields.start.value,
      travelMin: Number(fields.travel.value) || 0,
      prepMin: Number(fields.prep.value) || 0,
      arriveBeforeMin: Number(fields.arrive.value) || 0,
    });
    preview.innerHTML = `準備開始 <strong>${result.prepStart}</strong> ・ 出発 <strong>${result.depart}</strong> ・ 到着目安 <strong>${result.arrive}</strong>`;
  }

  function populateBelongingOptions() {
    const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
    sets.forEach((set) => {
      const opt = document.createElement('option');
      opt.value = set.id;
      opt.textContent = set.name;
      fields.belonging.appendChild(opt);
    });
  }

  function renderList() {
    const el = document.getElementById('schedule-list');
    const schedules = LM.get(LM.KEYS.SCHEDULES, []).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

    if (schedules.length === 0) {
      el.innerHTML = '<p class="lm-empty">登録されている予定はありません</p>';
      return;
    }

    el.innerHTML = '';
    schedules.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'lm-schedule-item';
      row.style.cursor = 'default';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.innerHTML = `
        <span>
          <span class="lm-schedule-time">${LM.formatDateHeader(s.date).slice(0, -3)} ${s.start}</span>
          <span>${escapeHtml(s.name)}</span>
        </span>
        <span style="display:flex; gap:6px;">
          <button type="button" data-edit="${s.id}" class="lm-btn secondary" style="padding:6px 10px; font-size:12px;">編集</button>
          <button type="button" data-delete="${s.id}" class="lm-btn secondary" style="padding:6px 10px; font-size:12px;">削除</button>
        </span>
      `;
      el.appendChild(row);
    });
  }

  function onListClick(e) {
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    if (editId) startEdit(editId);
    if (deleteId) {
      if (!confirm('この予定を削除しますか?')) return;
      const schedules = LM.get(LM.KEYS.SCHEDULES, []).filter((s) => s.id !== deleteId);
      LM.set(LM.KEYS.SCHEDULES, schedules);
      renderList();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
