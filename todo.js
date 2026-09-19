(function () {
  const groupsEl = document.getElementById('todo-groups');
  const weeklyGridEl = document.getElementById('weekly-grid');
  const weeklyCountEl = document.getElementById('weekly-count');
  const rewardBoxEl = document.getElementById('reward-box');

  let state = LM.getTodoState();

  renderGroups();
  renderWeeklyGrid();
  LM.renderNav(document.getElementById('nav-container'));

  document.getElementById('daily-reset-btn').addEventListener('click', () => {
    const ok = confirm('タスクをリセットします。よろしいですか?\n(週間クリア記録は消えません)');
    if (!ok) return;
    state.dailyTasks = LM.defaultTodoTasks();
    state.reflected = LM.defaultTodoReflected();
    LM.saveTodoState(state);
    renderGroups();
    renderWeeklyGrid();
  });

  function renderGroups() {
    groupsEl.innerHTML = '';
    LM.TODO_GROUPS.forEach((g) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'lm-todo-group';

      const label = document.createElement('div');
      label.className = 'lm-todo-group-label' + (g.isMain ? ' is-main' : '');
      label.innerHTML = `<span>${g.label}</span><span class="count">${g.ids.length}</span>`;
      groupEl.appendChild(label);

      g.ids.forEach((id, idx) => {
        const task = state.dailyTasks[id];
        const row = document.createElement('div');
        row.className = 'lm-todo-row' + (task.checked ? ' is-checked' : '');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.checked;
        checkbox.addEventListener('change', () => {
          LM.toggleTodoCheck(state, id, checkbox.checked);
          row.classList.toggle('is-checked', checkbox.checked);
          renderWeeklyGrid();
        });

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        const num = g.ids.length > 1 ? '①②③'[idx] || String(idx + 1) : '';
        nameInput.placeholder = `${g.label}${num} のタスク`;
        nameInput.value = task.name;
        nameInput.addEventListener('input', () => {
          state.dailyTasks[id].name = nameInput.value;
          LM.saveTodoState(state);
        });

        row.appendChild(checkbox);
        row.appendChild(nameInput);
        groupEl.appendChild(row);
      });

      groupsEl.appendChild(groupEl);
    });
  }

  function renderWeeklyGrid() {
    weeklyGridEl.innerHTML = '';
    for (let i = 1; i <= LM.TODO_WEEK_TOTAL; i++) {
      const cell = document.createElement('div');
      cell.className = 'lm-week-cell' + (i <= state.weeklyClears ? ' is-filled' : '');
      weeklyGridEl.appendChild(cell);
    }
    weeklyCountEl.textContent = `${state.weeklyClears} / ${LM.TODO_WEEK_TOTAL}`;
    rewardBoxEl.style.display = state.weeklyClears >= LM.TODO_WEEK_TOTAL ? 'block' : 'none';
  }
})();
