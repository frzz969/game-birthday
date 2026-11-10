d=open('tools/pristine/index.js',encoding='utf-8').read()
j=d.find('ending-wish')
out=d[j-60:j+90]
open('scratchpad/snippet.txt','w',encoding='utf-8').write(out)
print('ok')
"