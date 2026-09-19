(function () {
  const PAGE_SIZE = 3;
  const form = document.getElementById('item-form');
  const fields = {
    name: document.getElementById('f-name'),
    category: document.getElementById('f-category'),
    price: document.getElementById('f-price'),
    url: document.getElementById('f-url'),
    desire: document.getElementById('f-desire'),
    plan: document.getElementById('f-plan'),
    memo: document.getElementById('f-memo'),
  };
  const formTitle = document.getElementById('form-title');
  const cancelBtn = document.getElementById('cancel-edit');
  const unpurchasedEl = document.getElementById('unpurchased-list');
  const purchasedEl = document.getElementById('purchased-list');
  const totalsEl = document.getElementById('totals');

  let editingId = null;
  const page = { unpurchased: 0, purchased: 0 };

  render();
  document.addEventListener('click', onGlobalClick);
  LM.renderNav(document.getElementById('nav-container'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const items = LM.get(LM.KEYS.WISHLIST, []);
    const data = {
      id: editingId || LM.uid(),
      name: fields.name.value.trim(),
      category: fields.category.value,
      price: Number(fields.price.value) || 0,
      url: fields.url.value.trim(),
      desire: Number(fields.desire.value) || 3,
      planThisMonth: fields.plan.checked,
      purchased: false,
      memo: fields.memo.value.trim(),
    };

    if (editingId) {
      const idx = items.findIndex((it) => it.id === editingId);
      if (idx !== -1) data.purchased = items[idx].purchased;
      if (idx !== -1) items[idx] = data;
    } else {
      items.push(data);
    }
    LM.set(LM.KEYS.WISHLIST, items);
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', resetForm);

  function onGlobalClick(e) {
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    const toggleId = e.target.dataset.togglePurchased;
    const prevKind = e.target.dataset.prev;
    const nextKind = e.target.dataset.next;
    const listAllKind = e.target.dataset.listAll;

    if (editId) startEdit(editId);

    if (deleteId) {
      if (!confirm('削除しますか?')) return;
      const items = LM.get(LM.KEYS.WISHLIST, []).filter((it) => it.id !== deleteId);
      LM.set(LM.KEYS.WISHLIST, items);
      render();
    }

    if (toggleId) {
      const items = LM.get(LM.KEYS.WISHLIST, []);
      const item = items.find((it) => it.id === toggleId);
      if (item) item.purchased = !item.purchased;
      LM.set(LM.KEYS.WISHLIST, items);
      LM.closeModal();
      render();
    }

    if (prevKind) {
      page[prevKind] = Math.max(0, page[prevKind] - 1);
      render();
    }
    if (nextKind) {
      page[nextKind] = page[nextKind] + 1;
      render();
    }
    if (listAllKind) {
      openListAllModal(listAllKind);
    }
  }

  function startEdit(id) {
    const item = LM.get(LM.KEYS.WISHLIST, []).find((it) => it.id === id);
    if (!item) return;
    editingId = id;
    fields.name.value = item.name;
    fields.category.value = item.category;
    fields.price.value = item.price;
    fields.url.value = item.url || '';
    fields.desire.value = item.desire;
    fields.plan.checked = !!item.planThisMonth;
    fields.memo.value = item.memo || '';
    formTitle.textContent = '編集';
    cancelBtn.style.display = 'inline-block';
    LM.closeModal();
    form.scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    editingId = null;
    form.reset();
    fields.desire.value = 3;
    formTitle.textContent = '追加する';
    cancelBtn.style.display = 'none';
  }

  function render() {
    const items = LM.get(LM.KEYS.WISHLIST, []);
    const unpurchased = items.filter((it) => !it.purchased).sort((a, b) => b.desire - a.desire);
    const purchased = items.filter((it) => it.purchased).sort((a, b) => b.desire - a.desire);

    renderPaged(unpurchasedEl, unpurchased, 'まだ何も登録されていません', 'unpurchased');
    renderPaged(purchasedEl, purchased, '購入済みのものはまだありません', 'purchased');
    renderTotals(unpurchased);
  }

  function renderTotals(unpurchased) {
    const total = unpurchased.reduce((sum, it) => sum + it.price, 0);
    const planTotal = unpurchased.filter((it) => it.planThisMonth).reduce((sum, it) => sum + it.price, 0);
    totalsEl.innerHTML = `
      <span>未購入合計 ¥${total.toLocaleString()}</span>
      <span>今月買うもの合計 ¥${planTotal.toLocaleString()}</span>
    `;
  }

  function renderPaged(container, items, emptyText, kind) {
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = `<p class="lm-empty">${emptyText}</p>`;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (page[kind] >= totalPages) page[kind] = totalPages - 1;
    const pageItems = items.slice(page[kind] * PAGE_SIZE, page[kind] * PAGE_SIZE + PAGE_SIZE);

    pageItems.forEach((it) => container.appendChild(renderItemBox(it)));

    if (items.length > PAGE_SIZE) {
      const pager = document.createElement('div');
      pager.className = 'lm-pager';
      pager.innerHTML = `
        <button type="button" data-prev="${kind}" ${page[kind] === 0 ? 'disabled' : ''}>◀</button>
        <span>${page[kind] + 1}/${totalPages}</span>
        <button type="button" data-next="${kind}" ${page[kind] >= totalPages - 1 ? 'disabled' : ''}>▶</button>
      `;
      container.appendChild(pager);
    }

    if (items.length > PAGE_SIZE) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lm-btn secondary lm-list-all-btn';
      btn.dataset.listAll = kind;
      btn.textContent = '一覧表示';
      container.appendChild(btn);
    }
  }

  function openListAllModal(kind) {
    const items = LM.get(LM.KEYS.WISHLIST, [])
      .filter((it) => (kind === 'unpurchased' ? !it.purchased : it.purchased))
      .sort((a, b) => b.desire - a.desire);
    const wrap = document.createElement('div');
    items.forEach((it) => wrap.appendChild(renderItemBox(it)));
    LM.openModal(kind === 'unpurchased' ? '未購入 一覧' : '購入済み 一覧', wrap);
  }

  function renderItemBox(it) {
    const box = document.createElement('div');
    box.style.padding = '10px 0';
    box.style.borderBottom = '1px solid var(--paper-line)';
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
        <strong>${escapeHtml(it.name)}</strong>
        <span>¥${it.price.toLocaleString()}</span>
      </div>
      <div style="font-size:12px; color:var(--text-soft); margin:2px 0 6px;">
        ${escapeHtml(it.category)} ・ ${'★'.repeat(it.desire)}${'☆'.repeat(5 - it.desire)} ${it.planThisMonth ? '・ 今月買う予定' : ''}
        ${it.url ? ` ・ <a href="${escapeHtml(it.url)}" target="_blank" rel="noopener">販売ページ</a>` : ''}
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" data-toggle-purchased="${it.id}" class="lm-btn secondary" style="padding:4px 10px; font-size:12px;">
          ${it.purchased ? '未購入に戻す' : '購入済みにする'}
        </button>
        <button type="button" data-edit="${it.id}" class="lm-btn secondary" style="padding:4px 10px; font-size:12px;">編集</button>
        <button type="button" data-delete="${it.id}" class="lm-btn secondary" style="padding:4px 10px; font-size:12px;">削除</button>
      </div>
    `;
    return box;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
