"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Field, TextInput, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

type Cert = {
  id: string;
  serialNumber: string | null;
  certNumber: string | null;
  certFileId: string | null;
  issuedAt: string | null;
  nextDueAt: string | null;
  item: { itemCode: string; name: string } | null;
};

export function CalCertsClient({ lang: _lang }: { lang: Lang }) {
  const [sn, setSn] = useState("");
  const [cert, setCert] = useState("");
  const [item, setItem] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (sn) q.set("sn", sn);
      if (cert) q.set("cert", cert);
      if (item) q.set("item", item);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const j = await fetch(`/api/portal/cal-certs?${q.toString()}`).then(r => r.json());
      setRows(j?.certs ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const columns: DataTableColumn<Cert>[] = [
    { key: "issuedAt", label: "발행일 / Ngày", width: "110px",
      render: (v) => v ? String(v).slice(0,10) : "-" },
    { key: "certNumber", label: "성적서번호 / Số chứng chỉ", width: "180px",
      render: (v) => <span className="font-mono">{(v as string) ?? "-"}</span> },
    { key: "serialNumber", label: "S/N", width: "200px",
      render: (v) => <span className="font-mono text-[11px]">{(v as string) ?? "-"}</span> },
    { key: "item", label: "품목 / Vật phẩm",
      render: (_, r) => r.item ? `${r.item.itemCode} · ${r.item.name}` : "-" },
    { key: "nextDueAt", label: "다음 기한", width: "110px",
      render: (v) => v ? String(v).slice(0,10) : "-" },
    { key: "certFileId", label: "다운로드", width: "100px", align: "center",
      render: (v) => v ? (
        <Link href={`/api/files/${v}`} target="_blank" rel="noopener"
          className="inline-block rounded bg-[color:var(--tts-primary)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90">
          📄 PDF
        </Link>
      ) : <span className="text-[color:var(--tts-muted)]">-</span> },
  ];

  return (
    <div className="space-y-3">
      <Card title="검색조건 / Tìm kiếm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="S/N"><TextInput value={sn} onChange={(e)=>setSn(e.target.value)} placeholder="SN-..."/></Field>
          <Field label="성적서번호 / Số CC"><TextInput value={cert} onChange={(e)=>setCert(e.target.value)} placeholder="CC-..."/></Field>
          <Field label="품목 / Vật phẩm"><TextInput value={item} onChange={(e)=>setItem(e.target.value)} placeholder="ITM-..."/></Field>
          <Field label="시작일 / Từ"><TextInput type="date" value={from} onChange={(e)=>setFrom(e.target.value)} /></Field>
          <Field label="종료일 / Đến"><TextInput type="date" value={to} onChange={(e)=>setTo(e.target.value)} /></Field>
        </div>
        <div className="mt-3"><Button onClick={load} disabled={loading}>{loading ? "조회 중…" : "조회 / Tìm"}</Button></div>
      </Card>
      <Card title={`결과 / Kết quả (${rows.length})`}>
        <DataTable columns={columns} data={rows} rowKey={(r) => r.id} emptyMessage="결과 없음 / Không có kết quả" />
      </Card>
    </div>
  );
}
