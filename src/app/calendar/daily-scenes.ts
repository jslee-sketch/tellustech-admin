// 매일 바뀌는 캘린더 히어로 스트립 데이터.
// 날짜(연중일수) 를 인덱스로 베트남 풍경(좌) + 한국 풍경(우) 한 쌍 선택.
// 외부 의존 없음 — 그라디언트 + 이모지 + 한 줄 카피로 표현.

export type Scene = {
  emoji: string;
  title: string;
  caption: string;
  gradient: string; // CSS background
};

export const VN_SCENES: Scene[] = [
  { emoji: "🛶", title: "Vịnh Hạ Long", caption: "하롱베이의 안개 낀 새벽", gradient: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)" },
  { emoji: "🏮", title: "Phố cổ Hội An", caption: "호이안 등불 거리", gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" },
  { emoji: "⛪", title: "Sài Gòn", caption: "사이공 노트르담 성당", gradient: "linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)" },
  { emoji: "🌾", title: "Đồng bằng sông Cửu Long", caption: "메콩 델타의 황금 들판", gradient: "linear-gradient(135deg, #84cc16 0%, #365314 100%)" },
  { emoji: "🏯", title: "Cố đô Huế", caption: "후에 황성의 고요한 아침", gradient: "linear-gradient(135deg, #a855f7 0%, #581c87 100%)" },
  { emoji: "🌉", title: "Cầu Rồng Đà Nẵng", caption: "다낭 용교의 야경", gradient: "linear-gradient(135deg, #f43f5e 0%, #881337 100%)" },
  { emoji: "🍜", title: "Phở Hà Nội", caption: "하노이 쌀국수 한 그릇", gradient: "linear-gradient(135deg, #fb923c 0%, #9a3412 100%)" },
  { emoji: "🌴", title: "Đảo Phú Quốc", caption: "푸꾸옥 섬의 야자수", gradient: "linear-gradient(135deg, #14b8a6 0%, #134e4a 100%)" },
  { emoji: "☕", title: "Cà phê sữa đá", caption: "베트남 연유 커피", gradient: "linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)" },
  { emoji: "🏞️", title: "Sa Pa", caption: "사파의 다랑이 논", gradient: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" },
  { emoji: "⚓", title: "Cảng Hải Phòng", caption: "하이퐁 항구의 컨테이너선", gradient: "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)" },
  { emoji: "🪷", title: "Sen Việt Nam", caption: "베트남의 국화 연꽃", gradient: "linear-gradient(135deg, #ec4899 0%, #831843 100%)" },
];

export const KR_SCENES: Scene[] = [
  { emoji: "🏯", title: "경복궁", caption: "광화문의 사계", gradient: "linear-gradient(135deg, #6366f1 0%, #312e81 100%)" },
  { emoji: "🗼", title: "남산서울타워", caption: "해질녘 N서울타워", gradient: "linear-gradient(135deg, #f97316 0%, #7c2d12 100%)" },
  { emoji: "🌊", title: "광안대교", caption: "부산 광안리의 야경", gradient: "linear-gradient(135deg, #06b6d4 0%, #164e63 100%)" },
  { emoji: "🍱", title: "비빔밥", caption: "전주 비빔밥 한 상", gradient: "linear-gradient(135deg, #facc15 0%, #713f12 100%)" },
  { emoji: "🏔️", title: "한라산", caption: "겨울 백록담", gradient: "linear-gradient(135deg, #38bdf8 0%, #0c4a6e 100%)" },
  { emoji: "🌸", title: "벚꽃길", caption: "여의도 봄날의 산책", gradient: "linear-gradient(135deg, #f9a8d4 0%, #831843 100%)" },
  { emoji: "🍁", title: "내장산", caption: "단풍이 물든 가을 산자락", gradient: "linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)" },
  { emoji: "🏝️", title: "성산일출봉", caption: "제주의 해돋이", gradient: "linear-gradient(135deg, #fde047 0%, #854d0e 100%)" },
  { emoji: "🎎", title: "한복", caption: "전통 한복의 색감", gradient: "linear-gradient(135deg, #a78bfa 0%, #4c1d95 100%)" },
  { emoji: "🍜", title: "라면", caption: "야식 라면 한 그릇", gradient: "linear-gradient(135deg, #f87171 0%, #7f1d1d 100%)" },
  { emoji: "🚄", title: "KTX", caption: "KTX의 출발", gradient: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" },
  { emoji: "🍵", title: "보성 녹차밭", caption: "보성의 차밭 능선", gradient: "linear-gradient(135deg, #22c55e 0%, #14532d 100%)" },
];

// YYYY-MM-DD 기준 일관된 인덱스. 매일 바뀌고 새로고침해도 동일.
function dayIndex(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function pickDailyScenes(date: Date = new Date()): { vn: Scene; kr: Scene } {
  const i = dayIndex(date);
  return {
    vn: VN_SCENES[i % VN_SCENES.length],
    // KR 은 반대 방향 회전으로 같은 날 같은 짝이 안 되도록
    kr: KR_SCENES[(VN_SCENES.length - 1 - (i % KR_SCENES.length)) % KR_SCENES.length],
  };
}
