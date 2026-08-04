#!/usr/bin/env python3
"""까치툴 — 도구 페이지에 '함께 쓰면 좋은 도구' 섹션을 심고 목록 페이지를 갱신한다.

도구를 추가할 때는 아래 TOOLS 에 한 줄 넣고 REL 에 짝을 적은 뒤 이 스크립트를 돌리면 된다.
마커 사이만 갈아끼우므로 몇 번을 돌려도 결과가 같다.
"""
import re, sys, pathlib

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/tools')

# slug: (아이콘, 이름, 짧은 설명, 목록용 긴 설명)
TOOLS = {
 'salary':        ('💰','연봉 실수령액 계산기','2026년 요율·간이세액표 원본',
                   '2026년 4대보험 요율과 국세청 근로소득 간이세액표를 그대로 적용해 월 실수령액을 계산합니다. 공제 항목별 금액까지 전부 보여줍니다.'),
 'severance':     ('💼','퇴직금 계산기','평균임금·통상임금 자동 비교',
                   '입사일과 마지막 근무일만 넣으면 재직일수와 평균임금 산정기간을 자동으로 잡아줍니다. 상여금·연차수당 3/12를 반영하고 통상임금과 비교해 유리한 쪽으로 계산합니다.'),
 'holiday-pay':   ('📅','주휴수당 계산기','2026년 최저임금 10,320원 기준',
                   '요일별 근무시간을 넣으면 주휴수당과 주급·월급이 나옵니다. 주 15시간 요건과 최저임금 미달 여부까지 확인해 드립니다.'),
 'annual-leave':  ('🗓️','연차 계산기','입사일·회계연도 기준 동시 비교',
                   '입사일만 넣으면 연차 발생 내역이 연도별로 나옵니다. 입사일 기준과 회계연도 기준을 동시에 계산해 어느 쪽이 유리한지 알려주고 미사용 연차수당까지 계산합니다.'),
 'unemployment':  ('🧾','실업급여 계산기','2026년 상한 68,100원 반영',
                   '1일 지급액과 소정급여일수, 총 수급액을 계산합니다. 2026년에 7년 만에 오른 상한액과 최저임금 연동 하한액을 반영했고 수급 요건도 확인해 드립니다.'),
 'loan':          ('🏦','대출 이자 계산기','원리금균등·원금균등·거치기간',
                   '월 상환액과 총 이자를 계산하고 원리금균등·원금균등·만기일시를 한 화면에서 비교합니다. 거치기간을 반영한 상환 스케줄을 회차별로 보여줍니다.'),
 'acquisition-tax':('🏠','취득세 계산기','다주택 중과·생애최초 감면 반영',
                   '집이나 상가를 살 때 내는 취득세·지방교육세·농어촌특별세를 항목별로 계산합니다. 다주택 중과와 생애최초 감면, 일시적 2주택까지 반영하고 인지세·중개보수를 더한 총 부대비용도 보여줍니다.'),
 'broker-fee':    ('🔑','중개수수료 계산기','매매·전세·월세 복비 상한',
                   '공인중개사에게 낼 복비의 법정 상한을 계산합니다. 월세 보증금 환산과 구간별 한도액, 부가세까지 자동으로 처리해 실제 지급액을 보여줍니다.'),
 'pdf':           ('📑','PDF 편집기','합치기·나누기·페이지 삭제',
                   '여러 PDF를 합치고 페이지를 삭제·회전·순서 변경하고, 필요한 페이지만 뽑아냅니다. 이미지를 PDF로 만들 수도 있습니다.'),
 'pdf-sign':      ('✍️','PDF 서명·도장 넣기','인쇄 없이 계약서에 바로',
                   '계약서에 서명을 직접 그려 넣고 도장을 얹어 저장합니다. 인쇄해서 서명하고 다시 스캔할 필요가 없고 원본 글자는 그대로 남습니다.'),
 'remove-bg':     ('✂️','배경 제거 (누끼)','인물만 남기고 투명 PNG',
                   '사진에서 인물만 남기고 배경을 지웁니다. 투명 PNG·배경색·흐림 처리 지원. 워터마크도 횟수 제한도 없습니다.'),
 'convert':       ('🔄','이미지 확장자 변환','PNG·JPG·WebP·BMP·ICO',
                   'PNG·JPG·WebP·BMP·ICO를 서로 바꿉니다. 여러 장을 한꺼번에 변환해 ZIP으로 받고, 파비콘용 ICO도 만들 수 있습니다.'),
 'id-photo':      ('🪪','증명사진 만들기','여권·반명함 300dpi',
                   '여권·반명함 규격에 맞게 자르고 배경색을 바꿔 300dpi로 저장합니다. 사진관 인화용 4×6인치 배치 시트도 만들어 드려요.'),
 'image-compress':('🗜️','이미지 용량 줄이기','목표 용량에 자동으로 맞춤',
                   '여러 장을 한 번에 압축하고, 목표 용량을 정하면 품질을 자동으로 맞춰줍니다. WebP·JPEG 변환과 크기 축소를 지원합니다.'),
 'qr':            ('🔳','QR코드 만들기','링크·와이파이·연락처',
                   '링크·와이파이·연락처·문자 QR을 만듭니다. 색상과 로고를 넣고 인쇄용 SVG로 받으세요. 유효기간도 스캔 추적도 없습니다.'),
 'app-icon':      ('🎨','앱 아이콘 사이즈 생성기','안드로이드·iOS·파비콘',
                   '이미지 하나로 안드로이드 mipmap 전 해상도, 적응형 아이콘, Play 스토어 512px, iOS AppIcon, 파비콘까지 한 번에 만들어 ZIP으로 받습니다.'),
 'screenshot':    ('📱','스토어 스크린샷 생성기','기기 프레임·피처 그래픽',
                   '앱 화면 캡처에 배경·기기 프레임·홍보 문구를 얹어 Play 스토어 등록 규격에 맞는 이미지로 만들어 ZIP으로 받습니다. 피처 그래픽도 지원합니다.'),
 'privacy-policy':('📄','개인정보처리방침 생성기','Play 스토어 심사용',
                   '수집 항목과 사용 중인 SDK를 고르면 Play 스토어 심사용 개인정보처리방침을 한국어·영어로 만들어 HTML 파일로 받습니다.'),
}

# 목록 페이지 분류 (순서가 곧 노출 순서)
CATS = [
 ('이미지 편집', '사진을 다루는 도구입니다. 전부 브라우저 안에서 처리되고 업로드가 없어서, 얼굴이 나온 사진이나 공개 전 자료도 안심하고 올릴 수 있습니다.',
  ['remove-bg','id-photo','convert','image-compress']),
 ('PDF·문서',   '계약서나 제출 서류를 다룰 때 쓰는 도구입니다. 원본 문서의 글자를 그대로 살린 채 처리합니다.',
  ['pdf','pdf-sign']),
 ('급여·노동', '법령과 공식 고시를 그대로 적용해 계산합니다. 근사식을 쓰지 않고 계산 과정과 근거 조문을 함께 보여줍니다.',
  ['salary','severance','unemployment','annual-leave','holiday-pay']),
 ('부동산·금융', '집을 사고팔 때, 돈을 빌릴 때 필요한 계산입니다. 법령과 고시 요율을 그대로 적용하고 입력한 값은 어디로도 전송되지 않습니다.',
  ['acquisition-tax','broker-fee','loan','qr']),
 ('앱 개발',    '안드로이드 앱을 출시할 때 반복적으로 필요한 작업들입니다. 직접 앱을 만들며 필요해서 만든 도구예요.',
  ['app-icon','screenshot','privacy-policy']),
]

# 각 도구 페이지 하단에 노출할 관련 도구 (맥락 흐름 순)
REL = {
 'salary':        ['severance','loan','annual-leave'],
 'loan':          ['acquisition-tax','broker-fee','salary'],
 'acquisition-tax':['broker-fee','loan','pdf-sign'],
 'broker-fee':    ['acquisition-tax','loan','pdf-sign'],
 'annual-leave':  ['severance','unemployment','holiday-pay'],
 'severance':     ['unemployment','annual-leave','salary'],
 'unemployment':  ['severance','annual-leave','salary'],
 'holiday-pay':   ['annual-leave','severance','salary'],
 'pdf':           ['pdf-sign','convert','image-compress'],
 'pdf-sign':      ['pdf','id-photo','salary'],
 'remove-bg':     ['id-photo','convert','image-compress'],
 'convert':       ['image-compress','remove-bg','id-photo'],
 'id-photo':      ['remove-bg','convert','image-compress'],
 'image-compress':['convert','remove-bg','pdf'],
 'qr':            ['convert','image-compress','holiday-pay'],
 'app-icon':      ['screenshot','privacy-policy','image-compress'],
 'screenshot':    ['app-icon','privacy-policy','image-compress'],
 'privacy-policy':['app-icon','screenshot','pdf'],
}

CSS = """/*REL:S*/
  .rel{display:grid;grid-template-columns:repeat(auto-fit,minmax(208px,1fr));gap:12px;margin:16px 0 14px}
  .rel a{display:block;padding:15px 17px;border:1px solid var(--line);border-radius:13px;
    background:var(--surface);text-decoration:none;color:inherit;transition:.14s}
  .rel a:hover{border-color:var(--accent);transform:translateY(-2px)}
  .rel a strong{display:block;font-size:15px;font-weight:700;letter-spacing:-.01em;margin-bottom:4px}
  .rel a span{display:block;font-size:13px;color:var(--ink-3);line-height:1.55}
  .rel-all{font-size:14.5px;font-weight:600;margin:0}
/*REL:E*/
"""

def block(slug):
    n = len(TOOLS)
    cards = '\n'.join(
        f'  <a href="/tools/{s}/"><strong>{TOOLS[s][1]}</strong><span>{TOOLS[s][2]}</span></a>'
        for s in REL[slug])
    return (f'<!--REL:S-->\n<h2>함께 쓰면 좋은 도구</h2>\n<div class="rel">\n{cards}\n</div>\n'
            f'<p class="rel-all"><a href="/tools/">까치툴 도구 {n}개 전체 보기 →</a></p>\n<!--REL:E-->\n\n')

def put(text, start, end, new):
    """마커가 있으면 갈아끼우고, 없으면 None 반환"""
    i, j = text.find(start), text.find(end)
    if i < 0 or j < 0:
        return None
    return text[:i] + new + text[j + len(end):]

HEAD_BLOCK = """<!--HEAD:S-->
<link rel="icon" href="/images/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
<meta property="og:image" content="https://www.kmagpie.com/images/kmagpie-og.png">
<meta property="og:site_name" content="까치툴">
<!--HEAD:E-->"""

def patch_head(s, nl):
    """<head> 공통 블록 삽입 — 마커가 있으면 교체, 없으면 </head> 앞에 추가"""
    blk = HEAD_BLOCK.replace('\n', nl)
    r = put(s, '<!--HEAD:S-->', '<!--HEAD:E-->', blk)
    if r is not None:
        return r
    i = s.find('<script async src="https://pagead2')
    if i < 0:
        i = s.lower().find('</head>')
    assert i > 0, '<head> 삽입 위치를 못 찾음'
    return s[:i] + blk + nl + s[i:]

def patch(slug):
    p = ROOT / slug / 'index.html'
    s = open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    css = CSS.replace('\n', nl)
    blk = block(slug).replace('\n', nl)

    r = put(s, '/*REL:S*/', '/*REL:E*/', css.strip())
    if r is None:
        i = s.find('</style>')                       # 첫 번째 style 블록에만
        assert i > 0, f'{slug}: </style> 없음'
        s = s[:i] + css + s[i:]
    else:
        s = r

    s = patch_head(s, nl)

    r = put(s, '<!--REL:S-->', '<!--REL:E-->', blk.strip())
    if r is None:
        i = s.find('<footer>')
        assert i > 0, f'{slug}: <footer> 없음'
        s = s[:i] + blk + s[i:]
    else:
        s = r

    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())

def index_grid():
    out = []
    for title, desc, slugs in CATS:
        cards = '\n'.join(
            f'  <a class="tool" href="/tools/{s}/">\n'
            f'    <span class="ic">{TOOLS[s][0]}</span>\n'
            f'    <div class="nm">{TOOLS[s][1]}</div>\n'
            f'    <div class="ds">{TOOLS[s][3]}</div>\n'
            f'  </a>' for s in slugs)
        out.append(f'<h2 class="cat">{title}</h2>\n<p class="cat-d">{desc}</p>\n'
                   f'<div class="grid">\n{cards}\n</div>')
    return '<!--CAT:S-->\n' + '\n\n'.join(out) + '\n<!--CAT:E-->'

CAT_CSS = """/*CAT:S*/
  h2.cat{font-size:17px;margin:34px 0 4px;letter-spacing:-.01em}
  h2.cat:first-of-type{margin-top:26px}
  p.cat-d{font-size:13.5px;color:var(--ink-3);margin:0 0 12px;line-height:1.6}
/*CAT:E*/
"""

def patch_index(path):
    p = pathlib.Path(path)
    s = open(p, encoding='utf-8', newline='').read()
    n = len(TOOLS)

    r = put(s, '/*CAT:S*/', '/*CAT:E*/', CAT_CSS.strip())
    if r is None:
        i = s.find('</style>')
        s = s[:i] + CAT_CSS + s[i:]
    else:
        s = r

    s = patch_head(s, '\r\n' if '\r\n' in s[:2000] else '\n')

    r = put(s, '<!--CAT:S-->', '<!--CAT:E-->', index_grid())
    if r is None:
        i = s.find('<div class="grid">')
        j = s.find('</div>', s.find('</a>\n</div>'))
        j = s.rfind('</div>', i, s.find('<h2>왜 브라우저에서'))
        assert i > 0 and j > i, '목록 그리드 위치를 못 찾음'
        s = s[:i] + index_grid() + s[j + len('</div>'):]
    else:
        s = r

    s = re.sub(r'도구 \d+개 전체', f'도구 {n}개 전체', s)
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())

if __name__ == '__main__':
    for slug in TOOLS:
        print(f'  {slug:16} {patch(slug):>7,} bytes')
    idx = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'index.html')
    print(f'  {"index":16} {patch_index(idx):>7,} bytes')
