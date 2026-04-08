# Branch Workplan (Portfolio)

면접용 포트폴리오 임팩트를 높이기 위한 브랜치별 작업 범위 정리.

## 1) `codex/sla-escalation`
- 한 줄 목표: 우선순위 기반 SLA 기한 계산과 임박/초과 가시화, 초과 이벤트 이력 자동 기록
- 핵심 작업
  - 우선순위별 SLA 정책 정의 (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - 티켓별 `dueAt` 계산/저장(생성 시점 기준)
  - 대시보드에 `임박`, `초과` 배지 표시
  - SLA 초과 시 `OVERDUE_ESCALATED`(또는 유사 이벤트) 이력 추가
- 완료 기준
  - API 응답에 SLA 상태 정보 포함
  - 목록/상세 화면에서 SLA 상태 확인 가능
  - SLA 계산/초과 이벤트 단위 테스트 포함

## 2) `codex/attachments-local`
- 한 줄 목표: 로컬 저장 기반 첨부파일 업로드/다운로드와 권한 검증
- 핵심 작업
  - `POST /api/tickets/:ticketId/attachments` 업로드
  - `GET /api/tickets/:ticketId/attachments` 목록
  - `GET /api/tickets/:ticketId/attachments/:attachmentId` 다운로드
  - 파일 확장자/용량 제한 및 파일명 정규화
  - 요청자 본인/운영자 권한 정책 반영
- 완료 기준
  - 업로드/조회/다운로드 흐름 동작
  - 차단 케이스(권한 없음, 확장자/용량 초과) 테스트 포함
  - 티켓 상세 화면에서 첨부파일 확인 가능

## 3) `codex/e2e-playwright`
- 한 줄 목표: 핵심 사용자 시나리오를 E2E로 자동 검증
- 핵심 작업
  - Playwright 설정 및 실행 스크립트 구성
  - 시나리오 1: 티켓 생성 -> 담당자 지정 -> 완료
  - 시나리오 2: `REQUESTER` 권한 차단(상태/담당자 변경 불가)
  - 시나리오 3: SLA 임박/초과 표기 확인
- 완료 기준
  - `npm run test:e2e`로 3개 시나리오 재현 가능
  - CI 또는 로컬 재현 문서화
  - 실패 시 디버깅 가능한 리포트(스크린샷/트레이스) 설정

## 4) `codex/observability`
- 한 줄 목표: 운영 관점에서 요청 추적과 장애 분석이 가능한 관측성 강화
- 핵심 작업
  - 요청 ID 미들웨어(`x-request-id` 수용/자동 생성)
  - 구조화 로그(요청 시작/종료/에러) 포맷 통일
  - 공통 에러 응답 포맷 정의(code/message/requestId/timestamp)
  - 주요 비즈니스 이벤트 로그(상태 변경, 담당자 변경, 코멘트)
- 완료 기준
  - 모든 에러 응답에서 `requestId` 확인 가능
  - 서버 로그로 단일 요청 추적 가능
  - 에러 핸들러/로깅 관련 단위 테스트 또는 통합 테스트 포함

## 작업 순서 제안
1. `codex/sla-escalation`
2. `codex/attachments-local`
3. `codex/e2e-playwright`
4. `codex/observability`

SLA를 먼저 넣어야 E2E 시나리오 3번을 안정적으로 검증할 수 있음.
