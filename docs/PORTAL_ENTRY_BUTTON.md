# 고객 포탈 진입 버튼 — tellustech.co.kr 회사 홈페이지 삽입용

회사 정적 홈페이지 (`tellustech.co.kr`) 헤더 또는 푸터에 아래 HTML 을 그대로 붙여넣으면 됩니다.
모든 한국어/베트남어 병기. 클릭 시 ERP 로그인 페이지가 **포탈 모드로 자동 전환**된 상태로 열립니다.

## 옵션 A — 헤더 inline 링크 (가장 가벼움)

```html
<a href="https://tellustech-admin-production.up.railway.app/login?portal=1"
   target="_blank" rel="noopener"
   style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;
          background:#5b9bd5;color:#fff;font-weight:bold;text-decoration:none;
          border-radius:6px;font-size:13px;">
  🛒 고객 포탈 / Cổng khách hàng
</a>
```

## 옵션 B — 푸터 카드형 (강조)

```html
<div style="margin:24px 0;padding:20px;border:1px solid #d1d5db;border-radius:12px;
            background:#f9fafb;text-align:center;max-width:420px;">
  <div style="font-size:11px;font-weight:bold;letter-spacing:0.15em;color:#e8943a;">
    TELLUSTECH VINA
  </div>
  <h3 style="margin:6px 0 4px;font-size:18px;color:#111;">
    고객 포탈 / Cổng khách hàng
  </h3>
  <p style="margin:0 0 14px;color:#666;font-size:12px;">
    AS 요청 · 소모품 요청 · 사용량 컨펌<br>
    Yêu cầu BH · Yêu cầu vật tư · Xác nhận sử dụng
  </p>
  <a href="https://tellustech-admin-production.up.railway.app/login?portal=1"
     target="_blank" rel="noopener"
     style="display:inline-block;padding:10px 24px;background:#5b9bd5;color:#fff;
            font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;">
    로그인 / Đăng nhập →
  </a>
</div>
```

## 옵션 C — 헤더 우측 상단 floating 버튼

```html
<a href="https://tellustech-admin-production.up.railway.app/login?portal=1"
   target="_blank" rel="noopener"
   style="position:fixed;top:16px;right:16px;z-index:9999;
          display:inline-flex;align-items:center;gap:8px;padding:10px 16px;
          background:linear-gradient(135deg,#5b9bd5,#4a82b4);color:#fff;
          font-weight:bold;text-decoration:none;border-radius:24px;
          box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:13px;">
  🛒 고객 포탈 / Cổng khách hàng
</a>
```

## 동작 원리
- URL `?portal=1` 또는 `?mode=portal` 쿼리 → 로그인 페이지 진입 시 자동으로 "포탈 모드" 폼 표시 (회사코드/언어 숨김, clientCode + 비밀번호만)
- 별도 페이지 분리 없이 같은 `/login` 라우트 + 쿼리만으로 토글
- 원하면 `target="_blank"` 빼서 같은 탭에서 열 수 있음

## DNS 매핑 (선택사항, 권장)
- Railway → Settings → Custom Domains → `portal.tellustech.co.kr` 추가
- DNS 제공자에서 CNAME `portal.tellustech.co.kr → tellustech-admin-production.up.railway.app`
- 그러면 위 버튼의 `href` 를 `https://portal.tellustech.co.kr/login?portal=1` 로 단축 가능
