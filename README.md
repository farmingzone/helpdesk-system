# Helpdesk System (MVP+)

민원/요청 처리 흐름을 다루는 **사이드 프로젝트**입니다. 학습/실험 목적의 프로젝트이며, 핵심 업무 흐름 검증에 집중했습니다.  
핵심은 기능 과시가 아니라 **추적 가능성, 상태 일관성, 이력 관리**입니다.

## MVP 핵심 범위
- 티켓 등록
- 티켓 목록 조회(상태 필터)
- 티켓 상세 조회(이력 포함)
- 상태 변경(접수 -> 처리중 -> 완료)
- 평균 처리시간 통계

## MVP+ 확장
- 검색/필터: 상태 + 요청자 + 키워드(제목/내용)
- 통계 고도화: 평균 처리시간 + 중앙값 처리시간 + 일자별 완료 건수
- 간단 권한: `ADMIN`, `AGENT`, `REQUESTER` (헤더 기반)
  - `REQUESTER`는 본인 티켓만 조회 가능
  - 상태 변경은 `ADMIN`, `AGENT`만 가능

## 제외 범위
- 알림
- 자동 분류 AI
- 복잡한 권한 체계
- 외부 연동

## 기술 스택
- Backend: Node.js, Express, TypeScript
- DB: SQLite, Prisma
- Test: Vitest
- Frontend: React, Vite, TypeScript (1페이지, 최소 UI)

## 실행 방법

### 1) 백엔드
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

기본 주소: `http://localhost:3000`

### 2) 프론트엔드
```bash
cd frontend
npm install
npm run dev
```

기본 주소: `http://localhost:5173`  
Vite 프록시(`/api`)를 통해 백엔드(`http://localhost:3000`)를 호출합니다.

### 3) 테스트
```bash
cd backend
npm test
```

### 4) Playwright E2E
```bash
cd frontend
npm install
npx playwright install chromium
npm run test:e2e
```

루트에서도 실행 가능합니다.
```bash
npm run test:e2e
```

## API 요약
- `POST /api/tickets` 티켓 생성
- `GET /api/tickets?status=RECEIVED|IN_PROGRESS|DONE&requesterName=<name>&q=<keyword>` 티켓 목록/검색
- `GET /api/tickets/:ticketId` 티켓 상세 + 이력
- `PATCH /api/tickets/:ticketId/status` 상태 변경
- `GET /api/stats/average-resolution-time` 평균 처리시간 통계
- `GET /api/stats/resolution-summary` 통계 요약(평균/중앙값/일자별 완료 건수)

## 권한 헤더 (간단 버전)
- `x-role`: `ADMIN` | `AGENT` | `REQUESTER`
- `x-user`: 사용자 이름

예시:
```bash
curl -H "x-role: REQUESTER" -H "x-user: user1" http://localhost:3000/api/tickets
```

## Usage Walkthrough
- ADMIN: 등록 -> 상태변경 2회 -> 상세/이력 -> 통계
- REQUESTER: 본인 티켓 조회 가능 + 상태변경 403 확인
- 상세 사용 시나리오 문서: `docs/03_demo.md`

## 문서
- `docs/00_scope.md`: 범위 정의
- `docs/01_research.md`: 업무 구조/데이터 흐름 분석
- `docs/02_plan.md`: 구현 계획
- `docs/03_demo.md`: 시연 시나리오
