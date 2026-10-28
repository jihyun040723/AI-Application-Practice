/*
 * Quiz game - stage 2 (score system + game modes)
 *
 * Score system (ScoreManager):
 *   base       easy x1 / medium x1.5 / hard x2 of 10 points -> 10 / 15 / 20
 *   time       +3 when answered in under 10 seconds
 *   no hint    +2 when the hint button was not used
 *   combo      +2 at a 3-answer streak, +5 at 5, +10 at 10
 *   hint cost  -2 immediately when the hint button is pressed
 *
 * Game modes: all (every question), category (one category), speed
 * (20 random questions, 15 seconds each).
 * Requires quiz-data.js (QUIZ_DATA, QUIZ_CATEGORIES).
 */

const BASE_POINTS = 10;
const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2 };
const DIFFICULTY_LABELS = { easy: "쉬움", medium: "보통", hard: "어려움" };
const TIME_BONUS_LIMIT_SEC = 10;
const TIME_BONUS = 3;
const NO_HINT_BONUS = 2;
const HINT_COST = 2;
const COMBO_BONUS = { 3: 2, 5: 5, 10: 10 };
const SPEED_QUESTION_COUNT = 20;
const SPEED_TIME_LIMIT_SEC = 15;
const BEST_SCORE_KEY = "quiz-best-scores";

const ScoreManager = {
    // streak = number of consecutive correct answers INCLUDING this one.
    calculate(difficulty, { elapsedSec, hintUsed, streak }) {
        const base = Math.round(BASE_POINTS * DIFFICULTY_MULTIPLIER[difficulty]);
        const time = elapsedSec < TIME_BONUS_LIMIT_SEC ? TIME_BONUS : 0;
        const noHint = hintUsed ? 0 : NO_HINT_BONUS;
        const combo = COMBO_BONUS[streak] || 0;
        return { base, time, noHint, combo, total: base + time + noHint + combo };
    },
};

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Category order, then easy -> hard, then id.
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
function compareQuestions(a, b) {
    return QUIZ_CATEGORIES.indexOf(a.category) - QUIZ_CATEGORIES.indexOf(b.category)
        || DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)
        || a.id - b.id;
}

function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function loadBestScores() {
    try {
        return JSON.parse(localStorage.getItem(BEST_SCORE_KEY)) || {};
    } catch (err) {
        return {};
    }
}

function saveBestScores(scores) {
    try {
        localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(scores));
    } catch (err) {
        // Storage unavailable (private mode etc.): the game still works.
    }
}

class QuizGame {
    constructor(root, data) {
        this.root = root;
        this.data = data;
        this.now = () => performance.now();   // overridable for tests

        this.mode = "all";
        this.modeKey = "all";
        this.questions = [];
        this.index = 0;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.results = [];
        this.answered = false;
        this.hintUsed = false;
        this.questionStart = 0;
        this.timerId = null;

        document.addEventListener("keydown", (e) => this.onKey(e));
        this.showModeSelect();
    }

    // ---------- Screens ----------

    showModeSelect() {
        this.stopTimer();
        const best = loadBestScores();
        const bestText = (key) => (best[key] ? `최고 ${best[key]}점` : "기록 없음");
        const total = this.data.length;

        this.root.innerHTML = `
            <div class="screen start-screen">
                <h1>🎯 퀴즈 게임</h1>
                <p class="subtitle">게임 모드 선택</p>
                <div class="mode-list">
                    <button class="mode-btn" type="button" data-mode="all">
                        <strong>전체 도전</strong>
                        <span>모든 카테고리 ${total}문제</span>
                        <em>${bestText("all")}</em>
                    </button>
                    <button class="mode-btn" type="button" data-mode="category">
                        <strong>카테고리별</strong>
                        <span>선택한 카테고리만</span>
                        <em>카테고리마다 기록</em>
                    </button>
                    <button class="mode-btn" type="button" data-mode="speed">
                        <strong>스피드 퀴즈</strong>
                        <span>${SPEED_QUESTION_COUNT}문제, 문제당 ${SPEED_TIME_LIMIT_SEC}초 제한</span>
                        <em>${bestText("speed")}</em>
                    </button>
                </div>
            </div>
        `;
        this.root.querySelectorAll(".mode-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                if (btn.dataset.mode === "category") this.showCategoryPicker();
                else this.start(btn.dataset.mode);
            });
        });
    }

    showCategoryPicker() {
        const best = loadBestScores();
        this.root.innerHTML = `
            <div class="screen start-screen">
                <h1>카테고리 선택</h1>
                <p class="subtitle">한 분야만 집중해서 풀어 보세요</p>
                <div class="mode-list">
                    ${QUIZ_CATEGORIES.map((cat) => {
                        const count = this.data.filter((q) => q.category === cat).length;
                        const key = `category:${cat}`;
                        return `
                            <button class="mode-btn" type="button" data-category="${escapeHtml(cat)}">
                                <strong>${escapeHtml(cat)}</strong>
                                <span>${count}문제</span>
                                <em>${best[key] ? `최고 ${best[key]}점` : "기록 없음"}</em>
                            </button>`;
                    }).join("")}
                </div>
                <button class="btn" id="backBtn" type="button">← 뒤로</button>
            </div>
        `;
        this.root.querySelectorAll("[data-category]").forEach((btn) => {
            btn.addEventListener("click", () => this.start("category", btn.dataset.category));
        });
        document.getElementById("backBtn").addEventListener("click", () => this.showModeSelect());
    }

    // category is only used by the "category" mode.
    start(mode, category = null) {
        this.mode = mode;
        this.category = category;

        if (mode === "speed") {
            this.questions = shuffle(this.data).slice(0, SPEED_QUESTION_COUNT);
            this.modeKey = "speed";
        } else if (mode === "category") {
            this.questions = this.data.filter((q) => q.category === category).sort(compareQuestions);
            this.modeKey = `category:${category}`;
        } else {
            this.questions = [...this.data].sort(compareQuestions);
            this.modeKey = "all";
        }

        this.index = 0;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.results = [];
        this.showQuestion();
    }

    showQuestion() {
        const q = this.questions[this.index];
        this.answered = false;
        this.hintUsed = false;
        const progress = (this.index / this.questions.length) * 100;

        this.root.innerHTML = `
            <div class="screen quiz-screen">
                <div class="quiz-header">
                    <span id="progressText">${this.index + 1} / ${this.questions.length}</span>
                    <span id="scoreText">점수: ${this.score}</span>
                    <span class="timer" id="timerText">0초</span>
                    <span id="streakText" class="streak">🔥 ${this.streak}</span>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
                <div class="quiz-body">
                    <div class="tags">
                        <span class="category-tag">${escapeHtml(q.category)}</span>
                        <span class="category-tag diff-${q.difficulty}">${DIFFICULTY_LABELS[q.difficulty]}</span>
                    </div>
                    <h2 class="question">${escapeHtml(q.question)}</h2>
                    <div class="options" id="options">
                        ${q.options.map((opt, i) => `
                            <button class="option" type="button" data-index="${i}">
                                <span class="option-key">${i + 1}</span>${escapeHtml(opt)}
                            </button>
                        `).join("")}
                    </div>
                    <div class="hint-row">
                        <button class="btn hint-btn" id="hintBtn" type="button">💡 힌트 사용 (-${HINT_COST}점)</button>
                        <p class="hint-text" id="hintText" hidden></p>
                    </div>
                </div>
                <div id="feedbackSlot"></div>
            </div>
        `;
        this.root.querySelectorAll(".option").forEach((btn) => {
            btn.addEventListener("click", () => this.selectAnswer(Number(btn.dataset.index)));
        });
        document.getElementById("hintBtn").addEventListener("click", () => this.useHint());

        this.startTimer();
    }

    // ---------- Timer ----------

    startTimer() {
        this.stopTimer();
        this.questionStart = this.now();
        this.updateTimer();
        this.timerId = setInterval(() => this.updateTimer(), 250);
    }

    stopTimer() {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = null;
    }

    elapsedSec() {
        return (this.now() - this.questionStart) / 1000;
    }

    updateTimer() {
        const el = document.getElementById("timerText");
        if (!el || this.answered) return;
        if (this.mode === "speed") {
            const left = Math.max(0, Math.ceil(SPEED_TIME_LIMIT_SEC - this.elapsedSec()));
            el.textContent = `${left}초`;
            el.classList.toggle("urgent", left <= 5);
            if (left <= 0) this.timeUp();
        } else {
            el.textContent = `${Math.floor(this.elapsedSec())}초`;
        }
    }

    timeUp() {
        if (this.answered) return;
        this.finishAnswer(-1, true);
    }

    // ---------- Hint ----------

    useHint() {
        if (this.answered || this.hintUsed) return;
        this.hintUsed = true;
        const q = this.questions[this.index];

        this.score = Math.max(0, this.score - HINT_COST);
        document.getElementById("scoreText").textContent = `점수: ${this.score}`;

        // Dim two wrong options and show the written hint.
        const wrong = shuffle(q.options.map((_, i) => i).filter((i) => i !== q.answer)).slice(0, 2);
        wrong.forEach((i) => this.root.querySelector(`.option[data-index="${i}"]`).classList.add("eliminated"));

        const hintText = document.getElementById("hintText");
        hintText.textContent = `💡 ${q.hint || "힌트가 없습니다."}`;
        hintText.hidden = false;
        document.getElementById("hintBtn").disabled = true;
    }

    // ---------- Answering ----------

    selectAnswer(choice) {
        if (this.answered) return;
        this.finishAnswer(choice, false);
    }

    finishAnswer(choice, timedOut) {
        this.answered = true;
        this.stopTimer();

        const q = this.questions[this.index];
        const correct = !timedOut && choice === q.answer;
        const elapsed = this.elapsedSec();

        let breakdown = null;
        if (correct) {
            this.streak += 1;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            breakdown = ScoreManager.calculate(q.difficulty, {
                elapsedSec: elapsed,
                hintUsed: this.hintUsed,
                streak: this.streak,
            });
            this.score += breakdown.total;
        } else {
            this.streak = 0;
        }
        this.results.push({ id: q.id, category: q.category, correct, timedOut, hintUsed: this.hintUsed });

        this.root.querySelectorAll(".option").forEach((btn) => {
            const i = Number(btn.dataset.index);
            btn.disabled = true;
            if (i === q.answer) btn.classList.add("correct");
            else if (i === choice) btn.classList.add("wrong");
        });
        document.getElementById("hintBtn").disabled = true;
        document.getElementById("scoreText").textContent = `점수: ${this.score}`;
        document.getElementById("streakText").textContent = `🔥 ${this.streak}`;
        this.showFeedback(q, correct, timedOut, breakdown);
    }

    showFeedback(q, correct, timedOut, breakdown) {
        const isLast = this.index === this.questions.length - 1;
        const answerText = q.options[q.answer];

        let lines = "";
        if (correct) {
            lines = `<div class="breakdown">
                <div><span>정답 (${DIFFICULTY_LABELS[q.difficulty]})</span><span>+${breakdown.base}</span></div>
                ${breakdown.time ? `<div><span>시간 보너스 (${TIME_BONUS_LIMIT_SEC}초 미만)</span><span>+${breakdown.time}</span></div>` : ""}
                ${breakdown.noHint ? `<div><span>힌트 미사용</span><span>+${breakdown.noHint}</span></div>` : ""}
                ${breakdown.combo ? `<div><span>🔥 ${this.streak}연속 정답 콤보</span><span>+${breakdown.combo}</span></div>` : ""}
                <div class="total"><span>획득 점수</span><span>+${breakdown.total}</span></div>
            </div>`;
        }

        const title = correct ? "정답입니다!" : timedOut ? "시간 초과!" : "틀렸습니다";
        document.getElementById("feedbackSlot").innerHTML = `
            <div class="feedback-backdrop">
                <div class="feedback ${correct ? "is-correct" : "is-wrong"}" role="dialog" aria-live="polite">
                    <div class="feedback-icon">${correct ? "✅" : timedOut ? "⏰" : "❌"}</div>
                    <h3>${title}</h3>
                    ${correct ? "" : `<p class="feedback-answer">정답: ${escapeHtml(answerText)}</p>`}
                    <p class="feedback-explain">${escapeHtml(q.explanation)}</p>
                    ${lines}
                    <button class="btn primary" id="nextBtn" type="button">${isLast ? "결과 보기" : "다음 문제"}</button>
                </div>
            </div>
        `;
        const next = document.getElementById("nextBtn");
        next.addEventListener("click", () => this.next());
        next.focus();
    }

    next() {
        // Ignore repeated triggers (e.g. keydown + click) once the dialog is gone.
        if (!document.getElementById("nextBtn")) return;
        if (this.index >= this.questions.length - 1) {
            this.showResult();
        } else {
            this.index += 1;
            this.showQuestion();
        }
    }

    // ---------- Result ----------

    showResult() {
        this.stopTimer();
        const total = this.results.length;
        const correctCount = this.results.filter((r) => r.correct).length;
        const rate = total === 0 ? 0 : Math.round((correctCount / total) * 100);

        const best = loadBestScores();
        const previous = best[this.modeKey] || 0;
        const isNewBest = this.score > previous;
        if (isNewBest) {
            best[this.modeKey] = this.score;
            saveBestScores(best);
        }

        const cats = [...new Set(this.questions.map((q) => q.category))];
        const rows = cats.map((cat) => {
            const list = this.results.filter((r) => r.category === cat);
            const ok = list.filter((r) => r.correct).length;
            return `<div class="cat-row"><span>${escapeHtml(cat)}</span><span>${ok} / ${list.length}</span></div>`;
        }).join("");

        this.root.innerHTML = `
            <div class="screen result-screen">
                <h1>🏆 퀴즈 완료!</h1>
                <div class="stats">
                    <div class="stat"><strong>${this.score}</strong><span>최종 점수</span></div>
                    <div class="stat"><strong>${correctCount} / ${total}</strong><span>정답 개수</span></div>
                    <div class="stat"><strong>${rate}%</strong><span>정답률</span></div>
                </div>
                <p class="best-line">${isNewBest ? "🎉 새로운 최고 기록!" : `최고 기록: ${previous}점`} · 최대 연속 정답 🔥 ${this.bestStreak}</p>
                <div class="cat-rows">${rows}</div>
                <button class="btn primary" id="restartBtn" type="button">다시 시작</button>
            </div>
        `;
        document.getElementById("restartBtn").addEventListener("click", () => this.showModeSelect());
    }

    // ---------- Keyboard: 1-4 pick, H hint, Enter/Space continue ----------

    onKey(e) {
        const nextBtn = document.getElementById("nextBtn");
        if (nextBtn && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            this.next();
            return;
        }
        if (this.answered || !document.getElementById("options")) return;
        if (["1", "2", "3", "4"].includes(e.key)) {
            this.selectAnswer(Number(e.key) - 1);
        } else if (e.key.toLowerCase() === "h") {
            this.useHint();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.quizGame = new QuizGame(document.getElementById("app"), QUIZ_DATA);
});
