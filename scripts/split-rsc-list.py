"""
For each (page.tsx) in TARGETS, generate a sibling client wrapper that contains
the <DataTable .../> block, and replace the page.tsx body with a call to it.

Strategy — much simpler:
1. Read page.tsx
2. Find <DataTable ...></DataTable> or <DataTable .../> block (multiline)
3. Wrap into a 'use client' wrapper file
4. Replace block in page.tsx with <WrapperName data={...} lang={L}/>
5. Remove now-unused imports

Risk: complex JSX inside columns may break. We do a *brace-balanced* extractor
to capture the whole <DataTable> block.

Skipped here — manual is safer for each case. This file is just a placeholder
documentation. The 9 pages will be hand-fixed in commits.
"""
print("Manual fix recommended.")
