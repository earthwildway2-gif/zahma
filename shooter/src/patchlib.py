import re
def find_func(src, name):
    m = re.search(r'\n(async )?function ' + re.escape(name) + r'\s*\(', src)
    if not m: raise SystemExit('function not found: ' + name)
    i = src.index('{', m.end()); depth = 0; j = i
    while True:
        c = src[j]
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: break
        j += 1
    return m.start() + 1, j + 1
def replace_func(src, name, new):
    a, b = find_func(src, name); return src[:a] + new + src[b:]
