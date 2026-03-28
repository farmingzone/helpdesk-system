# Project Context (Working Memory)

## 1) 프로젝트 한 줄 요약
- 민원/요청 처리 흐름을 다루는 Helpdesk 사이드 프로젝트 (Node/Express + Prisma/SQLite + React 1페이지)

## 2) 핵심 기능 상태
- 티켓 등록: 완료
- 티켓 목록/검색: 완료
  - 필터: `status`, `priority`, `requesterName`, `assigneeName`, `q`, `overdueOnly`
- 티켓 상세/이력: 완료
  - 이력 이벤트: `CREATED`, `STATUS_CHANGED`, `COMMENT`, `ASSIGNEE_CHANGED`
- 상태 변경: 완료
  - 전이: `RECEIVED -> IN_PROGRESS -> DONE`, `DONE -> IN_PROGRESS`(재오픈)
- 코멘트: 완료
- 담당자 변경: 완료
- 통계: 완료
  - 평균/중앙값/24시간 초과 완료/상태별 건수/오늘 완료/지연 건수/미배정/고우선순위/주의 티켓

## 3) 권한 규칙 (간단)
- 헤더:
  - `x-role`: `ADMIN | AGENT | REQUESTER`
  - `x-user`: 사용자명
- `REQUESTER`
  - 본인 티켓만 목록/상세 조회
  - 상태 변경 불가
  - 담당자 변경 불가
- `ADMIN`, `AGENT`
  - 상태 변경 가능
  - 담당자 변경 가능

## 4) 백엔드 구조 요약
- 엔트리: `backend/src/server.ts`
- 앱 구성: `backend/src/app.ts`
- 티켓 모듈:
  - routes: `backend/src/modules/tickets/tickets.routes.ts`
  - service: `backend/src/modules/tickets/tickets.service.ts`
  - repository: `backend/src/modules/tickets/tickets.repository.ts`
- 통계 모듈:
  - routes: `backend/src/modules/stats/stats.routes.ts`
  - service: `backend/src/modules/stats/stats.service.ts`
- 인증 컨텍스트: `backend/src/modules/auth/auth.ts`

## 5) 프론트 구조 요약
- 단일 페이지: `frontend/src/pages/DashboardPage.tsx`
- API:
  - `frontend/src/api/tickets.ts`
  - `frontend/src/api/stats.ts`
  - `frontend/src/api/client.ts`
- 스타일: `frontend/src/styles.css`

## 6) 주요 API
- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/:ticketId`
- `PATCH /api/tickets/:ticketId/status`
- `PATCH /api/tickets/:ticketId/assignee`
- `POST /api/tickets/:ticketId/comments`
- `GET /api/stats/average-resolution-time`
- `GET /api/stats/resolution-summary`

## 7) 브랜치 상태
- 기본 브랜치: `master`
- 고도화 작업 브랜치: `codex/advanced-v2`

## 8) 실행/검증 명령
- backend
  - `cd backend`
  - `npx prisma db push`
  - `npm test`
  - `npm run dev`
- frontend
  - `cd frontend`
  - `npm run build`
  - `npm run dev`

## 9) 다음 작업 후보
- 첨부파일(로컬 저장) 기능
- SLA 정책 화면화(기한 임박/초과 배지)
- 권한 모델 고도화(요청자별 읽기/쓰기 세분화)
- E2E 브라우저 테스트 도입
