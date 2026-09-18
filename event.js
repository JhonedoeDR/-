(function () {
  const form = document.getElementById('event-form');
  const fields = {
    name: document.getElementById('f-name'),
    start: document.getElementById('f-start'),
    end: document.getElementById('f-end'),
    target: document.getElementById('f-target'),
    current: document.getElementById('f-current'),
    unit: document.getElementById('f-unit'),
  };
  const formTitle = document.getElementById('form-title');
  const cancelBtn = document.getElementById('cancel-edit');
  const ongoingEl = document.getElementById('ongoing-list');
  const endedEl = document.getElementById('ended-list');

  let editingId = null;
  const today = LM.todayStr();

  render();
  LM.renderNav(document.getElementById('nav-container'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const events = LM.get(LM.KEYS.EVENTS, []);
    const data = {
      id: editingId || LM.uid(),
      name: fields.name.value.trim(),
      start: fields.start.value,
      end: fields.end.value,
      target: Number(fields.target.value) || 0,
      current: Number(fields.current.value) || 0,
      unit: fields.unit.value.trim(),
    };

    if (editingId) {
      const idx = events.findIndex((ev) => ev.id === editingId);
      if (idx !== -1) events[idx] = data;
    } else {
      events.push(data);
    }
    LM.set(LM.KEYS.EVENTS, events);
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', resetForm);
  [ongoingEl, endedEl].forEach((el) => el.addEventListener('click', onListClick));

  function onListClick(e) {
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    const updateId = e.target.dataset.updateCurrent;

    if (editId) startEdit(editId);

    if (deleteId) {
      if (!confirm('このイベントを削除しますか?')) return;
      const events = LM.get(LM.KEYS.EVENTS, []).filter((ev) => ev.id !== deleteId);
      LM.set(LM.KEYS.EVENTS, events);
      render();
    }

    if (updateId) {
      const input = document.querySelector(`input[data-current-input="${updateId}"]`);
      if (!input) return;
      const events = LM.get(LM.KEYS.EVENTS, []);
      const ev = events.find((e2) => e2.id === updateId);
      if (ev) ev.current = Number(input.value) || 0;
      LM.set(LM.KEYS.EVENTS, events);
      render();
    }
  }

  function startEdit(id) {
    const ev = LM.get(LM.KEYS.EVENTS, []).find((e2) => e2.id === id);
    if (!ev) return;
    editingId = id;
    fields.name.value = ev.name;
    fields.start.value = ev.start;
    fields.end.value = ev.end;
    fields.target.value = ev.target;
    fields.current.value = ev.current;
    fields.unit.value = ev.unit || '';
    formTitle.textContent = 'イベントを編集';
    cancelBtn.style.display = 'inline-block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    editingId = null;
    form.reset();
    fields.current.value = 0;
    formTitle.textContent = 'イベントを登録';
    cancelBtn.style.display = 'none';
  }

  function render() {
    const events = LM.get(LM.KEYS.EVENTS, []);
    const ongoing = events.filter((ev) => ev.end >= today);
    const ended = events.filter((ev) => ev.end < today);

    renderList(ongoingEl, ongoing, '開催中のイベントはありません', true);
    renderList(endedEl, ended, '終了したイベントはありません', false);
  }

  function renderList(container, events, emptyText, showProgress) {
    if (events.length === 0) {
      container.innerHTML = `<p class="lm-empty">${emptyText}</p>`;
      return;
    }

    const sorted = [...events].sort((a, b) => a.end.localeCompare(b.end));
    container.innerHTML = '';
    sorted.forEach((ev) => {
      const box = document.createElement('div');
      box.style.padding = '10px 0';
      box.style.borderBottom = '1px solid var(--paper-line)';

      let progressHtml = '';
      if (showProgress) {
        const { remain, remainDays, perDay, rate } = LM.calcEventProgress(ev, today);
        progressHtml = `
          <div class="lm-progress-track" style="margin:6px 0;">
            <div class="lm-progress-fill" style="width:${rate}%"></div>
          </div>
          <div class="lm-event-remain">残り${remainDays}日 ・ 残り${remain.toLocaleString()}${escapeHtml(ev.unit)} ・ 1日あたり${perDay.toLocaleString()}${escapeHtml(ev.unit)}必要</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:6px;">
            <input type="number" data-current-input="${ev.id}" value="${ev.current}" style="width:100px; font-family:var(--font-body); font-size:14px; padding:6px 8px; border:1px solid var(--paper-line); border-radius:6px;" />
            <button type="button" data-update-current="${ev.id}" class="lm-btn secondary" style="padding:6px 10px; font-size:12px;">現在値を更新</button>
          </div>
        `;
      }

      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong>${escapeHtml(ev.name)}</strong>
          <span style="font-size:12px; color:var(--ink-soft);">${ev.start}〜${ev.end}</span>
        </div>
        <div style="font-size:13px; color:var(--ink-soft); margin:2px 0;">${ev.current.toLocaleString()} / ${ev.target.toLocaleString()}${escapeHtml(ev.unit)}</div>
        ${progressHtml}
        <div style="display:flex; gap:6px; margin-top:8px;">
          <button type="button" data-edit="${ev.id}" class="lm-btn secondary" style="padding:4px 10px; font-size:12px;">編集</button>
          <button type="button" data-delete="${ev.id}" class="lm-btn secondary" style="padding:4px 10px; font-size:12px;">削除</button>
        </div>
      `;
      container.appendChild(box);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
