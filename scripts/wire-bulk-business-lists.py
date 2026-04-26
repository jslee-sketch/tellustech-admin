"""
Phase 2.B UI: 잔여 business list 페이지에 DataTable bulk-select wire.

Targets:
- sales/sales-client.tsx          → /api/sales/[id]
- purchases/purchases-client.tsx  → /api/purchases/[id]
- rental/it-contracts/...         → /api/rental/it-contracts/[id]
- rental/tm-rentals/...           → /api/rental/tm-rentals/[id]
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "app"

PAGES = [
    ("sales-client.tsx",        "src/app/sales",                "sale",     "sales"),
    ("purchases-client.tsx",    "src/app/purchases",            "purchase", "purchases"),
    ("it-contracts-client.tsx", "src/app/rental/it-contracts",  "계약",     "rental/it-contracts"),
    ("tm-rentals-client.tsx",   "src/app/rental/tm-rentals",    "TM 렌탈",  "rental/tm-rentals"),
]

count = 0
for fname, folder, kind, plural in PAGES:
    p = Path("C:/D드라이브/2.AIWorks/tellustech-erp") / folder / fname
    if not p.exists():
        print("skip (no file)", p); continue
    s = p.read_text(encoding="utf-8")
    if "selectable" in s:
        print("skip (already wired)", p); continue

    # 1) Add selection state — locate first useState declaration line
    m = re.search(r"(const \[\w+, set\w+\] = useState[^\n]+\n)", s)
    if m and "selectedIds" not in s:
        s = s[:m.end()] + "  const [selectedIds, setSelectedIds] = useState<string[]>([]);\n  const [busy, setBusy] = useState(false);\n" + s[m.end():]

    # 2) Inject selectable into DataTable
    bulk = (
        '\n        selectable\n'
        '        selectedIds={selectedIds}\n'
        '        onSelectionChange={setSelectedIds}\n'
        '        bulkActionBar={(ids, clear) => (\n'
        '          <Button type="button" size="sm" variant="ghost" onClick={async () => {\n'
        f'            if (!confirm(`선택된 ${{ids.length}}건 ({kind}) 삭제(soft)?`)) return;\n'
        '            setBusy(true);\n'
        '            for (const id of ids) {\n'
        f'              await fetch(`/api/{plural}/${{id}}`, {{ method: "DELETE" }});\n'
        '            }\n'
        '            setBusy(false); clear(); location.reload();\n'
        '          }} disabled={busy}>{busy ? "삭제 중…" : `선택 삭제 (${ids.length})`}</Button>\n'
        '        )}'
    )
    new_s = re.sub(
        r'(<DataTable[^/]*?emptyMessage=\{[^}]*?\})\s*/>',
        r'\1' + bulk + '\n      />',
        s, count=1, flags=re.S,
    )
    if new_s == s:
        print("no DataTable match", p); continue

    # 3) Ensure Button imported
    if not re.search(r'import\s*\{[^}]*Button[^}]*\}\s*from\s*"@/components/ui";', new_s):
        new_s = re.sub(
            r'(import\s*\{)([^}]*)(\}\s*from\s*"@/components/ui";)',
            lambda m: f'{m.group(1)} Button,{m.group(2)}{m.group(3)}',
            new_s, count=1,
        )

    p.write_text(new_s, encoding="utf-8")
    count += 1
    print("patched", p)

print(f"Total: {count}")
