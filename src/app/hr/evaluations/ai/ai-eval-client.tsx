"use client";

import { useState } from "react";
import { Badge, Button, Field, Row, Select } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Props = { employees: { value: string; label: string }[]; lang: Lang };

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

export function AiEvaluationClient({ employees, lang }: Props) {
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
        setError(data.error ?? t("msg.aiRunFailed", lang));
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
        <Field label={t("field.evalTarget", lang)} required>
          <Select value={empId} onChange={(e) => setEmpId(e.target.value)} placeholder={t("placeholder.select", lang)} options={employees} />
        </Field>
        <Field label=" " width="160px">
          <Button onClick={run} disabled={!empId || running}>
            {running ? t("btn.aiAnalyzing", lang) : t("btn.runAiEval", lang)}
          </Button>
        </Field>
      </Row>

      {error && <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-[color:var(--tts-border)] p-4">
            <div className="text-[11px] text-[color:var(--tts-sub)]">{t("label.totalScore", lang)}</div>
            <div className="text-3xl font-extrabold text-[color:var(--tts-primary)]">{result.report.finalScore.total}</div>
            <Badge tone={result.report.finalScore.grade === "A" ? "success" : result.report.finalScore.grade === "B" ? "primary" : result.report.finalScore.grade === "C" ? "warn" : "danger"}>
              {t("label.gradeLabel", lang).replace("{grade}", result.report.finalScore.grade)}
            </Badge>
            <div className="ml-auto text-[11px] text-[color:var(--tts-muted)]">
              {result.apiKeyPresent ? t("label.claudeApiActive", lang) : t("label.claudeApiInactive", lang)}
            </div>
          </div>

          <section>
            <h2 className="mb-2 text-[14px] font-extrabold text-[color:var(--tts-text)]">{t("label.weightedSum9", lang)}</h2>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">{t("th.indicator", lang)}</th><th className="py-2 text-right">{t("th.scoreH", lang)}</th><th className="py-2 text-right">{t("th.weightH", lang)}</th><th className="py-2 text-right">{t("th.contribution", lang)}</th></tr></thead>
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
            <h2 className="mb-2 text-[14px] font-extrabold">{t("label.incidentAnalysis", lang)}</h2>
            <div className="rounded-md border border-[color:var(--tts-border)] p-3 text-[12px]">
              <div className="mb-1">{t("label.ruleScore", lang).replace("{rule}", String(result.report.incidentAnalysis.ruleScore)).replace("{ai}", result.report.incidentAnalysis.aiScore !== null ? String(result.report.incidentAnalysis.aiScore) : "—")}</div>
              {result.report.incidentAnalysis.patternSummary && (
                <div className="mt-2 text-[color:var(--tts-sub)]">{result.report.incidentAnalysis.patternSummary}</div>
              )}
              {result.report.incidentAnalysis.strengths.length > 0 && (
                <div className="mt-2"><strong>{t("label.strengths", lang)}</strong> {result.report.incidentAnalysis.strengths.join(", ")}</div>
              )}
              {result.report.incidentAnalysis.weaknesses.length > 0 && (
                <div><strong>{t("label.weaknesses", lang)}</strong> {result.report.incidentAnalysis.weaknesses.join(", ")}</div>
              )}
              {result.report.incidentAnalysis.aiText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-[color:var(--tts-muted)]">{t("label.aiOriginal", lang)}</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-[11px] text-[color:var(--tts-sub)]">{result.report.incidentAnalysis.aiText}</pre>
                </details>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-[14px] font-extrabold">{t("label.erpObjective", lang)}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
              <dt className="text-[color:var(--tts-sub)]">{t("label.asTatHrs", lang)}</dt><dd className="font-mono">{result.report.erpMetrics.asTatHours ?? "—"}</dd>
              <dt className="text-[color:var(--tts-sub)]">{t("label.dispatchEff", lang)}</dt><dd className="font-mono">{result.report.erpMetrics.dispatchEfficiency.toFixed(1)}</dd>
              <dt className="text-[color:var(--tts-sub)]">{t("label.salesContribLbl", lang)}</dt><dd className="font-mono">{result.report.erpMetrics.salesContribution.toLocaleString()}</dd>
              <dt className="text-[color:var(--tts-sub)]">{t("label.erpSpeedDeadline", lang)}</dt><dd className="font-mono">{result.report.erpMetrics.erpSpeed.toFixed(0)} / {result.report.erpMetrics.erpDeadline.toFixed(0)}</dd>
              <dt className="text-[color:var(--tts-sub)]">{t("label.attendance", lang)}</dt><dd className="font-mono">{result.report.erpMetrics.attendance}</dd>
              <dt className="text-[color:var(--tts-sub)]">{t("label.peerScoreAvg", lang)}</dt><dd className="font-mono">{result.report.peerScore}</dd>
            </dl>
          </section>

          {result.report.biasWarnings.length > 0 && (
            <section>
              <h2 className="mb-2 text-[14px] font-extrabold text-[color:var(--tts-danger)]">{t("label.biasWarnings", lang)}</h2>
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
