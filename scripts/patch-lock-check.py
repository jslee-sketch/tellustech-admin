"""
Phase 2.B bulk-patch: inject `canEdit(existing)` lock check into all PATCH
handlers that have the pattern:

    const existing = await prisma.<model>.findUnique({ where: { id } });
    if (!existing) return notFound();

After the notFound, insert:

    const _v = canEdit(existing);
    if (!_v.allowed) return conflict(_v.reason);

Also ensures `canEdit` is imported from `@/lib/record-policy` and `conflict` is
imported from `@/lib/api-utils` (added if missing).

Skips files already containing `canEdit(`.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "app" / "api"

# Match the prologue we want to augment.
prologue_pat = re.compile(
    r"(const existing = await prisma\.\w+\.findUnique\(\{[^}]*where:\s*\{\s*id\s*\}[^}]*\}\)\s*;\s*\n\s*if \(!existing\) return notFound\(\);\s*\n)"
)

def ensure_import(src: str, name: str, module: str) -> str:
    """Add `name` to existing import from module, or add a new import line."""
    # Already imported?
    imp_re = re.compile(rf'import \{{([^}}]*)\}} from "{re.escape(module)}";')
    m = imp_re.search(src)
    if m:
        names = [x.strip() for x in m.group(1).split(",") if x.strip()]
        if name in names:
            return src
        names.append(name)
        new_block = "{ " + ", ".join(names) + " }"
        return src[:m.start()] + f'import {new_block} from "{module}";' + src[m.end():]
    # Add new import after the first import statement
    first_import = re.search(r'^import .*;\s*\n', src, re.M)
    if first_import:
        return src[:first_import.end()] + f'import {{ {name} }} from "{module}";\n' + src[first_import.end():]
    return f'import {{ {name} }} from "{module}";\n' + src

count = 0
patched_files = []
for path in ROOT.rglob("route.ts"):
    src = path.read_text(encoding="utf-8")
    if "canEdit(" in src:
        continue
    if not prologue_pat.search(src):
        continue
    new_src = prologue_pat.sub(
        r"\1    const _v = canEdit(existing);\n    if (!_v.allowed) return conflict(_v.reason);\n",
        src,
        count=1,
    )
    if new_src == src:
        continue
    new_src = ensure_import(new_src, "canEdit", "@/lib/record-policy")
    new_src = ensure_import(new_src, "conflict", "@/lib/api-utils")
    path.write_text(new_src, encoding="utf-8")
    count += 1
    patched_files.append(str(path.relative_to(ROOT.parent.parent.parent)))

print(f"Patched {count} files:")
for f in patched_files:
    print("  -", f)
