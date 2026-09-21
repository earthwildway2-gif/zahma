import pathlib, re
d=pathlib.Path('/tmp/sh')
js="".join((d/n).read_text(encoding='utf-8') for n in ['core1.js','core2.js','core3a.js','core3b.js','core4.js','chars.js','core5.js'])
html=(d/'shell.html').read_text(encoding='utf-8')+js+"\n})();\n</script>\n</body>\n</html>\n"
out=d/'shooter.html'
# keep any embedded voice clips already present in the built file
if out.exists():
    old=out.read_text(encoding='utf-8'); m=re.search(r"/\*VOICE_BEGIN\*/.*?/\*VOICE_END\*/",old,re.S)
    if m and len(m.group(0))>60: html=re.sub(r"/\*VOICE_BEGIN\*/.*?/\*VOICE_END\*/",lambda _:m.group(0),html,count=1,flags=re.S)
sf=d/'sfx.json'
if sf.exists():
    html=re.sub(r"/\*SFX_BEGIN\*/.*?/\*SFX_END\*/",lambda _:"/*SFX_BEGIN*/const SFX = "+sf.read_text()+";/*SFX_END*/",html,count=1,flags=re.S)
import base64, json
ad=d/'assets'
tex={f.stem:'data:image/jpeg;base64,'+base64.b64encode(f.read_bytes()).decode() for f in sorted(ad.glob('*.jpg'))} if ad.exists() else {}
sfxai={f.stem:'data:audio/mpeg;base64,'+base64.b64encode(f.read_bytes()).decode() for f in sorted(ad.glob('*.mp3'))} if ad.exists() else {}
html=re.sub(r"/\*AITEX_BEGIN\*/.*?/\*AITEX_END\*/",lambda _:"/*AITEX_BEGIN*/const AITEX = "+json.dumps(tex)+";/*AITEX_END*/",html,count=1,flags=re.S)
html=re.sub(r"/\*AISFX_BEGIN\*/.*?/\*AISFX_END\*/",lambda _:"/*AISFX_BEGIN*/const AISFX = "+json.dumps(sfxai)+";/*AISFX_END*/",html,count=1,flags=re.S)
print('ai textures',len(tex),'ai sounds',len(sfxai))
out.write_text(html,encoding='utf-8')
m=re.search(r'<script>\n\(\(\) => \{\n(.*)\n\}\)\(\);\n</script>',html,re.S)
(d/'shooter.js').write_text("(() => {\n"+m.group(1)+"\n})();",encoding='utf-8')
print(len(html)//1024,'KB')
