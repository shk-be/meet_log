# Meeting Logger - AI 기반 미팅 관리 시스템

AI를 활용한 스마트 미팅 기록 및 관리 시스템입니다.

## 주요 기능

### ✅ 완료된 기능 (Phase 0-4)

#### Phase 0-2: 기본 인프라
- **데이터베이스**: SQLite 기반 데이터 저장
- **백엔드**: Express.js REST API
- **프론트엔드**: React 18 + Vite + Material-UI
- **AI 통합**: OpenAI GPT-3.5-turbo를 활용한 미팅록 자동 정리

#### Phase 3: 액션 아이템 & 태그 관리
- **액션 아이템 페이지**:
  - 칸반 보드 (Drag & Drop)
  - 상태별 관리 (대기/진행중/완료/취소)
  - 우선순위 및 마감일 설정
  - 담당자 지정
- **태그 관리**:
  - 태그 생성/수정/삭제
  - 색상 지정 (18가지 색상)
  - 사용 빈도 추적

#### Phase 4: 검색 & 분석
- **고급 검색**:
  - AI Q&A 모드: 자연어로 질문하고 답변 받기
  - 키워드 검색 모드: 날짜, 참석자 필터링
- **분석 대시보드**:
  - 미팅 트렌드 차트
  - 액션 아이템 통계
  - 인기 태그 Top 10
  - 참여 빈도 분석
  - 키워드 클라우드

#### AI 설정 관리
- **AI 가이드라인 설정**:
  - 미팅 요약 가이드라인
  - 액션 아이템 추출 가이드라인
  - 주요 포커스 설정
- **미팅 타입 관리**:
  - 커스텀 미팅 타입 생성
  - 타입별 템플릿 설정

## 기술 스택

### Backend
- Node.js + Express.js
- SQLite (better-sqlite3)
- OpenAI API (GPT-3.5-turbo)

### Frontend
- React 18
- Vite
- Material-UI (MUI)
- React Router
- Recharts (차트)
- React Beautiful DnD (Drag & Drop)
- Axios

## 설치 및 실행

### 1. 환경 설정

```bash
# 프로젝트 클론
git clone https://github.com/shk-be/meet_log.git
cd meet_log

# .env 파일 생성
cp .env.example .env
```

`.env` 파일에 OpenAI API 키 입력:
```
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
PORT=3000
NODE_ENV=development
```

### 2. 백엔드 실행

```bash
cd server
npm install
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 3. 프론트엔드 실행

```bash
cd client
npm install
npm run dev
```

클라이언트가 `http://localhost:5173`에서 실행됩니다.

## API 엔드포인트

### Meetings
- `GET /api/meetings` - 미팅 목록 조회
- `POST /api/meetings` - 새 미팅 생성 (AI 자동 정리)
- `GET /api/meetings/:id` - 미팅 상세 조회
- `PUT /api/meetings/:id` - 미팅 수정
- `DELETE /api/meetings/:id` - 미팅 삭제

### Action Items
- `GET /api/action-items` - 액션 아이템 목록
- `POST /api/action-items` - 액션 아이템 생성
- `PUT /api/action-items/:id` - 액션 아이템 수정
- `DELETE /api/action-items/:id` - 액션 아이템 삭제

### Tags
- `GET /api/tags` - 태그 목록
- `POST /api/tags` - 태그 생성
- `PUT /api/tags/:id` - 태그 수정
- `DELETE /api/tags/:id` - 태그 삭제

### Search
- `POST /api/search` - AI 기반 검색 및 Q&A

### Settings
- `GET /api/settings` - 전체 설정 조회
- `PUT /api/settings` - 설정 업데이트
- `GET /api/settings/ai-guidelines` - AI 가이드라인 조회
- `PUT /api/settings/ai-guidelines` - AI 가이드라인 업데이트
- `GET /api/settings/meeting-types` - 미팅 타입 목록
- `POST /api/settings/meeting-types` - 미팅 타입 추가
- `PUT /api/settings/meeting-types/:id` - 미팅 타입 수정
- `DELETE /api/settings/meeting-types/:id` - 미팅 타입 삭제

## 사용 방법

1. **미팅 등록**: 미팅 내용을 입력하면 AI가 자동으로 구조화하여 정리
2. **액션 아이템 관리**: 칸반 보드에서 드래그 앤 드롭으로 상태 변경
3. **검색**: 자연어로 질문하거나 키워드로 검색
4. **분석**: 대시보드에서 미팅 통계 및 인사이트 확인
5. **설정**: AI 가이드라인을 커스터마이징하여 더 정확한 정리

## 향후 계획 (Phase 5+)

- Phase 5: 버전 관리, 미팅 템플릿
- Phase 6: 이메일/슬랙 알림
- Phase 7: PDF/DOCX 내보내기
- Phase 8: 캘린더/슬랙 연동
- Phase 9: 음성 녹음 및 자동 전사
- Phase 10: GPT-4 업그레이드, 감정 분석
- Phase 11: 미팅 관계 그래프
- Phase 12: 테스트 및 배포 최적화

## 라이선스

MIT

## 기여

이슈 및 PR을 환영합니다!
