# Render.com 배포 가이드

## 📋 사전 준비

1. **Render.com 계정 생성**
   - https://render.com 접속
   - GitHub 계정으로 가입/로그인

2. **GitHub 저장소 연결 권한 부여**
   - Render가 `shk-be/meet_log` 저장소에 접근할 수 있도록 허용

## 🚀 배포 단계

### 방법 1: Blueprint (render.yaml 사용) - 추천

1. **Render 대시보드 접속**
   - https://dashboard.render.com

2. **New Blueprint Instance 생성**
   - 상단 메뉴: "New +" → "Blueprint"
   - Repository 선택: `shk-be/meet_log`
   - Branch: `main`

3. **환경 변수 설정**
   - `OPENAI_API_KEY` 입력 (실제 OpenAI API 키로 교체)

4. **Apply 클릭**
   - 자동으로 3개 서비스 생성:
     - PostgreSQL 데이터베이스
     - Backend API 서버
     - Frontend 정적 사이트

---

### 방법 2: 수동 배포

#### Step 1: PostgreSQL 데이터베이스 생성

1. **New PostgreSQL 클릭**
   - Name: `meeting-logger-db`
   - Database: `meeting_logger`
   - User: `meeting_logger_user`
   - Region: Oregon (Free tier)
   - PostgreSQL Version: 14
   - Plan: Free

2. **Create Database 클릭**

3. **Internal Database URL 복사**
   - Info 탭에서 "Internal Database URL" 복사 (나중에 사용)

#### Step 2: Backend 웹 서비스 생성

1. **New Web Service 클릭**

2. **Git Repository 연결**
   - Repository: `shk-be/meet_log`
   - Branch: `main`

3. **서비스 설정**
   ```
   Name: meeting-logger-backend
   Region: Oregon (Free)
   Branch: main
   Root Directory: (비워둠)
   Environment: Node
   Build Command: cd server && npm install
   Start Command: cd server && npm start
   Plan: Free
   ```

4. **Advanced 설정**
   - Health Check Path: `/api/health`
   - Auto-Deploy: Yes

5. **Environment Variables 추가**
   ```
   NODE_ENV=production
   PORT=3000
   OPENAI_API_KEY=your-openai-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo
   DATABASE_URL=[Step 1에서 복사한 Internal Database URL]
   ```

   ⚠️ **중요:** `OPENAI_API_KEY`를 실제 OpenAI API 키로 교체하세요.

6. **Create Web Service 클릭**

#### Step 3: Frontend 정적 사이트 생성

1. **New Static Site 클릭**

2. **Git Repository 연결**
   - Repository: `shk-be/meet_log`
   - Branch: `main`

3. **서비스 설정**
   ```
   Name: meeting-logger-frontend
   Branch: main
   Root Directory: (비워둠)
   Build Command: cd client && npm install --legacy-peer-deps && npm run build
   Publish Directory: client/dist
   ```

4. **Environment Variables 추가**
   ```
   VITE_API_URL=[Backend 서비스 URL] (예: https://meeting-logger-backend.onrender.com)
   ```

5. **Create Static Site 클릭**

## 🔧 배포 후 설정

### 1. Client API URL 업데이트

Frontend에서 Backend API를 호출하도록 설정:

**client/src/services/api.js** 수정 필요:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

### 2. CORS 설정 확인

**server/src/server.js**에서 CORS가 frontend URL을 허용하는지 확인:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

## 📊 배포 확인

1. **Backend Health Check**
   ```
   https://meeting-logger-backend.onrender.com/api/health
   ```
   응답 예시:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-11-27T...",
     "openai": "configured"
   }
   ```

2. **Frontend 접속**
   ```
   https://meeting-logger-frontend.onrender.com
   ```

## ⚠️ 주의사항

### Free Tier 제한사항

1. **자동 슬립**
   - 15분 동안 요청이 없으면 서비스가 sleep 모드로 전환
   - 다음 요청 시 50초 정도 소요 (cold start)

2. **PostgreSQL**
   - 무료 플랜: 90일 후 만료
   - 1GB 스토리지
   - 연결 제한: 97개

3. **대역폭**
   - 100 GB/월

### 해결 방법

- **Paid Plan 사용** ($7/월부터)
- **UptimeRobot** 등으로 주기적 ping (sleep 방지)

## 🔄 업데이트 배포

GitHub에 푸시하면 자동 배포:
```bash
git add .
git commit -m "Update"
git push origin main
```

Render가 자동으로 감지하고 재배포합니다.

## 🐛 문제 해결

### 데이터베이스 연결 실패
```
Error: Failed to connect to PostgreSQL
```
**해결:** Environment Variables에서 DATABASE_URL 확인

### Build 실패
```
npm ERR! peer dependency
```
**해결:** `--legacy-peer-deps` 플래그 사용 확인

### 로그 확인
Render 대시보드 → 서비스 선택 → "Logs" 탭

## 📞 지원

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: https://github.com/shk-be/meet_log/issues
