d=open('tools/pristine/index.js',encoding='utf-8').read()
j=d.find('ending-wish')
seg=d[j:j+90]
start=seg.find('children:`')+len('children:`')
end=seg.find('`', start)
txt=seg[start:end]
print(repr(txt))
print([hex(ord(c)) for c in txt])
"