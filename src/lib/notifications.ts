import "server-only";
import { prisma } from "./prisma";
import type { CompanyCode, NotificationType } from "@/generated/prisma/client";

// 알림 생성 유틸. 다른 모듈(재고 부족·AS·계약 만료 등)은 이 함수만 호출하면 된다.
// 제목/본문은 3개 언어 컬럼 구조로 저장 — Phase 1-5 에선 수동 입력(AI 번역 미연동).
// 호출자는 vi/en/ko 세 필드를 모두 채우거나, 일부만 채울 수 있다.

export type NotificationInput = {
  userId: string;
  companyCode?: CompanyCode | null;
  type: NotificationType;
  title: { vi?: string; en?: string; ko?: string };
  body?: { vi?: string; en?: string; ko?: string };
  linkUrl?: string;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      companyCode: input.companyCode ?? null,
      type: input.type,
      titleVi: input.title.vi ?? null,
      titleEn: input.title.en ?? null,
      titleKo: input.title.ko ?? null,
      bodyVi: input.body?.vi ?? null,
      bodyEn: input.body?.en ?? null,
      bodyKo: input.body?.ko ?? null,
      linkUrl: input.linkUrl ?? null,
    },
  });
}
