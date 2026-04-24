"use client";

import { useState } from "react";
import { Badge, Button, Field, Row, Select } from "@/components/ui";

type Props = { employees: { value: string; label: string }[] };

type ReportResponse = {
  report: {
    employeeId: string;
    generatedAt: string;
    incidentAnalysis: {
      strengths: string[];
      weaknesses: string[];
      patternSummary: string;
      ruleScore: number;
      aiScore: number | null;
      aiText: string | null;
    };
    erpMetrics: {
      asTatHours: number | null;
      dispatchEfficiency: number;
      salesContribution: number;
      erpSpeed: number;
      erpDeadline: number;
      erpMastery: number;
      attendance: number;
    };
    peerScore: number;
    finalScore: {
      total: number;
      grade: "A" | "B" | "C" | "D";
      breakdown: Record<string, { score: number; weight: number; contribution: number }>;
    };
    biasWarnings: string[];
  };
  apiKeyPresent: boolean;
};

export function AiEvaluationClient({ employees }: Props) {
  const [empId, setEmpId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResponse | null>(null);

  async function run() {
    if (!empId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/hr/evaluations/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실행 실패");
        return;
      }
      const data = (await res.json()) as ReportResponse;
      setResult(data);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <Row>
        <Field label="평가 대상 직원" required>
          <Select value={empId} onChange={(e) => setEmpId(e.target.value)} placeholder="선택" options={employees} />
        </Field>
        <Field label=" " width="160px">
          <Button onClick={run} disabled={!empId || running}>
            {running ? "분석 중..." : "AI 평가 실행"}
          </Button>
        </Field>
      </Row>

      {error && <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-[color:var(--tts-border)] p-4">
            <div className="text-[11px] text-[color:var(--tts-sub)]">종합 점수</div>
            <div className="text-3xl font-extrabold text-[color:var(--tts-primary)]">{result.report.finalScore.total}</div>
            <Badge tone={result.report.finalScore.grade === "A" ? "success" : result.report.finalScore.grade === "B" ? "primary" : result.report.finalScore.grade === "C" ? "warn" : "danger"}>
              등급 {result.report.finalScore.grade}
            </Badge>
            <div className="ml-auto text-[11px] text-[color:var(--tts-muted)]">
              Claude API: {result.apiKeyPresent ? "✓ 활성" : "✗ 비활성 (규칙기반)"}
            </div>
          </div>

          <section>
            <h2 className="mb-2 text-[14px] font-extrabold text-[color:var(--tts-text)]">9지표 가중합</h2>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">지표</th><th className="py-2 text-right">점수</th><th className="py-2 text-right">가중치</th><th className="py-2 text-right">기여</th></tr></thead>
              <tbody>
                {Object.entries(result.report.finalScore.breakdown).map(([k, b]) => (
                  <tr key={k} className="border-b border-[color:var(--tts-border)]/50">
                    <td className="py-2 font-mono">{k}</td>
                    <td className="py-2 text-right font-mono">{b.score}</td>
                    <td className="py-2 text-right font-mono">{(b.weight * 100).toFixed(0)}%</td>
                    <td className="py-2 text-right font-mono font-bold">{b.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="mb-2 text-[14px] font-extrabold">사건 분석</h2>
            <div className="rounded-md border border-[color:var(--tts-border)] p-3 text-[12px]">
              <div className="mb-1">규칙 점수 {result.report.incidentAnalysis.ruleScore} · AI 점수 {result.report.incidentAnalysis.aiScore ?? "—"}</div>
              {result.report.incidentAnalysis.patternSummary && (
                <div className="mt-2 text-[color:var(--tts-sub)]">{result.report.incidentAnalysis.patternSummary}</div>
              )}
              {result.report.incidentAnalysis.strengths.length > 0 && (
                <div className="mt-2"><strong>강점:</strong> {result.report.incidentAnalysis.strengths.join(", ")}</div>
              )}
              {result.report.incidentAnalysis.weaknesses.length > 0 && (
                <div><strong>약점:</strong> {result.report.incidentAnalysis.weaknesses.join(", ")}</div>
              )}
              {result.report.incidentAnalysis.aiText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-[color:var(--tts-muted)]">AI 원문 보기</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-[11px] text-[color:var(--tts-sub)]">{result.report.incidentAnalysis.aiText}</pre>
                </details>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-[14px] font-extrabold">ERP 객관 지표</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
              <dt className="text-[color:var(--tts-sub)]">AS 평균 TAT (hrs)</dt><dd className="font-mono">{result.report.erpMetrics.asTatHours ?? "—"}</dd>
              <dt className="text-[color:var(--tts-sub)]">출동 효율 (%)</dt><dd className="font-mono">{result.report.erpMetrics.dispatchEfficiency.toFixed(1)}</dd>
              <dt className="text-[color:var(--tts-sub)]">매출 기여 (VND)</dt><dd className="font-mono">{result.report.erpMetrics.salesContribution.toLocaleString()}</dd>
              <dt className="text-[color:var(--tts-sub)]">ERP 속도 / 마감</dt><dd className="font-mono">{result.report.erpMetrics.erpSpeed.toFixed(0)} / {result.report.erpMetrics.erpDeadline.toFixed(0)}</dd>
              <dt className="text-[color:var(--tts-sub)]">근태</dt><dd className="font-mono">{result.report.erpMetrics.attendance}</dd>
              <dt className="text-[color:var(--tts-sub)]">동료 평가 평균</dt><dd className="font-mono">{result.report.peerScore}</dd>
            </dl>
          </section>

          {result.report.biasWarnings.length > 0 && (
            <section>
              <h2 className="mb-2 text-[14px] font-extrabold text-[color:var(--tts-danger)]">편향 경고</h2>
              <ul className="list-disc space-y-1 pl-5 text-[12px]">
                {result.report.biasWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
