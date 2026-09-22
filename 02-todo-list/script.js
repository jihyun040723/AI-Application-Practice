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

class TaskManager {
    constructor() {
        this.tasks = [];
        this.settings = {
            currentFilter: "all",
            currentSort: "date-desc",
            isDarkMode: false,
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
            this.settings = { ...this.settings, ...(data.settings || {}) };
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
        const category = document.getElementById("categorySelect").value;
        const dueDateInput = document.getElementById("dueDateInput");
        const repeatSelect = document.getElementById("repeatSelect");

        this.addTask(input.value, category, dueDateInput.value, repeatSelect.value);

        input.value = "";
        dueDateInput.value = "";
        repeatSelect.value = "none";
        input.focus();
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
