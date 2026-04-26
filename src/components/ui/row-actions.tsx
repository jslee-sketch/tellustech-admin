"use client";

import { Button } from "./button";

type RowActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  /** 잠긴 행이면 자물쇠 표시 + 버튼 비활성. */
  locked?: boolean;
  lockReason?: string | null;
  /** 추가 액션 버튼 (예: 잠금/해제). 잠금시 자물쇠 옆 표시. */
  extra?: React.ReactNode;
};

export function RowActions({ onEdit, onDelete, locked, lockReason, extra }: RowActionsProps) {
  if (locked) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span title={lockReason ?? "locked"} className="text-[color:var(--tts-warn)]">🔒</span>
        {extra}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {onEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          수정
        </Button>
      )}
      {onDelete && (
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          삭제
        </Button>
      )}
      {extra}
    </div>
  );
}
