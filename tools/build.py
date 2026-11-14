import os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
src=lambda f: open(os.path.join(R,'src',f),encoding='utf-8').read()
ui=''.join(src(f) for f in ['ui1.js','ui2.js','ui3.js','ui4.js','ui5.js','ui_camp.js','ui6.js'])
html=f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Head Coach 26 · NFL Franchise Simulator</title>
<style>{src('style.css')}</style></head>
<body><div id="app"></div>
<script>{src('data.js')}</script>
<script>{src('engine.js')}</script>
<script>{ui}</script>
</body></html>'''
out=os.path.join(R,'headcoach.html')
open(out,'w',encoding='utf-8').write(html)
open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(html)
print(out, len(html)//1024,'KB')
