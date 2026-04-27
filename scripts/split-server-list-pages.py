"""
Server component page 가 DataTable 에 render: function 을 직접 prop 으로 넘기면
Next.js 16 RSC 가 직렬화 못 해서 500. 자동 분리.

하지만 자동 분리 위험 — Card title/count 등 server-only 처리 보존 필요.
대신 1 줄 'use client' 만 page.tsx 상단에 붙이는 안전 fix 적용.

조건: page.tsx 가 'force-dynamic' 이면 server 만 가능 (use client 시 불가).
실제로는 'force-dynamic' 둘 다 호환 — server-side data fetch 는 page.tsx 에서
prisma 직접 못 쓰지만, 그건 별도 layer 분리 필요. 더 간단한 안전책:

1. 9개 페이지 모두 'use client' 만 추가하면 prisma 직접 호출 불가 → 깨짐
2. server data fetch 는 그대로 두고, return 만 client wrapper 로 위임

→ 자동화 어려움. 수동 분리가 안전.

대신 임시 감기 — 'use client' 시도 안 하고 직접 page.tsx 의 DataTable 호출을
client wrapper 로 위임하는 패턴을 9 파일에 직접 적용.
"""
print("manual fix 권장 — 자동 스크립트 위험.")
