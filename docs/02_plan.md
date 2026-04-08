# 02. 구현 계획 (Plan)

## 1) 구현 목표
- 내부 업무용 Helpdesk MVP를 완성한다.
- 핵심 플로우는 `티켓 등록 -> 상태 변경(3단계) -> 이력 기록 -> 평균 처리시간 조회`로 고정한다.
- 범위 외 기능(알림, AI, 복잡 권한, 외부 연동)은 끝까지 제외한다.

단순화 이유:
- 면접용 포트폴리오는 기능 수보다 "설명 가능한 핵심 흐름"이 중요하다.
- 추적 가능성, 상태 일관성, 이력 관리라는 내부 시스템의 본질에 집중하기 위함이다.

## 2) 단순화 원칙 (이번 수정 반영)
- 상태는 `접수/처리중/완료` 3단계만 유지한다.
- DB는 SQLite를 사용한다.
- 권한 체계는 MVP에서 제외한다.
- 대시보드는 1페이지로 제한한다.
- 통계는 평균 처리시간 1개만 제공한다.
- UI는 내부 업무 시스템 느낌의 단순한 화면으로 구성한다.
- 프론트엔드는 초기 필수 범위가 아니며, 백엔드 핵심 완료 후 최소 화면만 구현한다.

단순화 이유:
- 기술 과시보다 업무 흐름 설명 가능성을 우선하기 위함이다.
- 범위를 줄여 상태/이력 정합성 검증에 개발 시간을 집중하기 위함이다.

## 3) 예상 기술 스택 (MVP 축소안)
- Backend API: Node.js + Express + TypeScript
- DB: SQLite
- DB 접근: Prisma
- 입력 검증: Zod
- 테스트: Vitest 또는 Jest (상태 전이/이력/통계 중심)
- Frontend(후순위): React + Vite + TypeScript, 최소 화면만

단순화 이유:
- SQLite는 로컬 실행이 쉬워 데모 준비와 설명 부담을 낮춘다.
- Prisma는 스키마와 쿼리 구조를 문서/코드로 일관되게 설명하기 쉽다.
- 프론트를 후순위로 두어 백엔드 도메인 완성도를 먼저 확보한다.

## 4) 수정/생성 대상 파일 경로 (계획)

### 4.1 백엔드/DB/API/테스트 (초기 필수)
- `C:\Users\qjawn\helpdesk-system\backend\package.json`
- `C:\Users\qjawn\helpdesk-system\backend\tsconfig.json`
- `C:\Users\qjawn\helpdesk-system\backend\prisma\schema.prisma`
- `C:\Users\qjawn\helpdesk-system\backend\src\server.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\db\client.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\modules\tickets\tickets.routes.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\modules\tickets\tickets.service.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\modules\tickets\tickets.repository.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\modules\stats\stats.routes.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\modules\stats\stats.service.ts`
- `C:\Users\qjawn\helpdesk-system\backend\src\middlewares\error-handler.ts`
- `C:\Users\qjawn\helpdesk-system\backend\tests\tickets.status-transition.spec.ts`
- `C:\Users\qjawn\helpdesk-system\backend\tests\ticket-history.spec.ts`
- `C:\Users\qjawn\helpdesk-system\backend\tests\stats.average-resolution.spec.ts`

### 4.2 프론트엔드 (후순위 최소 범위)
- `C:\Users\qjawn\helpdesk-system\frontend\package.json`
- `C:\Users\qjawn\helpdesk-system\frontend\src\main.tsx`
- `C:\Users\qjawn\helpdesk-system\frontend\src\App.tsx`
- `C:\Users\qjawn\helpdesk-system\frontend\src\pages\DashboardPage.tsx` (1페이지)
- `C:\Users\qjawn\helpdesk-system\frontend\src\api\client.ts`
- `C:\Users\qjawn\helpdesk-system\frontend\src\api\tickets.ts`
- `C:\Users\qjawn\helpdesk-system\frontend\src\api\stats.ts`

단순화 이유:
- 초기 필수 파일을 백엔드에 집중해 MVP 핵심(상태/이력/통계)을 먼저 고정한다.
- 프론트는 1페이지 대시보드로 축소해 "동작 확인용" 역할만 수행한다.

## 5) DB 구조 (SQLite, MVP)

### 5.1 테이블: tickets
- `id` (TEXT PK, UUID 문자열)
- `title` (TEXT NOT NULL)
- `description` (TEXT NOT NULL)
- `requester_name` (TEXT NOT NULL)
- `status` (TEXT NOT NULL, 값 제한: RECEIVED/IN_PROGRESS/DONE)
- `created_at` (TEXT NOT NULL, ISO datetime)
- `updated_at` (TEXT NOT NULL, ISO datetime)
- `resolved_at` (TEXT NULL, 완료 시점)

### 5.2 테이블: ticket_histories
- `id` (TEXT PK, UUID 문자열)
- `ticket_id` (TEXT NOT NULL, FK -> tickets.id)
- `actor_name` (TEXT NOT NULL)
- `event_type` (TEXT NOT NULL, CREATED/STATUS_CHANGED)
- `from_status` (TEXT NULL)
- `to_status` (TEXT NULL)
- `note` (TEXT NULL)
- `created_at` (TEXT NOT NULL, ISO datetime)

### 5.3 인덱스
- `tickets(status, created_at DESC)`
- `ticket_histories(ticket_id, created_at ASC)`
- `tickets(resolved_at)`

단순화 이유:
- SQLite 특성에 맞춰 타입을 단순화해 마이그레이션과 설명 복잡도를 낮춘다.
- 이력 추적과 평균 처리시간 계산에 필요한 최소 컬럼만 유지한다.

## 6) API 엔드포인트 설계 (MVP 고정)

### 6.1 티켓 생성
- `POST /api/tickets`
- 입력: `title`, `description`, `requesterName`
- 처리: ticket 생성 + history(CREATED) 기록

### 6.2 티켓 목록 조회
- `GET /api/tickets?status=RECEIVED|IN_PROGRESS|DONE`
- 출력: 티켓 요약 목록

### 6.3 티켓 상세 조회
- `GET /api/tickets/:ticketId`
- 출력: 현재 상태 + 이력 타임라인

### 6.4 상태 변경
- `PATCH /api/tickets/:ticketId/status`
- 입력: `toStatus`, `actorName`, `note?`
- 처리: 3단계 전이 검증 + tickets 업데이트 + history(STATUS_CHANGED) 기록

### 6.5 통계
- `GET /api/stats/average-resolution-time`
- 출력: `completedCount`, `averageResolutionMinutes`

단순화 이유:
- 엔드포인트 수를 늘리지 않고 MVP 시나리오를 완결한다.
- 통계를 평균 처리시간 1개로 고정해 지표 정의 혼선을 방지한다.

## 7) 구현 순서 (재정렬)
1. 백엔드 기본 구조
- 서버 구동, 에러 처리, 공통 응답 포맷

2. DB 스키마(SQLite) 확정
- `tickets`, `ticket_histories`, 상태값 제약

3. API 구현
- 생성/목록/상세/상태변경/평균처리시간

4. 테스트 구현
- 상태 전이 규칙 테스트
- 상태 변경 시 이력 생성 테스트
- 평균 처리시간 계산 테스트

5. 프론트 최소 화면
- 1페이지 대시보드에서 등록/목록/상태변경/평균 처리시간 확인

단순화 이유:
- 백엔드/DB/API/테스트를 먼저 완료해야 상태 일관성과 추적 가능성을 신뢰할 수 있다.
- 프론트를 마지막에 최소 범위로 두면 일정 리스크를 줄이고 MVP 완성 확률을 높인다.

## 8) 핵심 트레이드오프

### 8.1 상태 유연성 vs 일관성
- 선택: 3단계 고정 전이
- 이유: 예외 전이(반려/재오픈)를 제외해 규칙 설명과 검증을 단순화한다.

### 8.2 데이터베이스 범용성 vs 데모 용이성
- 선택: SQLite
- 이유: 운영 확장성은 낮지만, 면접 과제에서는 실행/재현/설명이 빠르다.

### 8.3 화면 풍부함 vs 백엔드 완성도
- 선택: 1페이지 최소 UI
- 이유: 내부 시스템 포트폴리오는 시각적 화려함보다 업무 데이터 흐름의 신뢰성이 핵심이다.

### 8.4 권한 정교화 vs 범위 통제
- 선택: 권한 체계 제외
- 이유: 복잡 권한을 넣으면 핵심 흐름 검증이 밀려 MVP 품질이 낮아질 수 있다.

## 9) 완료 판정 체크리스트
- [ ] 티켓 등록 가능
- [ ] 상태 변경(접수/처리중/완료) 가능
- [ ] 상태 변경 시 이력 로그가 항상 남음
- [ ] 평균 처리시간 통계 조회 가능
- [ ] 대시보드가 1페이지로 유지됨
- [ ] 알림/AI/복잡 권한/외부 연동이 포함되지 않음

## 10) 범위 고정 메모 (면접 설명용)
- 이 계획은 의도적으로 기능을 줄여, "추적 가능성/상태 일관성/이력 관리"를 선명하게 보여주도록 설계했다.
- 기술 선택과 구현 순서는 모두 복잡도 절감과 설명 가능성 향상을 기준으로 결정했다.
