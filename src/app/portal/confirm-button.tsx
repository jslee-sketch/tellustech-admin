"use client";

export function ConfirmButton({ ticketId }: { ticketId: string }) {
  return (
    <button
      type="button"
      className="rounded bg-[color:var(--tts-success,#22c55e)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
      onClick={async () => {
        if (!confirm("이 요청을 완료 확인하시겠습니까?\n\nXác nhận hoàn tất yêu cầu này?")) return;
        const r = await fetch(`/api/portal/tickets/${ticketId}/confirm`, { method:'POST' });
        if (r.ok) location.reload();
        else alert("실패 / Thất bại");
      }}
    >
      ✓ 확인 / Xác nhận
    </button>
  );
}
