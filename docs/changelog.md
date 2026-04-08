# Changelog (Compact)

## 2026-03-28
- Playwright E2E 테스트 도입
  - `frontend/playwright.config.ts` 추가
  - 시나리오 3종 자동화
    - 티켓 생성 -> 담당자 지정 -> 완료
    - `REQUESTER` 상태/담당자 변경 차단
    - 지연 건수/지연 필터 반영 확인
  - 실패 시 스크린샷/트레이스/비디오 보존 설정
  - 루트 `npm run test:e2e` 스크립트 추가
- 브랜치 `codex/advanced-v2` 생성
- 담당자 기능 추가
  - `Ticket.assigneeName`
  - `PATCH /api/tickets/:ticketId/assignee`
  - `ASSIGNEE_CHANGED` 이력 추가
- 검색 필터 확장
  - `assigneeName` 필터 추가
- 통계 확장
  - `unassignedOpenCount`
  - `highPriorityOpenCount`
  - `attentionOpenCount`
- 프론트 대시보드 반영
  - 담당자 표시/필터/변경 폼 추가
  - 주의 티켓 지표 카드 추가
- 테스트 보강
  - 담당자 변경 이력 테스트 추가
  - 주의 티켓 통계 테스트 추가

## 2026-03-27
- README 퍼블릭 톤 정리
- `master` 브랜치에 전체 MVP+/UI 개선 반영

## 2026-03-23 ~ 2026-03-25
- 기본 MVP 구현
  - 티켓 생성/목록/상세
  - 상태 변경 + 이력
  - 평균 처리시간 통계
- 문서 작성
  - `docs/00_scope.md`
  - `docs/01_research.md`
  - `docs/02_plan.md`
  - `docs/03_demo.md`
- 테스트 기반 구축(Vitest)
