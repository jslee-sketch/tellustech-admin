import { t, type Lang } from "@/lib/i18n";

// 매일 바뀌는 캘린더 히어로 스트립 데이터.
// 날짜(연중일수) 를 인덱스로 베트남 풍경(좌) + 한국 풍경(우) 한 쌍 선택.
// 외부 의존 없음 — 그라디언트 + 이모지 + 한 줄 카피로 표현.

export type Scene = {
  emoji: string;
  title: string;
  captionKey: string; // i18n key for caption
  gradient: string; // CSS background
};

export type LocalizedScene = {
  emoji: string;
  title: string;
  caption: string;
  gradient: string;
};

export const VN_SCENES: Scene[] = [
  { emoji: "🛶", title: "Vịnh Hạ Long",                captionKey: "scene.vn.halong",  gradient: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)" },
  { emoji: "🏮", title: "Phố cổ Hội An",               captionKey: "scene.vn.hoian",   gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" },
  { emoji: "⛪", title: "Sài Gòn",                     captionKey: "scene.vn.saigon",  gradient: "linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)" },
  { emoji: "🌾", title: "Đồng bằng sông Cửu Long",     captionKey: "scene.vn.mekong",  gradient: "linear-gradient(135deg, #84cc16 0%, #365314 100%)" },
  { emoji: "🏯", title: "Cố đô Huế",                   captionKey: "scene.vn.hue",     gradient: "linear-gradient(135deg, #a855f7 0%, #581c87 100%)" },
  { emoji: "🌉", title: "Cầu Rồng Đà Nẵng",            captionKey: "scene.vn.danang",  gradient: "linear-gradient(135deg, #f43f5e 0%, #881337 100%)" },
  { emoji: "🍜", title: "Phở Hà Nội",                  captionKey: "scene.vn.pho",     gradient: "linear-gradient(135deg, #fb923c 0%, #9a3412 100%)" },
  { emoji: "🌴", title: "Đảo Phú Quốc",                captionKey: "scene.vn.phuquoc", gradient: "linear-gradient(135deg, #14b8a6 0%, #134e4a 100%)" },
  { emoji: "☕", title: "Cà phê sữa đá",               captionKey: "scene.vn.coffee",  gradient: "linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)" },
  { emoji: "🏞️", title: "Sa Pa",                       captionKey: "scene.vn.sapa",    gradient: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" },
  { emoji: "⚓", title: "Cảng Hải Phòng",              captionKey: "scene.vn.haiphong",gradient: "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)" },
  { emoji: "🪷", title: "Sen Việt Nam",                captionKey: "scene.vn.lotus",   gradient: "linear-gradient(135deg, #ec4899 0%, #831843 100%)" },
];

export const KR_SCENES: Scene[] = [
  { emoji: "🏯", title: "경복궁",         captionKey: "scene.kr.gyeongbok", gradient: "linear-gradient(135deg, #6366f1 0%, #312e81 100%)" },
  { emoji: "🗼", title: "남산서울타워",   captionKey: "scene.kr.namsan",    gradient: "linear-gradient(135deg, #f97316 0%, #7c2d12 100%)" },
  { emoji: "🌊", title: "광안대교",       captionKey: "scene.kr.gwangan",   gradient: "linear-gradient(135deg, #06b6d4 0%, #164e63 100%)" },
  { emoji: "🍱", title: "비빔밥",         captionKey: "scene.kr.bibimbap",  gradient: "linear-gradient(135deg, #facc15 0%, #713f12 100%)" },
  { emoji: "🏔️", title: "한라산",         captionKey: "scene.kr.halla",     gradient: "linear-gradient(135deg, #38bdf8 0%, #0c4a6e 100%)" },
  { emoji: "🌸", title: "벚꽃길",         captionKey: "scene.kr.cherry",    gradient: "linear-gradient(135deg, #f9a8d4 0%, #831843 100%)" },
  { emoji: "🍁", title: "내장산",         captionKey: "scene.kr.maple",     gradient: "linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)" },
  { emoji: "🏝️", title: "성산일출봉",     captionKey: "scene.kr.seongsan",  gradient: "linear-gradient(135deg, #fde047 0%, #854d0e 100%)" },
  { emoji: "🎎", title: "한복",           captionKey: "scene.kr.hanbok",    gradient: "linear-gradient(135deg, #a78bfa 0%, #4c1d95 100%)" },
  { emoji: "🍜", title: "라면",           captionKey: "scene.kr.ramen",     gradient: "linear-gradient(135deg, #f87171 0%, #7f1d1d 100%)" },
  { emoji: "🚄", title: "KTX",            captionKey: "scene.kr.ktx",       gradient: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" },
  { emoji: "🍵", title: "보성 녹차밭",    captionKey: "scene.kr.boseong",   gradient: "linear-gradient(135deg, #22c55e 0%, #14532d 100%)" },
];

// YYYY-MM-DD 기준 일관된 인덱스. 매일 바뀌고 새로고침해도 동일.
function dayIndex(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function localize(scene: Scene, lang: Lang): LocalizedScene {
  return { emoji: scene.emoji, title: scene.title, gradient: scene.gradient, caption: t(scene.captionKey, lang) };
}

export function pickDailyScenes(date: Date = new Date(), lang: Lang = "KO"): { vn: LocalizedScene; kr: LocalizedScene } {
  const i = dayIndex(date);
  return {
    vn: localize(VN_SCENES[i % VN_SCENES.length], lang),
    // KR 은 반대 방향 회전으로 같은 날 같은 짝이 안 되도록
    kr: localize(KR_SCENES[(VN_SCENES.length - 1 - (i % KR_SCENES.length)) % KR_SCENES.length], lang),
  };
}
