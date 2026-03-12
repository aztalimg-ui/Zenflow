/* ═══════════════════════════════════════════════════
   ZENFLOW — App Core
   ═══════════════════════════════════════════════════ */

// ──── DATA LAYER ────
const Store = {
    get(key, def) { try { return JSON.parse(localStorage.getItem(`zf_${key}`)) ?? def; } catch { return def; } },
    set(key, val) { localStorage.setItem(`zf_${key}`, JSON.stringify(val)); },
    tasks: () => Store.get('tasks', []),
    saveTasks: (t) => Store.set('tasks', t),
    categories: () => Store.get('categories', [
        { id: 'cat-1', name: 'Work', color: '#6366f1' },
        { id: 'cat-2', name: 'Personal', color: '#22c55e' },
        { id: 'cat-3', name: 'Health', color: '#f43f5e' }
    ]),
    saveCategories: (c) => Store.set('categories', c),
    pomoSessions: () => Store.get('pomo', []),
    savePomo: (p) => Store.set('pomo', p),
    theme: () => Store.get('theme', 'dark'),
    streak: () => Store.get('streak', { count: 0, lastDate: null }),
    saveStreak: (s) => Store.set('streak', s),
    activity: () => Store.get('activity', {}),
    saveActivity: (a) => Store.set('activity', a),
    aiThreads: () => Store.get('ai_threads', []),
    saveAiThreads: (th) => Store.set('ai_threads', th)
};

// ──── UTILITY ────
const uid = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const today = () => new Date().toISOString().split('T')[0];
const daysBetween = (a, b) => Math.ceil((new Date(a) - new Date(b)) / 86400000);

function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(i18n.getLocale(), { month: 'short', day: 'numeric' });
}

// ──── TOAST ────
function toast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
    $('#toastContainer').appendChild(el);
    setTimeout(() => { el.classList.add('exit'); setTimeout(() => el.remove(), 300); }, 3000);
}

// ──── MAIN APP ────
const app = {
    currentView: 'dashboard',
    editingTaskId: null,
    calDate: new Date(),
    calSelected: null,
    pomoState: { running: false, timeLeft: 25 * 60, duration: 25, interval: null, mode: 'focus' },
    charts: {},

    init() {
        this.initTheme();
        this.initSplash();
        this.bindEvents();
        this.updateStreak();
        setTimeout(() => {
            this.renderAll();
            this.initCharts();
            this.initAI();
            this.initPomoSettings();
            i18n.applyTranslations();
            this.initDeviceMode();
        }, 100);
    },

    // ──── DEVICE SWITCHER ────
    initDeviceMode() {
        const savedMode = Store.get('device_mode', 'desktop');
        this.setDeviceMode(savedMode);

        $$('.device-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.device;
                this.setDeviceMode(mode);
            });
        });
    },

    setDeviceMode(mode) {
        document.body.classList.remove('view-mobile', 'view-tablet');
        
        if (mode === 'mobile') {
            document.body.classList.add('view-mobile');
        } else if (mode === 'tablet') {
            document.body.classList.add('view-tablet');
        }

        $$('.device-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.device === mode);
        });

        Store.set('device_mode', mode);

        if (this.currentView === 'analytics') {
            setTimeout(() => this.updateCharts(), 300);
        }
    },

    // ──── SPLASH ────
    initSplash() {
        const canvas = $('#particleCanvas');
        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                r: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.1
            });
        }

        let animId;
        function draw() {
            ctx.clearRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
                ctx.fill();
            });
            // connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - dist / 120)})`;
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        }
        draw();

        setTimeout(() => {
            $('#splash').classList.add('exit');
            setTimeout(() => {
                cancelAnimationFrame(animId);
                $('#splash').remove();
                $('#app').classList.remove('hidden');
            }, 800);
        }, 4000);
    },

    // ──── THEME ────
    initTheme() {
        const t = Store.theme();
        document.documentElement.setAttribute('data-theme', t);
    },
    toggleTheme() {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        Store.set('theme', next);
        this.updateCharts();
        toast(`${i18n.t('toast_theme_switch')} ${next} ${i18n.t('toast_mode')}`, 'info');
    },

    // ──── NAVIGATION ────
    switchView(view) {
        this.currentView = view;
        $$('.view').forEach(v => v.classList.remove('active'));
        $(`#view-${view}`).classList.add('active');
        $$('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        this.renderAll();
        if (view === 'analytics') setTimeout(() => this.updateCharts(), 100);
        if (view === 'calendar') this.renderCalendar();
        if (view === 'pomodoro') this.renderPomoTaskSelect();
    },

    // ──── EVENTS ────
    bindEvents() {
        // Navigation
        $$('.nav-item[data-view]').forEach(n => n.addEventListener('click', () => this.switchView(n.dataset.view)));
        // Sidebar
        $('#sidebarToggle').addEventListener('click', () => $('#sidebar').classList.toggle('collapsed'));
        $('#mobileSidebarToggle')?.addEventListener('click', () => this.toggleMobileSidebar());
        // Theme
        $('#themeToggle').addEventListener('click', () => this.toggleTheme());
        // Add Task
        $('#addTaskBtn').addEventListener('click', () => this.openTaskModal());
        $$('.add-col-task').forEach(b => b.addEventListener('click', () => this.openTaskModal(b.dataset.status)));
        // Task Form
        $('#taskForm').addEventListener('submit', (e) => { e.preventDefault(); this.saveTask(); });
        $('#modalClose').addEventListener('click', () => this.closeTaskModal());
        $('#cancelTaskBtn').addEventListener('click', () => this.closeTaskModal());
        $('#deleteTaskBtn').addEventListener('click', () => this.deleteTask());
        // Subtasks
        $('#addSubtaskBtn').addEventListener('click', () => this.addSubtask());
        $('#subtaskInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addSubtask(); } });
        // Categories
        $('#addCategoryBtn').addEventListener('click', () => this.openCategoryModal());
        $('#categoryForm').addEventListener('submit', (e) => { e.preventDefault(); this.saveCategory(); });
        $('#catModalClose').addEventListener('click', () => this.closeCategoryModal());
        $('#cancelCatBtn').addEventListener('click', () => this.closeCategoryModal());
        $('#deleteCatBtn').addEventListener('click', () => this.deleteCategory());
        // Color picker
        $$('#colorPicker .color-swatch').forEach(s => {
            s.addEventListener('click', () => {
                $$('#colorPicker .color-swatch').forEach(x => x.classList.remove('active'));
                s.classList.add('active');
            });
        });
        // Search
        $('#searchInput').addEventListener('input', () => this.renderKanban());
        // Filters
        $('#filterPriority').addEventListener('change', () => this.renderKanban());
        $('#filterCategory').addEventListener('change', () => this.renderKanban());
        // Calendar
        $('#calPrev').addEventListener('click', () => { this.calDate.setMonth(this.calDate.getMonth() - 1); this.renderCalendar(); });
        $('#calNext').addEventListener('click', () => { this.calDate.setMonth(this.calDate.getMonth() + 1); this.renderCalendar(); });
        $('#calToday').addEventListener('click', () => { this.calDate = new Date(); this.renderCalendar(); });
        // Pomodoro
        $$('.pomo-tab').forEach(t => t.addEventListener('click', () => this.setPomoMode(t)));
        $('#pomoStart').addEventListener('click', () => this.togglePomo());
        $('#pomoReset').addEventListener('click', () => this.resetPomo());
        // Export/Import
        $('#exportBtn').addEventListener('click', () => this.exportData());
        $('#importBtn').addEventListener('click', () => $('#importFile').click());
        $('#importFile').addEventListener('change', (e) => this.importData(e));
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleShortcut(e));
        // Close modals on overlay click
        $$('.modal-overlay').forEach(o => o.addEventListener('click', (e) => {
            if (e.target === o) o.classList.add('hidden');
        }));
        // Analytics period
        $('#analyticsPeriod')?.addEventListener('change', () => this.updateCharts());
    },

    toggleMobileSidebar() {
        const sb = $('#sidebar');
        if (sb.classList.contains('mobile-open')) {
            sb.classList.remove('mobile-open');
            document.querySelector('.sidebar-backdrop')?.remove();
        } else {
            sb.classList.add('mobile-open');
            const bk = document.createElement('div');
            bk.className = 'sidebar-backdrop';
            bk.onclick = () => this.toggleMobileSidebar();
            document.body.appendChild(bk);
        }
    },

    handleShortcut(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') { this.closeTaskModal(); this.closeCategoryModal(); }
            return;
        }
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); $('#searchInput').focus(); return; }
        switch (e.key) {
            case 'n': case 'N': this.openTaskModal(); break;
            case '1': this.switchView('dashboard'); break;
            case '2': this.switchView('kanban'); break;
            case '3': this.switchView('calendar'); break;
            case '4': this.switchView('analytics'); break;
            case '5': this.switchView('pomodoro'); break;
            case '6': this.switchView('aiplanner'); break;
            case 'd': case 'D': this.toggleTheme(); break;
            case '?': $('#shortcutsModal').classList.remove('hidden'); break;
            case 'Escape':
                this.closeTaskModal(); this.closeCategoryModal();
                $('#shortcutsModal').classList.add('hidden');
                break;
        }
    },

    // ──── RENDER ALL ────
    renderAll() {
        this.renderDashboard();
        this.renderKanban();
        this.renderCategories();
        this.renderTopStats();
        this.renderFilterCategories();
        i18n.applyTranslations();
    },

    // ──── TOP STATS ────
    renderTopStats() {
        const tasks = Store.tasks();
        $('#todoCount').textContent = tasks.filter(t => t.status === 'todo').length;
        $('#progressCount').textContent = tasks.filter(t => t.status === 'inprogress').length;
        $('#doneCount').textContent = tasks.filter(t => t.status === 'done').length;
    },

    // ──── DASHBOARD ────
    renderDashboard() {
        const tasks = Store.tasks();
        const done = tasks.filter(t => t.status === 'done');
        const streak = Store.streak();
        const sessions = Store.pomoSessions();
        const totalMins = sessions.reduce((a, s) => a + (s.duration || 25), 0);

        // Greeting
        const h = new Date().getHours();
        $('#greeting').textContent = h < 12 ? i18n.t('greeting_morning') : h < 17 ? i18n.t('greeting_afternoon') : i18n.t('greeting_evening');
        $('#dateDisplay').textContent = new Date().toLocaleDateString(i18n.getLocale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        // Stats
        $('#dashTotalValue').textContent = tasks.length;
        $('#dashCompletedValue').textContent = done.length;
        $('#dashStreakValue').textContent = streak.count;
        $('#dashFocusValue').textContent = totalMins >= 60 ? Math.floor(totalMins / 60) + 'h' : totalMins + 'm';

        // Recent tasks
        const recent = [...tasks].sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')).slice(0, 5);
        const recentEl = $('#recentTasks');
        const emptyEl = $('#emptyRecent');
        if (recent.length === 0) {
            recentEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
        } else {
            emptyEl.classList.add('hidden');
            recentEl.innerHTML = recent.map(t => `
                <div class="recent-task-item" onclick="app.openTaskModal(null, '${t.id}')">
                    <div class="recent-task-check ${t.status === 'done' ? 'checked' : ''}" onclick="event.stopPropagation(); app.quickToggle('${t.id}')"></div>
                    <div class="recent-task-info">
                        <div class="recent-task-title ${t.status === 'done' ? 'completed' : ''}">${this.esc(t.title)}</div>
                        <div class="recent-task-meta">
                            <span>${this.priorityEmoji(t.priority)} ${t.priority}</span>
                            ${t.dueDate ? `<span>📅 ${formatDate(t.dueDate)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Upcoming deadlines
        const upcoming = tasks.filter(t => t.dueDate && t.status !== 'done')
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
        const upEl = $('#upcomingDeadlines');
        const emptyDl = $('#emptyDeadlines');
        if (upcoming.length === 0) {
            upEl.innerHTML = '';
            emptyDl.classList.remove('hidden');
        } else {
            emptyDl.classList.add('hidden');
            upEl.innerHTML = upcoming.map(t => {
                const diff = daysBetween(t.dueDate, today());
                const cls = diff < 0 ? 'overdue' : diff === 0 ? 'today' : '';
                const label = diff < 0 ? `${Math.abs(diff)}${i18n.t('days_suffix')} ${i18n.t('overdue_label')}` : diff === 0 ? i18n.t('today_label') : `${i18n.t('in_days')} ${diff}${i18n.t('days_suffix')}`;
                return `<div class="upcoming-item ${cls}" onclick="app.openTaskModal(null, '${t.id}')">
                    <span>${this.esc(t.title)}</span>
                    <span class="upcoming-date ${cls}">${label}</span>
                </div>`;
            }).join('');
        }
    },

    quickToggle(id) {
        const tasks = Store.tasks();
        const t = tasks.find(x => x.id === id);
        if (!t) return;
        t.status = t.status === 'done' ? 'todo' : 'done';
        t.updatedAt = new Date().toISOString();
        if (t.status === 'done') this.recordActivity();
        Store.saveTasks(tasks);
        this.renderAll();
        toast(t.status === 'done' ? i18n.t('toast_task_completed') : i18n.t('toast_task_reopened'), 'success');
    },

    // ──── KANBAN ────
    renderKanban() {
        let tasks = Store.tasks();
        const search = $('#searchInput').value.toLowerCase();
        const pFilter = $('#filterPriority').value;
        const cFilter = $('#filterCategory').value;

        if (search) tasks = tasks.filter(t => t.title.toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search));
        if (pFilter) tasks = tasks.filter(t => t.priority === pFilter);
        if (cFilter) tasks = tasks.filter(t => t.category === cFilter);

        ['todo', 'inprogress', 'done'].forEach(status => {
            const col = $(`#${status}Tasks`);
            const filtered = tasks.filter(t => t.status === status);
            const countId = status === 'todo' ? 'colTodoCount' : status === 'inprogress' ? 'colProgressCount' : 'colDoneCount';
            $(`#${countId}`).textContent = filtered.length;

            col.innerHTML = filtered.map(t => this.renderTaskCard(t)).join('');

            // Drag & drop
            col.querySelectorAll('.task-card').forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    card.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', card.dataset.id);
                    e.dataTransfer.effectAllowed = 'move';
                });
                card.addEventListener('dragend', () => card.classList.remove('dragging'));
            });
        });

        // Column drop zones
        $$('.kanban-column').forEach(col => {
            col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
            col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const id = e.dataTransfer.getData('text/plain');
                const newStatus = col.dataset.status;
                const tasks = Store.tasks();
                const task = tasks.find(t => t.id === id);
                if (task && task.status !== newStatus) {
                    task.status = newStatus;
                    task.updatedAt = new Date().toISOString();
                    if (newStatus === 'done') this.recordActivity();
                    Store.saveTasks(tasks);
                    this.renderAll();
                    if (newStatus === 'done') toast(i18n.t('toast_task_completed'), 'success');
                }
            });
        });
    },

    renderTaskCard(t) {
        const cats = Store.categories();
        const cat = cats.find(c => c.id === t.category);
        const subtasks = t.subtasks || [];
        const doneSubs = subtasks.filter(s => s.done).length;
        const dueClass = t.dueDate ? (daysBetween(t.dueDate, today()) < 0 ? 'overdue' : daysBetween(t.dueDate, today()) === 0 ? 'today' : '') : '';

        return `<div class="task-card" draggable="true" data-id="${t.id}" ondblclick="app.openTaskModal(null, '${t.id}')">
            <div class="task-card-priority ${t.priority}"></div>
            <div class="task-card-header">
                <span class="task-card-title ${t.status === 'done' ? 'completed' : ''}">${this.esc(t.title)}</span>
                <div class="task-card-actions">
                    <button class="icon-btn" onclick="app.openTaskModal(null, '${t.id}')" aria-label="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                </div>
            </div>
            ${t.description ? `<div class="task-card-desc">${this.esc(t.description)}</div>` : ''}
            ${t.tags && t.tags.length ? `<div class="task-card-tags">${t.tags.map(tg => `<span class="task-tag">${this.esc(tg)}</span>`).join('')}</div>` : ''}
            <div class="task-card-footer">
                <div>
                    ${cat ? `<span class="task-category-badge" style="color:${cat.color}; background:${cat.color}15"><span class="category-dot" style="background:${cat.color}"></span>${this.esc(cat.name)}</span>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    ${subtasks.length ? `<span class="task-subtask-progress"><div class="subtask-bar"><div class="subtask-fill" style="width:${subtasks.length ? (doneSubs / subtasks.length * 100) : 0}%"></div></div>${doneSubs}/${subtasks.length}</span>` : ''}
                    ${t.dueDate ? `<span class="task-due ${dueClass}">📅 ${formatDate(t.dueDate)}</span>` : ''}
                </div>
            </div>
        </div>`;
    },

    // ──── TASK MODAL ────
    openTaskModal(status, editId) {
        const modal = $('#taskModal');
        modal.classList.remove('hidden');
        this.editingTaskId = editId || null;

        if (editId) {
            const t = Store.tasks().find(x => x.id === editId);
            if (!t) return;
            $('#modalTitle').textContent = i18n.t('edit_task');
            $('#taskTitle').value = t.title;
            $('#taskDesc').value = t.description || '';
            $('#taskPriority').value = t.priority;
            $('#taskStatus').value = t.status;
            $('#taskDue').value = t.dueDate || '';
            $('#taskCategory').value = t.category || '';
            $('#taskTags').value = (t.tags || []).join(', ');
            $('#taskId').value = t.id;
            $('#deleteTaskBtn').classList.remove('hidden');
            this.renderSubtaskList(t.subtasks || []);
        } else {
            $('#modalTitle').textContent = i18n.t('new_task_modal');
            $('#taskForm').reset();
            if (status) $('#taskStatus').value = status;
            $('#taskId').value = '';
            $('#deleteTaskBtn').classList.add('hidden');
            $('#subtaskList').innerHTML = '';
        }
        this.renderFilterCategories();
        setTimeout(() => $('#taskTitle').focus(), 100);
    },

    closeTaskModal() {
        $('#taskModal').classList.add('hidden');
        this.editingTaskId = null;
    },

    saveTask() {
        const title = $('#taskTitle').value.trim();
        if (!title) return;

        const tasks = Store.tasks();
        const subtaskEls = $$('#subtaskList .subtask-item');
        const subtasks = Array.from(subtaskEls).map(el => ({
            id: el.dataset.id,
            text: el.querySelector('span').textContent,
            done: el.querySelector('input[type=checkbox]').checked
        }));

        const tags = $('#taskTags').value.split(',').map(t => t.trim()).filter(Boolean);
        const taskData = {
            title,
            description: $('#taskDesc').value.trim(),
            priority: $('#taskPriority').value,
            status: $('#taskStatus').value,
            dueDate: $('#taskDue').value || null,
            category: $('#taskCategory').value || null,
            tags, subtasks,
            updatedAt: new Date().toISOString()
        };

        if (this.editingTaskId) {
            const idx = tasks.findIndex(t => t.id === this.editingTaskId);
            if (idx !== -1) {
                const wasNotDone = tasks[idx].status !== 'done';
                tasks[idx] = { ...tasks[idx], ...taskData };
                if (wasNotDone && taskData.status === 'done') this.recordActivity();
            }
        } else {
            taskData.id = uid();
            taskData.createdAt = new Date().toISOString();
            tasks.unshift(taskData);
            if (taskData.status === 'done') this.recordActivity();
        }

        Store.saveTasks(tasks);
        this.closeTaskModal();
        this.renderAll();
        toast(this.editingTaskId ? i18n.t('toast_task_updated') : i18n.t('toast_task_created'), 'success');
    },

    deleteTask() {
        if (!this.editingTaskId) return;
        let tasks = Store.tasks();
        tasks = tasks.filter(t => t.id !== this.editingTaskId);
        Store.saveTasks(tasks);
        this.closeTaskModal();
        this.renderAll();
        toast(i18n.t('toast_task_deleted'), 'warning');
    },

    addSubtask() {
        const input = $('#subtaskInput');
        const text = input.value.trim();
        if (!text) return;
        const list = $('#subtaskList');
        const id = uid();
        const el = document.createElement('div');
        el.className = 'subtask-item';
        el.dataset.id = id;
        el.innerHTML = `<input type="checkbox"><span>${this.esc(text)}</span>
            <button type="button" class="icon-btn" onclick="this.parentElement.remove()" aria-label="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>`;
        el.querySelector('input[type=checkbox]').addEventListener('change', function () {
            el.querySelector('span').classList.toggle('done', this.checked);
        });
        list.appendChild(el);
        input.value = '';
        input.focus();
    },

    renderSubtaskList(subtasks) {
        const list = $('#subtaskList');
        list.innerHTML = '';
        subtasks.forEach(s => {
            const el = document.createElement('div');
            el.className = 'subtask-item';
            el.dataset.id = s.id;
            el.innerHTML = `<input type="checkbox" ${s.done ? 'checked' : ''}><span class="${s.done ? 'done' : ''}">${this.esc(s.text)}</span>
                <button type="button" class="icon-btn" onclick="this.parentElement.remove()" aria-label="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>`;
            el.querySelector('input[type=checkbox]').addEventListener('change', function () {
                el.querySelector('span').classList.toggle('done', this.checked);
            });
            list.appendChild(el);
        });
    },

    // ──── CATEGORIES ────
    renderCategories() {
        const cats = Store.categories();
        const tasks = Store.tasks();
        $('#categoryList').innerHTML = cats.map(c => {
            const count = tasks.filter(t => t.category === c.id).length;
            return `<button class="category-item" onclick="app.openCategoryModal('${c.id}')">
                <span class="category-dot" style="background:${c.color}"></span>
                <span>${this.esc(c.name)}</span>
                <span class="category-count">${count}</span>
            </button>`;
        }).join('');
    },

    renderFilterCategories() {
        const cats = Store.categories();
        const sel = $('#filterCategory');
        const taskCat = $('#taskCategory');
        const opts = `<option value="">${i18n.t('all_categories')}</option>` + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const taskOpts = `<option value="">${i18n.t('no_category')}</option>` + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        sel.innerHTML = opts;
        taskCat.innerHTML = taskOpts;
        if (this.editingTaskId) {
            const t = Store.tasks().find(x => x.id === this.editingTaskId);
            if (t) taskCat.value = t.category || '';
        }
    },

    openCategoryModal(editId) {
        const modal = $('#categoryModal');
        modal.classList.remove('hidden');
        if (editId) {
            const c = Store.categories().find(x => x.id === editId);
            if (!c) return;
            $('#catModalTitle').textContent = i18n.t('edit_category');
            $('#catName').value = c.name;
            $('#catId').value = c.id;
            $$('#colorPicker .color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === c.color));
            $('#deleteCatBtn').classList.remove('hidden');
        } else {
            $('#catModalTitle').textContent = i18n.t('new_category');
            $('#categoryForm').reset();
            $('#catId').value = '';
            $$('#colorPicker .color-swatch').forEach((s, i) => s.classList.toggle('active', i === 0));
            $('#deleteCatBtn').classList.add('hidden');
        }
    },

    closeCategoryModal() { $('#categoryModal').classList.add('hidden'); },

    saveCategory() {
        const name = $('#catName').value.trim();
        if (!name) return;
        const color = $('#colorPicker .color-swatch.active')?.dataset.color || '#6366f1';
        const cats = Store.categories();
        const editId = $('#catId').value;
        if (editId) {
            const c = cats.find(x => x.id === editId);
            if (c) { c.name = name; c.color = color; }
        } else {
            cats.push({ id: uid(), name, color });
        }
        Store.saveCategories(cats);
        this.closeCategoryModal();
        this.renderAll();
        toast(i18n.t('toast_category_saved'), 'success');
    },

    deleteCategory() {
        const id = $('#catId').value;
        if (!id) return;
        Store.saveCategories(Store.categories().filter(c => c.id !== id));
        const tasks = Store.tasks();
        tasks.forEach(t => { if (t.category === id) t.category = null; });
        Store.saveTasks(tasks);
        this.closeCategoryModal();
        this.renderAll();
        toast(i18n.t('toast_category_deleted'), 'warning');
    },

    // ──── CALENDAR ────
    renderCalendar() {
        const d = this.calDate;
        const year = d.getFullYear(), month = d.getMonth();
        $('#calMonthYear').textContent = d.toLocaleDateString(i18n.getLocale(), { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const tasks = Store.tasks();
        const todayStr = today();
        let html = '';

        // Previous month padding
        const prevLast = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<div class="cal-day other-month"><span class="cal-day-number">${prevLast - i}</span></div>`;
        }

        // Current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const sel = this.calSelected === dateStr;
            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
            const hasTasks = dayTasks.length > 0;

            // Render task labels (max 3 visible)
            let taskLabels = '';
            if (dayTasks.length > 0) {
                const visible = dayTasks.slice(0, 3);
                taskLabels = visible.map(t => {
                    const color = t.priority === 'critical' ? '#f43f5e' : t.priority === 'high' ? '#f97316' : t.priority === 'medium' ? '#f59e0b' : '#10b981';
                    const doneClass = t.status === 'done' ? ' cal-task-done' : '';
                    return `<div class="cal-task-label${doneClass}" style="--task-color:${color}" title="${this.esc(t.title)}">${this.esc(t.title)}</div>`;
                }).join('');
                if (dayTasks.length > 3) {
                    taskLabels += `<div class="cal-task-more">+${dayTasks.length - 3}</div>`;
                }
            }

            html += `<div class="cal-day ${isToday ? 'today' : ''} ${sel ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''}" onclick="app.selectCalDay('${dateStr}')">
                <span class="cal-day-number">${day}</span>
                <div class="cal-day-tasks">${taskLabels}</div>
            </div>`;
        }

        // Next month padding
        const totalCells = startDay + lastDay.getDate();
        const remaining = (7 - totalCells % 7) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="cal-day other-month"><span class="cal-day-number">${i}</span></div>`;
        }

        $('#calendarDays').innerHTML = html;
    },

    selectCalDay(dateStr) {
        this.calSelected = dateStr;
        this.renderCalendar();
        const tasks = Store.tasks().filter(t => t.dueDate === dateStr);
        const detail = $('#calDayDetail');
        if (tasks.length) {
            detail.classList.remove('hidden');
            $('#calDetailDate').textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString(i18n.getLocale(), { weekday: 'long', month: 'long', day: 'numeric' });
            $('#calDetailTasks').innerHTML = tasks.map(t => `
                <div class="recent-task-item" onclick="app.openTaskModal(null, '${t.id}')">
                    <div class="recent-task-check ${t.status === 'done' ? 'checked' : ''}"></div>
                    <div class="recent-task-info">
                        <div class="recent-task-title ${t.status === 'done' ? 'completed' : ''}">${this.esc(t.title)}</div>
                        <div class="recent-task-meta"><span>${this.priorityEmoji(t.priority)} ${t.priority}</span></div>
                    </div>
                </div>
            `).join('');
        } else {
            detail.classList.add('hidden');
        }
    },

    // ──── POMODORO ────
    pomoSettings: null,

    getPomoSettings() {
        if (!this.pomoSettings) {
            this.pomoSettings = Store.get('pomoSettings', { focus: 25, short: 5, long: 15 });
        }
        return this.pomoSettings;
    },

    savePomoSettings(settings) {
        this.pomoSettings = settings;
        Store.set('pomoSettings', settings);
    },

    initPomoSettings() {
        const s = this.getPomoSettings();
        // Update tab data-duration attributes
        $$('.pomo-tab').forEach(tab => {
            const mode = tab.dataset.mode;
            if (mode === 'focus') tab.dataset.duration = s.focus;
            else if (mode === 'short') tab.dataset.duration = s.short;
            else if (mode === 'long') tab.dataset.duration = s.long;
        });
        // Update input values
        const fi = $('#pomoFocusInput');
        const si = $('#pomoShortInput');
        const li = $('#pomoLongInput');
        if (fi) fi.value = s.focus;
        if (si) si.value = s.short;
        if (li) li.value = s.long;
        // Update initial state
        this.pomoState.duration = s.focus;
        this.pomoState.timeLeft = s.focus * 60;

        // Settings toggle
        $('#pomoSettingsBtn').addEventListener('click', () => {
            $('#pomoSettingsPanel').classList.toggle('hidden');
        });

        // +/- buttons
        $$('.pomo-adj-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = $(`#${btn.dataset.target}`);
                const step = parseInt(btn.dataset.step);
                const min = parseInt(input.min) || 1;
                const max = parseInt(input.max) || 120;
                let val = parseInt(input.value) + step;
                val = Math.max(min, Math.min(max, val));
                input.value = val;
            });
        });

        // Save settings
        $('#pomoSaveSettings').addEventListener('click', () => {
            const focus = Math.max(1, Math.min(120, parseInt($('#pomoFocusInput').value) || 25));
            const short = Math.max(1, Math.min(60, parseInt($('#pomoShortInput').value) || 5));
            const long = Math.max(1, Math.min(60, parseInt($('#pomoLongInput').value) || 15));
            this.savePomoSettings({ focus, short, long });
            // Update tab durations
            $$('.pomo-tab').forEach(tab => {
                const mode = tab.dataset.mode;
                if (mode === 'focus') tab.dataset.duration = focus;
                else if (mode === 'short') tab.dataset.duration = short;
                else if (mode === 'long') tab.dataset.duration = long;
            });
            // Re-apply current active tab
            const activeTab = $('.pomo-tab.active');
            if (activeTab) {
                this.pomoState.duration = parseInt(activeTab.dataset.duration);
                this.resetPomo();
            }
            $('#pomoSettingsPanel').classList.add('hidden');
            toast(i18n.t('pomo_settings_saved'), 'success');
        });
    },

    setPomoMode(tab) {
        $$('.pomo-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const dur = parseInt(tab.dataset.duration);
        const mode = tab.dataset.mode;
        this.pomoState.duration = dur;
        this.pomoState.mode = mode === 'focus' ? 'focus' : 'break';
        this.resetPomo();
    },

    togglePomo() {
        if (this.pomoState.running) {
            clearInterval(this.pomoState.interval);
            this.pomoState.running = false;
            $('#pomoStart span').textContent = i18n.t('resume');
        } else {
            this.pomoState.running = true;
            $('#pomoStart span').textContent = i18n.t('pause');
            this.pomoState.interval = setInterval(() => this.pomoTick(), 1000);
        }
    },

    pomoTick() {
        this.pomoState.timeLeft--;
        if (this.pomoState.timeLeft <= 0) {
            clearInterval(this.pomoState.interval);
            this.pomoState.running = false;
            if (this.pomoState.mode === 'focus') {
                const sessions = Store.pomoSessions();
                sessions.push({ date: today(), duration: this.pomoState.duration, task: $('#pomoTaskSelect').value || null });
                Store.savePomo(sessions);
                toast(i18n.t('toast_focus_done'), 'success');
            } else {
                toast(i18n.t('toast_break_done'), 'info');
            }
            this.resetPomo();
            this.renderPomoStats();
            return;
        }
        this.renderPomoDisplay();
    },

    resetPomo() {
        clearInterval(this.pomoState.interval);
        this.pomoState.running = false;
        this.pomoState.timeLeft = this.pomoState.duration * 60;
        $('#pomoStart span').textContent = this.pomoState.mode === 'focus' ? i18n.t('start_focus') : i18n.t('start_break');
        this.renderPomoDisplay();
        this.renderPomoStats();
    },

    renderPomoDisplay() {
        const mins = Math.floor(this.pomoState.timeLeft / 60);
        const secs = this.pomoState.timeLeft % 60;
        $('#timerMinutes').textContent = String(mins).padStart(2, '0');
        $('#timerSeconds').textContent = String(secs).padStart(2, '0');

        const total = this.pomoState.duration * 60;
        const progress = (total - this.pomoState.timeLeft) / total;
        const circumference = 2 * Math.PI * 120;
        $('#timerProgress').style.strokeDashoffset = circumference * (1 - progress);
        if (this.pomoState.mode === 'focus') {
            $('#timerProgress').style.stroke = 'var(--indigo)';
        } else {
            $('#timerProgress').style.stroke = 'var(--emerald)';
        }
    },

    renderPomoStats() {
        const sessions = Store.pomoSessions();
        const todaySessions = sessions.filter(s => s.date === today());
        const totalMins = sessions.reduce((a, s) => a + (s.duration || 25), 0);
        $('#pomoSessionsToday').textContent = todaySessions.length;
        $('#pomoTotalFocus').textContent = totalMins >= 60 ? Math.floor(totalMins / 60) + 'h' : totalMins + 'm';
        $('#pomoTotalSessions').textContent = sessions.length;
    },

    renderPomoTaskSelect() {
        const tasks = Store.tasks().filter(t => t.status !== 'done');
        $('#pomoTaskSelect').innerHTML = `<option value="">${i18n.t('no_task_selected')}</option>` +
            tasks.map(t => `<option value="${t.id}">${this.esc(t.title)}</option>`).join('');
        this.renderPomoStats();
    },

    // ──── ACTIVITY & STREAK ────
    recordActivity() {
        const act = Store.activity();
        const d = today();
        act[d] = (act[d] || 0) + 1;
        Store.saveActivity(act);
        this.updateStreak();
    },

    updateStreak() {
        const act = Store.activity();
        let streak = 0;
        let d = new Date();
        while (true) {
            const key = d.toISOString().split('T')[0];
            if (act[key] && act[key] > 0) { streak++; d.setDate(d.getDate() - 1); }
            else break;
        }
        Store.saveStreak({ count: streak, lastDate: today() });
    },

    // ──── CHARTS ────
    initCharts() {
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#a0a0c0';
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() || 'rgba(255,255,255,0.06)';
        const defaults = { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } }, scales: {} };

        // Dashboard week chart
        this.charts.dashWeek = new Chart($('#dashWeekChart'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: i18n.t('chart_tasks_done'), data: [], backgroundColor: 'rgba(99,102,241,0.6)', borderRadius: 6 }] },
            options: { ...defaults, scales: { x: { ticks: { color: textColor }, grid: { display: false } }, y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } } } }
        });

        this.charts.completion = new Chart($('#completionChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: i18n.t('chart_completed'), data: [], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointRadius: 4 }] },
            options: { ...defaults, scales: { x: { ticks: { color: textColor }, grid: { display: false } }, y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } } } }
        });

        this.charts.status = new Chart($('#statusChart'), {
            type: 'doughnut',
            data: { labels: [i18n.t('chart_to_do'), i18n.t('chart_in_progress'), i18n.t('chart_done')], datasets: [{ data: [0, 0, 0], backgroundColor: ['#818cf8', '#f59e0b', '#10b981'], borderWidth: 0 }] },
            options: { ...defaults, cutout: '65%' }
        });

        this.charts.priority = new Chart($('#priorityChart'), {
            type: 'doughnut',
            data: { labels: [i18n.t('chart_low'), i18n.t('chart_medium'), i18n.t('chart_high'), i18n.t('chart_critical')], datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#f43f5e'], borderWidth: 0 }] },
            options: { ...defaults, cutout: '65%' }
        });

        this.charts.category = new Chart($('#categoryChart'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: i18n.t('chart_tasks'), data: [], backgroundColor: [], borderRadius: 6 }] },
            options: { ...defaults, indexAxis: 'y', scales: { x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { display: false } } } }
        });

        this.charts.pomodoro = new Chart($('#pomodoroChart'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: i18n.t('chart_sessions'), data: [], backgroundColor: 'rgba(244,63,94,0.6)', borderRadius: 6 }] },
            options: { ...defaults, scales: { x: { ticks: { color: textColor }, grid: { display: false } }, y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } } } }
        });

        this.updateCharts();
        this.renderHeatmap();
    },

    updateCharts() {
        const tasks = Store.tasks();
        const act = Store.activity();
        const sessions = Store.pomoSessions();
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#a0a0c0';

        // Week data (last 7 days)
        const weekLabels = [], weekData = [], pomoWeekData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            weekLabels.push(d.toLocaleDateString(i18n.getLocale(), { weekday: 'short' }));
            weekData.push(act[key] || 0);
            pomoWeekData.push(sessions.filter(s => s.date === key).length);
        }

        // Dashboard week
        if (this.charts.dashWeek) {
            this.charts.dashWeek.data.labels = weekLabels;
            this.charts.dashWeek.data.datasets[0].data = weekData;
            this.charts.dashWeek.update();
        }

        // Completion trend
        if (this.charts.completion) {
            this.charts.completion.data.labels = weekLabels;
            this.charts.completion.data.datasets[0].data = weekData;
            this.charts.completion.update();
        }

        // Status
        if (this.charts.status) {
            this.charts.status.data.datasets[0].data = [
                tasks.filter(t => t.status === 'todo').length,
                tasks.filter(t => t.status === 'inprogress').length,
                tasks.filter(t => t.status === 'done').length
            ];
            this.charts.status.update();
        }

        // Priority
        if (this.charts.priority) {
            this.charts.priority.data.datasets[0].data = [
                tasks.filter(t => t.priority === 'low').length,
                tasks.filter(t => t.priority === 'medium').length,
                tasks.filter(t => t.priority === 'high').length,
                tasks.filter(t => t.priority === 'critical').length
            ];
            this.charts.priority.update();
        }

        // Category
        const cats = Store.categories();
        if (this.charts.category) {
            this.charts.category.data.labels = cats.map(c => c.name);
            this.charts.category.data.datasets[0].data = cats.map(c => tasks.filter(t => t.category === c.id).length);
            this.charts.category.data.datasets[0].backgroundColor = cats.map(c => c.color + 'aa');
            this.charts.category.update();
        }

        // Pomodoro
        if (this.charts.pomodoro) {
            this.charts.pomodoro.data.labels = weekLabels;
            this.charts.pomodoro.data.datasets[0].data = pomoWeekData;
            this.charts.pomodoro.update();
        }

        this.renderHeatmap();
    },

    renderHeatmap() {
        const act = Store.activity();
        const container = $('#heatmapContainer');
        if (!container) return;
        container.innerHTML = '';
        // Last 20 weeks
        const now = new Date();
        for (let w = 19; w >= 0; w--) {
            const weekDiv = document.createElement('div');
            weekDiv.className = 'heatmap-week';
            for (let d = 0; d < 7; d++) {
                const date = new Date(now);
                date.setDate(date.getDate() - (w * 7 + (6 - d)));
                const key = date.toISOString().split('T')[0];
                const count = act[key] || 0;
                const level = count === 0 ? '' : count <= 1 ? 'level-1' : count <= 3 ? 'level-2' : count <= 5 ? 'level-3' : 'level-4';
                const cell = document.createElement('div');
                cell.className = `heatmap-cell ${level}`;
                cell.title = `${key}: ${count} ${i18n.t('tasks_suffix')}`;
                weekDiv.appendChild(cell);
            }
            container.appendChild(weekDiv);
        }
    },

    // ──── EXPORT / IMPORT ────
    exportData() {
        const data = { tasks: Store.tasks(), categories: Store.categories(), pomo: Store.pomoSessions(), activity: Store.activity(), exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `zenflow-backup-${today()}.json`;
        a.click();
        toast(i18n.t('toast_export'), 'success');
    },

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.tasks) Store.saveTasks(data.tasks);
                if (data.categories) Store.saveCategories(data.categories);
                if (data.pomo) Store.savePomo(data.pomo);
                if (data.activity) Store.saveActivity(data.activity);
                this.renderAll();
                this.updateCharts();
                toast(i18n.t('toast_import'), 'success');
            } catch { toast(i18n.t('toast_import_error'), 'error'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    // ══════════════════════════════════════════
    // AI PLANNER
    // ══════════════════════════════════════════
    aiMessages: [],
    aiLoading: false,

    initAI() {
        // Bind AI events
        $('#aiSendBtn').addEventListener('click', () => this.aiSend());
        $('#aiInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.aiSend(); }
        });
        // Auto-grow textarea
        $('#aiInput').addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 160) + 'px';
        });
        // Settings toggle
        $('#aiSettingsBtn').addEventListener('click', () => {
            const panel = $('#aiKeyPanel');
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                const saved = localStorage.getItem('zf_ai_key');
                if (saved) $('#aiKeyInput').value = saved;
                $('#aiKeyInput').focus();
            }
        });
        // Save key
        $('#aiKeySaveBtn').addEventListener('click', () => {
            const key = $('#aiKeyInput').value.trim();
            if (key) {
                localStorage.setItem('zf_ai_key', key);
                $('#aiKeyPanel').classList.add('hidden');
                this.aiUpdateConnectedState();
                toast(i18n.t('ai_key_saved'), 'success');
            }
        });
        // History Modal
        $('#aiHistoryBtn')?.addEventListener('click', () => {
            this.aiRenderHistoryList();
            $('#aiHistoryModal').classList.remove('hidden');
        });
        $('#aiHistoryClose')?.addEventListener('click', () => {
            $('#aiHistoryModal').classList.add('hidden');
        });
        // Clear chat
        $('#aiClearBtn').addEventListener('click', () => {
            this.aiArchiveCurrentThread();
            this.aiMessages = [];
            localStorage.removeItem('zf_ai_history');
            this.aiRenderMessages();
        });
        // Load saved messages
        try {
            const saved = localStorage.getItem('zf_ai_history');
            if (saved) this.aiMessages = JSON.parse(saved);
        } catch { }
        if (this.aiMessages.length) this.aiRenderMessages();
        // Show connected state
        this.aiUpdateConnectedState();
    },

    aiUpdateConnectedState() {
        const hasKey = !!localStorage.getItem('zf_ai_key');
        const badge = $('#aiConnectedBadge');
        if (badge) badge.classList.toggle('hidden', !hasKey);
    },

    aiSendSuggestion(btn) {
        $('#aiInput').value = btn.textContent;
        this.aiSend();
    },

    async aiSend() {
        const input = $('#aiInput');
        const text = input.value.trim();
        if (!text || this.aiLoading) return;

        const apiKey = localStorage.getItem('zf_ai_key');
        if (!apiKey) {
            $('#aiKeyPanel').classList.remove('hidden');
            return;
        }

        // Add user message
        this.aiMessages.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';
        this.aiRenderMessages();
        this.aiLoading = true;

        // Show typing indicator
        const msgArea = $('#aiMessages');
        const typingEl = document.createElement('div');
        typingEl.className = 'ai-msg ai-msg-bot ai-typing';
        typingEl.innerHTML = `<div class="ai-msg-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93L12 10l-.75-.07A4.001 4.001 0 0112 2z"/><path d="M8 14s-4 0-4 4 4 4 4 4h8s4 0 4-4-4-4-4-4"/></svg></div><div class="ai-msg-content"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
        msgArea.appendChild(typingEl);
        msgArea.scrollTop = msgArea.scrollHeight;

        try {
            // Build context with current tasks
            const tasks = Store.tasks();
            const taskContext = tasks.length
                ? `\nUser's current tasks:\n${tasks.slice(0, 20).map(t => `- [${t.status}] ${t.title}${t.dueDate ? ' (due: ' + t.dueDate + ')' : ''} priority: ${t.priority}`).join('\n')}`
                : '';

            const systemPrompt = `You are an AI productivity planner inside a task management app called ZenFlow. Your job is to create detailed, actionable plans when the user describes a goal. Format your responses using markdown:
- Use ## for section headers
- Use numbered lists for steps
- Use **bold** for important items
- Suggest time estimates and priorities
- Break complex goals into phases
- Be concise but thorough
Respond in the same language the user writes in.${taskContext}`;

            const apiMessages = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history
            for (const msg of this.aiMessages) {
                apiMessages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }

            const reply = await this._aiCallAPI(apiKey, apiMessages, typingEl);
            this.aiMessages.push({ role: 'assistant', content: reply });
            localStorage.setItem('zf_ai_history', JSON.stringify(this.aiMessages));
        } catch (err) {
            const errorMsg = this._aiParseError(err);
            this.aiMessages.push({ role: 'assistant', content: errorMsg });
        }

        this.aiLoading = false;
        typingEl.remove();
        this.aiRenderMessages();
    },

    // Performs API call with automatic retry on rate-limit (429) errors
    async _aiCallAPI(apiKey, apiMessages, typingEl, retryCount = 0) {
        const MAX_RETRIES = 3;

        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        // Rate limit - auto retry with countdown
        if (resp.status === 429 && retryCount < MAX_RETRIES) {
            const retryAfter = this._aiGetRetryDelay(resp, retryCount);
            const waitSec = Math.ceil(retryAfter / 1000);

            // Show countdown in typing indicator
            const contentEl = typingEl.querySelector('.ai-msg-content');
            for (let s = waitSec; s > 0; s--) {
                if (contentEl) {
                    contentEl.innerHTML = `<div class="ai-retry-countdown">⏳ ${i18n.t('ai_error_rate_limit_retry') || 'Rate limit reached. Retrying in'} <strong>${s}s</strong>...</div>`;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
            // Restore typing dots
            if (contentEl) {
                contentEl.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
            }
            return this._aiCallAPI(apiKey, apiMessages, typingEl, retryCount + 1);
        }

        const data = await resp.json();

        if (data.error) {
            const err = new Error(data.error.message || 'API error');
            err.status = data.error.code || resp.status;
            err.details = data.error.details || [];
            err.errorMessage = data.error.message || '';
            throw err;
        }

        return data.choices?.[0]?.message?.content || 'No response received.';
    },

    // Extract retry delay from response or use exponential backoff
    _aiGetRetryDelay(resp, retryCount) {
        const retryHeader = resp.headers.get('Retry-After');
        if (retryHeader) {
            const val = parseFloat(retryHeader);
            if (!isNaN(val)) return val * 1000;
        }
        // Exponential backoff: 15s, 30s, 60s
        return (15 * Math.pow(2, retryCount)) * 1000;
    },

    // Parse API errors into user-friendly messages
    _aiParseError(err) {
        const msg = (err.errorMessage || err.message || '').toLowerCase();
        const status = err.status;

        // Quota exceeded (limit: 0, billing issue)
        if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('resource has been exhausted') || msg.includes('rate_limit') || msg.includes('tokens per minute')) {
            return `⚠️ **${i18n.t('ai_error_quota_title') || 'API Quota Exceeded'}**\n\n${i18n.t('ai_error_quota_desc') || 'Your free Groq API quota has been exhausted.'}\n\n**${i18n.t('ai_error_quota_solutions') || 'What you can do:'}**\n1. ⏳ ${i18n.t('ai_error_quota_wait') || 'Wait a few minutes and try again — free limits reset over time'}\n2. 🔑 ${i18n.t('ai_error_quota_new_key') || 'Create a new API key at [Groq Console](https://console.groq.com/keys)'}\n\n${i18n.t('ai_error_quota_hint') || 'The free tier allows ~30 requests per minute.'}`;
        }

        // Rate limit (temporary)
        if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
            return `⚠️ **${i18n.t('ai_error_rate_title') || 'Too Many Requests'}**\n\n${i18n.t('ai_error_rate_desc') || 'The AI service is temporarily overloaded. Please wait a minute and try again.'}`;
        }

        // Invalid API key
        if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('invalid') || msg.includes('permission') || msg.includes('authentication')) {
            return `🔑 **${i18n.t('ai_error_key_title') || 'Invalid API Key'}**\n\n${i18n.t('ai_error_key_desc') || 'Your API key appears to be invalid or has been revoked.'}\n\n${i18n.t('ai_error_key_fix') || 'Please go to Settings (⚙️) and enter a valid key from [Groq Console](https://console.groq.com/keys).'}`;
        }

        // Network / other errors
        if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network')) {
            return `🌐 **${i18n.t('ai_error_network_title') || 'Network Error'}**\n\n${i18n.t('ai_error_network_desc') || 'Could not connect to the AI service. Please check your internet connection and try again.'}`;
        }

        // Generic fallback
        return `⚠️ **${i18n.t('ai_error_generic_title') || 'Error'}:** ${err.message}\n\n${i18n.t('ai_error_generic_desc') || 'Please check your API key in settings.'}`;
    },

    aiRenderMessages() {
        const msgArea = $('#aiMessages');
        if (!this.aiMessages.length) {
            // Show welcome screen
            msgArea.innerHTML = `<div class="ai-welcome">
                <div class="ai-welcome-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <h2 data-i18n="ai_welcome_title">What can I help you plan?</h2>
                <p data-i18n="ai_welcome_desc">Describe your goal and I'll create a detailed action plan with steps, deadlines, and priorities.</p>
                <div class="ai-suggestions">
                    <button class="ai-suggestion-chip" onclick="app.aiSendSuggestion(this)" data-i18n="ai_suggest_1">Plan a website launch</button>
                    <button class="ai-suggestion-chip" onclick="app.aiSendSuggestion(this)" data-i18n="ai_suggest_2">Organize my study schedule</button>
                    <button class="ai-suggestion-chip" onclick="app.aiSendSuggestion(this)" data-i18n="ai_suggest_3">Create a fitness routine</button>
                </div>
            </div>`;
            i18n.applyTranslations();
            return;
        }

        msgArea.innerHTML = this.aiMessages.map(m => {
            const isUser = m.role === 'user';
            const content = isUser ? this.esc(m.content) : this.aiRenderMarkdown(m.content);
            return `<div class="ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-bot'}">
                ${isUser ? '' : `<div class="ai-msg-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93L12 10l-.75-.07A4.001 4.001 0 0112 2z"/><path d="M8 14s-4 0-4 4 4 4 4 4h8s4 0 4-4-4-4-4-4"/></svg></div>`}
                <div class="ai-msg-content">${content}</div>
            </div>`;
        }).join('');

        msgArea.scrollTop = msgArea.scrollHeight;
    },

    aiRenderMarkdown(text) {
        return text
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Headers
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h2>$1</h2>')
            // Bold & italic
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Ordered lists
            .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
            // Unordered lists
            .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
            // Wrap consecutive <li> in <ul>
            .replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)/, '<p>$1')
            .replace(/(.+)$/, '$1</p>');
    },

    aiArchiveCurrentThread() {
        if (!this.aiMessages || this.aiMessages.length === 0) return;
        const threads = Store.aiThreads();
        const firstUserMsg = this.aiMessages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '') : 'New Chat';
        
        threads.unshift({
            id: uid(),
            title: title,
            date: new Date().toISOString(),
            messages: [...this.aiMessages]
        });
        Store.saveAiThreads(threads);
    },

    aiRenderHistoryList() {
        const list = $('#aiHistoryList');
        const empty = $('#aiHistoryEmpty');
        const threads = Store.aiThreads();
        
        if (threads.length === 0) {
            list.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        
        empty.classList.add('hidden');
        list.innerHTML = threads.map(th => `
            <div class="ai-history-item" onclick="app.aiRestoreThread('${th.id}')">
                <div class="ai-history-info">
                    <div class="ai-history-title">${this.esc(th.title)}</div>
                    <div class="ai-history-date">${formatDate(th.date.split('T')[0])}</div>
                </div>
                <div class="ai-history-actions" onclick="event.stopPropagation()">
                    <button class="icon-btn" onclick="app.aiDeleteThread('${th.id}')" aria-label="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    aiRestoreThread(id) {
        const threads = Store.aiThreads();
        const thIndex = threads.findIndex(t => t.id === id);
        if (thIndex === -1) return;
        
        // Archive current if it has messages
        this.aiArchiveCurrentThread();
        
        const th = threads[thIndex];
        this.aiMessages = [...th.messages];
        localStorage.setItem('zf_ai_history', JSON.stringify(this.aiMessages));
        
        // Remove restored thread from history
        threads.splice(thIndex, 1);
        Store.saveAiThreads(threads);
        
        $('#aiHistoryModal').classList.add('hidden');
        this.aiRenderMessages();
        toast(i18n.t('ai_history_restored') || 'Chat restored', 'success');
    },

    aiDeleteThread(id) {
        let threads = Store.aiThreads();
        threads = threads.filter(t => t.id !== id);
        Store.saveAiThreads(threads);
        this.aiRenderHistoryList();
    },

    // ──── HELPERS ────
    esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; },
    priorityEmoji(p) { return { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪'; }
};

// ──── BOOT ────
document.addEventListener('DOMContentLoaded', () => app.init());
