(function () {
  const PAGE_SIZE = 5;
  const setForm = document.getElementById('set-form');
  const setNameInput = document.getElementById('f-set-name');
  const listEl = document.getElementById('set-list');

  let page = 0;
  const openSetIds = new Set();

  render();
  document.addEventListener('click', onGlobalClick);
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
    renderPaged(listEl, sets, false);
  }

  function renderPaged(container, sets, isModal) {
    container.innerHTML = '';
    if (sets.length === 0) {
      container.innerHTML = '<p class="lm-empty">セットはまだ登録されていません</p>';
      return;
    }

    let pageItems = sets;
    if (!isModal) {
      const totalPages = Math.max(1, Math.ceil(sets.length / PAGE_SIZE));
      if (page >= totalPages) page = totalPages - 1;
      pageItems = sets.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    }

    pageItems.forEach((set) => container.appendChild(renderSetBox(set)));

    if (!isModal && sets.length > PAGE_SIZE) {
      const totalPages = Math.max(1, Math.ceil(sets.length / PAGE_SIZE));
      const pager = document.createElement('div');
      pager.className = 'lm-pager';
      pager.innerHTML = `
        <button type="button" data-prev="1" ${page === 0 ? 'disabled' : ''}>◀</button>
        <span>${page + 1}/${totalPages}</span>
        <button type="button" data-next="1" ${page >= totalPages - 1 ? 'disabled' : ''}>▶</button>
      `;
      container.appendChild(pager);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lm-btn secondary lm-list-all-btn';
      btn.dataset.listAll = '1';
      btn.textContent = '一覧表示';
      container.appendChild(btn);
    }
  }

  function renderSetBox(set) {
    const wrap = document.createElement('div');
    wrap.className = 'lm-collapsible' + (openSetIds.has(set.id) ? ' open' : '');

    const itemsHtml = set.items
      .map(
        (it) => `
      <li class="lm-check-item" style="justify-content:space-between;">
        <span>${escapeHtml(it.name)}</span>
        <button type="button" data-remove-item="${set.id}:${it.id}" class="lm-btn secondary" style="padding:4px 8px; font-size:12px;">削除</button>
      </li>`
      )
      .join('');

    wrap.innerHTML = `
      <div class="lm-collapsible-header" data-toggle-set="${set.id}">
        <strong>${escapeHtml(set.name)}(${set.items.length})</strong>
        <span class="lm-collapsible-arrow">▶</span>
      </div>
      <div class="lm-collapsible-body">
        <ul class="lm-check-list">${itemsHtml || '<li class="lm-empty">まだ持ちものが登録されていません</li>'}</ul>
        <form data-add-item="${set.id}" style="display:flex; gap:8px; margin-top:8px;">
          <input placeholder="持ちものを追加" style="flex:1; min-width:0; font-family:var(--font-body); font-size:16px; padding:8px 10px; border:1px solid var(--paper-line); border-radius:8px;" required />
          <button type="submit" class="lm-btn secondary" style="padding:8px 14px;">追加</button>
        </form>
        <button type="button" data-delete-set="${set.id}" class="lm-btn secondary" style="margin-top:10px; padding:6px 10px; font-size:12px;">セット削除</button>
      </div>
    `;

    wrap.querySelector('.lm-collapsible-header').addEventListener('click', () => {
      wrap.classList.toggle('open');
      if (wrap.classList.contains('open')) openSetIds.add(set.id);
      else openSetIds.delete(set.id);
    });

    wrap.querySelector('form[data-add-item]').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const name = input.value.trim();
      if (!name) return;
      const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
      const s = sets.find((x) => x.id === set.id);
      if (s) s.items.push({ id: LM.uid(), name });
      LM.set(LM.KEYS.BELONGING_SETS, sets);
      openSetIds.add(set.id);
      render();
    });

    return wrap;
  }

  function onGlobalClick(e) {
    const removeKey = e.target.dataset.removeItem;
    const deleteSetId = e.target.dataset.deleteSet;
    const prev = e.target.dataset.prev;
    const next = e.target.dataset.next;
    const listAll = e.target.dataset.listAll;

    if (removeKey) {
      const [setId, itemId] = removeKey.split(':');
      const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
      const set = sets.find((s) => s.id === setId);
      if (set) set.items = set.items.filter((it) => it.id !== itemId);
      LM.set(LM.KEYS.BELONGING_SETS, sets);
      render();
      LM.closeModal();
    }

    if (deleteSetId) {
      if (!confirm('このセットを削除しますか?(紐付けている予定からも解除されます)')) return;
      const sets = LM.get(LM.KEYS.BELONGING_SETS, []).filter((s) => s.id !== deleteSetId);
      LM.set(LM.KEYS.BELONGING_SETS, sets);

      const schedules = LM.get(LM.KEYS.SCHEDULES, []);
      schedules.forEach((s) => {
        if (s.belongingSetIds) s.belongingSetIds = s.belongingSetIds.filter((id) => id !== deleteSetId);
        if (s.belongingSetId === deleteSetId) s.belongingSetId = null;
      });
      LM.set(LM.KEYS.SCHEDULES, schedules);
      render();
      LM.closeModal();
    }

    if (prev) {
      page = Math.max(0, page - 1);
      render();
    }
    if (next) {
      page = page + 1;
      render();
    }
    if (listAll) {
      const sets = LM.get(LM.KEYS.BELONGING_SETS, []);
      const wrap = document.createElement('div');
      renderPaged(wrap, sets, true);
      LM.openModal('セット 一覧', wrap);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
