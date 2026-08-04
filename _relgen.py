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
 'car-tax':       ('🚗','자동차세 계산기','배기량·차령 경감·연납 할인',
                   '배기량과 최초 등록 연도만 넣으면 자동차세와 지방교육세가 나옵니다. 차령 경감을 법 산식 그대로 반기 단위로 계산하고 1월·3월·6월·9월 연납 할인액을 비교합니다.'),
 'car-acquisition':('🚙','자동차 취득세 계산기','경차 75만원·전기차 140만원 감면',
                   '차를 살 때 내는 취득세를 차종·용도별 세율로 계산합니다. 경차와 전기차 감면 한도를 반영하고, 공채 매입처럼 지역마다 다른 항목은 무엇을 더 확인해야 하는지 알려줍니다.'),
 'char-count':    ('🔤','글자수 세기','공백 포함·제외, 바이트, 원고지',
                   '붙여넣으면 글자수와 바이트가 즉시 나옵니다. 자소서 목표 글자수를 공백 포함·제외 기준으로 골라 진행률을 확인할 수 있고 원고지 매수도 세어 줍니다.'),
 'pyeong':        ('📐','평수 계산기','평↔㎡, 전용·공급면적',
                   '평과 제곱미터를 정확한 값 400/121로 양방향 변환합니다. 전용률을 넣으면 전용면적과 공급면적을 함께 보여주고 국민주택 규모 85㎡ 기준선도 표시합니다.'),
 'date-calc':     ('📆','날짜 계산기','만나이·D-day·날짜 사이 일수',
                   '만 나이와 D-day, 두 날짜 사이의 일수를 계산합니다. 100일·1000일 기념일을 한국식과 0일식으로 나란히 보여주고 주말을 뺀 영업일도 셀 수 있습니다.'),
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
  ['acquisition-tax','broker-fee','loan']),
 ('자동차', '차를 사고 유지할 때 내는 세금입니다. 확인되지 않은 항목은 계산에 넣지 않고 어디서 확인해야 하는지 알려드립니다.',
  ['car-tax','car-acquisition']),
 ('생활 편의', '자주 찾게 되는 단순한 계산과 변환입니다. 가입도 설치도 없이 바로 씁니다.',
  ['char-count','pyeong','date-calc','qr']),
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
 'qr':            ['char-count','convert','date-calc'],
 'car-tax':       ['car-acquisition','loan','acquisition-tax'],
 'car-acquisition':['car-tax','loan','acquisition-tax'],
 'char-count':    ['date-calc','pyeong','qr'],
 'pyeong':        ['acquisition-tax','broker-fee','date-calc'],
 'date-calc':     ['char-count','annual-leave','severance'],
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

    s = patch_footer(s, 'ko', slug in CALC)
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())

# 계산 결과를 내놓는 도구 — 푸터에 면책 안내 한 줄을 더 붙인다
CALC = {'salary', 'severance', 'holiday-pay', 'annual-leave', 'unemployment',
        'loan', 'acquisition-tax', 'broker-fee', 'car-tax', 'car-acquisition'}

FOOT_NOTE = {
 'ko': '<p>계산 결과는 참고용 추정치이며 법적 효력이 없습니다. '
       '정확한 금액과 문의처는 <a href="/disclaimer.html">면책조항</a>에서 확인하세요.</p>',
 'en': '<p>Results are estimates for reference only and carry no legal force. '
       'See the <a href="/en/disclaimer.html">disclaimer</a> for what they are based on '
       'and who to ask for a binding answer.</p>',
}


def patch_footer(s, lang, calc=False):
    """푸터에 면책조항 링크(+계산기라면 안내 한 줄)를 넣는다. 몇 번 돌려도 결과가 같다."""
    if lang == 'ko':
        old = '<a href="/privacy-policy.html">개인정보처리방침</a>'
        new = '<a href="/disclaimer.html">면책조항</a> · ' + old
        anchor = '<footer>'
    else:
        old = '<a href="/privacy-policy.html">Privacy Policy</a>'
        new = '<a href="/en/disclaimer.html">Disclaimer</a> &middot; ' + old
        anchor = '<footer>'

    if 'disclaimer' not in s.lower():
        s = s.replace(old, new)

    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    if calc and 'FOOTNOTE' not in s:
        i = s.find(anchor)
        if i > 0:
            j = i + len(anchor)
            s = s[:j] + f'{nl}  <!--FOOTNOTE-->{FOOT_NOTE[lang]}' + s[j:]
    elif not calc and 'FOOTNOTE' in s:
        # 계산기가 아닌 페이지에 잘못 들어간 안내 문구는 걷어낸다
        s = re.sub(r'[ \t]*<!--FOOTNOTE-->.*?</p>\r?\n?', '', s, flags=re.S)
    return s


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

    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    blk = ('<!--LANG:S-->\n<p class="langsw">'
           '<a href="/en/tools/" hreflang="en" lang="en">English version</a>'
           '</p>\n<!--LANG:E-->').replace('\n', nl)
    r = put(s, '<!--LANG:S-->', '<!--LANG:E-->', blk)
    if r is None:
        i = s.find('<p class="sub">')
        j = s.find('</p>', i) + len('</p>')
        s = s[:j] + nl + blk + s[j:]
    else:
        s = r
    if '/*LANG:S*/' not in s:
        k = s.find('</style>')
        s = s[:k] + LANG_CSS.replace('\n', nl) + s[k:]
    if 'hreflang="ko" href="https://www.kmagpie.com/tools/"' not in s:
        i = s.find('<!--HEAD:S-->')
        s = (s[:i]
             + f'<link rel="alternate" hreflang="ko" href="https://www.kmagpie.com/tools/">{nl}'
             + f'<link rel="alternate" hreflang="en" href="https://www.kmagpie.com/en/tools/">{nl}'
             + f'<link rel="alternate" hreflang="x-default" href="https://www.kmagpie.com/tools/">{nl}'
             + s[i:])

    s = patch_footer(s, 'ko')
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())

# ─────────────────────────────────────────────────────────────
# 영문판 (/en/tools/) — 한국 특화 계산기만 번역해서 운영한다
# ─────────────────────────────────────────────────────────────
EN_ROOT = ROOT.parent / 'en' / 'tools'

# slug: (아이콘, 영문 이름, 짧은 설명, 목록용 긴 설명)
EN_TOOLS = {
 'salary':       ('💰','Net Salary Calculator','After-tax pay, 2026 rates',
                  'Works out your monthly take-home pay from a gross annual salary using the official National Tax Service withholding table and 2026 rates for the four major insurances. Every deduction is itemised.'),
 'severance':    ('💼','Severance Pay Calculator','Retirement allowance (퇴직금)',
                  'Enter your start and end dates and it works out the statutory severance your employer owes you. It builds the three-month average wage period automatically and compares it against ordinary wage, as the law requires.'),
 'unemployment': ('🧾','Unemployment Benefit Calculator',"Job seeker's allowance (실업급여)",
                  'Estimates your daily benefit, how many days you can claim, and the total. Uses the 2026 daily cap and the minimum-wage-linked floor, and checks the basic eligibility conditions.'),
 'annual-leave': ('🗓️','Annual Leave Calculator','Statutory paid leave (연차)',
                  'Enter your hire date and see how many paid leave days you have earned, year by year. Calculates both the hire-date basis and the fiscal-year basis so you can see which one your employer is using and what it costs you.'),
 'holiday-pay':  ('📅','Weekly Holiday Allowance','The extra paid day (주휴수당)',
                  'Korea gives you an extra paid day each week if you work 15 hours or more. Enter your shifts and see what you are actually owed, checked against the 2026 minimum wage of 10,320 won.'),
}

EN_CATS = [
 ('Pay and employment',
  'Korean employment law gives you rights that may not exist back home — an extra paid day every week, statutory severance after one year, paid leave that accrues monthly. These tools apply the law and the official rate tables directly, and show you the working.',
  ['salary','holiday-pay','severance','annual-leave','unemployment']),
]

EN_REL = {
 'salary':       ['severance','holiday-pay','annual-leave'],
 'severance':    ['unemployment','annual-leave','salary'],
 'unemployment': ['severance','annual-leave','salary'],
 'annual-leave': ['severance','holiday-pay','salary'],
 'holiday-pay':  ['salary','annual-leave','severance'],
}

EN_HEAD_BLOCK = """<!--HEAD:S-->
<link rel="icon" href="/images/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
<meta property="og:image" content="https://www.kmagpie.com/images/kmagpie-og.png">
<meta property="og:site_name" content="Kmagpie Tools">
<!--HEAD:E-->"""

LANG_CSS = """/*LANG:S*/
  .langsw{font-size:13px;margin:-12px 0 20px}
  .langsw a{color:var(--ink-3);text-decoration:none;border-bottom:1px solid var(--line)}
  .langsw a:hover{color:var(--accent);border-color:var(--accent)}
/*LANG:E*/
"""

ALT_RE = re.compile(r'[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*>\r?\n?')


def alt_block(slug):
    u = f'https://www.kmagpie.com/tools/{slug}/'
    e = f'https://www.kmagpie.com/en/tools/{slug}/'
    return ('<!--ALT:S-->\n'
            f'<link rel="alternate" hreflang="ko" href="{u}">\n'
            f'<link rel="alternate" hreflang="en" href="{e}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{u}">\n'
            '<!--ALT:E-->')


def lang_block(slug, lang):
    if lang == 'ko':
        a = f'<a href="/en/tools/{slug}/" hreflang="en" lang="en">English version</a>'
    else:
        a = f'<a href="/tools/{slug}/" hreflang="ko" lang="ko">한국어로 보기</a>'
    return f'<!--LANG:S-->\n<p class="langsw">{a}</p>\n<!--LANG:E-->'


def patch_alt(s, nl, slug):
    """head 에 hreflang 3종을 마커로 넣는다 (마커 없는 기존 줄은 걷어낸다)"""
    blk = alt_block(slug).replace('\n', nl)
    r = put(s, '<!--ALT:S-->', '<!--ALT:E-->', blk)
    if r is not None:
        return r
    s = ALT_RE.sub('', s)
    i = s.find('<!--HEAD:S-->')
    if i < 0:
        i = s.find('<script async src="https://pagead2')
    assert i > 0, f'{slug}: hreflang 삽입 위치를 못 찾음'
    return s[:i] + blk + nl + s[i:]


def patch_lang(s, nl, slug, lang):
    """빵부스러기 바로 아래 언어 전환 링크"""
    blk = lang_block(slug, lang).replace('\n', nl)
    r = put(s, '<!--LANG:S-->', '<!--LANG:E-->', blk)
    if r is not None:
        s = r
    else:
        i = s.find('<p class="crumb">')
        assert i > 0, f'{slug}: crumb 없음'
        j = s.find('</p>', i) + len('</p>')
        s = s[:j] + nl + blk + s[j:]
    if '/*LANG:S*/' not in s:
        k = s.find('</style>')
        s = s[:k] + LANG_CSS.replace('\n', nl) + s[k:]
    return s


def en_block(slug):
    n = len(EN_TOOLS)
    cards = '\n'.join(
        f'  <a href="/en/tools/{s}/"><strong>{EN_TOOLS[s][1]}</strong><span>{EN_TOOLS[s][2]}</span></a>'
        for s in EN_REL[slug])
    return (f'<!--REL:S-->\n<h2>Related tools</h2>\n<div class="rel">\n{cards}\n</div>\n'
            f'<p class="rel-all"><a href="/en/tools/">See all {n} English tools →</a></p>\n<!--REL:E-->\n\n')


def patch_en(slug):
    p = EN_ROOT / slug / 'index.html'
    s = open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    css = CSS.replace('\n', nl)
    blk = en_block(slug).replace('\n', nl)

    r = put(s, '/*REL:S*/', '/*REL:E*/', css.strip())
    if r is None:
        i = s.find('</style>')
        assert i > 0, f'en/{slug}: </style> 없음'
        s = s[:i] + css + s[i:]
    else:
        s = r

    blkh = EN_HEAD_BLOCK.replace('\n', nl)
    r = put(s, '<!--HEAD:S-->', '<!--HEAD:E-->', blkh)
    if r is None:
        i = s.find('<script async src="https://pagead2')
        assert i > 0, f'en/{slug}: head 삽입 위치를 못 찾음'
        s = s[:i] + blkh + nl + s[i:]
    else:
        s = r

    s = patch_alt(s, nl, slug)
    s = patch_lang(s, nl, slug, 'en')

    r = put(s, '<!--REL:S-->', '<!--REL:E-->', blk.strip())
    if r is None:
        i = s.find('<footer>')
        assert i > 0, f'en/{slug}: <footer> 없음'
        s = s[:i] + blk + s[i:]
    else:
        s = r

    s = patch_footer(s, 'en', slug in CALC)
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())


EN_INDEX = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kmagpie Tools — Free Korean Pay and Employment Calculators</title>
<meta name="description" content="Free calculators for people working in Korea. Net salary after tax, severance pay, weekly holiday allowance, annual leave and unemployment benefit — using the official 2026 rates. No sign-up, nothing uploaded.">
<link rel="canonical" href="https://www.kmagpie.com/en/tools/">
<meta property="og:title" content="Kmagpie Tools — Korean Pay and Employment Calculators">
<meta property="og:description" content="Net salary, severance, weekly holiday allowance, annual leave and unemployment benefit — official 2026 rates, calculated in your browser.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.kmagpie.com/en/tools/">
<link rel="alternate" hreflang="ko" href="https://www.kmagpie.com/tools/">
<link rel="alternate" hreflang="en" href="https://www.kmagpie.com/en/tools/">
<link rel="alternate" hreflang="x-default" href="https://www.kmagpie.com/tools/">
<style>
  :root{
    --bg:#faf9f7; --surface:#fff; --line:#e6e2dc; --line-soft:#efece7;
    --ink:#22201d; --ink-2:#57524b; --ink-3:#8a837a;
    --accent:#b45309; --accent-soft:#fdf4e7;
  }
  @media (prefers-color-scheme:dark){
    :root{
      --bg:#171614; --surface:#201f1c; --line:#33312d; --line-soft:#2a2926;
      --ink:#ece9e4; --ink-2:#aca69d; --ink-3:#7d776e;
      --accent:#e0a35a; --accent-soft:#2a2117;
    }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Pretendard","Noto Sans KR",sans-serif;
    line-height:1.7;font-size:16px;-webkit-font-smoothing:antialiased}
  .wrap{max-width:880px;margin:0 auto;padding:44px 22px 90px}
  .crumb{font-size:13px;color:var(--ink-3);margin:0 0 18px}
  .crumb a{color:var(--ink-3);text-decoration:none}
  .crumb a:hover{color:var(--accent)}
  h1{font-size:30px;line-height:1.25;margin:0;letter-spacing:-.02em;font-weight:700}
  .brand{display:flex;align-items:center;gap:14px;margin:0 0 10px}
  .brand img{width:64px;height:64px;flex:none;display:block}
  @media (prefers-color-scheme:dark){ .brand img.lt{display:none} }
  @media not all and (prefers-color-scheme:dark){ .brand img.dk{display:none} }
  .sub{color:var(--ink-2);margin:0 0 8px;font-size:15.5px}
  .langsw{font-size:13px;margin:0 0 20px}
  .langsw a{color:var(--ink-3);text-decoration:none;border-bottom:1px solid var(--line)}
  .langsw a:hover{color:var(--accent);border-color:var(--accent)}
  h2{font-size:19px;margin:44px 0 10px;letter-spacing:-.015em;font-weight:700}
  h2.cat{font-size:17px;margin:34px 0 4px;letter-spacing:-.01em}
  h2.cat:first-of-type{margin-top:26px}
  p.cat-d{font-size:13.5px;color:var(--ink-3);margin:0 0 12px;line-height:1.6}
  p{margin:0 0 14px}
  a{color:var(--accent)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:14px;margin:14px 0}
  .tool{display:block;padding:18px 20px;border:1px solid var(--line);border-radius:14px;
    background:var(--surface);text-decoration:none;color:inherit;transition:.14s}
  .tool:hover{border-color:var(--accent);transform:translateY(-2px)}
  .tool .ic{font-size:22px;display:block;margin-bottom:8px}
  .tool .nm{font-size:16px;font-weight:700;letter-spacing:-.01em;margin-bottom:5px}
  .tool .ds{font-size:13.5px;color:var(--ink-3);line-height:1.6}
  footer{margin-top:56px;padding-top:22px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-3)}
  footer a{color:var(--ink-3)}
  @media (max-width:560px){ .wrap{padding:32px 16px 70px} h1{font-size:24px} .brand img{width:52px;height:52px} }
</style>
<!--HEAD:S-->
<!--HEAD:E-->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3632022254909828" crossorigin="anonymous"></script>
</head>
<body>
<div class="wrap">

<p class="crumb"><a href="/">K-magpie</a> &rsaquo; Kmagpie Tools</p>

<div class="brand"><img class="lt" src="/images/kmagpie-logo.png" alt="Kmagpie Tools logo, a magpie holding a wrench" width="64" height="64"><img class="dk" src="/images/kmagpie-logo-dark.png" alt="Kmagpie Tools logo, a magpie holding a wrench" width="64" height="64"><h1>Kmagpie Tools</h1></div>
<p class="sub">Free calculators for people working in Korea. No sign-up, no uploads &mdash; everything runs inside your browser.</p>
<p class="langsw"><a href="/tools/" hreflang="ko" lang="ko">&#54620;&#44397;&#50612;&#47196; &#48372;&#44592;</a></p>

<!--CAT:S-->
<!--CAT:E-->

<h2>Why these numbers are hard to find in English</h2>
<p>Korean payroll runs on rules that are published in Korean, updated every year, and rarely explained anywhere else. The withholding table that decides your income tax is a 588-row government document. The weekly holiday allowance has no equivalent in most countries, so nobody thinks to ask about it. Severance is a legal entitlement rather than a benefit your employer chooses to offer.</p>
<p>These tools apply the actual rules rather than a rough approximation, and each page explains where the number came from. If your payslip disagrees with the result, that gap is worth asking your employer about.</p>

<h2>Nothing leaves your browser</h2>
<p>Every calculation happens on your own device. Your salary, your dates and your hours are never sent anywhere, never stored, and never logged. You can turn off your connection after the page loads and the tools keep working.</p>

<footer>
  <p>Kmagpie Tools &middot; All calculations run in your browser. Nothing you type is transmitted or stored.</p>
  <p>These pages are general information, not legal or tax advice. For a binding answer, contact the relevant authority or a qualified professional.</p>
  <p><a href="/">Home</a> &middot; <a href="/tools/">&#54620;&#44397;&#50612;</a> &middot; <a href="/privacy-policy.html">Privacy Policy</a></p>
</footer>

</div>
</body>
</html>
"""


def en_index_grid():
    out = []
    for title, desc, slugs in EN_CATS:
        cards = '\n'.join(
            f'  <a class="tool" href="/en/tools/{s}/">\n'
            f'    <span class="ic">{EN_TOOLS[s][0]}</span>\n'
            f'    <div class="nm">{EN_TOOLS[s][1]}</div>\n'
            f'    <div class="ds">{EN_TOOLS[s][3]}</div>\n'
            f'  </a>' for s in slugs)
        out.append(f'<h2 class="cat">{title}</h2>\n<p class="cat-d">{desc}</p>\n'
                   f'<div class="grid">\n{cards}\n</div>')
    return '<!--CAT:S-->\n' + '\n\n'.join(out) + '\n<!--CAT:E-->'


def patch_en_index():
    p = EN_ROOT / 'index.html'
    if p.exists():
        s = open(p, encoding='utf-8', newline='').read()
    else:
        p.parent.mkdir(parents=True, exist_ok=True)
        s = EN_INDEX
    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    s = put(s, '<!--CAT:S-->', '<!--CAT:E-->', en_index_grid().replace('\n', nl))
    blkh = EN_HEAD_BLOCK.replace('\n', nl)
    s = put(s, '<!--HEAD:S-->', '<!--HEAD:E-->', blkh)
    s = patch_footer(s, 'en')
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())


def patch_ko_lang(slug):
    """한국어 페이지에 hreflang + 영문판 링크를 심는다"""
    p = ROOT / slug / 'index.html'
    s = open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    s = patch_alt(s, nl, slug)
    s = patch_lang(s, nl, slug, 'ko')
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())


# 독립 페이지 (도구가 아닌 정적 페이지)
STANDALONE = [(ROOT.parent / 'disclaimer.html', 'ko'),
              (ROOT.parent / 'en' / 'disclaimer.html', 'en')]


def patch_standalone(path, lang):
    p = pathlib.Path(path)
    s = open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s[:2000] else '\n'
    blk = (HEAD_BLOCK if lang == 'ko' else EN_HEAD_BLOCK).replace('\n', nl)
    r = put(s, '<!--HEAD:S-->', '<!--HEAD:E-->', blk)
    if r is not None:
        s = r
    open(p, 'w', encoding='utf-8', newline='').write(s)
    return len(s.encode())


if __name__ == '__main__':
    for slug in TOOLS:
        print(f'  {slug:16} {patch(slug):>7,} bytes')
    idx = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'index.html')
    print(f'  {"index":16} {patch_index(idx):>7,} bytes')

    if EN_ROOT.is_dir():
        print('  ── en ──')
        for slug in EN_TOOLS:
            print(f'  en/{slug:13} {patch_en(slug):>7,} bytes')
            print(f'  ko/{slug:13} {patch_ko_lang(slug):>7,} bytes  (hreflang)')
        print(f'  {"en/index":16} {patch_en_index():>7,} bytes')
    for path, lang in STANDALONE:
        if path.exists():
            print(f'  {path.name+"("+lang+")":16} {patch_standalone(path, lang):>7,} bytes')
