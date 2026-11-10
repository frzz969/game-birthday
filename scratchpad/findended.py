import re
d=open('tools/pristine/index.js',encoding='utf-8').read()
seen=set()
for m in re.finditer(r'ended\s*:\s*(true|false|!0|!1)', d):
    v=m.group(0)
    if v not in seen:
        seen.add(v); print(v)
print('done')
"