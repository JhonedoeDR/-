(function () {
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

  render();
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

  [unpurchasedEl, purchasedEl].forEach((el) => el.addEventListener('click', onListClick));

  function onListClick(e) {
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    const toggleId = e.target.dataset.togglePurchased;

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
      render();
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
    const unpurchased = items.filter((it) => !it.purchased);
    const purchased = items.filter((it) => it.purchased);

    renderList(unpurchasedEl, unpurchased, 'まだ何も登録されていません');
    renderList(purchasedEl, purchased, '購入済みのものはまだありません');
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

  function renderList(container, items, emptyText) {
    if (items.length === 0) {
      container.innerHTML = `<p class="lm-empty">${emptyText}</p>`;
      return;
    }

    const sorted = [...items].sort((a, b) => b.desire - a.desire);
    container.innerHTML = '';
    sorted.forEach((it) => {
      const box = document.createElement('div');
      box.style.padding = '10px 0';
      box.style.borderBottom = '1px solid var(--paper-line)';
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong>${escapeHtml(it.name)}</strong>
          <span>¥${it.price.toLocaleString()}</span>
        </div>
        <div style="font-size:12px; color:var(--text-soft); margin:2px 0 6px;">
          ${escapeHtml(it.category)} ・ 欲しい度${it.desire} ${it.planThisMonth ? '・ 今月買う予定' : ''}
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
      container.appendChild(box);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
