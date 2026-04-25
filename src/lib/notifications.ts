import "server-only";
import { prisma } from "./prisma";
import { fillTranslations } from "./translate";
import type { CompanyCode, Language, NotificationType } from "@/generated/prisma/client";

// 알림 생성 유틸. 다른 모듈(재고 부족·AS·계약 만료 등)은 이 함수만 호출하면 된다.
// 제목/본문은 3개 언어 컬럼 구조로 저장.
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

// 한 언어로만 작성한 제목/본문을 3개 언어로 자동 번역해 알림 발송.
// originalLang 기준으로 누락된 두 언어를 Claude API 로 채운다.
export type TranslatedNotificationInput = {
  userId: string;
  companyCode?: CompanyCode | null;
  type: NotificationType;
  originalLang: Language;
  title: string;
  body?: string;
  linkUrl?: string;
};

export async function createTranslatedNotification(input: TranslatedNotificationInput) {
  const titleField = input.originalLang.toLowerCase() as "vi" | "en" | "ko";
  const titleFilled = await fillTranslations({
    [titleField]: input.title,
    originalLang: input.originalLang,
  } as Parameters<typeof fillTranslations>[0]);
  const bodyFilled = input.body
    ? await fillTranslations({
        [titleField]: input.body,
        originalLang: input.originalLang,
      } as Parameters<typeof fillTranslations>[0])
    : { vi: null, en: null, ko: null };

  return createNotification({
    userId: input.userId,
    companyCode: input.companyCode ?? null,
    type: input.type,
    title: { vi: titleFilled.vi ?? undefined, en: titleFilled.en ?? undefined, ko: titleFilled.ko ?? undefined },
    body: { vi: bodyFilled.vi ?? undefined, en: bodyFilled.en ?? undefined, ko: bodyFilled.ko ?? undefined },
    linkUrl: input.linkUrl,
  });
}
