import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, notFound, ok, optionalEnum, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { translateText } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

// GET: 메시지 리스트 (최신 순)
// POST: 메시지 전송 → Claude API 로 나머지 2개 언어 번역 → 3언어 저장
// 실시간 전달은 WebSocket 서버(별도 프로세스) 필요 — 현재는 HTTP fetch polling 또는 전송 후 수동 새로고침.

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    // 멤버만 조회 가능
    const member = await prisma.chatRoomMember.findUnique({
      where: { chatRoomId_userId: { chatRoomId: id, userId: session.sub } },
    });
    if (!member) return notFound();

    const messages = await prisma.chatMessage.findMany({
      where: { chatRoomId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { sender: { select: { username: true } } },
    });

    // 읽음 확인 — 현재 접속자의 lastReadAt 갱신
    await prisma.chatRoomMember.update({
      where: { chatRoomId_userId: { chatRoomId: id, userId: session.sub } },
      data: { lastReadAt: new Date() },
    });

    return ok({ messages: messages.reverse() });
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const member = await prisma.chatRoomMember.findUnique({
      where: { chatRoomId_userId: { chatRoomId: id, userId: session.sub } },
    });
    if (!member) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const content = requireString(p.content, "content");
      const originalLang = optionalEnum(p.originalLang, LANGS) ?? (session.language as Language);

      // 원문 필드 채우기
      const fields: { contentVi: string | null; contentEn: string | null; contentKo: string | null } = {
        contentVi: null,
        contentEn: null,
        contentKo: null,
      };
      const srcKey = `content${originalLang[0]}${originalLang[1].toLowerCase()}` as "contentVi" | "contentEn" | "contentKo";
      fields[srcKey] = content;

      // 나머지 2개 언어 Claude 번역 (API 키 없으면 null)
      for (const lang of LANGS) {
        if (lang === originalLang) continue;
        const key = `content${lang[0]}${lang[1].toLowerCase()}` as "contentVi" | "contentEn" | "contentKo";
        if (!fields[key]) {
          fields[key] = await translateText(content, lang, originalLang);
        }
      }

      // @전표번호 멘션 추출 (TLS-/VRT-/SLS-/PUR-/YY/MM/DD-NN 등)
      const mentionRe = /(TLS|VRT|SLS|PUR|CAL|TM|INC|EVAL|ONB|OFF|LV|EXP|SCH|LIC|CL|ITM)-\d{4,6}-\d{2,}|\d{2}\/\d{2}\/\d{2}-\d{2}/g;
      const mentions = Array.from(new Set((content.match(mentionRe) ?? []).map((m) => m.trim())));

      const msg = await prisma.chatMessage.create({
        data: {
          chatRoomId: id,
          senderId: session.sub,
          contentVi: fields.contentVi,
          contentEn: fields.contentEn,
          contentKo: fields.contentKo,
          originalLang,
          mentions,
          attachmentId: trimNonEmpty(p.attachmentId),
        },
      });
      // 채팅방 lastUpdated 갱신 (updatedAt 은 Prisma 가 자동)
      await prisma.chatRoom.update({ where: { id }, data: { updatedAt: new Date() } });
      return ok({ message: msg }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
