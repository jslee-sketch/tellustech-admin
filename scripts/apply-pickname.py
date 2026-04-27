"""
sweep: convert .companyNameVi → pickName(obj, lang, "companyName") for read-only
display contexts. Same for .nameVi → pickName(obj, lang).

This is risky for write paths (form values, API requests). Only safe targets:
  - JSX text: {someVar.companyNameVi}
  - String concat: `${x.companyNameVi}` or `${x?.companyNameVi ?? ...}`
  - In data mapping for display: clientName: c.companyNameVi → clientName: pickName(c, lang, "companyName")

Skip files:
  - clients-client.tsx, clients-import.tsx, client-detail.tsx (form/edit)
  - api routes (server data layer)

Strategy: only patch *.tsx 파일 in src/app, with naive regex matching JSX-style
display + string templates. Preview first.
"""
import re
from pathlib import Path

ROOT = Path("C:/D드라이브/2.AIWorks/tellustech-erp/src/app")
SKIP_FILES = {
    "clients-client.tsx", "clients-import.tsx", "client-detail.tsx",
    "employees-client.tsx", "employees-import.tsx", "employee-detail.tsx",
    "client-new-form.tsx", "employee-new-form.tsx",
    "page.tsx",  # we'll handle page.tsx specifically (reads only)
}

# We'll do a different pass: target page.tsx files (server reads) — JSX display.
# Pattern A: `${x.companyNameVi}`           → `${pickName(x, L, "companyName")}`
# Pattern B: `{x.companyNameVi}` (JSX text) → `{pickName(x, L, "companyName")}`
# Pattern C: `: x.companyNameVi`            → `: pickName(x, L, "companyName")`

# pickName helper signature in our codebase: pickName(rec, lang, base)
# `lang` variable name in pages: L (server) or `lang` (client). We require existing var.

# To stay safe: only apply to lines ending with display contexts, not assignments
# to data fields. We use a simple heuristic: lines that contain JSX braces around
# the field, OR template literal `${ ... }`, OR map entries assigning to label.

def patch_file(p: Path) -> int:
    if p.name in SKIP_FILES: return 0
    src = p.read_text(encoding="utf-8")
    original = src
    # 일단 안전 패턴만 — `{x.companyNameVi}` 또는 `${x.companyNameVi}` 또는 `${x.client.companyNameVi}`
    # in JSX/template literal context.
    # 이름 변형: nameVi, companyNameVi.

    def replace_chain(match):
        full = match.group(0)
        chain = match.group(1)  # e.g. "client.companyName" or "ticket.client.companyName"
        # split last segment
        if chain.endswith(".companyName"):
            return f"{full[:-len('Vi')]}".replace(chain + "Vi", f'pickName({chain.rsplit(".", 1)[0]}, L, "companyName")') if "." in chain else full
        return full

    # Cleaner: do pattern by pattern manually.

    # 1. {x.companyNameVi} → {pickName(x, L, "companyName")}  in .tsx page (server — uses L)
    #    {x.companyNameVi}  in client (uses lang)
    is_use_client = '"use client"' in src.split("\n")[0] or "'use client'" in src.split("\n")[0]
    lang_var = "lang" if is_use_client else "L"

    # JSX simple: {WORD.WORD?.companyNameVi}
    # Use chained access pattern
    pat_jsx_company = re.compile(r"\{(\w+(?:\.\w+)*)\.companyNameVi\}")
    def repl_company_jsx(m):
        chain = m.group(1)
        return f"{{pickName({chain}, {lang_var}, \"companyName\")}}"
    src = pat_jsx_company.sub(repl_company_jsx, src)

    # Template literal: ${WORD.WORD?.companyNameVi}
    pat_tmpl_company = re.compile(r"\$\{(\w+(?:\??\.\w+)*)\.companyNameVi\}")
    def repl_company_tmpl(m):
        chain = m.group(1)
        return f"${{pickName({chain}, {lang_var}, \"companyName\")}}"
    src = pat_tmpl_company.sub(repl_company_tmpl, src)

    # Same for nameVi (employee) — base "name"
    pat_jsx_name = re.compile(r"\{(\w+(?:\??\.\w+)*)\.nameVi\}")
    def repl_name_jsx(m):
        chain = m.group(1)
        return f"{{pickName({chain}, {lang_var})}}"
    src = pat_jsx_name.sub(repl_name_jsx, src)

    pat_tmpl_name = re.compile(r"\$\{(\w+(?:\??\.\w+)*)\.nameVi\}")
    def repl_name_tmpl(m):
        chain = m.group(1)
        return f"${{pickName({chain}, {lang_var})}}"
    src = pat_tmpl_name.sub(repl_name_tmpl, src)

    if src == original:
        return 0
    # Also ensure pickName imported
    if "pickName" in src and "pickName" not in re.findall(r'import\s*\{[^}]*\}\s*from\s*"@/lib/i18n";', src)[0] if re.findall(r'import\s*\{[^}]*\}\s*from\s*"@/lib/i18n";', src) else "":
        # Add pickName to existing import from @/lib/i18n
        src = re.sub(
            r'(import\s*\{)([^}]*)(\}\s*from\s*"@/lib/i18n";)',
            lambda m: m.group(1) + (" pickName," if "pickName" not in m.group(2) else "") + m.group(2) + m.group(3),
            src, count=1,
        )

    p.write_text(src, encoding="utf-8")
    return 1

count = 0
patched = []
for tsx in ROOT.rglob("*.tsx"):
    if patch_file(tsx):
        count += 1
        patched.append(str(tsx.relative_to(ROOT)))
print(f"Patched {count} files:")
for f in patched: print("  -", f)
