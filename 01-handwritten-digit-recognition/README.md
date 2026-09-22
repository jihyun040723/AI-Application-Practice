# Handwritten Digit Recognition

MNIST 데이터셋으로 학습한 신경망이 사용자가 그린 0~9 손글씨 숫자를 인식하는 프로그램. 데스크톱(Tkinter) 버전과 웹(Flask) 버전 두 가지로 구현되어 있다.

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Requirements](#requirements)
- [Desktop Version](#desktop-version)
- [Web Version](#web-version)
- [Standalone Executable](#standalone-executable)
- [How the Model Works](#how-the-model-works)
- [CLAUDE.md Files](#claudemd-files)
- [Possible Additional Features](#possible-additional-features)

## Overview

| | Desktop Version | Web Version |
|---|---|---|
| 인터페이스 | Tkinter 창 | 브라우저 (HTML5 Canvas) |
| 실행 | `python digit_recognition.py` | `python app.py` 후 `localhost:5000` 접속 |
| 모델 캐싱 | 실행할 때마다 재학습 | 최초 1회만 학습, 이후 `digit_model.keras` 재사용 |
| 결과 표시 | 예측 숫자 + 신뢰도 | 예측 숫자 + Top-3 확률 막대 그래프 |
| 독립 실행 | PyInstaller로 `.exe` 빌드 가능 | Python + Flask 서버가 켜져 있어야 함 |

두 버전 모두 MNIST 6만 장으로 학습한 동일한 신경망을 사용하며, 5 epoch 학습 후
테스트 정확도 약 **97~98%**를 기록한다.

## Folder Structure

```
01-handwritten-digit-recognition/
├── README.md                       ← 이 파일
├── CLAUDE.md                       ← 두 버전 공통 프로젝트 노트
├── desktop_version/
│   ├── digit_recognition.py        ← Tkinter 앱 + 모델 학습 코드
│   ├── requirements.txt            ← tensorflow, numpy, Pillow
│   ├── install_requirements.bat    ← 위 라이브러리 설치
│   ├── run_digit_recognition.bat   ← 더블클릭으로 실행
│   ├── build_exe.bat               ← PyInstaller로 단독 .exe 빌드
│   └── CLAUDE.md                   ← 이 버전 전용 노트
└── web_version/
    ├── app.py                      ← Flask 서버, /predict + /status API
    ├── templates/
    │   ├── index.html              ← 캔버스 UI (CSS/JS 인라인)
    │   └── loading.html            ← 모델 학습 중 표시되는 로딩 화면
    ├── requirements.txt            ← flask, tensorflow, numpy, Pillow
    ├── install_requirements.bat    ← 위 라이브러리 설치
    ├── run_web_version.bat         ← 더블클릭으로 실행
    └── CLAUDE.md                   ← 이 버전 전용 노트
```

## Requirements

- Windows 10/11
- Python 3.11
- 최초 실행 시 인터넷 연결 필요 (MNIST 데이터셋 약 11MB 다운로드, 이후 캐시됨)

## Desktop Version

1. `desktop_version/` 폴더에서 **`install_requirements.bat`**을 한 번 실행 (TensorFlow, NumPy, Pillow 설치)
2. **`run_digit_recognition.bat`**을 더블클릭
3. 검은 콘솔 창이 뜨며 모델을 학습 (5 epoch, 약 30~60초). 학습이 끝나면 그리기 창이 뜸
4. 검은 캔버스에 마우스로 숫자를 그림
5. **Recognize** 클릭 → 예측 숫자와 신뢰도(%) 표시. **Clear**로 다시 그리기

실행할 때마다 모델을 처음부터 다시 학습하므로, 매번 짧은 대기 시간이 발생한다.

## Web Version

1. `web_version/` 폴더에서 **`install_requirements.bat`**을 한 번 실행 (Flask, TensorFlow, NumPy, Pillow 설치)
2. **`run_web_version.bat`**을 더블클릭
3. 서버는 즉시 열리므로 바로 브라우저에서 `http://127.0.0.1:5000` 접속 가능
4. 모델이 학습되는 동안(최초 1회, 약 30~60초) "서버를 준비하고 있습니다..." 로딩 화면이 뜨고, `/status`를 주기적으로 확인하다가 준비되면 자동으로 전환됨
5. 캔버스에 마우스·터치스크린·스타일러스로 숫자를 그리고 **인식하기** 클릭 (단축키: `Enter` 인식, `C` 지우기)
6. 예측 숫자, 신뢰도, Top-3 후보 숫자의 확률 막대 그래프가 표시됨. 그림 없이 인식을 시도하거나 오류가 발생하면 캔버스 테두리가 붉게 흔들리는 피드백이 나타남

UI는 한글로 되어 있다. 최초 실행 시 학습한 모델은 `web_version/digit_model.keras`에
저장되어 이후 실행부터는 즉시 구동된다. 재학습하려면 이 파일을 삭제하면 된다.

서버 종료는 콘솔 창을 닫거나 안에서 `Ctrl+C`를 누르면 된다.

## Standalone Executable

`desktop_version/build_exe.bat`은 [PyInstaller](https://pyinstaller.org)를 이용해
`digit_recognition.py`를 Python 및 모든 라이브러리와 함께 하나의 `.exe` 파일로 묶는다.
이 파일은 Python이 설치되지 않은 Windows PC에서도 그대로 실행할 수 있다.

1. `desktop_version/` 안의 **`build_exe.bat`**을 더블클릭
2. 빌드가 끝날 때까지 대기 (TensorFlow를 포함하므로 몇 분 걸리고, 결과물은 수백 MB 크기)
3. 완성된 프로그램은 `desktop_version/dist/HandwrittenDigitRecognition.exe`에 생성됨
4. 이 `.exe`를 더블클릭하면 터미널이나 Python 설치 없이 바로 실행됨

## How the Model Works

두 버전 모두 동일한 신경망 구조를 사용한다.

```
Input (28x28 grayscale)
  → Flatten
  → Dense(128, relu)
  → Dropout(0.2)
  → Dense(64, relu)
  → Dense(10, softmax)   ← 0~9 각 숫자에 대한 확률 출력
```

- **데이터셋**: MNIST — 손글씨 숫자 28x28 흑백 이미지, 학습용 6만 장 + 테스트용 1만 장. `keras.datasets.mnist.load_data()`로 자동 다운로드
- **학습**: 5 epoch, Adam optimizer, sparse categorical cross-entropy 손실 함수, 학습 데이터의 10%를 검증용으로 분리
- **추론**: 사용자가 그린 280x280 이미지를 28x28로 축소하고 0~1 범위로 정규화한 뒤 모델에 입력 (학습 데이터와 동일한 형식)
- **정확도**: MNIST 테스트셋 기준 약 97~98%. 실제 마우스/터치로 그린 손글씨는 MNIST의 펜 획과 다르게 그려지는 경우가 많아 체감 정확도가 다소 낮을 수 있음

## CLAUDE.md Files

이 프로젝트는 세 개의 `CLAUDE.md` 파일로 Claude Code가 각 버전의 맥락을 자동으로
파악할 수 있게 구성되어 있다.

- `CLAUDE.md` (이 폴더의 루트) — 두 버전에 공통되는 개요
- `desktop_version/CLAUDE.md` — Tkinter/Python 관련 노트
- `web_version/CLAUDE.md` — Flask/웹 관련 노트

## Possible Additional Features

- 데스크톱: 모델 캐싱 (재학습 없이 즉시 실행)
- 데스크톱: Top-3 예측 확률 바
- 데스크톱: 로딩 화면
- 데스크톱: 키보드 단축키 (Enter/C)
- 데스크톱: 붓 굵기 조절
- 데스크톱: 한 획 취소(Undo)
- 웹: 다크 모드
- 양쪽: 그림 PNG 저장
- 모델: CNN 업그레이드 (정확도 향상)
- 양쪽: 자동 인식 (그리는 즉시)
