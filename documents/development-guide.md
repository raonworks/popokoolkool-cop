# 포포쿨쿨 개발 가이드

이 문서는 현재 저장소의 실제 구현 상태를 기준으로 작성한 개발 가이드입니다. 현재 앱은 Vite에서 생성한 React 기본 화면이며, 기획된 화이트노이즈 믹서 기능은 아직 구현되지 않았습니다.

## 1. 프로젝트 개요

- **프로젝트명**: `popokoolkool`
- **현재 형태**: Vite + React + TypeScript 단일 페이지 애플리케이션
- **패키지 형식**: ESM (`package.json`의 `type: module`)
- **현재 화면**: React/Vite 소개 화면, 카운터, 문서 및 커뮤니티 링크
- **기획 방향**: 여러 자연 소리를 섞어 재생하는 수면·집중용 화이트노이즈 앱

기획서의 Capacitor, Web Audio API, Media Session API, 슬립 타이머, 즐겨찾기 기능은 현재 의존성이나 소스에 포함되어 있지 않습니다. 해당 기능을 구현할 때는 아래의 현재 구조를 확장하는 방식으로 진행합니다.

## 2. 기술 스택과 역할

| 기술         | 역할                                  |
| ------------ | ------------------------------------- |
| React 19     | UI 컴포넌트와 사용자 상호작용 관리    |
| TypeScript 6 | 타입 검사와 개발 안정성 확보          |
| Vite 8       | 개발 서버, HMR, 프로덕션 번들링       |
| ESLint 10    | JavaScript/TypeScript/React 규칙 검사 |
| CSS          | 전역 디자인 토큰과 화면별 스타일      |

현재 런타임 의존성은 `react`, `react-dom`뿐입니다. 상태관리 라이브러리, 오디오 라이브러리, 라우터, 테스트 러너는 아직 추가되지 않았습니다.

## 3. 디렉터리 구조

```text
.
├── index.html              # 브라우저 진입 HTML과 앱 제목
├── package.json            # 스크립트와 의존성
├── vite.config.ts          # Vite React 플러그인 설정
├── eslint.config.js        # ESLint flat config
├── tsconfig.json           # TypeScript 프로젝트 참조 설정
├── tsconfig.app.json       # src용 컴파일 옵션
├── tsconfig.node.json      # Vite 설정 등 Node 파일용 옵션
├── documents/
│   ├── app.md              # 제품 기획 및 로드맵
│   └── development-guide.md # 이 문서
├── public/
│   ├── favicon.svg
│   └── icons.svg           # SVG sprite
└── src/
    ├── main.tsx            # React 루트 마운트
    ├── App.tsx             # 현재 화면과 로컬 카운터 상태
    ├── index.css           # 전역 토큰, 기본 요소, 반응형 규칙
    ├── App.css             # App 화면 스타일
    └── assets/              # 번들에 포함되는 이미지/SVG 자산
```

### 현재 렌더링 흐름

1. `index.html`의 `#root` 요소를 준비합니다.
2. `src/main.tsx`가 `createRoot`로 React 앱을 마운트합니다.
3. `StrictMode` 안에서 `App`을 렌더링합니다.
4. `App.tsx`가 `hero.png`, `react.svg`, `vite.svg`를 import하고 화면을 구성합니다.
5. `App.css`와 `index.css`가 각각 화면 및 전역 스타일을 적용합니다.

현재 상태는 `App` 내부의 `useState` 카운터 하나뿐이며, 전역 상태나 서버 통신은 없습니다.

## 4. 개발 환경과 실행 명령

Node.js와 npm을 준비한 뒤 프로젝트 루트에서 실행합니다.

```bash
npm install
npm run dev
```

주요 명령은 다음과 같습니다.

| 명령              | 용도                                           |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Vite 개발 서버와 HMR 실행                      |
| `npm run build`   | TypeScript 프로젝트 빌드 후 Vite 프로덕션 빌드 |
| `npm run lint`    | ESLint 검사                                    |
| `npm run preview` | 빌드 결과를 로컬에서 미리보기                  |

현재 `package.json`에는 자동화된 테스트 스크립트가 없습니다. 기능을 추가하면 테스트 도구와 `test` 스크립트를 별도로 도입해야 합니다.

## 5. 코딩 규칙

### TypeScript와 React

- 컴포넌트는 `.tsx`, 타입·유틸리티는 `.ts`에 작성합니다.
- `tsconfig.app.json`의 `noUnusedLocals`, `noUnusedParameters`를 만족해야 합니다.
- 컴포넌트에서 사용하는 상태는 가능한 한 해당 기능을 소유한 컴포넌트 가까이에 둡니다.
- 여러 화면이나 기능이 공유하는 상태가 생기기 전에는 전역 상태 라이브러리를 추가하지 않습니다.
- 새 컴포넌트는 `src/components/`에 기능 단위로 분리하고, 오디오 로직은 `src/audio/` 또는 `src/features/audio/`로 UI와 분리합니다.
- 이벤트 핸들러에는 동작이 드러나는 이름을 사용합니다. 예: `handlePlayPause`, `handleVolumeChange`.
- 사용하지 않는 import와 매개변수를 남기지 않습니다.

### 스타일

- 전역 색상, 글꼴, 간격은 `src/index.css`의 CSS 변수로 관리합니다.
- 컴포넌트 전용 스타일은 `src/App.css` 또는 해당 컴포넌트의 CSS 파일에 둡니다.
- 기존 스타일은 중첩 규칙과 미디어 쿼리를 사용하므로, 새 규칙도 같은 구조를 유지합니다.
- 모바일 기준에서 레이아웃이 깨지지 않는지 확인합니다. 현재 주요 분기점은 `1024px`입니다.
- 버튼, 슬라이더, 링크는 키보드 포커스와 충분한 대비를 제공해야 합니다.

### 자산과 링크

- `src/assets`의 자산은 import해서 사용합니다. 예: `import soundIcon from './assets/sound.svg'`.
- `public`의 파일은 루트 경로로 참조합니다. 예: `/icons.svg`.
- 외부 링크를 추가할 때는 목적을 분명히 하고, 새 탭 링크에는 필요하면 `rel="noreferrer"`를 함께 사용합니다.

## 6. 화이트노이즈 기능 확장 가이드

기능 구현 순서는 오디오 엔진과 UI를 섞지 않는 것을 기준으로 합니다.

### 권장 모듈 경계

```text
src/
├── audio/
│   ├── audioEngine.ts       # AudioContext와 소스 노드 생성/해제
│   ├── soundTypes.ts         # 사운드 ID, 볼륨, 재생 상태 타입
│   └── mediaSession.ts       # 잠금화면 미디어 제어 연동
├── features/
│   ├── mixer/                # 사운드 목록, 개별 볼륨, 믹서 UI
│   └── sleep-timer/          # 타이머와 페이드 아웃 상태
└── components/               # 공통 버튼, 슬라이더, 표시 컴포넌트
```

### 오디오 엔진

- 첫 사용자 재생 동작에서 `AudioContext`를 생성하거나 resume합니다. 브라우저의 자동 재생 정책을 고려해야 합니다.
- 각 사운드는 독립적인 source와 gain node를 가지며, gain node를 통해 개별 볼륨을 조절합니다.
- 전체 음량은 개별 gain 뒤에 master gain을 두어 제어합니다.
- 컴포넌트가 unmount되거나 사운드가 제거될 때 source, gain, `AudioContext`를 정리합니다.
- 프로토타입에서는 Web Audio API로 합성 노이즈를 사용할 수 있지만, 프로덕션에서는 음원 파일의 라이선스와 preload 전략을 문서화합니다.
- 오디오 엔진 API는 React 상태와 분리합니다. UI는 `play`, `pause`, `setVolume`, `setMasterVolume`, `dispose` 같은 명확한 명령만 호출하도록 합니다.

### 상태 모델

사운드 상태는 최소한 다음 정보를 표현할 수 있어야 합니다.

```ts
type SoundId = "rain" | "storm" | "wind";

type SoundState = {
  id: SoundId;
  enabled: boolean;
  volume: number; // 0부터 1 사이
};
```

- 볼륨 값의 범위를 UI와 오디오 엔진 양쪽에서 검증합니다.
- 재생 중인 사운드와 선택만 된 사운드를 구분합니다.
- 브라우저가 오디오를 재생할 수 없는 경우 사용자에게 복구 가능한 오류를 보여줍니다.

### 슬립 타이머

- 타이머는 남은 시간과 실행 상태를 명시적으로 관리합니다.
- 종료 직전에 master gain을 일정 시간 동안 1에서 0으로 낮춥니다.
- 타이머 완료 시 source를 즉시 제거할지, 일시정지 상태로 둘지 정책을 먼저 결정합니다.
- `setInterval`을 사용한다면 컴포넌트 해제와 타이머 변경 시 반드시 정리합니다.
- 시스템 시간 변경에 영향을 덜 받도록 남은 시간 계산은 경과 시간을 기준으로 합니다.

### Media Session과 Capacitor

Media Session API는 지원 여부를 확인한 뒤 사용합니다. 브라우저 기능만으로 모든 모바일 백그라운드 재생을 보장할 수 없으므로, Capacitor 도입 시 실제 Android/iOS 기기에서 화면 잠금과 백그라운드 전환을 검증해야 합니다.

Capacitor를 추가할 때는 웹 빌드 결과와 네이티브 프로젝트의 동기화 절차를 문서화하고, 특정 플러그인의 플랫폼별 제한을 함께 기록합니다. 네이티브 기능을 도입하기 전에는 웹 브라우저에서 동작하는 기본 재생·일시정지·볼륨 제어를 먼저 완성합니다.

## 7. 접근성 및 품질 체크리스트

- 모든 이미지에는 의미가 있으면 설명적인 `alt`를, 장식이면 빈 `alt`를 제공합니다.
- 사운드 토글과 볼륨 슬라이더는 마우스 없이 사용할 수 있어야 합니다.
- 버튼의 현재 상태가 텍스트 또는 접근성 속성으로 전달되어야 합니다.
- 색상만으로 재생 상태나 오류를 표현하지 않습니다.
- 작은 화면에서 사운드 카드와 슬라이더가 가로로 잘리지 않는지 확인합니다.
- 오디오가 자동으로 시작되지 않도록 하고, 사용자의 명시적인 재생 동작을 요구합니다.
- 빌드 전 `npm run lint`와 `npm run build`를 실행합니다.

## 8. 기능 개발 순서

1. 기본 화면을 수면 앱의 실제 정보 구조로 교체하고 사운드 목록의 타입을 정의합니다.
2. 한 개의 사운드에 대해 재생·일시정지·볼륨 조절을 완성합니다.
3. 여러 사운드의 gain을 합산하는 믹서 엔진과 개별 토글을 추가합니다.
4. master 볼륨과 슬립 타이머, 페이드 아웃을 추가합니다.
5. Media Session을 연동하고 브라우저별 동작을 확인합니다.
6. 즐겨찾기 저장이 필요할 때만 `localStorage` 저장 계층을 추가합니다.
7. Capacitor 패키징은 웹 기능 검증 이후 도입하고 실기기에서 백그라운드 재생을 검증합니다.

각 단계는 한 번에 하나의 사용자 흐름을 완성한 뒤 `npm run lint`와 `npm run build`로 확인합니다. 현재 테스트 러너가 없으므로 오디오 엔진을 추가하는 시점에는 단위 테스트 또는 브라우저 자동화 테스트 도입을 우선 검토합니다.

## 9. 현재 알려진 제한과 다음 작업

- `App.tsx`는 Vite 기본 템플릿 화면이므로 제품 UI가 아닙니다.
- `documents/app.md`의 오디오·Capacitor 계획은 설계 문서이며 구현을 의미하지 않습니다.
- 실제 음원 파일과 라이선스 정보가 없습니다.
- 자동화된 테스트가 없습니다.
- 배포 환경, PWA 설정, Capacitor 네이티브 프로젝트가 아직 없습니다.

첫 구현 작업은 사운드 데이터 모델과 오디오 엔진의 최소 API를 정의한 뒤, 단일 합성 노이즈를 재생하는 작은 수직 슬라이스로 시작하는 것을 권장합니다. 이 방식이면 UI, 브라우저 자동 재생 정책, 리소스 정리 문제를 초기에 함께 검증할 수 있습니다.
