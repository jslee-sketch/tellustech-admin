"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

// 풀스크린 서명 모달 — 모바일에서 큰 캔버스로 손가락 서명 편하게.
type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (dataUrl: string) => void;
  title?: string;
};

export function SignatureModal({ open, onClose, onSubmit, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";
    ctx.clearRect(0, 0, c.width, c.height);
    setHasContent(false);
  }, [open]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    drawing.current = true;
    const p = getPoint(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    c.setPointerCapture(e.pointerId);
    setHasContent(true);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function end() { drawing.current = false; }
  function clear() {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasContent(false);
  }
  function submit() {
    if (!hasContent) return;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onSubmit(dataUrl);
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/85 p-4" onClick={onClose}>
      <div
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col rounded-xl border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[14px] font-bold">{title ?? "서명 / Ký tên"}</div>
          <Button size="sm" variant="ghost" onClick={onClose}>닫기 / Đóng</Button>
        </div>
        <canvas
          ref={canvasRef}
          className="flex-1 w-full cursor-crosshair touch-none rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)]"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={clear} disabled={!hasContent}>지우기 / Xoá</Button>
          <Button onClick={submit} disabled={!hasContent}>저장 / Lưu</Button>
        </div>
      </div>
    </div>
  );
}
