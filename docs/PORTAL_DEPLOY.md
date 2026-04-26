# 고객 포탈 (PORTAL_MODE) 분리 배포 가이드

## 컨셉
- 같은 코드베이스 / 같은 DB 공유 / **별도 Railway 서비스**
- `PORTAL_MODE=true` 환경변수로 인스턴스 분기
- 도메인 예: `portal.tellustech-erp.up.railway.app` 또는 커스텀 도메인 `portal.tellustech-erp.com`
- CLIENT 역할만 접근 가능 — admin/manager/staff 로그인 시도 시 즉시 logout + redirect

## proxy.ts 분기 동작
- `PORTAL_MODE=true` 감지 시:
  - `/portal/*`, `/api/portal/*`, `/api/auth/*`, `/api/files/*`, `/login`, `/`, `/flags/*`, `/_next/*` 만 허용
  - 그 외 모든 경로 → 페이지: `/portal` redirect / API: `404 portal_mode_only`
  - 비-CLIENT 세션 → `/login?reason=client_only` redirect (admin 차단)
- `PORTAL_MODE` 미설정 (사내 인스턴스) 동작은 변경 없음

## Railway 셋업 단계 (사용자 액션 필요)

1. **두 번째 서비스 생성**
   - 같은 GitHub repo 연결
   - 같은 main 브랜치 watch
   - Builder = Nixpacks (현 인스턴스와 동일)

2. **환경변수 (사내 인스턴스 변수에 추가로 1개만 설정)**
   ```
   PORTAL_MODE=true
   DATABASE_URL=<사내 인스턴스와 동일>
   JWT_SECRET=<사내 인스턴스와 동일>  ← 동일해야 동일 세션 인식
   ANTHROPIC_API_KEY=<사내 인스턴스와 동일>
   NODE_ENV=production
   ```

3. **빌드 명령** — 변경 없음 (`prisma db push --accept-data-loss && next build`)

4. **도메인 연결**
   - Railway → Settings → Domains → `Generate Domain` → `portal-xxxx.up.railway.app`
   - 또는 Custom Domain `portal.tellustech.co.kr` (DNS CNAME)

5. **사내 인스턴스 (admin) 도메인은 별도 — `tellustech-admin-production.up.railway.app` 그대로 유지**

## 보안 모델

| 시도 | 결과 |
|---|---|
| 외부인이 portal 도메인 직접 접근 | `/login` 강제 (CLIENT 계정 필요) |
| admin 계정으로 portal 도메인 로그인 시도 | proxy 가 즉시 logout + `/login?reason=client_only` |
| portal 도메인에서 `/admin/*` `/master/*` 등 사내 경로 직접 입력 | 페이지: `/portal` redirect / API: 404 |
| 사내 도메인에서 `/portal/*` 접근 | 기존 동작 (CLIENT 계정만 진입) |
| JWT 쿠키 도메인 분리 | 도메인이 다르므로 자연스럽게 격리 (subdomain 공유 X) |

## 검증 체크리스트 (배포 후)

```bash
# 1. 사내 사이트 정상
curl https://tellustech-admin-production.up.railway.app/api/auth/me  # 401 또는 200

# 2. 포탈 사이트 — admin 계정 거절
curl -X POST https://portal.../api/auth/login \
  -d '{"username":"admin","password":"...","companyCode":"TV"}' \
  → 200 응답이지만, 다음 GET /api/auth/me 가 client_only 로 403

# 3. 포탈 사이트 — 사내 라우트 차단
curl https://portal.../master/clients  → 302 to /portal
curl https://portal.../api/sales        → 404 portal_mode_only
```

## 롤백
- Railway 두번째 서비스만 정지 / 삭제 → 사내 인스턴스 영향 없음
- 코드 한 줄도 변경 안 됨 (PORTAL_MODE 분기는 환경변수에만 의존)
