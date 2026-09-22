# My Tasks (할 일 관리 앱)

순수 HTML/CSS/JavaScript로 만든 개인용 할 일 관리 웹 앱. 별도 서버나 빌드 도구 없이 `index.html`을 브라우저에서 열면 바로 실행된다.

## Table of Contents

- [Folder Structure](#folder-structure)
- [How to Run](#how-to-run)
- [Features](#features)
- [Data Structure](#data-structure)
- [CLAUDE.md Files](#claudemd-files)
- [Possible Additional Features](#possible-additional-features)

## Folder Structure

```
02-todo-list/
├── README.md
├── CLAUDE.md
├── index.html    ← 앱 구조 (HTML)
├── style.css     ← 스타일 (라이트/다크 테마)
└── script.js     ← 전체 로직 (TaskManager 클래스)
```

## How to Run

`index.html`을 더블클릭해서 기본 브라우저로 열면 된다. 별도 설치나 서버 실행이 필요 없다.

## Features

**할 일 관리**
- 할 일 추가 (Enter 키 또는 추가 버튼), 최대 100자
- 체크박스로 완료/미완료 토글, 완료 시 취소선
- 항목 더블클릭으로 텍스트·카테고리 인라인 수정 (Enter 저장, Esc 취소)
- X 버튼으로 개별 삭제, "완료된 항목 모두 삭제" (확인창 포함)
- 드래그 앤 드롭으로 순서 변경

**카테고리**
- 업무(파란색) / 개인(초록색) / 공부(보라색) 3종
- 추가 시 드롭다운으로 선택, 항목에 색상 배지로 표시
- 상단 필터 버튼(전체/업무/개인/공부)으로 카테고리별 보기, 각 버튼에 개수 표시

**진행률 대시보드**
- 전체 진행률 "N/M 완료 (%)" + 프로그레스 바
- 카테고리별 미니 진행률
- 오늘 추가된 할 일 개수
- 오늘의 격언 랜덤 표시

**검색/정렬**
- 실시간 검색 필터
- 정렬: 최신순 / 오래된순 / 카테고리순 / 완료 상태순 / 마감일순 (선택한 정렬 방식은 저장됨)

**✨ 추가 구현: 마감일 지정**
- 할 일 추가·수정 시 마감일(날짜) 지정 가능
- 마감일이 지났고 미완료인 항목은 빨간 배지로 강조 표시
- "마감일순" 정렬 옵션 추가 (마감일 없는 항목은 뒤로 정렬)

**✨ 추가 구현: 반복 할 일**
- 할 일 추가·수정 시 반복 주기(없음/매일/매주) 지정 가능
- 반복 할 일을 완료 처리하면 다음 주기의 할 일이 자동으로 새로 생성됨
- 반복 설정된 항목은 🔁 아이콘으로 표시

**다크 모드**
- 우측 상단 토글 스위치 (단축키 `Alt+D`)
- 배경 `#1A1A1A`, 카드 `#2D2D2D`, 텍스트 `#E0E0E0`
- 선택한 테마는 localStorage에 저장되어 다음 방문에도 유지

**데이터 백업**
- "내보내기" — 현재 할 일 목록을 JSON 파일로 다운로드
- "가져오기" — JSON 파일 업로드로 복원 (덮어쓰기 전 현재 데이터 자동 백업)
- 모든 데이터는 `localStorage`에 저장되어 새로고침해도 유지됨

**키보드 단축키**
- `Alt+N`: 할 일 입력창 포커스
- `Alt+D`: 다크/라이트 모드 전환
- `Alt+1/2/3/4`: 전체/업무/개인/공부 필터 전환

## Data Structure

```json
{
  "tasks": [
    {
      "id": "1758540000000abc123",
      "text": "프로젝트 기획서 검토",
      "category": "work",
      "completed": false,
      "createdAt": "2026-09-22T05:25:59.497Z",
      "order": 0,
      "dueDate": "2026-09-25",
      "repeat": "none"
    }
  ],
  "settings": {
    "currentFilter": "all",
    "currentSort": "date-desc",
    "isDarkMode": false
  }
}
```

## CLAUDE.md Files

- `CLAUDE.md` (이 폴더) — 앱 구조와 코드 스타일 노트

## Possible Additional Features

- 우선순위(높음/보통/낮음) 설정
- 마감일 알림 (당일/임박 항목 브라우저 알림)
- 여러 목록(프로젝트별) 관리
- 클라우드 동기화 (localStorage 대신 서버 저장)
