import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card, DataTable } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return (
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-3xl">
          <Card title="접근 제한">관리자(ADMIN)만 접근 가능한 페이지입니다.</Card>
        </div>
      </main>
    );
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { occurredAt: "desc" },
    take: 300,
    include: { user: { select: { username: true } } },
  });

  const rows = logs.map((l) => ({
    id: l.id,
    occurredAt: l.occurredAt.toISOString().slice(0, 19).replace("T", " "),
    companyCode: l.companyCode ?? "—",
    username: l.user?.username ?? "system",
    tableName: l.tableName,
    action: l.action,
    recordId: l.recordId,
    beforeAfter: summarizeChange(l.before, l.after, l.action),
  }));

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
          <h1 className="mt-1 text-2xl font-extrabold">🧾 감사 로그 (Audit Log)</h1>
          <div className="mt-1 text-[12px] text-[color:var(--tts-muted)]">모든 INSERT/UPDATE/DELETE 기록 · 최근 300건</div>
        </div>
        <Card count={rows.length}>
          <DataTable
            columns={[
              { key: "occurredAt", label: "시각", width: "170px", render: (v) => <span className="font-mono text-[11px]">{v as string}</span> },
              { key: "companyCode", label: "회사", width: "60px" },
              { key: "username", label: "사용자", width: "120px" },
              {
                key: "action",
                label: "작업",
                width: "80px",
                render: (v) => {
                  const s = v as string;
                  const tone = s === "INSERT" ? "success" : s === "UPDATE" ? "warn" : s === "DELETE" ? "danger" : "neutral";
                  return <Badge tone={tone}>{s}</Badge>;
                },
              },
              { key: "tableName", label: "테이블", width: "160px", render: (v) => <span className="font-mono text-[11px]">{v as string}</span> },
              { key: "recordId", label: "Record ID", width: "220px", render: (v) => <span className="font-mono text-[10px] text-[color:var(--tts-muted)]">{v as string}</span> },
              {
                key: "beforeAfter",
                label: "변경 내용",
                render: (_, r) => (
                  <pre className="whitespace-pre-wrap text-[10px] text-[color:var(--tts-sub)]">{r.beforeAfter}</pre>
                ),
              },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage="기록된 감사 로그가 없습니다"
          />
        </Card>
      </div>
    </main>
  );
}

function summarizeChange(before: unknown, after: unknown, action: string): string {
  if (action === "INSERT") {
    return "+ " + JSON.stringify(truncate(after), null, 0);
  }
  if (action === "DELETE") {
    return "- " + JSON.stringify(truncate(before), null, 0);
  }
  if (action === "UPDATE") {
    const b = (before ?? {}) as Record<string, unknown>;
    const a = (after ?? {}) as Record<string, unknown>;
    const diffs: string[] = [];
    for (const k of Object.keys(a)) {
      if (k === "updatedAt" || k === "createdAt") continue;
      if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) {
        diffs.push(`${k}: ${JSON.stringify(b[k])} → ${JSON.stringify(a[k])}`);
      }
    }
    return diffs.length === 0 ? "(변경 없음)" : diffs.slice(0, 5).join("\n");
  }
  return "";
}

function truncate(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const o = obj as Record<string, unknown>;
  const keys = ["id", "code", "name", "status", "totalAmount", "amount"] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in o) out[k] = o[k as string];
  return Object.keys(out).length > 0 ? out : o;
}
