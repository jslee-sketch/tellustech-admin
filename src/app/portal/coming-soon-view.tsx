import { t, type Lang } from "@/lib/i18n";

export function ComingSoonView({ lang, title }: { lang: Lang; title: string }) {
  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-3 text-[64px]">🚧</div>
        <h1 className="mb-2 text-2xl font-extrabold">{title}</h1>
        <div className="mb-1 text-[14px] font-bold text-[color:var(--tts-accent)]">{t("portal.comingSoon", lang)}</div>
        <p className="text-[13px] text-[color:var(--tts-sub)]">{t("portal.comingSoonDesc", lang)}</p>
      </div>
    </main>
  );
}
