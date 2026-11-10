d=open('tools/pristine/index.js',encoding='utf-8').read()
j=d.find('ending-wish')
seg=d[j:j+120]
s=seg.find("children:`")+len("children:`")
e=seg.find("`",s)
txt=seg[s:e]
f=open('scratchpad/out.txt','w',encoding='utf-8')
f.write(repr(txt)+'\n')
f.write(' '.join(hex(ord(c)) for c in txt))
f.close()
