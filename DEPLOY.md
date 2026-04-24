# TELLUSTECH ERP — Railway 배포 가이드

## 1. 사전 준비

- Railway 계정 + `empathetic-eagerness` 프로젝트 (이미 있음)
  - `tellustech-admin` 서비스
  - `Postgres` 서비스 (이미 있음, 볼륨 포함)
- GitHub 저장소: `jslee-sketch/tellustech-admin`
- 도메인: 추후 `admin.tellustech.co.kr` CNAME 연결

## 2. 배포 순서

### 2.1 GitHub push

```bash
cd /c/D드라이브/2.AIWorks/tellustech-erp
git remote add origin https://github.com/jslee-sketch/tellustech-admin.git
git add .
git commit -m "Replace Python admin with Next.js ERP"
git branch -M main
git push -f origin main   # 기존 Python 코드 덮어쓰기
```

기존 Python 코드는 필요 시 `main~1` 태그로 복원 가능 (force push 후 몇 분 내).

### 2.2 Railway 환경변수 설정

Railway 대시보드 → `tellustech-admin` → Variables 탭:

| 키 | 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | (이미 링크됨) | Postgres 서비스에서 자동 주입 |
| `JWT_SECRET` | 128자 랜덤 hex | 아래 명령으로 생성 |
| `NODE_ENV` | `production` | |
| `ANTHROPIC_API_KEY` | (선택) | 채팅 3언어 번역. 없어도 앱 작동 |

`JWT_SECRET` 생성:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.3 Railway 재배포

GitHub push 하면 Railway 가 자동 감지 → Nixpacks 로 Next.js 빌드 → 배포.

빌드 체인:
1. `npm ci` (의존성 설치)
2. `postinstall` 훅 — `prisma generate` 자동 실행
3. `npm run build` — `prisma generate && next build`
4. 배포 시작 시 — `npx prisma db push` (스키마 동기화, 데이터 보존)
5. `npm run start` — Next.js 서버 기동

### 2.4 초기 DB 시드 (최초 1회)

배포 성공 후 Railway 서비스 → `⋮` → `Shell` 열고:

```bash
npm run db:seed
```

→ 기본 계정 `admin/admin123` · `vr_admin/admin123` · 15 품목 · 거래처 5 · 부서 10 생성.

**주의**: `db:deploy` 스크립트는 `--accept-data-loss` 포함이라 운영 데이터 있을 때 쓰면 안 됨. 최초 1회만.

## 3. 도메인 연결 (선택)

1. Railway `tellustech-admin` → Settings → Networking → Custom Domain
2. `admin.tellustech.co.kr` 입력 → CNAME 타겟 확인
3. 닷네임코리아 DNS 관리자:
   - 타입: CNAME
   - 호스트: `admin`
   - 값: Railway 가 알려준 `xxx.up.railway.app`
   - TTL: 3600
4. `tellustech-site/index.html` Admin 버튼 href 수정:
   ```html
   <a href="https://admin.tellustech.co.kr">Admin</a>
   ```

## 4. 트러블슈팅

**빌드 실패 — Prisma 엔진 누락**
→ `postinstall: prisma generate` 확인 (package.json)

**빌드 실패 — "Cannot find module 'xxx'"**
→ `npm ci` 로 재설치 필요. Railway 는 `package-lock.json` 기준으로 설치.

**스타트 실패 — DATABASE_URL 미설정**
→ Railway Variables 에서 Postgres 연결 상태 확인. 링크가 끊어진 경우 `${{Postgres.DATABASE_URL}}` 로 재설정.

**로그인 500 에러**
→ `JWT_SECRET` 환경변수 누락. 꼭 운영 전용 랜덤값으로 설정.

**스키마 동기화 실패**
→ Shell 에서 `npx prisma db push --accept-data-loss` 수동 실행 (기존 데이터 삭제 경고).

## 5. 로컬 개발

```bash
npm install
cp .env.example .env     # DATABASE_URL, JWT_SECRET 채우기
npx prisma db push
npm run db:seed
npm run dev
```
