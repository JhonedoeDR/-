(function () {
  const today = LM.todayStr();
  const MAIN_LIMIT = 3;

  const form = document.getElementById('task-form');
  const input = document.getElementById('f-task-text');
  const listEl = document.getElementById('tasks-list');
  const countEl = document.getElementById('tasks-count');

  render();
  LM.renderNav(document.getElementById('nav-container'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const allTasks = LM.get(LM.KEYS.TASKS, {});
    const list = allTasks[today] || [];
    list.push({ id: LM.uid(), text, done: false, main: false });
    allTasks[today] = list;
    LM.set(LM.KEYS.TASKS, allTasks);
    input.value = '';
    render();
  });

  function render() {
    const allTasks = LM.get(LM.KEYS.TASKS, {});
    const tasks = allTasks[today] || [];
    if (tasks.length === 0) {
      countEl.textContent = '';
      listEl.innerHTML = '<p class="lm-empty">今日のタスクはありません</p>';
      return;
    }
    const doneCount = tasks.filter((t) => t.done).length;
    countEl.textContent = `${doneCount}/${tasks.length}`;

    const ul = document.createElement('ul');
    ul.className = 'lm-check-list';
    tasks.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'lm-check-item' + (t.done ? ' done' : '');
      li.style.flexWrap = 'wrap';
      li.style.justifyContent = 'space-between';
      li.innerHTML = `
        <label style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
          <input type="checkbox" ${t.done ? 'checked' : ''} data-task-id="${t.id}" />
          <span style="overflow-wrap:anywhere;">${escapeHtml(t.text)}</span>
        </label>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button type="button" data-toggle-main="${t.id}" class="lm-btn secondary" style="padding:4px 8px; font-size:12px;${t.main ? ' border-color:var(--accent); color:var(--accent);' : ''}">${t.main ? 'メイン解除' : 'メインに設定'}</button>
          <button type="button" data-delete-task="${t.id}" class="lm-btn secondary" style="padding:4px 8px; font-size:12px;">削除</button>
        </div>
      `;
      ul.appendChild(li);
    });
    listEl.innerHTML = '';
    listEl.appendChild(ul);

    ul.addEventListener('change', (e) => {
      const checkbox = e.target;
      if (checkbox.type !== 'checkbox') return;
      const taskId = checkbox.dataset.taskId;
      const allTasks2 = LM.get(LM.KEYS.TASKS, {});
      const list = allTasks2[today] || [];
      const task = list.find((t) => t.id === taskId);
      if (task) task.done = checkbox.checked;
      allTasks2[today] = list;
      LM.set(LM.KEYS.TASKS, allTasks2);
      render();
    });

    ul.addEventListener('click', (e) => {
      const delId = e.target.dataset.deleteTask;
      const mainId = e.target.dataset.toggleMain;

      if (delId) {
        if (!confirm('削除しますか?')) return;
        const allTasks2 = LM.get(LM.KEYS.TASKS, {});
        allTasks2[today] = (allTasks2[today] || []).filter((t) => t.id !== delId);
        LM.set(LM.KEYS.TASKS, allTasks2);
        render();
      }

      if (mainId) {
        const allTasks2 = LM.get(LM.KEYS.TASKS, {});
        const list2 = allTasks2[today] || [];
        const task = list2.find((t) => t.id === mainId);
        if (task) {
          if (!task.main) {
            const mainCount = list2.filter((t) => t.main).length;
            if (mainCount >= MAIN_LIMIT) {
              LM.showToast(`メインタスクは${MAIN_LIMIT}件までです`, 'error');
              return;
            }
          }
          task.main = !task.main;
        }
        allTasks2[today] = list2;
        LM.set(LM.KEYS.TASKS, allTasks2);
        render();
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
