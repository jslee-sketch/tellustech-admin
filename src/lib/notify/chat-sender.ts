// ERP 채팅 발송 — 시스템(SYSTEM) 사용자가 개인 1:1 방에 메시지 작성.
// Notification 모델은 별도 — 여기서는 ChatMessage 만 다룸.
import { prisma } from "@/lib/prisma";

const SYSTEM_USER_USERNAME = "system";

async function ensureSystemUser(): Promise<string | null> {
  let sys = await prisma.user.findFirst({ where: { username: SYSTEM_USER_USERNAME }, select: { id: true } });
  if (sys) return sys.id;
  // 없으면 자동 생성 (비활성 계정)
  try {
    sys = await prisma.user.create({
      data: {
        username: SYSTEM_USER_USERNAME,
        passwordHash: "DISABLED_NO_LOGIN",
        role: "ADMIN",
        allowedCompanies: ["TV", "VR"],
        isActive: false, // 로그인 차단
      },
    });
    return sys.id;
  } catch {
    return null;
  }
}

// 시스템 → 직원 1:1 채팅방 확보 (없으면 생성).
async function ensureSystemDirectRoom(systemUserId: string, employeeUserId: string, companyCode: "TV" | "VR"): Promise<string | null> {
  // 양쪽 모두 멤버인 DIRECT 방 검색
  const existing = await prisma.chatRoom.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId: systemUserId } } },
        { members: { some: { userId: employeeUserId } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      companyCode: companyCode as never,
      members: { create: [{ userId: systemUserId }, { userId: employeeUserId }] },
    },
    select: { id: true },
  });
  return created.id;
}

export async function sendChatMessage(args: {
  recipientEmployeeId: string;
  contentKo: string;
  contentVi: string;
  contentEn: string;
  companyCode: "TV" | "VR";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    // Employee → User 매핑
    const user = await prisma.user.findFirst({
      where: { employeeId: args.recipientEmployeeId, isActive: true },
      select: { id: true },
    });
    if (!user) return { ok: false, error: "no_user_for_employee" };

    const systemUserId = await ensureSystemUser();
    if (!systemUserId) return { ok: false, error: "no_system_user" };

    const roomId = await ensureSystemDirectRoom(systemUserId, user.id, args.companyCode);
    if (!roomId) return { ok: false, error: "no_room" };

    await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: systemUserId,
        contentVi: args.contentVi,
        contentEn: args.contentEn,
        contentKo: args.contentKo,
        originalLang: "KO",
      } as never,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? "chat_error" };
  }
}
