d=open('site/assets/index-DJZmi1tB.js',encoding='utf-8').read()
print('new:', d.count('Happy birthday, Istiii'))
print('old template remaining:', d.count('Happy birthday, ${Z.recipient}'))
