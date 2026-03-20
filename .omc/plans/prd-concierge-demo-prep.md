# PRD: MyNews Concierge 데모 준비

## 문제

PRD v0.4 기준 P0 백엔드/프론트엔드/로봇 tool은 구현 완료되었으나, 실제 데모를 위한 end-to-end 검증과 튜닝이 남아있다.

참조 문서:
- PRD: `/Users/simjoon/develop/maekyung/docs/PRD_MyNews_Concierge.md`
- 구현 현황: `/Users/simjoon/develop/maekyung/docs/IMPLEMENTATION_STATUS_MyNews_Concierge.md`

## 목표

1. mynews Concierge API가 실제 데이터로 정상 동작하는지 smoke test
2. 병원 원장 페르소나 기준 브리핑/질문/액션 흐름이 데모 시나리오대로 동작
3. Desk + Action Queue UI가 데모 흐름에 맞게 자연스럽게 보이는지 확인
4. 빌드/린트 통과

## 비목표

- reachykiwi 하드웨어 연동 (별도 환경 필요)
- 자동 속보 polling (P1)
- WebSocket handoff (P1)
- 멀티유저 (P1)

## 수용 기준

### AC-1: Concierge API smoke test
- `POST /api/concierge/brief` 가 병원 원장 프로필로 호출 시 뉴스 3건 + whyItMatters + recommendedAction + spokenScript 반환
- `POST /api/concierge/ask` 가 "금리 변화가 병원 운영에 왜 중요해?" 질문에 프로필 맥락 반영 답변 반환
- `POST /api/concierge/action/save` + `GET /api/concierge/action/today` 가 저장/조회 정상 동작
- `POST /api/concierge/action/remind` 가 preset "before_leave" 기준 정상 저장
- `GET /api/concierge/handoff/latest` 가 마지막 handoff 반환

### AC-2: Desk 화면 검증
- `/desk` 페이지가 브리핑 뉴스 카드 3개를 표시
- 각 카드에 제목, "왜 중요한지", "추천 액션" 표시
- 카드 클릭 시 기사 상세로 이동

### AC-3: Action Queue 검증
- `/actions` 페이지에서 저장된 뉴스와 리마인드 항목 표시
- "완료" 처리 가능
- pending/completed 구분 표시

### AC-4: Ask 흐름 검증
- `/search` 페이지에서 질문 시 concierge ask API 기반 답변
- followUpQuestions 표시
- 관련 기사 목록 표시

### AC-5: 빌드 통과
- `npx next build` 성공
- TypeScript 에러 0개

## 기술 제약

- ANTHROPIC_API_KEY 환경변수 필요
- SQLite DB에 188K 기사 적재 필요 (이미 완료)
- 단일 사용자 데모 (profileId: 1 고정)

## 구현 단계

1. API smoke test (curl 또는 스크립트로 5개 API 순차 호출)
2. 발견된 문제 수정
3. UI 검증 (Desk, Actions, Ask)
4. 빌드 확인
