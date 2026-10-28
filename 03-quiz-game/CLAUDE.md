# Quiz Game (상식 퀴즈 게임)

## Project Overview

Browser-based 4-choice general-knowledge quiz. 4 categories x 10 questions =
40 questions. Pure HTML/CSS/JavaScript, no build step, no backend — opening
`index.html` is enough.

## Commands

- Run: open `index.html` directly in any browser.

## Architecture

- `index.html` — empty `<main id="app">`; all screens are rendered by JS.
- `styles.css` — gradient background, white card, option/feedback styles.
- `quiz-data.js` — `QUIZ_CATEGORIES` and `QUIZ_DATA` (question objects:
  `id, category, difficulty, question, options[4], answer(0-3), explanation, hint`).
- `quiz-game.js` — `QuizGame` class: start → question → feedback → result.
  Score per correct answer: easy 10 / medium 15 / hard 20 (`POINTS`).
  Questions are played in category order, then by id.

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

- Answer positions in `QUIZ_DATA` are deliberately balanced across 0-3 (no
  long runs of the same index). Keep that when adding questions; options are
  not shuffled at runtime.
- Superlative questions state their criterion in the text, e.g.
  "세계에서 가장 긴 강은? (전통적 측정 기준)" — Nile vs. Amazon depends on
  how the length is measured, and the explanation mentions the other claim.
