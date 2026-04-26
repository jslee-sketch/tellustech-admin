"""
Phase 2.A — Schema migration: inject deletedAt/lockedAt/lockReason fields.

- BUSINESS models: deletedAt + lockedAt + lockReason + (no originalLang change)
- MASTER models: deletedAt only (no lock — masters are reference data)

Insertion point: BEFORE the `updatedAt   DateTime    @updatedAt` line of each model,
keeping existing indentation. Idempotent — skips models that already have deletedAt.
"""
import re
import sys
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[1] / "prisma" / "schema.prisma"

MASTER_MODELS = {"Client", "Item", "Warehouse", "Employee", "Department", "License", "Project"}

BUSINESS_MODELS = {
    "Sales", "Purchase", "ItContract", "TmRental", "AsTicket", "AsDispatch",
    "Expense", "Payroll", "Incentive", "LeaveRecord", "OnboardingCard",
    "OffboardingCard", "Incident", "Evaluation", "CalendarEvent", "Schedule",
    "Calibration", "PayableReceivable",
}

ALL_TARGETS = MASTER_MODELS | BUSINESS_MODELS

src = SCHEMA.read_text(encoding="utf-8")

model_re = re.compile(r"^model (\w+) \{\n(.*?)^\}", re.M | re.S)

def transform_block(name: str, body: str) -> str:
    if "deletedAt" in body:
        return body  # already injected
    is_master = name in MASTER_MODELS
    # find the first line containing `updatedAt` and `@updatedAt`
    lines = body.split("\n")
    target_idx = None
    indent = "  "
    for i, ln in enumerate(lines):
        if "@updatedAt" in ln and "updatedAt" in ln:
            target_idx = i
            m = re.match(r"^(\s+)", ln)
            indent = m.group(1) if m else "  "
            break
    if target_idx is None:
        return body  # no updatedAt — skip (e.g., AuditLog, Notification)
    inject = []
    inject.append(f"{indent}deletedAt   DateTime?")
    if not is_master:
        inject.append(f"{indent}lockedAt    DateTime?")
        inject.append(f"{indent}lockReason  String?")
    new_lines = lines[:target_idx] + inject + lines[target_idx:]
    return "\n".join(new_lines)

def replace_model(m):
    name = m.group(1)
    body = m.group(2)
    if name not in ALL_TARGETS:
        return m.group(0)
    new_body = transform_block(name, body)
    if new_body == body:
        return m.group(0)
    return f"model {name} {{\n{new_body}}}"

new_src = model_re.sub(replace_model, src)

if new_src == src:
    print("No changes made (already injected or no targets matched).")
    sys.exit(0)

SCHEMA.write_text(new_src, encoding="utf-8")
print(f"Updated {SCHEMA}.")
