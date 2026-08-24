# ja/tests/joseon assembler: core splice + stubs
import os, re

KO = open('/home/claude/tests/joseon/index.html', encoding='utf-8').read()
SRC = open('/home/claude/ja_joseon_src.html', encoding='utf-8').read()

core = KO.split('/*CORE:S*/')[1].split('/*CORE:E*/')[0]

# 1) drop the Korean display-only constants (GAN/JI hangul strings)
core = core.replace('var GAN="갑을병정무기경신임계", JI="자축인묘진사오미신유술해";\n', '')

# 2) strip block comments containing hangul (comments only; strings have no */)
HANG = re.compile(r'[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯]')
core = re.sub(r'/\*[^*]*(?:\*(?!/)[^*]*)*\*/',
              lambda m: '' if HANG.search(m.group()) else m.group(), core)

# 3) replace nokWon display body (KRW -> JPY, 1 seok = 24만원 ~= 2.6만엔), engine untouched
old_nokwon = re.search(r'function nokWon\(n\)\{.*?\n\}', core, re.S).group()
new_nokwon = ("function nokWon(n){\n"
              "  var man=Math.round(n*2.6);\n"
              "  return '約'+man.toLocaleString('ja-JP')+'万円';\n"
              "}")
core = core.replace(old_nokwon, new_nokwon)

assert not HANG.search(core), 'hangul left in core'
assert 'JD_ENC' in core and 'var TOPP=' in core and 'function career' in core

out = SRC.replace('/*__CORE__*/', '/*CORE:S*/' + core + '/*CORE:E*/')
assert not HANG.search(out), 'hangul left in ja page'
os.makedirs('/home/claude/ja/tests/joseon/img', exist_ok=True)
open('/home/claude/ja/tests/joseon/index.html', 'w', encoding='utf-8').write(out)

# ── stubs ──
ROLES = [
 ("01","🏯","王宮棟梁（宮大工の頭領）","王宮の大梁は、誰にでも上げられるものじゃない"),
 ("02","🌿","漢陽一の名医","鍼一本で、大臣も飛び起きる"),
 ("03","📖","市場の語り部・伝奇叟","語りのひと節で、市場じゅうが足を止める"),
 ("04","🍲","水剌間の料理長（王の台所）","王様の匙を止めさせる味"),
 ("05","🌾","万石取りの大地主","秋になれば、八道が私の蔵に挨拶へ来る"),
 ("06","🍶","酒幕の主人（宿場の顔役）","八道の噂は、ここで一晩泊まっていく"),
 ("07","🏹","武科首席の武官","矢の一本で、国境が静まり返る"),
 ("08","⚖️","司憲府の監察官","その眼差しに、汚職役人が辞表を書く"),
 ("09","🎒","褓負商の大親方（行商団の長）","八道の道は、全部私の帳簿の中にある"),
 ("10","🔮","漢陽一の観相家","顔を一目見て、宰相になる相を見抜く"),
 ("11","🐎","暗行御史（アメンオサ）","馬牌が光れば、町がひれ伏す"),
 ("12","👑","領議政（朝鮮王朝の総理大臣）","一人之下、万人之上"),
]

STUB = """<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{nm} — 朝鮮王朝 職業診断 | カササギ診断</title>
<link rel="canonical" href="https://www.kmagpie.com/ja/tests/joseon/">
<meta property="og:title" content="{emo} {nm} — 朝鮮王朝に生まれていたら？">
<meta property="og:description" content="{ct} · 生年月日で30秒、君の朝鮮での職業と出世運は？">
<meta property="og:image" content="https://www.kmagpie.com/ja/tests/joseon/img/og-{nn}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.kmagpie.com/ja/tests/joseon/s/{nn}/">
<meta name="twitter:card" content="summary_large_image">
<script>location.replace('/ja/tests/joseon/'+location.search);</script>
</head>
<body>
<p><a href="/ja/tests/joseon/">朝鮮王朝 職業診断へ →</a></p>
</body>
</html>
"""

for nn, emo, nm, ct in ROLES:
    d = f'/home/claude/ja/tests/joseon/s/{nn}'
    os.makedirs(d, exist_ok=True)
    html = STUB.format(nn=nn, emo=emo, nm=nm, ct=ct)
    assert not HANG.search(html)
    open(d + '/index.html', 'w', encoding='utf-8').write(html)

print('ja index + 12 stubs done')
