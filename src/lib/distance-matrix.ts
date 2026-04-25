import "server-only";

// Google Maps Distance Matrix 호출 헬퍼.
// GOOGLE_MAPS_API_KEY 환경변수 있을 때만 실호출, 없으면 클라이언트가 보낸 값을 그대로 사용.
//
// 응답 단위: 미터 → km 로 변환. 실패 시 null 반환.

export type DistanceResult = {
  km: number;
  durationSec: number;
  source: "google" | "client_input" | "unavailable";
};

export async function googleDistanceKm(originAddress: string, destAddress: string): Promise<DistanceResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  if (!originAddress || !destAddress) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", originAddress);
    url.searchParams.set("destinations", destAddress);
    url.searchParams.set("units", "metric");
    url.searchParams.set("key", key);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      rows?: { elements?: { status?: string; distance?: { value?: number }; duration?: { value?: number } }[] }[];
    };
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK" || !el.distance?.value) return null;
    return {
      km: Number((el.distance.value / 1000).toFixed(2)),
      durationSec: el.duration?.value ?? 0,
      source: "google",
    };
  } catch (err) {
    console.error("[distance-matrix] failed:", err);
    return null;
  }
}
