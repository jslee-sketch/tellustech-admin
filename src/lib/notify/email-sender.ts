// Gmail SMTP 발송. GMAIL_USER + GMAIL_APP_PASSWORD 환경변수 기반.
// Free Gmail 한도: 일 500통. rate-limit 가드는 dispatcher 가 큰 fan-out 방지.
import nodemailer from "nodemailer";

let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (_transport) return _transport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  _transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return _transport;
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

// 브랜드 HTML wrapper — 인쇄/메일 클라이언트 호환 (테이블 기반).
export function wrapBrandHtml(opts: { title: string; bodyHtml: string; linkUrl?: string; linkLabel?: string }): string {
  const link = opts.linkUrl
    ? `<p style="margin:24px 0 8px"><a href="${opts.linkUrl}" style="display:inline-block;padding:10px 18px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">${opts.linkLabel ?? "View in ERP"}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr><td style="background:#0f172a;padding:18px 24px;">
      <div style="color:#fbbf24;font-size:11px;letter-spacing:0.15em;font-weight:700;">TELLUSTECH ERP</div>
      <div style="color:#fff;font-size:18px;font-weight:700;margin-top:4px;">${opts.title}</div>
    </td></tr>
    <tr><td style="padding:24px;color:#1e293b;font-size:14px;line-height:1.55;">
      ${opts.bodyHtml}
      ${link}
    </td></tr>
    <tr><td style="background:#f8fafc;padding:14px 24px;color:#64748b;font-size:11px;">
      Tellustech Vina / Vietrental — Automated notification. Reply not monitored.
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const t = getTransport();
  if (!t) return { ok: false, error: "GMAIL_USER/GMAIL_APP_PASSWORD not configured" };
  try {
    await t.sendMail({
      from: `"Tellustech ERP" <${process.env.GMAIL_USER}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text ?? msg.subject,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? "send_error" };
  }
}
