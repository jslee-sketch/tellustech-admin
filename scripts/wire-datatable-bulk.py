"""
Phase 2.B UI: wire DataTable bulk-select + soft-delete bar into list pages.

Targets — 마스터 list 컴포넌트 4종 (items/warehouses/employees/projects).
Pattern: 기존 <DataTable ... rowKey={...} emptyMessage={...} /> 호출에
selectable / selectedIds / onSelectionChange / bulkActionBar 추가.

Backend route 가 soft-delete 지원해야 정상 작동:
  - master/items/[id], master/warehouses/[id], master/employees/[id], master/projects/[id]
  현재 hard delete — 이건 별개 후속.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "app" / "master"

PAGES = [
    ("items",       "items-client.tsx",       "item",       "items"),
    ("warehouses",  "warehouses-client.tsx",  "warehouse",  "warehouses"),
    ("employees",   "employees-client.tsx",   "employee",   "employees"),
    ("projects",    "projects-client.tsx",    "project",    "projects"),
]

count = 0
for folder, fname, kind, plural in PAGES:
    p = ROOT / folder / fname
    if not p.exists():
        print("skip (no file)", p)
        continue
    src = p.read_text(encoding="utf-8")
    if "selectedIds" in src:
        print("skip (already wired)", p)
        continue

    # 1) Add useState for selection — after first useState declaration
    if "useState(\"\")" in src or "useState('')" in src:
        src = re.sub(
            r"(const \[q, setQ\] = useState\([\"']{2}\);)",
            r"\1\n  const [selectedIds, setSelectedIds] = useState<string[]>([]);\n  const [busy, setBusy] = useState(false);",
            src, count=1,
        )

    # 2) Add selectable props before closing `/>`
    bulk = (
        '\n        selectable\n'
        '        selectedIds={selectedIds}\n'
        '        onSelectionChange={setSelectedIds}\n'
        '        bulkActionBar={(ids, clear) => (\n'
        '          <Button type="button" size="sm" variant="ghost" onClick={async () => {\n'
        f'            if (!confirm(`선택된 ${{ids.length}}건 (${kind}) 삭제(soft)?`)) return;\n'
        '            setBusy(true);\n'
        '            for (const id of ids) {\n'
        f'              await fetch(`/api/master/{plural}/${{id}}`, {{ method: "DELETE" }});\n'
        '            }\n'
        '            setBusy(false);\n'
        '            clear();\n'
        '            location.reload();\n'
        '          }} disabled={busy}>{busy ? "삭제 중…" : `선택 삭제 (${ids.length})`}</Button>\n'
        '        )}'
    )

    # Inject before `<DataTable ... />` closing tag
    src = re.sub(
        r'(<DataTable[^>]*?emptyMessage=\{[^}]*\})\s*/>',
        r'\1' + bulk + '\n      />',
        src, count=1,
    )

    # 3) Ensure Button is imported
    if "Button" not in re.findall(r'import\s*\{[^}]*\}\s*from\s*"@/components/ui";', src)[0] if re.findall(r'import\s*\{[^}]*\}\s*from\s*"@/components/ui";', src) else "":
        src = re.sub(
            r'(import\s*\{)([^}]*)(\}\s*from\s*"@/components/ui";)',
            lambda m: f'{m.group(1)} Button,{m.group(2)}{m.group(3)}',
            src, count=1,
        )

    p.write_text(src, encoding="utf-8")
    count += 1
    print("patched", p)

print(f"Total: {count}")
