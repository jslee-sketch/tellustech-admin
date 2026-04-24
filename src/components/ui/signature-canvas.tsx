"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./button";

// HTML5 Canvas 기반 전자서명. 모바일 터치 + 데스크톱 마우스 지원.
// onChange(null) = 빈 캔버스. onChange(dataUrl) = PNG base64.

type Props = {
  value?: string | null; // 초기값 (dataURL)
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
};

export function SignatureCanvas({
  value,
  onChange,
  width = 480,
  height = 180,
  disabled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasContent, setHasContent] = useState<boolean>(Boolean(value));

  // 초기 value 를 캔버스에 그려 넣기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasContent(true);
      };
      img.src = value;
    } else {
      setHasContent(false);
    }
  }, [value]);

  const getPoint = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const start = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      drawing.current = true;
      const p = getPoint(e);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      canvas.setPointerCapture(e.pointerId);
      setHasContent(true);
    },
    [disabled],
  );

  const move = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }, []);

  const end = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onChange(null);
  }, [onChange]);

  return (
    <div className="inline-block">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block cursor-crosshair rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] touch-none"
        style={{ width: `${width}px`, height: `${height}px`, maxWidth: "100%" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div className="mt-1 flex items-center gap-2 text-[11px] text-[color:var(--tts-muted)]">
        <span>{hasContent ? "✍️ 서명됨" : "서명 영역을 클릭/드래그하여 서명"}</span>
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={disabled || !hasContent}>
          지우기
        </Button>
      </div>
    </div>
  );
}
