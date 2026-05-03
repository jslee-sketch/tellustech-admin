// Zalo OA API v3 — 준비만. ZALO_OA_ACCESS_TOKEN 미설정 시 자동 스킵.
// https://developers.zalo.me/docs/official-account/

export type ZaloMessage = {
  zaloId: string;
  text: string;
};

export async function sendZaloMessage(msg: ZaloMessage): Promise<{ ok: boolean; error?: string }> {
  const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!accessToken) return { ok: false, error: "skipped:no_zalo_oa_token" };

  try {
    const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": accessToken },
      body: JSON.stringify({
        recipient: { user_id: msg.zaloId },
        message: { text: msg.text },
      }),
    });
    const data = (await res.json()) as { error?: number; message?: string };
    if (data.error !== 0) return { ok: false, error: `zalo_error_${data.error}:${data.message ?? ""}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? "fetch_error" };
  }
}

// Token 갱신 — refresh_token 으로 access_token 재발급. cron 에서 주기 실행 권장.
export async function refreshZaloToken(): Promise<{ ok: boolean; accessToken?: string; error?: string }> {
  const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN;
  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;
  if (!refreshToken || !appId || !appSecret) return { ok: false, error: "skipped:no_zalo_app_creds" };

  try {
    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "secret_key": appSecret },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        app_id: appId,
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) return { ok: false, error: data.error ?? "no_token" };
    return { ok: true, accessToken: data.access_token };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? "fetch_error" };
  }
}
