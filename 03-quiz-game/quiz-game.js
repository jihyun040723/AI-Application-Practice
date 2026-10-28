/*
 * Quiz game - stage 1 (MVP)
 * Plays all 40 questions in category order, shows instant feedback with an
 * explanation after each answer, and a result screen at the end.
 * Requires quiz-data.js (QUIZ_DATA, QUIZ_CATEGORIES).
 */

const POINTS = { easy: 10, medium: 15, hard: 20 };
const DIFFICULTY_LABELS = { easy: "쉬움", medium: "보통", hard: "어려움" };

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

class QuizGame {
    constructor(root, data) {
        this.root = root;
        this.data = data;
        this.questions = [];
        this.index = 0;
        this.score = 0;
        this.results = [];      // { id, category, correct }
        this.answered = false;

        document.addEventListener("keydown", (e) => this.onKey(e));
        this.showStart();
    }

    // ---------- Screens ----------

    showStart() {
        this.root.innerHTML = `
            <div class="screen start-screen">
                <h1>🎯 퀴즈 게임</h1>
                <p class="subtitle">${QUIZ_CATEGORIES.length}개 카테고리, ${this.data.length}개의 도전적인 문제</p>
                <div class="chips">
                    ${QUIZ_CATEGORIES.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join("")}
                </div>
                <button class="btn primary" id="startBtn" type="button">게임 시작</button>
            </div>
        `;
        document.getElementById("startBtn").addEventListener("click", () => this.start());
    }

    start() {
        // Category order first, then id order inside each category.
        this.questions = [...this.data].sort((a, b) =>
            QUIZ_CATEGORIES.indexOf(a.category) - QUIZ_CATEGORIES.indexOf(b.category) || a.id - b.id
        );
        this.index = 0;
        this.score = 0;
        this.results = [];
        this.showQuestion();
    }

    showQuestion() {
        const q = this.questions[this.index];
        this.answered = false;
        const progress = (this.index / this.questions.length) * 100;

        this.root.innerHTML = `
            <div class="screen quiz-screen">
                <div class="quiz-header">
                    <span id="progressText">${this.index + 1} / ${this.questions.length}</span>
                    <span id="scoreText">점수: ${this.score}</span>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
                <div class="quiz-body">
                    <span class="category-tag">${escapeHtml(q.category)}</span>
                    <h2 class="question">${escapeHtml(q.question)}</h2>
                    <div class="options" id="options">
                        ${q.options.map((opt, i) => `
                            <button class="option" type="button" data-index="${i}">
                                <span class="option-key">${i + 1}</span>${escapeHtml(opt)}
                            </button>
                        `).join("")}
                    </div>
                </div>
                <div id="feedbackSlot"></div>
            </div>
        `;
        this.root.querySelectorAll(".option").forEach((btn) => {
            btn.addEventListener("click", () => this.selectAnswer(Number(btn.dataset.index)));
        });
    }

    selectAnswer(choice) {
        if (this.answered) return;
        this.answered = true;

        const q = this.questions[this.index];
        const correct = choice === q.answer;
        const earned = correct ? POINTS[q.difficulty] : 0;
        this.score += earned;
        this.results.push({ id: q.id, category: q.category, correct });

        this.root.querySelectorAll(".option").forEach((btn) => {
            const i = Number(btn.dataset.index);
            btn.disabled = true;
            if (i === q.answer) btn.classList.add("correct");
            else if (i === choice) btn.classList.add("wrong");
        });
        document.getElementById("scoreText").textContent = `점수: ${this.score}`;
        this.showFeedback(q, correct, earned);
    }

    showFeedback(q, correct, earned) {
        const isLast = this.index === this.questions.length - 1;
        const answerText = q.options[q.answer];
        document.getElementById("feedbackSlot").innerHTML = `
            <div class="feedback-backdrop">
                <div class="feedback ${correct ? "is-correct" : "is-wrong"}" role="dialog" aria-live="polite">
                    <div class="feedback-icon">${correct ? "✅" : "❌"}</div>
                    <h3>${correct ? "정답입니다!" : "틀렸습니다"}</h3>
                    ${correct ? "" : `<p class="feedback-answer">정답: ${escapeHtml(answerText)}</p>`}
                    <p class="feedback-explain">${escapeHtml(q.explanation)}</p>
                    <p class="feedback-points">${correct ? `+${earned}점 (${DIFFICULTY_LABELS[q.difficulty]})` : "+0점"}</p>
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

    showResult() {
        const total = this.results.length;
        const correctCount = this.results.filter((r) => r.correct).length;
        const rate = total === 0 ? 0 : Math.round((correctCount / total) * 100);

        const rows = QUIZ_CATEGORIES.map((cat) => {
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
                <div class="cat-rows">${rows}</div>
                <button class="btn primary" id="restartBtn" type="button">다시 시작</button>
            </div>
        `;
        document.getElementById("restartBtn").addEventListener("click", () => this.showStart());
    }

    // ---------- Keyboard: 1-4 pick an option, Enter/Space continue ----------

    onKey(e) {
        const nextBtn = document.getElementById("nextBtn");
        if (nextBtn && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            this.next();
            return;
        }
        if (!this.answered && ["1", "2", "3", "4"].includes(e.key)) {
            const btn = this.root.querySelector(`.option[data-index="${Number(e.key) - 1}"]`);
            if (btn) this.selectAnswer(Number(e.key) - 1);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.quizGame = new QuizGame(document.getElementById("app"), QUIZ_DATA);
});
