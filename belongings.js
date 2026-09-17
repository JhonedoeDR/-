(function () {
  const setForm = document.getElementById('set-form');
  const setNameInput = document.getElementById('f-set-name');
  const listEl = document.getElementById('set-list');

  render();
  listEl.addEventListener('click', onListClick);
  LM.renderNav(document.getElementById('nav-container'));

  setForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = setNameInput.value.trim();
    if (!name) return;
    const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
    sets.push({ id: LM.uid(), name, items: [] });
    LM.set(LM.KEYS.BELONGING_SETS, sets);
    setNameInput.value = '';
    render();
  });

  function render() {
    const sets = LM.get(LM.KEYS.BELONGING_SETS, []);

    if (sets.length === 0) {
      listEl.innerHTML = '<p class="lm-empty">セットはまだ登録されていません</p>';
      return;
    }

    listEl.innerHTML = '';
    sets.forEach((set) => {
      const box = document.createElement('div');
      box.style.marginBottom = '20px';
      box.style.paddingBottom = '16px';
      box.style.borderBottom = '1px solid var(--paper-line)';

      const itemsHtml = set.items
        .map(
          (it) => `
        <li class="lm-check-item" style="justify-content:space-between;">
          <span>${escapeHtml(it.name)}</span>
          <button type="button" data-remove-item="${set.id}:${it.id}" class="lm-btn secondary" style="padding:4px 8px; font-size:12px;">削除</button>
        </li>`
        )
        .join('');

      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="font-family:var(--font-display); font-size:15px;">${escapeHtml(set.name)}</strong>
          <button type="button" data-delete-set="${set.id}" class="lm-btn secondary" style="padding:6px 10px; font-size:12px;">セット削除</button>
        </div>
        <ul class="lm-check-list">${itemsHtml || '<li class="lm-empty">まだ持ちものが登録されていません</li>'}</ul>
        <form data-add-item="${set.id}" style="display:flex; gap:8px; margin-top:8px;">
          <input placeholder="持ちものを追加" style="flex:1; font-family:var(--font-body); font-size:14px; padding:8px 10px; border:1px solid var(--paper-line); border-radius:8px;" required />
          <button type="submit" class="lm-btn secondary" style="padding:8px 14px;">追加</button>
        </form>
      `;
      listEl.appendChild(box);
    });

    listEl.querySelectorAll('form[data-add-item]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const setId = form.dataset.addItem;
        const input = form.querySelector('input');
        const name = input.value.trim();
        if (!name) return;
        const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
        const set = sets.find((s) => s.id === setId);
        if (set) set.items.push({ id: LM.uid(), name });
        LM.set(LM.KEYS.BELONGING_SETS, sets);
        render();
      });
    });
  }

  function onListClick(e) {
    const removeKey = e.target.dataset.removeItem;
    const deleteSetId = e.target.dataset.deleteSet;

    if (removeKey) {
      const [setId, itemId] = removeKey.split(':');
      const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
      const set = sets.find((s) => s.id === setId);
      if (set) set.items = set.items.filter((it) => it.id !== itemId);
      LM.set(LM.KEYS.BELONGING_SETS, sets);
      render();
    }

    if (deleteSetId) {
      if (!confirm('このセットを削除しますか?(紐付けている予定からも解除されます)')) return;
      const sets = LM.get(LM.KEYS.BELONGING_SETS, []).filter((s) => s.id !== deleteSetId);
      LM.set(LM.KEYS.BELONGING_SETS, sets);

      const schedules = LM.get(LM.KEYS.SCHEDULES, []);
      schedules.forEach((s) => {
        if (s.belongingSetId === deleteSetId) s.belongingSetId = null;
      });
      LM.set(LM.KEYS.SCHEDULES, schedules);
      render();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
