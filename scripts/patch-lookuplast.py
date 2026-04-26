"""
Patch all `lookupLast` queries to bypass the soft-delete auto-filter.

Pattern detected:
    where: { <FIELD>Code: { startsWith: ... }
    where: { <FIELD>Code: { startsWith: ..., companyCode: ... }

We prepend `deletedAt: undefined, ` to the where object so the prisma
extension's `callerWantsDeleted` heuristic skips the auto-injection.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "app" / "api"

# Match: where: { ANYWORDCode: { startsWith
pat = re.compile(r"(where:\s*\{\s*(?:companyCode[^,]*,\s*)?)((\w+Code|\w+Number):\s*\{\s*startsWith)")

count = 0
for path in ROOT.rglob("route.ts"):
    src = path.read_text(encoding="utf-8")
    if "deletedAt: undefined" in src:
        continue
    new = pat.sub(r"\1deletedAt: undefined, \2", src)
    if new != src:
        path.write_text(new, encoding="utf-8")
        count += 1
        print(f"Patched: {path.relative_to(ROOT.parent.parent.parent)}")

print(f"Total: {count} files patched.")
