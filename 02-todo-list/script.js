/*
 * My Tasks - personal to-do list app
 * Pure HTML/CSS/JavaScript, data persisted with localStorage.
 */

const STORAGE_KEY = "my-tasks-data";

const CATEGORY_LABELS = {
    work: "업무",
    personal: "개인",
    study: "공부",
};

const QUOTES = [
    "노력하는 모든 순간이 소중해요",
    "작은 진전도 큰 성과입니다",
    "오늘 하나를 끝내면 내일이 가벼워져요",
    "완벽보다 완료가 중요합니다",
    "천천히 가도 멈추지만 않으면 됩니다",
];

// Keyword dictionary for automatic category suggestions.
// Single-character keywords are weighted lower and only match at the start
// of a word, because they are far more likely to appear by accident.
const CATEGORY_KEYWORDS = {
    work: [
        "회의", "미팅", "프로젝트", "보고서", "클라이언트", "개발", "코딩", "시스템",
        "업무", "출장", "기획", "발표", "메일", "계약", "견적", "거래처", "결재",
        "야근", "회사", "스케줄", "팀", "납품", "배포", "고객",
    ],
    personal: [
        "집", "가족", "친구", "취미", "여행", "쇼핑", "운동", "요리", "병원",
        "영화", "청소", "빨래", "장보기", "약속", "생일", "산책", "데이트",
        "카페", "휴가", "미용실", "헬스", "주말",
    ],
    study: [
        "공부", "학습", "강의", "시험", "과제", "책", "프로그래밍", "자격증",
        "수업", "복습", "예습", "논문", "암기", "독서", "단어", "문제집", "퀴즈",
    ],
};

const DEFAULT_AUTO_CATEGORY = {
    enabled: true,
    showSuggestions: true,
    threshold: 0.6,
};

// Returns { category, confidence, matches } or null when nothing matches.
// confidence = winning category's share of the total keyword score (0-1).
function classifyText(text) {
    const lower = text.toLowerCase();
    const scores = {};
    const matches = {};
    let total = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        scores[cat] = 0;
        matches[cat] = [];
        for (const kw of keywords) {
            let hit;
            if (kw.length === 1) {
                hit = new RegExp(`(^|\\s)${kw}`).test(lower);
            } else {
                hit = lower.includes(kw);
            }
            if (!hit) continue;
            const weight = kw.length === 1 ? 0.5 : 1;
            scores[cat] += weight;
            matches[cat].push(kw);
            total += weight;
        }
    }
    if (total === 0) return null;

    const [category, best] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { category, confidence: best / total, matches: matches[category] };
}

class TaskManager {
    constructor() {
        this.tasks = [];
        this.settings = {
            currentFilter: "all",
            currentSort: "date-desc",
            isDarkMode: false,
            autoCategory: { ...DEFAULT_AUTO_CATEGORY },
        };
        this.searchTerm = "";
        this.editingId = null;

        this.load();
        this.bindEvents();
        this.applyTheme();
        this.render();
    }

    // ---------- Persistence ----------

    load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            this.tasks = data.tasks || [];
            const saved = data.settings || {};
            this.settings = {
                ...this.settings,
                ...saved,
                autoCategory: { ...DEFAULT_AUTO_CATEGORY, ...(saved.autoCategory || {}) },
            };
        } catch (err) {
            console.error("Failed to load saved tasks", err);
        }
    }

    save() {
        const data = {
            tasks: this.tasks,
            settings: this.settings,
            metadata: {
                version: "1.0.0",
                savedAt: new Date().toISOString(),
            },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // ---------- CRUD ----------

    addTask(text, category, dueDate = "", repeat = "none") {
        const trimmed = text.trim();
        if (!trimmed) return;

        this.tasks.push({
            id: `${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
            text: trimmed.slice(0, 100),
            category,
            completed: false,
            createdAt: new Date().toISOString(),
            order: this.tasks.length,
            dueDate: dueDate || null,
            repeat: repeat || "none",
        });
        this.save();
        this.render();
    }

    deleteTask(id) {
        const el = document.querySelector(`[data-id="${id}"]`);
        const finish = () => {
            this.tasks = this.tasks.filter((t) => t.id !== id);
            this.save();
            this.render();
        };
        if (el) {
            el.classList.add("removing");
            el.addEventListener("animationend", finish, { once: true });
        } else {
            finish();
        }
    }

    toggleComplete(id) {
        const task = this.tasks.find((t) => t.id === id);
        if (!task) return;
        task.completed = !task.completed;

        // Recurring tasks: completing one spawns the next occurrence.
        if (task.completed && task.repeat && task.repeat !== "none") {
            const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
            const nextDate = new Date(baseDate);
            nextDate.setDate(nextDate.getDate() + (task.repeat === "weekly" ? 7 : 1));

            this.tasks.push({
                id: `${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
                text: task.text,
                category: task.category,
                completed: false,
                createdAt: new Date().toISOString(),
                order: this.tasks.length,
                dueDate: nextDate.toISOString().slice(0, 10),
                repeat: task.repeat,
            });
        }

        this.save();
        this.render();
    }

    updateTask(id, text, category, dueDate = "", repeat = "none") {
        const task = this.tasks.find((t) => t.id === id);
        if (!task) return;
        const trimmed = text.trim();
        if (trimmed) task.text = trimmed.slice(0, 100);
        task.category = category;
        task.dueDate = dueDate || null;
        task.repeat = repeat || "none";
        this.save();
        this.render();
    }

    clearCompleted() {
        const completedCount = this.tasks.filter((t) => t.completed).length;
        if (completedCount === 0) return;
        const ok = confirm(`완료된 할 일 ${completedCount}개를 모두 삭제하시겠습니까?`);
        if (!ok) return;
        this.tasks = this.tasks.filter((t) => !t.completed);
        this.save();
        this.render();
    }

    reorder(draggedId, targetId) {
        const fromIndex = this.tasks.findIndex((t) => t.id === draggedId);
        const toIndex = this.tasks.findIndex((t) => t.id === targetId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const [moved] = this.tasks.splice(fromIndex, 1);
        this.tasks.splice(toIndex, 0, moved);
        this.tasks.forEach((t, idx) => { t.order = idx; });
        this.save();
        this.render();
    }

    // ---------- Import / Export ----------

    exportData() {
        const data = {
            tasks: this.tasks,
            settings: this.settings,
            metadata: {
                version: "1.0.0",
                exportDate: new Date().toISOString(),
                taskCount: this.tasks.length,
            },
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `my-tasks-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.toast("데이터가 성공적으로 내보내졌습니다!");
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            let data;
            try {
                data = JSON.parse(evt.target.result);
            } catch (err) {
                alert("올바른 JSON 파일이 아닙니다.");
                return;
            }
            const incoming = Array.isArray(data.tasks) ? data.tasks : [];
            const ok = confirm(
                `${incoming.length}개의 할 일을 가져오시겠습니까?\n현재 데이터는 자동으로 백업됩니다.`
            );
            if (!ok) return;

            // Back up current data before overwriting.
            localStorage.setItem(`${STORAGE_KEY}-backup-${Date.now()}`, localStorage.getItem(STORAGE_KEY) || "{}");

            this.tasks = incoming;
            this.save();
            this.render();
        };
        reader.readAsText(file);
    }

    // ---------- Derived data ----------

    getFilteredSortedTasks() {
        let list = [...this.tasks];

        if (this.settings.currentFilter !== "all") {
            list = list.filter((t) => t.category === this.settings.currentFilter);
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            list = list.filter((t) => t.text.toLowerCase().includes(term));
        }

        switch (this.settings.currentSort) {
            case "date-asc":
                list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case "category":
                list.sort((a, b) => a.category.localeCompare(b.category));
                break;
            case "completed":
                list.sort((a, b) => Number(a.completed) - Number(b.completed));
                break;
            case "date-desc":
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case "dueDate":
                list.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            default:
                list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }

        return list;
    }

    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter((t) => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        const today = new Date().toDateString();
        const todayCount = this.tasks.filter(
            (t) => new Date(t.createdAt).toDateString() === today
        ).length;

        const byCategory = {};
        for (const cat of Object.keys(CATEGORY_LABELS)) {
            const catTasks = this.tasks.filter((t) => t.category === cat);
            const catCompleted = catTasks.filter((t) => t.completed).length;
            byCategory[cat] = { total: catTasks.length, completed: catCompleted };
        }

        const counts = {
            all: total,
            work: byCategory.work.total,
            personal: byCategory.personal.total,
            study: byCategory.study.total,
        };

        return { total, completed, percent, todayCount, byCategory, counts };
    }

    // ---------- Rendering ----------

    render() {
        this.renderDashboard();
        this.renderFilterCounts();
        this.renderList();
        this.renderQuote();
    }

    renderDashboard() {
        const { total, completed, percent, todayCount, byCategory } = this.getStats();

        document.getElementById("overallProgressText").textContent =
            `${completed}/${total} 완료 (${percent}%)`;
        document.getElementById("overallProgressFill").style.width = `${percent}%`;
        document.getElementById("todayCount").textContent = `${todayCount}개`;

        const statsEl = document.getElementById("categoryStats");
        statsEl.innerHTML = Object.entries(byCategory).map(([cat, stat]) => {
            const pct = stat.total === 0 ? 0 : Math.round((stat.completed / stat.total) * 100);
            return `
                <div class="category-stat ${cat}">
                    <div class="category-stat-label">
                        <span>${CATEGORY_LABELS[cat]}</span>
                        <span>${stat.completed}/${stat.total}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join("");
    }

    renderFilterCounts() {
        const { counts } = this.getStats();
        document.getElementById("countAll").textContent = counts.all;
        document.getElementById("countWork").textContent = counts.work;
        document.getElementById("countPersonal").textContent = counts.personal;
        document.getElementById("countStudy").textContent = counts.study;

        document.querySelectorAll(".filter-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.filter === this.settings.currentFilter);
        });
    }

    renderQuote() {
        const quoteEl = document.getElementById("dailyQuote");
        const index = new Date().getDate() % QUOTES.length;
        quoteEl.textContent = `💬 ${QUOTES[index]}`;
    }

    renderList() {
        const listEl = document.getElementById("taskList");
        const emptyEl = document.getElementById("emptyState");
        const tasks = this.getFilteredSortedTasks();

        emptyEl.hidden = tasks.length !== 0;
        listEl.innerHTML = "";

        for (const task of tasks) {
            const li = document.createElement("li");
            li.className = `task-item ${task.category}${task.completed ? " completed" : ""}`;
            li.dataset.id = task.id;
            li.draggable = this.editingId !== task.id;

            if (this.editingId === task.id) {
                li.innerHTML = `
                    <span class="drag-handle">⠿</span>
                    <input type="checkbox" ${task.completed ? "checked" : ""} disabled>
                    <input type="text" class="task-edit-input" value="${escapeHtml(task.text)}" maxlength="100">
                    <select class="task-edit-category">
                        ${Object.entries(CATEGORY_LABELS).map(([val, label]) =>
                            `<option value="${val}" ${val === task.category ? "selected" : ""}>${label}</option>`
                        ).join("")}
                    </select>
                    <input type="date" class="task-edit-due" value="${task.dueDate || ""}">
                    <select class="task-edit-repeat">
                        <option value="none" ${(!task.repeat || task.repeat === "none") ? "selected" : ""}>반복 없음</option>
                        <option value="daily" ${task.repeat === "daily" ? "selected" : ""}>매일</option>
                        <option value="weekly" ${task.repeat === "weekly" ? "selected" : ""}>매주</option>
                    </select>
                `;
                const editInput = li.querySelector(".task-edit-input");
                const editCategory = li.querySelector(".task-edit-category");
                const editDue = li.querySelector(".task-edit-due");
                const editRepeat = li.querySelector(".task-edit-repeat");
                editInput.focus();
                editInput.select();

                // Removing the focused input during re-render (after Enter or
                // Escape) fires a native "blur" on it too. This guard makes
                // sure only the first of commit/cancel actually applies.
                let settled = false;
                const commit = () => {
                    if (settled) return;
                    settled = true;
                    this.editingId = null;
                    this.updateTask(task.id, editInput.value, editCategory.value, editDue.value, editRepeat.value);
                };
                const cancel = () => {
                    if (settled) return;
                    settled = true;
                    this.editingId = null;
                    this.render();
                };

                editInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") cancel();
                });
                editInput.addEventListener("blur", commit);

                for (const field of [editDue, editRepeat]) {
                    field.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") commit();
                        if (e.key === "Escape") cancel();
                    });
                    field.addEventListener("blur", commit);
                }
            } else {
                const overdue = !task.completed && isOverdue(task.dueDate);
                const dueBadge = task.dueDate
                    ? `<span class="due-badge ${overdue ? "overdue" : ""}">📅 ${formatDueDate(task.dueDate)}</span>`
                    : "";
                const repeatBadge = task.repeat && task.repeat !== "none"
                    ? `<span class="repeat-badge" title="${task.repeat === "daily" ? "매일 반복" : "매주 반복"}">🔁</span>`
                    : "";

                li.innerHTML = `
                    <span class="drag-handle">⠿</span>
                    <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    <span class="category-badge ${task.category}">${CATEGORY_LABELS[task.category]}</span>
                    ${dueBadge}
                    ${repeatBadge}
                    <span class="task-time">${timeAgo(task.createdAt)}</span>
                    <button class="delete-btn" type="button" title="삭제">×</button>
                `;

                li.querySelector(".task-checkbox").addEventListener("change", () => {
                    this.toggleComplete(task.id);
                });
                li.querySelector(".task-text").addEventListener("dblclick", () => {
                    this.editingId = task.id;
                    this.render();
                });
                li.querySelector(".delete-btn").addEventListener("click", () => {
                    this.deleteTask(task.id);
                });

                li.addEventListener("dragstart", () => {
                    li.classList.add("dragging");
                });
                li.addEventListener("dragend", () => {
                    li.classList.remove("dragging");
                });
                li.addEventListener("dragover", (e) => e.preventDefault());
                li.addEventListener("drop", (e) => {
                    e.preventDefault();
                    const draggingEl = listEl.querySelector(".dragging");
                    if (!draggingEl || draggingEl === li) return;
                    this.reorder(draggingEl.dataset.id, li.dataset.id);
                });
            }

            listEl.appendChild(li);
        }
    }

    toast(message) {
        const el = document.createElement("div");
        el.textContent = message;
        el.style.cssText = `
            position: fixed; top: 16px; right: 16px; background: #2d2d2d; color: white;
            padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; z-index: 999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    }

    // ---------- Theme ----------

    toggleTheme() {
        this.settings.isDarkMode = !this.settings.isDarkMode;
        this.save();
        this.applyTheme();
    }

    applyTheme() {
        document.body.classList.toggle("dark", this.settings.isDarkMode);
        document.getElementById("themeToggle").checked = this.settings.isDarkMode;
    }

    // ---------- Events ----------

    bindEvents() {
        document.getElementById("addBtn").addEventListener("click", () => this.handleAdd());
        document.getElementById("taskInput").addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.handleAdd();
        });

        document.querySelectorAll(".filter-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.settings.currentFilter = btn.dataset.filter;
                this.save();
                this.render();
            });
        });

        document.getElementById("clearCompletedBtn").addEventListener("click", () => {
            this.clearCompleted();
        });

        document.getElementById("searchInput").addEventListener("input", (e) => {
            this.searchTerm = e.target.value;
            this.renderList();
        });

        document.getElementById("sortSelect").value = this.settings.currentSort;
        document.getElementById("sortSelect").addEventListener("change", (e) => {
            this.settings.currentSort = e.target.value;
            this.save();
            this.renderList();
        });

        document.getElementById("exportBtn").addEventListener("click", () => this.exportData());
        document.getElementById("importBtn").addEventListener("click", () => {
            document.getElementById("importFile").click();
        });
        document.getElementById("importFile").addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) this.importData(file);
            e.target.value = "";
        });

        document.getElementById("reclassifyBtn").addEventListener("click", () => this.reclassifyAll());
        document.getElementById("categorySettingsBtn").addEventListener("click", () => this.openSettings());

        document.getElementById("themeToggle").addEventListener("change", () => this.toggleTheme());

        document.addEventListener("keydown", (e) => {
            if (e.altKey && e.key.toLowerCase() === "n") {
                e.preventDefault();
                document.getElementById("taskInput").focus();
            }
            if (e.altKey && e.key.toLowerCase() === "d") {
                e.preventDefault();
                this.toggleTheme();
            }
            if (e.altKey && ["1", "2", "3", "4"].includes(e.key)) {
                e.preventDefault();
                const map = { 1: "all", 2: "work", 3: "personal", 4: "study" };
                this.settings.currentFilter = map[e.key];
                this.save();
                this.render();
            }
        });
    }

    handleAdd() {
        const input = document.getElementById("taskInput");
        const categorySelect = document.getElementById("categorySelect");
        const dueDateInput = document.getElementById("dueDateInput");
        const repeatSelect = document.getElementById("repeatSelect");

        const text = input.value;
        const selected = categorySelect.value;
        const dueDate = dueDateInput.value;
        const repeat = repeatSelect.value;
        if (!text.trim()) return;

        const reset = () => {
            input.value = "";
            dueDateInput.value = "";
            repeatSelect.value = "none";
            input.focus();
        };

        const suggestion = this.getSuggestion(text, selected);
        if (!suggestion) {
            this.addTask(text, selected, dueDate, repeat);
            reset();
            return;
        }

        const { category, confidence } = suggestion;
        if (!this.settings.autoCategory.showSuggestions) {
            // Suggestions disabled: classify silently.
            this.addTask(text, category, dueDate, repeat);
            this.toast(`"${CATEGORY_LABELS[category]}" 카테고리로 자동 분류했습니다`);
            reset();
            return;
        }

        reset();
        this.openModal({
            title: "카테고리 추천",
            bodyHtml: `
                <p>텍스트 분석 결과 <strong>"${CATEGORY_LABELS[category]}"</strong> 카테고리로 분류하는 것을 추천합니다.</p>
                <p class="modal-muted">신뢰도: ${Math.round(confidence * 100)}% · 선택한 카테고리: ${CATEGORY_LABELS[selected]}</p>
                <p>추천 카테고리로 설정하시겠습니까?</p>
            `,
            actions: [
                { label: "확인", primary: true, onClick: () => this.addTask(text, category, dueDate, repeat) },
                { label: "취소", onClick: () => this.addTask(text, selected, dueDate, repeat) },
            ],
            onDismiss: () => this.addTask(text, selected, dueDate, repeat),
        });
    }

    // ---------- Auto categorization ----------

    // Returns a suggestion only when it differs from `current` and passes
    // the confidence threshold; otherwise null.
    getSuggestion(text, current) {
        const cfg = this.settings.autoCategory;
        if (!cfg.enabled) return null;
        const result = classifyText(text);
        if (!result || result.category === current) return null;
        if (result.confidence < cfg.threshold) return null;
        return result;
    }

    reclassifyAll() {
        const cfg = this.settings.autoCategory;
        if (!cfg.enabled) {
            this.toast("자동 분류가 꺼져 있습니다. 분류 설정에서 켜 주세요");
            return;
        }
        const changes = [];
        for (const task of this.tasks) {
            const s = this.getSuggestion(task.text, task.category);
            if (s) changes.push({ task, category: s.category });
        }
        if (changes.length === 0) {
            this.toast("재분류할 항목이 없습니다");
            return;
        }
        const list = changes.slice(0, 8).map((c) =>
            `<li>${escapeHtml(c.task.text)} : ${CATEGORY_LABELS[c.task.category]} → ${CATEGORY_LABELS[c.category]}</li>`
        ).join("");
        const more = changes.length > 8 ? `<li>...외 ${changes.length - 8}개</li>` : "";
        this.openModal({
            title: "자동 재분류",
            bodyHtml: `<p>${changes.length}개 항목의 카테고리를 변경합니다.</p><ul class="modal-list">${list}${more}</ul>`,
            actions: [
                {
                    label: "변경",
                    primary: true,
                    onClick: () => {
                        for (const c of changes) c.task.category = c.category;
                        this.save();
                        this.render();
                        this.toast(`${changes.length}개 항목을 재분류했습니다`);
                    },
                },
                { label: "취소" },
            ],
        });
    }

    openSettings() {
        const cfg = this.settings.autoCategory;
        const keywordRows = Object.entries(CATEGORY_KEYWORDS).map(([cat, kws]) => `
            <div class="keyword-row">
                <span class="category-badge ${cat}">${CATEGORY_LABELS[cat]}</span>
                <span class="keyword-list">${kws.slice(0, 8).join(", ")} 등</span>
            </div>
        `).join("");

        const modal = this.openModal({
            title: "자동 분류 설정",
            bodyHtml: `
                <label class="setting-row">
                    <input type="checkbox" id="setEnabled" ${cfg.enabled ? "checked" : ""}>
                    <span><strong>자동 분류 기능 활성화</strong><br>
                    <small>새 할 일 추가 시 키워드를 분석해 카테고리를 제안합니다.</small></span>
                </label>
                <label class="setting-row">
                    <input type="checkbox" id="setSuggest" ${cfg.showSuggestions ? "checked" : ""}>
                    <span><strong>분류 제안 표시</strong><br>
                    <small>끄면 확인 없이 자동으로 분류합니다.</small></span>
                </label>
                <div class="setting-row column">
                    <strong>신뢰도 임계값: <span id="setThresholdLabel">${Math.round(cfg.threshold * 100)}%</span></strong>
                    <input type="range" id="setThreshold" min="30" max="100" step="5" value="${Math.round(cfg.threshold * 100)}">
                    <small>이 값 이상의 신뢰도를 가진 제안만 표시됩니다. 높을수록 더 확실한 제안만 표시됩니다.</small>
                </div>
                <div class="setting-row column">
                    <strong>키워드 미리보기</strong>
                    ${keywordRows}
                </div>
            `,
            actions: [
                {
                    label: "저장",
                    primary: true,
                    onClick: () => {
                        this.settings.autoCategory = {
                            enabled: modal.querySelector("#setEnabled").checked,
                            showSuggestions: modal.querySelector("#setSuggest").checked,
                            threshold: Number(modal.querySelector("#setThreshold").value) / 100,
                        };
                        this.save();
                        this.toast("분류 설정을 저장했습니다");
                    },
                },
                { label: "닫기" },
            ],
        });
        const slider = modal.querySelector("#setThreshold");
        slider.addEventListener("input", () => {
            modal.querySelector("#setThresholdLabel").textContent = `${slider.value}%`;
        });
    }

    // Minimal modal helper. Each action closes the dialog after its handler;
    // closing any other way (Esc / backdrop) runs `onDismiss` if given.
    openModal({ title, bodyHtml, actions, onDismiss }) {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";
        backdrop.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="modal-header"><h2>${escapeHtml(title)}</h2></div>
                <div class="modal-body">${bodyHtml}</div>
                <div class="modal-actions"></div>
            </div>
        `;
        const modal = backdrop.querySelector(".modal");
        let closed = false;
        const close = (runDismiss) => {
            if (closed) return;
            closed = true;
            document.removeEventListener("keydown", onKey, true);
            backdrop.remove();
            if (runDismiss && onDismiss) onDismiss();
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                close(true);
            }
        };
        document.addEventListener("keydown", onKey, true);
        backdrop.addEventListener("mousedown", (e) => {
            if (e.target === backdrop) close(true);
        });

        const actionsEl = backdrop.querySelector(".modal-actions");
        for (const action of actions) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = action.label;
            if (action.primary) btn.className = "primary";
            btn.addEventListener("click", () => {
                close(false);
                if (action.onClick) action.onClick();
            });
            actionsEl.appendChild(btn);
        }

        document.body.appendChild(backdrop);
        (actionsEl.querySelector(".primary") || actionsEl.firstChild).focus();
        return modal;
    }
}

function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
}

function formatDueDate(dateStr) {
    const [, month, day] = dateStr.split("-");
    return `${month}/${day}`;
}

function isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
    window.taskManager = new TaskManager();
});
