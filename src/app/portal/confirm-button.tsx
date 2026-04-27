"use client";

export function ConfirmButton({ ticketId }: { ticketId: string }) {
  return (
    <button
      type="button"
      className="rounded bg-[color:var(--tts-success,#22c55e)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
      onClick={async () => {
        if (!confirm("이 요청을 완료 확인하시겠습니까?\n\nXác nhận hoàn tất yêu cầu này?")) return;
        const r = await fetch(`/api/portal/tickets/${ticketId}/confirm`, { method:'POST' });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j?.pointsEarned && j.pointsEarned > 0) {
            // 간단 toast — 사이드바도 새로고침 후 갱신됨
            const div = document.createElement("div");
            div.textContent = `🏆 +${j.pointsEarned.toLocaleString("vi-VN")}d 적립! (잔액: ${(j.pointBalance ?? 0).toLocaleString("vi-VN")}d)`;
            div.style.cssText = "position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;font-weight:bold;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2)";
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 4000);
          }
          setTimeout(() => location.reload(), 200);
        }
        else alert("실패 / Thất bại");
      }}
    >
      ✓ 확인 / Xác nhận
    </button>
  );
}
