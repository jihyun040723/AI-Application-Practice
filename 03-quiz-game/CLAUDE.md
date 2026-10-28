# Quiz Game (상식 퀴즈 게임)

## Project Overview

Browser-based 4-choice general-knowledge quiz. Stage 1 is the core quiz
(4 categories x 10 questions); stage 2 adds a score system, three game
modes, a hint button, and project slash commands for validating, analysing
and extending the question data. Pure HTML/CSS/JavaScript, no build step,
no backend — opening `index.html` is enough.

## Commands

- Run: open `index.html` directly in any browser.
- Project slash commands (`.claude/commands/`, available after restarting
  Claude Code in this folder):
  - `/quiz-validate [카테고리]` — find ambiguous superlatives in the questions
    (all questions, or only the given category via `$ARGUMENTS`)
  - `/quiz-range [시작] [끝]` — review questions `$1`..`$2`: difficulty and
    answer-position distribution
  - `/quiz-add [카테고리] [난이도]` — add one guideline-compliant question
    (`$1` = category, `$2` = easy|medium|hard)

## Architecture

- `index.html` — empty `<main id="app">`; all screens are rendered by JS.
- `styles.css` — card layout, options, feedback dialog, mode buttons, timer,
  hint and score-breakdown styles.
- `quiz-data.js` — `QUIZ_CATEGORIES` and `QUIZ_DATA`
  (`id, category, difficulty, question, options[4], answer(0-3), explanation, hint`).
- `quiz-game.js`
  - `ScoreManager.calculate()` — base (easy 10 / medium 15 / hard 20), time
    bonus +3 (< 10 s), no-hint bonus +2, combo bonus at streak 3 / 5 / 10
    (+2 / +5 / +10). Pressing the hint button costs 2 points immediately.
  - `QuizGame` — mode select → (category picker) → question → feedback →
    result. Modes: `all`, `category`, `speed` (20 random questions, 15 s each;
    timeout counts as wrong). Best score per mode is kept in `localStorage`
    (`quiz-best-scores`); storage errors are ignored.
  - Questions are ordered by category, then easy → hard, then id.

## Code Style

- All code and comments in English; UI-facing text in Korean.
- Keep the app in the four files above — no build tooling.

## 퀴즈 문제 교차 검증 가이드라인

모든 문제 작성 시 확인 사항:

1. **정답이 하나뿐인가?**
   - 다른 해석이 가능하면 조건을 명시 (예: 면적 기준, 2024년 기준)
2. **최상급 표현에 기준이 있는가?**
   - '가장 큰', '최초의' 등 최상급 표현은 측정 기준을 명시
3. **시간과 범위가 명확한가?**
   - 변할 수 있는 정보는 시점을 명시
   - 지리적·분류적 범위를 한정
4. **교차 검증했는가?**
   - 의심스러운 정보는 2개 이상의 출처를 확인
   - 논란이 있는 내용은 주류 학설 기준으로 출제하거나 제외

## Development Notes

- Keep answer positions balanced across 0-3 (options are not shuffled at
  runtime); `/quiz-range` and `/quiz-add` check this.
- Custom command files use `$ARGUMENTS`, `$1`, `$2` placeholders, which
  Claude Code replaces with the values typed after the command name.
- Superlative questions state their criterion in the text, e.g.
  "세계에서 가장 긴 강은? (전통적 측정 기준)" — Nile vs. Amazon depends on
  how the length is measured, and the explanation mentions the other claim.
