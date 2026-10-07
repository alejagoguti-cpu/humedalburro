import re

with open('modulo-11-garden.html', 'r', encoding='utf-8') as f:
    text = f.read()

scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', text, re.DOTALL)
print('Found script tags:', len(scripts))
inline_script = ''
for s in scripts:
    if 'THREE' in s:
        inline_script = s
        break

print('Main 3D script length in chars:', len(inline_script))

# Check brackets balance by state machine
stack = []
pairs = {')': '(', ']': '[', '}': '{'}
in_single = False
in_double = False
in_backtick = False
in_line_comment = False
in_block_comment = False
escape = False

i = 0
line_no = 1
col_no = 1

while i < len(inline_script):
    ch = inline_script[i]
    if ch == '\n':
        line_no += 1
        col_no = 1
        in_line_comment = False
        i += 1
        continue
    
    col_no += 1
    
    if in_line_comment:
        i += 1
        continue
    
    if in_block_comment:
        if ch == '*' and i + 1 < len(inline_script) and inline_script[i+1] == '/':
            in_block_comment = False
            i += 2
            continue
        i += 1
        continue
    
    if escape:
        escape = False
        i += 1
        continue
    
    if ch == '\\':
        escape = True
        i += 1
        continue
    
    if in_single:
        if ch == "'":
            in_single = False
        i += 1
        continue
        
    if in_double:
        if ch == '"':
            in_double = False
        i += 1
        continue
        
    if in_backtick:
        if ch == '`':
            in_backtick = False
        i += 1
        continue
        
    if ch == '/' and i + 1 < len(inline_script):
        if inline_script[i+1] == '/':
            in_line_comment = True
            i += 2
            continue
        elif inline_script[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
            
    if ch == "'":
        in_single = True
        i += 1
        continue
    if ch == '"':
        in_double = True
        i += 1
        continue
    if ch == '`':
        in_backtick = True
        i += 1
        continue
        
    if ch in '([{':
        stack.append((ch, line_no, col_no))
    elif ch in ')]}':
        if not stack:
            print(f'Unmatched closing {ch} at line {line_no}, col {col_no}')
        else:
            top, tline, tcol = stack.pop()
            if top != pairs[ch]:
                print(f'Mismatched {ch} at line {line_no}, opened {top} at line {tline}:{tcol}')
    i += 1

if stack:
    print(f'Unclosed brackets left: {len(stack)}, first: {stack[0]}')
else:
    print('All brackets cleanly balanced!')
