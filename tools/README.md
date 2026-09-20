# أدوات المشروع

## 1) أصوات مصرية بالذكاء الاصطناعي
الحوارات (27 سطر) بتتحوّل لملفات صوت وتتحط جوه اللعبة:

```bash
pip install edge-tts
python tools/extract_lines.py          # يطلّع voice/lines.json
python tools/make_voice.py --engine edge   # يولّد voice/<id>.mp3 بصوت ar-EG
python tools/build_voice.py            # يدمج الأصوات جوه index.html
```

- `edge`: أصوات Microsoft العصبية باللهجة المصرية (ar-EG)، مجانية. لو اسم الصوت اتغيّر: `edge-tts --list-voices | grep ar-EG`.
- `elevenlabs`: طبيعي أكتر. حط `ELEVENLABS_API_KEY` وحدد `ELEVEN_VOICE_IDS` جوه `make_voice.py` (اختار أصوات لهجة مصرية من مكتبتهم).
- اللعبة بتستخدم ملف الصوت لو موجود، ولو مش موجود بترجع لصوت الجهاز.

## 2) بيانات الأحياء الحقيقية (OpenStreetMap)
```bash
python tools/osm_fetch.py imbaba 30.055 31.190 30.085 31.225   # جنوب غرب شمال شرق
```
بينزّل الشوارع والمباني الحقيقية للمنطقة في `data/`. البيانات مجانية بشرط الإشارة: © OpenStreetMap contributors.
