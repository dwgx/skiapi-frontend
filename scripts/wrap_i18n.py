#!/usr/bin/env python3
"""
Auto-wrap hardcoded Chinese strings in JSX files with t() calls.
Handles: JSX attributes (title="中"), JSX children (>中<), string literals.
"""
import re
import os
from pathlib import Path

ROOT = Path(__file__).parent.parent / 'src'
CH_RE = re.compile(r'[\u4e00-\u9fff]')

def has_chinese(s):
    return bool(CH_RE.search(s))

# Patterns to transform (order matters!)
# 1. JSX attribute: foo="中文..." -> foo={t('中文...')}
attr_re = re.compile(r'(\s)(title|placeholder|label|actionLabel|description|confirmLabel|helperText|aria-label|name)="([^"]*[\u4e00-\u9fff][^"]*)"')
# 2. JSX text child: >中文< (but not inside already-wrapped {})
# Match things like >中文...<  and  >    中文文字   <
child_re = re.compile(r'>(\s*)([^<>{}\n]*[\u4e00-\u9fff][^<>{}\n]*?)(\s*)<')
# 3. showSuccess('中文'), showError('中文')
show_re = re.compile(r"(showSuccess|showError)\(('([^']*[\u4e00-\u9fff][^']*)'|\"([^\"]*[\u4e00-\u9fff][^\"]*)\")\)")
# 4. Ternary: ? '中' : '中' or ? \"中\" : \"中\"
tern_re = re.compile(r"([\?:]\s*)'([^']*[\u4e00-\u9fff][^']*)'")

def has_t_hook(src):
    return 't(' in src and ('useTranslation' in src or "from 'react-i18next'" in src)

def add_import(src):
    if "from 'react-i18next'" in src:
        return src
    # Add after last import
    lines = src.split('\n')
    last_import = -1
    for i, l in enumerate(lines):
        if l.startswith('import '):
            last_import = i
    if last_import >= 0:
        lines.insert(last_import + 1, "import { useTranslation } from 'react-i18next';")
        return '\n'.join(lines)
    return src

def add_hook(src):
    # Match: export default function Name() {
    m = re.search(r'(export default function \w+\([^)]*\)\s*\{\s*\n)', src)
    if not m:
        m = re.search(r'(function \w+\([^)]*\)\s*\{\s*\n)', src)
    if m and 'const { t } = useTranslation()' not in src:
        pos = m.end()
        return src[:pos] + '  const { t } = useTranslation();\n' + src[pos:]
    return src

def transform(src):
    changed = False

    def attr_sub(m):
        nonlocal changed
        changed = True
        return f'{m.group(1)}{m.group(2)}={{t(\'{m.group(3)}\')}}'
    src = attr_re.sub(attr_sub, src)

    def child_sub(m):
        nonlocal changed
        text = m.group(2).strip()
        if not text or not has_chinese(text):
            return m.group(0)
        # Skip if contains template expressions or quotes messing us up
        if '{' in text or '}' in text or '"' in text or "'" in text:
            return m.group(0)
        changed = True
        return f'>{{t(\'{text}\')}}<'
    src = child_re.sub(child_sub, src)

    def show_sub(m):
        nonlocal changed
        changed = True
        func = m.group(1)
        # Extract content without outer quotes
        inner = m.group(2)
        quote = inner[0]
        content = inner[1:-1]
        return f"{func}(t('{content}'))"
    src = show_re.sub(show_sub, src)

    return src, changed

def process(path):
    src = path.read_text(encoding='utf-8')
    if not has_chinese(src):
        return False
    new_src, changed = transform(src)
    if not changed:
        return False
    if not has_t_hook(new_src):
        new_src = add_import(new_src)
        new_src = add_hook(new_src)
    path.write_text(new_src, encoding='utf-8')
    return True

if __name__ == '__main__':
    count = 0
    for f in ROOT.rglob('*.jsx'):
        if process(f):
            print(f'[OK] {f.name}')
            count += 1
    print(f'\n{count} files updated')
