import re
d=open('tools/pristine/index.js',encoding='utf-8').read()
for m in re.finditer(r"Eu\s*=\s*(\".*?\"|\x27.*?\x27)", d):
    print('Eu =', m.group(0))
for m in re.finditer(r"localStorage\.\w+\((.{0,50})\)", d):
    print('LS:', m.group(0))
print('done')