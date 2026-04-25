import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { withUniqueRetry } from "@/lib/code-generator";
import { fillTranslations } from "@/lib/translate";
import type { ASStatus, Language } from "@/generated/prisma/client";

// AS 접수 API
// - ticketNumber 포맷: YY/MM/DD-## (가이드 명시, 2자리 순번, 일일)
// - 미수금차단 자동 확인: 거래처 receivableStatus === BLOCKED → receivableBlocked=true
// - S/N 느슨 확인 (LOOSE) — 검증 없이 저장
// - 증상 필드는 vi/en/ko 3컬럼. AI 번역 미연동(Phase 1-5 deferred).
//   사용자가 최소 1개 언어 입력 + originalLang 선택.

const STATUSES: readonly ASStatus[] = ["RECEIVED", "IN_PROGRESS", "DISPATCHED", "COMPLETED", "CANCELED"] as const;
const LANGUAGES: readonly Language[] = ["VI", "EN", "KO"] as const;

function todayYyMmDd(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
}

async function nextAsTicketNumber(): Promise<string> {
  const prefix = `${todayYyMmDd()}-`;
  const last = await prisma.asTicket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  });
  let next = 1;
  if (last) {
    const tail = last.ticketNumber.slice(prefix.length);
    const n = Number(tail);
    if (Number.isInteger(n) && n >= 0) next = n + 1;
  }
  return `${prefix}${String(next).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const status = optionalEnum(url.searchParams.get("status"), STATUSES);
    const clientId = trimNonEmpty(url.searchParams.get("client"));
    const assignedToId = trimNonEmpty(url.searchParams.get("assignee"));

    const where = {
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(q
        ? {
            OR: [
              { ticketNumber: { contains: q, mode: "insensitive" as const } },
              { serialNumber: { contains: q, mode: "insensitive" as const } },
              { client: { companyNameVi: { contains: q, mode: "insensitive" as const } } },
              { client: { clientCode: { contains: q, mode: "insensitive" as const } } },
              { symptomVi: { contains: q, mode: "insensitive" as const } },
              { symptomEn: { contains: q, mode: "insensitive" as const } },
              { symptomKo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const tickets = await prisma.asTicket.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: 500,
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } },
        assignedTo: { select: { id: true, employeeCode: true, nameVi: true } },
        _count: { select: { dispatches: true } },
      },
    });
    return ok({ tickets });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const clientId = requireString(p.clientId, "clientId");
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, receivableStatus: true },
      });
      if (!client) return badRequest("invalid_client");

      const assignedToId = trimNonEmpty(p.assignedToId);
      if (assignedToId) {
        const e = await prisma.employee.findUnique({ where: { id: assignedToId } });
        if (!e) return badRequest("invalid_assignee");
      }

      const itemId = trimNonEmpty(p.itemId);
      if (itemId) {
        const it = await prisma.item.findUnique({ where: { id: itemId } });
        if (!it) return badRequest("invalid_item");
      }

      // 증상 — 최소 1개 언어 필수
      const symptomVi = trimNonEmpty(p.symptomVi);
      const symptomEn = trimNonEmpty(p.symptomEn);
      const symptomKo = trimNonEmpty(p.symptomKo);
      if (!symptomVi && !symptomEn && !symptomKo) {
        return badRequest("invalid_input", { field: "symptom", reason: "required_at_least_one" });
      }
      const originalLang = optionalEnum(p.originalLang, LANGUAGES) ??
        (symptomVi ? "VI" : symptomEn ? "EN" : "KO");

      // Claude 자동 번역 — 누락된 언어 채움
      const filled = await fillTranslations({
        vi: symptomVi ?? null, en: symptomEn ?? null, ko: symptomKo ?? null, originalLang,
      });

      // 사진 첨부 — 이미 업로드된 파일 ID 배열
      const photoIds = Array.isArray(p.photoIds)
        ? (p.photoIds as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
        : [];
      if (photoIds.length > 0) {
        const existing = await prisma.file.count({ where: { id: { in: photoIds } } });
        if (existing !== photoIds.length) {
          return badRequest("invalid_photo_ids");
        }
      }

      const receivableBlocked = client.receivableStatus === "BLOCKED";

      const created = await withUniqueRetry(
        async () => {
          const ticketNumber = await nextAsTicketNumber();
          return prisma.asTicket.create({
            data: {
              ticketNumber,
              clientId,
              assignedToId: assignedToId ?? null,
              itemId: itemId ?? null,
              serialNumber: trimNonEmpty(p.serialNumber),
              status: "RECEIVED",
              receivedAt: new Date(),
              symptomVi: filled.vi,
              symptomEn: filled.en,
              symptomKo: filled.ko,
              originalLang,
              receivableBlocked,
              ...(photoIds.length > 0
                ? { photos: { connect: photoIds.map((id) => ({ id })) } }
                : {}),
            },
            include: {
              client: { select: { clientCode: true, companyNameVi: true, receivableStatus: true } },
              photos: { select: { id: true, originalName: true } },
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      return ok({ ticket: created, warning: receivableBlocked ? "receivable_blocked" : null }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
