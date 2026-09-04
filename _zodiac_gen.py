# -*- coding: utf-8 -*-
"""
띠별 오늘의 운세 12페이지 생성기
  출력: /home/claude/fortune/today/zodiac/<slug>/index.html  (단일 파일, 외부 요청 0)
  실행: python3 /home/claude/_zodiac_gen.py
  결정론: 같은 입력 → 같은 출력. 여러 번 돌려도 동일.
"""
import os, re, sys, io

OUT_ROOT = "/home/claude/fortune/today/zodiac"
BASE_URL = "https://www.kmagpie.com/fortune/today/zodiac/"

# ── 띠 기본 데이터 (자축인묘진사오미신유술해 순) ────────────────────────────
Z = [
    dict(slug="rat",     nm="쥐",     emo="🐭", ji="자", jih="子"),
    dict(slug="ox",      nm="소",     emo="🐮", ji="축", jih="丑"),
    dict(slug="tiger",   nm="호랑이", emo="🐯", ji="인", jih="寅"),
    dict(slug="rabbit",  nm="토끼",   emo="🐰", ji="묘", jih="卯"),
    dict(slug="dragon",  nm="용",     emo="🐲", ji="진", jih="辰"),
    dict(slug="snake",   nm="뱀",     emo="🐍", ji="사", jih="巳"),
    dict(slug="horse",   nm="말",     emo="🐴", ji="오", jih="午"),
    dict(slug="goat",    nm="양",     emo="🐑", ji="미", jih="未"),
    dict(slug="monkey",  nm="원숭이", emo="🐵", ji="신", jih="申"),
    dict(slug="rooster", nm="닭",     emo="🐔", ji="유", jih="酉"),
    dict(slug="dog",     nm="개",     emo="🐶", ji="술", jih="戌"),
    dict(slug="pig",     nm="돼지",   emo="🐷", ji="해", jih="亥"),
]
ELJ = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]      # 지지 오행 (목0 화1 토2 금3 수4)
EL_NM = ["목", "화", "토", "금", "수"]
EL_H = ["木", "火", "土", "金", "水"]
GAN = "갑을병정무기경신임계"
JI = "자축인묘진사오미신유술해"

# ── 띠별 성향 소개 (각 300자 이상, 페이지 상단 고정 SEO 본문) ───────────────
INTRO = {
"rat": "쥐띠는 열두 지지 가운데 첫 글자인 자(子)를 받습니다. 자는 한밤중 열한 시부터 새벽 한 시까지, 한 해로 치면 동지 무렵의 물입니다. 모든 것이 잠든 시각에 홀로 깨어 다음 계절을 준비하는 자리라, 쥐띠의 기질은 부지런함보다 먼저 눈치와 감각으로 설명됩니다. 남들이 아직 낌새를 못 챈 단계에서 흐름을 먼저 읽고, 크게 벌이는 대신 작게 여러 번 시도해 손해를 줄입니다. 모아 두는 성향도 여기서 나옵니다. 돈이든 정보든 인맥이든 당장 쓸 데가 없어도 일단 확보해 두었다가 필요한 순간에 정확히 꺼내 쓰는 것이 쥐띠식 살림입니다. 약점은 그 민첩함이 잔걱정으로 바뀔 때입니다. 가능성을 너무 많이 계산하다 정작 결정을 미루고, 확보해 둔 것을 놓지 못해 판을 키우지 못하는 경우가 있습니다. 자수(子水)는 흐르는 물이라 고이면 탁해집니다. 쥐띠에게 좋은 하루는 정보를 모으는 하루가 아니라 모아 둔 것 가운데 하나를 실제로 써 보는 하루입니다.",
"ox": "소띠의 글자는 축(丑)입니다. 축은 새벽 한 시에서 세 시, 한겨울의 언 땅입니다. 겉으로는 아무 일도 일어나지 않는 시각이지만 땅속에서는 이미 봄을 향한 준비가 시작된 자리라, 소띠의 기질은 눈에 보이지 않는 축적으로 설명됩니다. 한 번 시작한 일은 좀처럼 놓지 않고, 속도가 느리다는 말을 들어도 방향을 바꾸지 않으며, 결국 끝까지 남아 있는 사람이 소띠인 경우가 많습니다. 신뢰가 이들의 가장 큰 자산입니다. 말수가 적어도 약속한 것을 지키는 이력이 쌓이면 사람들이 중요한 일을 맡깁니다. 약점은 그 단단함이 고집으로 굳을 때입니다. 이미 틀린 방향인 줄 알면서도 들인 시간이 아까워 계속 밀고 가거나, 서운한 일을 말하지 않고 안에 쌓아 두었다가 한꺼번에 터뜨리기도 합니다. 축토(丑土)는 얼어 있는 흙이라 녹여 줄 온기가 필요합니다. 소띠에게는 일을 더 하는 것보다 중간에 한 번 말로 꺼내 놓는 습관이 훨씬 이득입니다.",
"tiger": "호랑이띠의 글자는 인(寅)입니다. 인은 새벽 세 시에서 다섯 시, 입춘이 드는 자리이자 한 해의 첫 달입니다. 아직 추운데 먼저 움트는 나무의 기운이라, 호랑이띠의 기질은 시작하는 힘으로 설명됩니다. 조건이 다 갖춰지기를 기다리지 않고 일단 발을 들이며, 남이 망설이는 자리에서 먼저 손을 들고, 불의라고 느끼면 손해를 감수하고도 목소리를 냅니다. 사람을 끌어모으는 힘도 여기서 나옵니다. 앞장서는 사람이 있어야 움직이는 판에서 호랑이띠는 자연스럽게 그 자리에 섭니다. 약점은 시작한 만큼 끝맺지 못할 때입니다. 초반의 열이 워낙 세서 중반의 지루함을 견디기 어려워하고, 자존심이 걸리면 물러설 자리를 스스로 없애 버리기도 합니다. 인목(寅木)은 아직 어린 나무라 뻗을 방향이 중요합니다. 호랑이띠에게 좋은 하루는 새 일을 하나 더 벌이는 하루가 아니라, 벌여 둔 것 가운데 하나를 끝까지 밀어 마무리 짓는 하루입니다.",
"rabbit": "토끼띠의 글자는 묘(卯)입니다. 묘는 새벽 다섯 시에서 일곱 시, 해가 막 올라오는 시각이자 봄이 한창인 자리입니다. 이미 자란 풀과 꽃의 기운이라, 토끼띠의 기질은 부드러움과 섬세함으로 설명됩니다. 분위기를 빠르게 읽고 상대가 불편해하는 지점을 먼저 피해 가며, 직접 부딪치는 대신 돌아가는 길을 찾아 결국 원하는 곳에 도착합니다. 미감이 좋아 색과 형태, 문장의 결을 다루는 일에서 강점이 두드러집니다. 약점은 그 유연함이 우유부단함으로 보일 때입니다. 거절을 어려워하다 감당 못 할 일까지 떠안고, 갈등을 미루다 상황이 더 나빠지는 경우가 있습니다. 마음이 상해도 티를 내지 않아 주변이 눈치채지 못하는 것도 문제입니다. 묘목(卯木)은 가늘어도 무리 지어 자랍니다. 토끼띠에게는 혼자 견디는 것보다 편한 사람 한 명에게 상황을 그대로 말해 두는 편이 훨씬 빠른 해결책입니다.",
"dragon": "용띠의 글자는 진(辰)입니다. 진은 아침 일곱 시에서 아홉 시, 봄이 끝나 가는 축축한 흙이자 물을 품은 창고입니다. 열두 지지 가운데 유일하게 실재하지 않는 동물을 받은 자리라, 용띠의 기질은 스케일로 설명됩니다. 눈앞의 일보다 판 전체를 먼저 그리고, 남들이 현실적이지 않다고 말하는 그림을 오래 붙들며, 실제로 그중 하나를 현실로 만들어 내기도 합니다. 자존심이 세다는 평을 듣지만 그 자존심이 기준을 높게 유지하는 힘이기도 합니다. 약점은 그림과 현실의 거리가 멀 때입니다. 시작은 크게 했는데 세부가 받쳐 주지 않아 흐지부지되거나, 인정받지 못한다고 느끼면 갑자기 흥미를 잃습니다. 기복이 큰 것도 진토(辰土)가 물을 품고 있기 때문입니다. 용띠에게 좋은 하루는 더 큰 그림을 그리는 하루가 아니라, 그려 둔 그림에서 이번 주에 실제로 할 수 있는 한 칸을 떼어 내는 하루입니다.",
"snake": "뱀띠의 글자는 사(巳)입니다. 사는 오전 아홉 시에서 열한 시, 초여름의 불이자 아직 정점에 이르지 않은 열입니다. 겉으로 활활 타지 않고 안에서 뜨거운 자리라, 뱀띠의 기질은 집중과 통찰로 설명됩니다. 말수가 많지 않은 대신 관찰이 깊고, 한 가지 주제를 오래 파고들어 남들이 못 보는 구조를 짚어 냅니다. 결정을 내리기까지 오래 걸리지만 일단 내리면 잘 흔들리지 않습니다. 전문성이 쌓이는 분야에서 특히 강합니다. 약점은 그 깊이가 폐쇄로 기울 때입니다. 속을 잘 보이지 않아 오해를 사고, 한 번 마음이 식으면 설명 없이 관계를 정리해 버리며, 의심이 들면 확인 대신 혼자 결론을 내리기도 합니다. 사화(巳火)는 밝히는 불이지 태우는 불이 아닙니다. 뱀띠에게는 판단을 마친 뒤 그 판단의 근거를 한 번 밖으로 말해 보는 습관이 관계와 일 양쪽을 모두 편하게 만들어 줍니다.",
"horse": "말띠의 글자는 오(午)입니다. 오는 낮 열한 시에서 한 시, 한여름 정오의 불입니다. 하루 중 볕이 가장 강한 자리라, 말띠의 기질은 속도와 밝음으로 설명됩니다. 결심과 실행 사이가 짧고, 처음 만난 사람과도 금세 편해지며, 분위기가 가라앉은 자리에 들어가면 온도를 올려 놓습니다. 몸으로 부딪쳐 배우는 학습이 빨라 새 환경 적응이 남들보다 수월합니다. 약점은 그 열이 오래가지 않을 때입니다. 시작할 때의 몰입이 강한 만큼 반복되는 구간에서 급격히 지치고, 지루해지면 미련 없이 다음 것으로 옮겨 갑니다. 하고 싶은 말을 그대로 내놓다가 관계에 금이 가는 경우도 있습니다. 오화(午火)는 강한 불이라 땔감보다 조절이 중요합니다. 말띠에게 좋은 하루는 새로운 일을 시작하는 하루가 아니라, 이미 재미가 식은 일 하나를 끝까지 붙들어 끝내 보는 하루입니다.",
"goat": "양띠의 글자는 미(未)입니다. 미는 오후 한 시에서 세 시, 여름 끝의 마른 흙이자 열매가 익어 가는 자리입니다. 뜨거움이 한풀 꺾이고 결실을 갈무리하는 시각이라, 양띠의 기질은 온화함과 인내로 설명됩니다. 상대의 감정을 세밀하게 읽고 먼저 배려하며, 갈등이 생기면 자기 몫을 조금 줄여서라도 자리를 지킵니다. 예술이나 돌봄처럼 사람의 마음을 다루는 일에서 강점이 두드러집니다. 약점은 그 배려가 자기 소모로 이어질 때입니다. 참는 것이 익숙해 정작 자기가 무엇을 원하는지 말하지 못하고, 쌓인 서운함이 엉뚱한 자리에서 터지며, 결정을 남에게 미루고 나서 후회하기도 합니다. 미토(未土)는 마른 흙이라 물이 필요합니다. 양띠에게는 남을 챙기는 시간의 일부를 떼어 자기 상태를 확인하는 시간으로 돌리는 것이 하루의 균형을 잡는 가장 빠른 방법입니다.",
"monkey": "원숭이띠의 글자는 신(申)입니다. 신은 오후 세 시에서 다섯 시, 가을이 시작되는 금(金)의 기운입니다. 여름의 무성함을 정리하고 쓸 것과 버릴 것을 가르는 자리라, 원숭이띠의 기질은 재주와 응용으로 설명됩니다. 머리 회전이 빠르고 상황에 맞춰 방법을 바꾸는 데 능하며, 남들이 규칙대로 하느라 막힌 지점에서 옆문을 찾아냅니다. 여러 가지를 동시에 다루는 능력도 뛰어나 변화가 잦은 환경에서 오히려 성과를 냅니다. 약점은 그 재주가 가벼움으로 읽힐 때입니다. 시작한 것이 많아 마무리가 흩어지고, 쉽게 되는 길이 보이면 기본을 건너뛰며, 말솜씨가 좋아 실제보다 크게 약속하는 일이 있습니다. 신금(申金)은 단단하지만 아직 다듬어지지 않은 쇠입니다. 원숭이띠에게 좋은 하루는 새 방법을 하나 더 찾는 하루가 아니라, 이미 찾아 둔 방법 하나를 끝까지 밀어 결과로 만드는 하루입니다.",
"rooster": "닭띠의 글자는 유(酉)입니다. 유는 저녁 다섯 시에서 일곱 시, 가을이 한창인 다듬어진 금의 자리입니다. 수확을 마치고 낟알을 고르는 시각이라, 닭띠의 기질은 정확함과 기준으로 설명됩니다. 어긋난 것이 눈에 먼저 들어오고, 대충 넘어가는 것을 견디기 어려워하며, 자기 영역 안에서는 흐트러짐 없이 관리합니다. 시간 약속과 마무리 품질에서 신뢰를 얻는 유형입니다. 약점은 그 기준이 밖으로 향할 때입니다. 남의 실수를 지적하는 말이 필요 이상으로 날카로워지고, 완벽하지 않으면 시작조차 못 하며, 자기 자신에게도 엄격해 스스로를 지치게 만듭니다. 유금(酉金)은 잘 벼려진 칼이라 무엇을 자르느냐가 중요합니다. 닭띠에게는 지적하고 싶은 말을 하루 재워 두는 습관, 그리고 팔십 점짜리 결과물을 일단 내놓아 보는 연습이 실제 성과를 크게 늘려 줍니다.",
"dog": "개띠의 글자는 술(戌)입니다. 술은 저녁 일곱 시에서 아홉 시, 가을이 끝나 가는 마른 흙이자 불을 품은 창고입니다. 하루의 일을 마치고 문단속을 하는 시각이라, 개띠의 기질은 의리와 원칙으로 설명됩니다. 한 번 내 편이라고 정한 사람은 상황이 나빠져도 놓지 않고, 옳고 그름의 기준이 분명해 손해를 보면서도 선을 지킵니다. 책임을 맡기면 끝까지 지켜 내는 유형이라 조직에서 신뢰가 두텁습니다. 약점은 그 원칙이 세상과 부딪칠 때입니다. 기준에 어긋나는 일을 보면 참지 못해 불필요한 싸움을 만들고, 사람을 내 편과 아닌 편으로 빠르게 가르며, 실망하면 오래 담아 둡니다. 걱정이 많아 미리 최악을 그려 보는 습관도 있습니다. 술토(戌土)는 불을 품은 흙이라 안에 열이 있습니다. 개띠에게는 지켜야 할 선과 그냥 넘겨도 되는 일을 구분해 두는 것이 하루의 피로를 크게 줄여 줍니다.",
"pig": "돼지띠의 글자는 해(亥)입니다. 해는 밤 아홉 시에서 열한 시, 겨울로 들어서는 큰물입니다. 한 해의 마지막 글자이자 다음 순환의 씨앗을 품은 자리라, 돼지띠의 기질은 넉넉함과 순수함으로 설명됩니다. 계산 없이 사람을 대하고, 있는 것을 잘 나누며, 복잡하게 얽힌 자리에서도 본질만 보고 결정합니다. 함께 있으면 편하다는 말을 자주 듣고, 그 편안함이 사람을 오래 머물게 합니다. 약점은 그 넉넉함이 무방비가 될 때입니다. 상대를 쉽게 믿었다가 손해를 보고, 좋은 게 좋다는 태도로 갈등을 덮다가 문제를 키우며, 한번 참았던 것이 임계점을 넘으면 감정이 크게 흔들립니다. 해수(亥水)는 깊고 큰물이라 방향이 정해지면 힘이 큽니다. 돼지띠에게는 사람을 덜 믿는 연습보다, 돈과 약속만큼은 문서로 확인해 두는 습관 하나가 훨씬 실질적인 방어가 됩니다.",
}

# ── 총운 문단 (rel5 × 밴드 = 15개, 각 180~240자) ───────────────────────────
PARA5 = [
[  # 0 비겁 — 같은 기운
"오늘의 하늘 글자가 {띠}띠와 같은 오행으로 겹칩니다. 같은 편이 늘어나는 자리이면서 같은 몫을 노리는 사람도 늘어나는 자리라, 점수가 낮게 잡힌 날에는 뒤엣것이 먼저 만져집니다. 내 자리가 좁아지는 기분에 조바심이 나고 지갑도 평소보다 헐거워지기 쉽습니다. 오늘은 새 판을 벌이는 대신 이미 벌여 둔 일 하나를 접는 쪽이 낫습니다. 견줄 상대는 옆자리가 아니라 어제의 나로 두세요.",
"{띠}띠에게 오늘은 나와 같은 기운이 하루 종일 곁에 서 있는 날입니다. 밀어주는 힘도 내 것이고 버티는 힘도 내 것이라, 남의 속도에 맞추려 들지만 않으면 무리 없이 흘러갑니다. 함께 일하는 사람과 역할이 겹칠 수 있으니 누가 무엇을 맡는지만 아침에 한 번 정리해 두면 마찰이 줄어듭니다. 크게 얻지도 크게 잃지도 않는 하루, 대신 내 속도를 지키기에는 더없이 좋은 날입니다.",
"{띠}띠에게 오늘은 같은 기운이 그대로 힘으로 붙는 날입니다. 미뤄 두었던 일을 꺼내도 지치지 않고, 먼저 말을 꺼내도 어색하지 않으며, 앞줄에 서겠다고 손을 들어도 무리가 없습니다. 혼자 하는 일이면 추진력이, 여럿이 하는 일이면 사람을 모으는 힘이 붙습니다. 다만 기세가 좋을수록 지출도 함께 커지니, 오늘 결정한 소비는 내일 아침에 한 번 더 확인해 보세요.",
],
[  # 1 식상 — 내가 내는
"오늘의 기운은 {띠}띠가 밖으로 내보내는 자리에 놓입니다. 말과 표현이 앞서기 쉬운 배치인데 점수가 낮게 잡힌 날에는 그 앞섬이 말실수나 헛품으로 새기 쉽습니다. 하고 싶은 이야기가 많아도 절반은 내일로 미뤄 두고, 보내기 전에 한 번 더 읽는 습관을 오늘만큼은 지키세요. 새로 시작하는 것보다 끝맺지 못한 것을 손보는 쪽이 남는 하루입니다.",
"{띠}띠에게 오늘은 안에 있던 것이 밖으로 나오는 날입니다. 아이디어든 솜씨든 식욕이든, 어제까지 잠겨 있던 것이 조금씩 형태를 갖춥니다. 크게 터지지는 않아도 손끝에서 무언가 나오는 감각이 있어 작업이 즐겁습니다. 사람들에게 보여 줄 것이 생기는 날이니 완성도를 재느라 붙들고 있기보다 절반쯤에서 한 번 꺼내 보이는 편이 이득입니다. 저녁 한 끼는 정성껏 고르세요.",
"{띠}띠에게 오늘은 내보내는 기운이 그대로 결과가 되는 날입니다. 말은 잘 통하고 만든 것은 반응이 오며, 오래 붙들고 있던 표현이 마침내 정확한 문장을 찾습니다. 발표와 기획, 창작처럼 밖으로 꺼내는 일에 좋고 처음 만나는 사람 앞에서도 긴장이 덜합니다. 먹을 복도 함께 오는 배치라 오늘의 약속은 잡아 두어도 좋습니다. 다만 신이 나서 약속을 겹쳐 잡지는 마세요.",
],
[  # 2 재 — 내가 다루는
"오늘의 기운은 {띠}띠가 다루고 거두는 자리에 놓입니다. 돈과 사람이 함께 움직이는 배치인데 점수가 낮은 날에는 그 움직임이 나가는 쪽으로 기웁니다. 눈에 들어오는 물건이 많고 이유도 그럴듯해서 장바구니가 쉽게 찹니다. 오늘 담은 것은 하루 재워 두고 내일 결제하세요. 빌려주는 돈처럼 관계가 걸린 지출일수록 한 번 더 생각하는 편이 뒤끝이 없습니다.",
"{띠}띠에게 오늘은 손에 쥐고 굴리는 것들이 정리되는 날입니다. 큰돈이 들어오지는 않아도 흩어져 있던 씀씀이가 눈에 보이고, 미뤄 두었던 정산이나 연락이 자연스럽게 처리됩니다. 사람을 만나는 일에도 나쁘지 않아 오랜만의 연락 한 통이 뜻밖의 정보로 이어질 수 있습니다. 욕심을 키우기보다 이미 가진 것의 상태를 확인하기에 어울리는 하루입니다.",
"{띠}띠에게 오늘은 다루는 힘이 커지는 날입니다. 사람과 돈이 같은 방향으로 움직여서, 만나자는 연락이 곧 일이 되고 벌여 둔 일이 숫자로 돌아옵니다. 협상이나 견적처럼 값을 정하는 자리에서 특히 유리하고, 오래 미뤄 둔 청구와 정산도 오늘 꺼내면 잘 풀립니다. 기회가 여러 갈래로 들어오는 날이라 다 잡으려 하기보다 두 개만 골라 붙드는 쪽이 남습니다.",
],
[  # 3 관 — 나를 누르는
"오늘의 기운은 {띠}띠를 위에서 누르는 자리에 놓입니다. 해야 할 일과 지켜야 할 시간이 평소보다 무겁게 느껴지고, 누군가의 한마디가 오래 남습니다. 점수가 낮게 잡힌 날이니 오늘은 잘하려 애쓰기보다 빠뜨리지 않는 것을 목표로 삼으세요. 규칙과 서류, 시간 약속처럼 어기면 표가 나는 것부터 챙기고 나머지는 내일로 넘겨도 됩니다.",
"{띠}띠에게 오늘은 적당한 긴장이 하루를 붙들어 주는 날입니다. 마감이나 윗사람, 규칙처럼 나를 누르는 것들이 있지만 그 무게 덕분에 오히려 집중이 됩니다. 어려운 연락이나 미뤄 둔 결재가 있다면 오늘 처리하는 편이 낫습니다. 맡은 자리를 정확히 지키는 것만으로 신뢰가 쌓이는 배치이니, 새로 벌이기보다 맡은 것을 흠 없이 끝내는 데 하루를 쓰세요.",
"{띠}띠에게 오늘은 누르는 힘이 그대로 무게가 되는 날입니다. 책임이 오히려 자리를 만들어 주어서, 결정을 미루지 않고 내리면 그 결정이 곧 인정으로 돌아옵니다. 면접이나 심사, 발표처럼 평가받는 자리에 특히 좋고 윗사람과의 대화도 매끄럽습니다. 오래 끌던 문제에 선을 긋기에 알맞은 날이니, 오늘 결단한 것은 오늘 안에 통보까지 마치는 편이 깔끔합니다.",
],
[  # 4 인 — 나를 돕는
"오늘의 기운은 {띠}띠를 뒤에서 받쳐 주는 자리에 놓입니다. 본래 배우고 쉬기에 좋은 배치인데 점수가 낮게 잡힌 날에는 그 안온함이 늘어짐으로 기웁니다. 자료만 모으다 하루가 가고 준비만 하다 시작을 못 합니다. 오늘은 읽는 시간과 하는 시간을 반씩 나누고 세 줄이라도 손으로 옮겨 적어 보세요. 몸이 무거우면 일찍 자는 것도 오늘의 할 일입니다.",
"{띠}띠에게 오늘은 뒤를 받쳐 주는 손이 있는 날입니다. 크게 나서지 않아도 필요한 것이 제때 도착하고, 물어볼 사람이 있으며, 서류나 자료가 순순히 정리됩니다. 배우고 익히는 일에 어울리는 하루라 미뤄 두었던 공부나 정리를 꺼내기에 좋습니다. 새로 시작하는 힘보다 다지는 힘이 강한 날이니 오늘은 기초를 손보는 데 시간을 쓰면 아깝지 않습니다.",
"{띠}띠에게 오늘은 도움이 안쪽에서부터 차오르는 날입니다. 머리가 맑아 오래 막혀 있던 문제의 실마리가 보이고, 사람에게서도 문서에서도 필요한 것이 알아서 옵니다. 계약이나 자격, 시험처럼 서류가 걸린 일에 특히 좋고 어른이나 선배의 한마디가 결정적으로 도움이 됩니다. 든든한 뒷배가 서는 날이니 미뤄 둔 부탁 한 가지를 오늘 꺼내 보세요.",
],
]

HL5 = [
["내 몫부터 지키는 날", "내 속도로 걸으면 되는 날", "앞줄에 서도 되는 날"],
["말보다 손을 먼저 쓰는 날", "손끝에서 무언가 나오는 날", "꺼내 놓으면 통하는 날"],
["장바구니를 하루 재우는 날", "가진 것을 확인하는 날", "사람과 돈이 같이 움직이는 날"],
["빠뜨리지 않는 것이 목표인 날", "긴장이 집중으로 바뀌는 날", "결단이 그대로 인정이 되는 날"],
["읽기 반 하기 반의 날", "뒤를 받쳐 주는 손이 있는 날", "막힌 곳의 실마리가 보이는 날"],
]

REL5_NM = ["비겁", "식상", "재성", "관성", "인성"]
REL5_SUB = ["같은 기운이 겹치는 날", "내가 내보내는 기운의 날",
            "내가 다루는 기운의 날", "나를 누르는 기운의 날", "나를 돕는 기운의 날"]

# ── 지지관계 한마디 7개 (평·육합·삼합·충·형·파·해) ─────────────────────────
ZJR_TX = [
"오늘의 지지와 {띠}띠의 글자 사이에는 당기는 힘도 밀어내는 힘도 없습니다. 사건이 하루를 흔들지 않으니 하늘 글자의 성격이 그대로 드러나는 날입니다.",
"오늘의 지지와 {띠}띠의 글자가 육합(六合)으로 맞물립니다. 말을 꺼내기 전에 이미 반쯤 통해 있는 느낌이라 부탁과 화해가 잘 되는 배치입니다.",
"오늘의 지지와 {띠}띠의 글자가 삼합(三合)의 한 조입니다. 혼자보다 여럿일 때 판이 커지니 오늘은 사람을 부르는 쪽으로 움직여 보세요.",
"오늘의 지지가 {띠}띠의 글자와 정면으로 마주 서는 충(沖)입니다. 자리와 일정이 바뀌기 쉬우니 약속은 앞뒤로 여유를 두고 잡으세요.",
"오늘의 지지와 {띠}띠의 글자가 형(刑)으로 걸립니다. 말과 서류에서 마찰이 붙기 쉬운 배치라 보내기 전 확인 한 번이 오늘 하루를 지켜 줍니다.",
"오늘의 지지와 {띠}띠의 글자가 파(破)의 짝입니다. 잘 가던 계획이 중간에서 한 번 어긋나기 쉬우니 예비안을 미리 하나 세워 두세요.",
"오늘의 지지와 {띠}띠의 글자가 해(害)로 엮입니다. 먼 사람보다 가까운 사람에게 서운함이 생기기 쉬운 날이니 오늘 것은 오늘 풀고 넘기세요.",
]
JR_NM = ["평", "육합", "삼합", "충", "형", "파", "해"]
JR_H = ["平", "六合", "三合", "沖", "刑", "破", "害"]
JR_TAG = [["보통", "n"], ["좋음", "g"], ["좋음", "g"], ["변동", "w"], ["조심", "w"], ["주의", "w"], ["주의", "w"]]

# ── 세부 4항목 한 줄 문안 (4 × 3밴드) ──────────────────────────────────────
SUB_TX = [
["나가는 쪽으로 기웁니다. 오늘의 결제는 하루 재워 두세요.",
 "크게 들고 나지 않습니다. 씀씀이만 눈으로 확인해 두세요.",
 "들어오는 쪽으로 기웁니다. 값을 정하는 자리에 유리합니다."],
["말수를 줄이는 편이 안전한 날입니다.",
 "무난합니다. 먼저 안부를 물어 보세요.",
 "마음이 잘 닿습니다. 미뤄 둔 말을 꺼내기 좋습니다."],
["새로 벌이지 말고 남은 것을 접으세요.",
 "맡은 만큼은 무리 없이 굴러갑니다.",
 "진도가 잘 나갑니다. 어려운 것부터 손대세요."],
["잠이 보약입니다. 오늘은 일찍 누우세요.",
 "무리만 안 하면 괜찮은 컨디션입니다.",
 "몸이 가볍습니다. 미뤄 둔 운동을 시작하기 좋습니다."],
]
SUB_LBL = ["💰 재물", "💞 애정", "📚 일·공부", "🌿 건강"]
BAND_NM = ["🌫️ 몸을 낮추는 날", "🌤️ 평탄하게 가는 날", "🌟 밀어붙여도 되는 날"]

# ── 행운 요소 (오늘 천간 오행 기준, 새로 정의) ─────────────────────────────
LUCKY5 = [
 dict(el="목", elh="木", color="연둣빛 초록", nums=[3, 8], dir="동쪽", item="나무 소재 소품"),
 dict(el="화", elh="火", color="선홍·주황", nums=[2, 7], dir="남쪽", item="따뜻한 조명"),
 dict(el="토", elh="土", color="황토·크림", nums=[5, 10], dir="지금 있는 자리", item="도자기 잔"),
 dict(el="금", elh="金", color="은백·회백", nums=[4, 9], dir="서쪽", item="금속 액세서리"),
 dict(el="수", elh="水", color="감청·먹빛", nums=[1, 6], dir="북쪽", item="유리병에 담은 물"),
]

# ── 점수 저울 ──────────────────────────────────────────────────────────────
BASE5 = [58, 61, 60, 53, 64]
SUB5 = [[56, 56, 62, 64], [60, 64, 60, 68], [70, 62, 60, 58], [54, 58, 66, 52], [58, 62, 66, 68]]
SUB_W = [1.0, 1.3, 0.9, 1.1]
JMOD = [0, 10, 12, -12, -9, -7, -5]

# ── fold 본문 3개 (원문 창작, 합계 2,500자 이상) ───────────────────────────
FOLD = [
("띠별 운세를 읽는 법 — 무엇을 보고 무엇을 보지 않는가", """
<p>이 페이지가 오늘 하는 계산은 단 두 가지입니다. 하나는 <strong>오늘 날짜의 천간</strong>이 이 띠의 지지와 오행으로 어떤 사이인지, 다른 하나는 <strong>오늘 날짜의 지지</strong>가 이 띠의 지지와 짝짓기 표에서 어떤 사이인지입니다. 앞의 것이 하루의 성격을 정하고 뒤의 것이 하루의 사건을 정합니다. 점수 큰 숫자와 총운 문단은 앞의 것에서, 지지 한마디와 점수의 가감은 뒤의 것에서 나옵니다.</p>
<p>오행 관계는 다섯 가지로 갈립니다. 오늘의 기운이 내 띠와 같은 오행이면 <strong>비겁</strong>, 내가 낳아 주는 오행이면 <strong>식상</strong>, 내가 눌러 다루는 오행이면 <strong>재성</strong>, 나를 누르는 오행이면 <strong>관성</strong>, 나를 낳아 주는 오행이면 <strong>인성</strong>입니다. 명리에서는 여기에 음양을 더해 열 가지로 나누지만, 띠는 지지 한 글자뿐이라 이 페이지는 다섯 가지까지만 갈랐습니다. 열 가지로 나누려면 태어난 날의 천간, 즉 일간이 있어야 하는데 띠에는 그 글자가 없기 때문입니다.</p>
<p>지지 관계는 일곱 가지입니다. 서로 끌어당기는 육합, 셋이 모여 흐름을 만드는 삼합, 정면으로 부딪히는 충, 마찰을 뜻하는 형, 깨뜨리는 파, 해를 끼치는 해, 그리고 어느 표에도 들지 않는 평입니다. 두 글자가 여러 표에 동시에 걸리는 경우가 있는데, 이 페이지는 충 › 삼합 › 육합 › 형 › 파 › 해 › 평의 순서로 하나만 고릅니다. 합이 있어도 충이 있으면 합이 풀린다고 보는 전통적인 읽기를 그대로 따랐습니다.</p>
<p>그래서 이 페이지를 읽을 때는 점수 한 숫자만 보지 말고 <strong>어떤 관계에서 나온 점수인지</strong>를 함께 보는 편이 쓸모가 있습니다. 같은 60점이라도 관성에 삼합이 붙어 올라온 60점과 인성에 충이 붙어 내려온 60점은 하루를 쓰는 방법이 다릅니다. 앞쪽은 긴장되는 일정을 여럿이 함께 처리하기에 좋은 날이고, 뒤쪽은 도움이 오기는 하는데 일정이 흔들리는 날입니다. 총운 문단과 지지 한마디를 나란히 읽으면 그 차이가 보입니다.</p>
<p>점수를 만드는 순서도 그대로 적어 둡니다. 먼저 오행 관계마다 정해 둔 기본 점수를 놓습니다. 비겁 58, 식상 61, 재성 60, 관성 53, 인성 64입니다. 하루라는 짧은 단위에서는 나를 받쳐 주는 기운을 후하게, 나를 누르는 기운을 박하게 치는 저울입니다. 여기에 지지 관계 가감을 더합니다. 삼합이면 +12, 육합이면 +10, 평이면 0, 해면 -5, 파면 -7, 형이면 -9, 충이면 -12입니다. 마지막으로 오늘 날짜 문자열과 띠 번호를 붙여 고정된 해시 함수에 넣고 그 값에서 -6에서 +6 사이의 편차를 뽑아 얹은 뒤, 1 미만은 1로 99 초과는 99로 자릅니다.</p>
<p>재물·애정·일·건강 네 항목은 같은 재료를 다른 저울로 잽니다. 오행 관계마다 네 항목의 기본 점수가 따로 있고, 지지 관계 가감에는 항목별 가중치(재물 1.0, 애정 1.3, 일 0.9, 건강 1.1)를 곱해 더합니다. 애정에 지지 가중치가 가장 큰 것은 합과 충이 전통적으로 사람 사이의 일로 읽히기 때문입니다. 편차는 총운과 같은 해시값의 서로 다른 비트에서 -5에서 +5 사이로 뽑아 항목마다 따로 얹습니다. 그래서 총운이 낮은 날에도 어떤 항목 하나는 높게 나올 수 있고, 그 항목이 오늘 무엇을 하면 좋은지를 알려 주는 단서가 됩니다.</p>
<p>행운의 색과 방향은 <strong>오늘 천간의 오행</strong>에서 나옵니다. 목의 날은 초록과 동쪽, 화의 날은 붉은색과 남쪽, 토의 날은 황토색과 지금 있는 자리, 금의 날은 은백색과 서쪽, 수의 날은 짙은 남색과 북쪽입니다. 색과 방향은 그날 열두 띠가 모두 같고, 숫자만 오행에 배정된 두 수 가운데 띠와 날짜에서 만든 해시로 하나를 골라 띠마다 갈립니다. 열두 띠 점수표에서 색과 방향이 모두 같게 보이는 것은 그래서입니다.</p>
"""),
("띠는 1월 1일이 아니라 입춘에 바뀝니다", """
<p>띠를 정하는 기준은 양력 1월 1일도, 음력 설날도 아닌 <strong>입춘(立春)</strong>입니다. 사주에서 한 해의 시작은 스물네 절기 가운데 첫 절기인 입춘이고, 해마다 2월 3일에서 5일 사이에 듭니다. 그래서 1월생과 2월 초순생은 흔히 알고 있는 띠보다 한 해 앞의 띠인 경우가 있습니다. 예를 들어 어느 해 1월 20일에 태어난 사람은 달력상 그 해의 띠를 말하지만, 사주로 보면 아직 지난해의 띠에 속합니다.</p>
<p>입춘은 날짜뿐 아니라 <strong>시각</strong>까지 정해져 있습니다. 같은 2월 4일이라도 절입 시각이 오후 다섯 시 이십 분이라면, 그날 새벽에 태어난 사람은 지난해 띠이고 저녁에 태어난 사람은 새해 띠입니다. 몇 시간 차이로 띠가 갈리는 것이 이상해 보일 수 있지만, 절기는 태양의 황경이 특정 각도에 이르는 순간으로 정의되므로 원래 분 단위까지 확정되는 값입니다. 띠는 그 순간을 경계로 바뀝니다.</p>
<p>음력 설날을 기준으로 잘못 알고 있는 경우도 흔합니다. 설날은 달의 주기로 정해지고 입춘은 태양의 위치로 정해지므로 둘은 해마다 어긋납니다. 설날이 입춘보다 앞서는 해도 있고 뒤서는 해도 있어서, 그 사이에 태어난 사람은 어느 기준을 쓰느냐에 따라 띠가 달라집니다. 이 페이지를 포함해 사주 계산을 하는 곳은 모두 입춘을 씁니다.</p>
<p>왜 하필 입춘일까요. 사주는 달의 삭망이 아니라 태양의 위치로 계절을 나누는 체계이기 때문입니다. 한 해는 입춘·경칩·청명처럼 열두 개의 절(節)로 나뉘고, 각 절이 드는 순간이 그대로 월주가 바뀌는 경계가 됩니다. 그 열두 절 가운데 첫 번째가 입춘이므로 연주도 여기서 바뀝니다. 띠는 연주의 아랫글자, 즉 연지(年支)를 동물로 옮긴 이름이니 결국 입춘을 따라갈 수밖에 없습니다. 새해 첫날에 띠 그림이 걸리는 것은 달력의 관습이고, 사주의 계산과는 다른 이야기입니다.</p>
<p>이 페이지가 매일 쓰는 일진에는 입춘이 관여하지 않는다는 점도 알아 둘 만합니다. 날의 간지는 절기와 무관하게 예순 날마다 한 칸씩 돌아가는 순환이라, 율리우스 적일을 60으로 나눈 나머지만으로 정확히 구해집니다. 입춘이 필요한 것은 <strong>당신의 띠를 정할 때</strong>뿐입니다. 그러니 2월 초에 태어난 분은 자기 띠만 한 번 정확히 확인해 두면, 그 뒤로는 이 페이지의 계산이 해마다 흔들릴 일이 없습니다.</p>
<p>아래 출생 연도 표는 양력 연도만 적어 둔 간단한 안내입니다. 1월생과 2월 1일~5일생이라면 표의 연도와 실제 띠가 다를 수 있으니, 절입 시각까지 따진 정확한 띠가 필요하면 <a href="/fortune/today/">생년월일을 넣는 오늘의 운세</a>나 <a href="/tools/manse/">만세력 도구</a>에서 확인해 보세요. 두 곳 모두 1900년부터의 절입 시각을 분 단위로 담은 표로 계산합니다.</p>
"""),
("이 산식의 한계 — 열두 칸으로 나눈 하루", """
<p>솔직하게 적어 둡니다. 띠별 운세는 대한민국 인구를 열두 줄로 세우는 일입니다. 한 줄에 사백만 명이 넘게 서고, 그 사백만 명이 오늘 모두 같은 점수와 같은 문단을 받습니다. 이 페이지가 매일 다른 값을 내놓기는 하지만 그것은 <strong>날짜가 바뀌기 때문</strong>이지 사람을 더 잘게 나누기 때문이 아닙니다. 같은 띠라면 스무 살도 예순 살도 오늘 같은 글을 읽습니다.</p>
<p>계산에 들어가지 않는 것도 많습니다. 태어난 달과 날, 태어난 시간은 하나도 쓰이지 않고, 명리에서 가장 중요하게 보는 <strong>일간(日干)</strong>, 즉 태어난 날의 천간도 띠에는 들어 있지 않습니다. 그래서 이 페이지는 오행 관계를 열 가지 십성이 아니라 다섯 가지까지만 나눕니다. 대운이나 세운의 흐름, 원국 안에서 어떤 오행이 부족한지 같은 것은 아예 다루지 않습니다.</p>
<p>점수를 만드는 저울도 전부 이 페이지가 정한 것입니다. 오행 관계마다 기본 점수를 다르게 준 것, 삼합에 +12를 주고 충에 -12를 준 것, 날짜와 띠에서 만든 해시값으로 ±6의 편차를 얹은 것 모두 하루라는 단위에서 그럴듯하게 느껴지도록 조정한 값입니다. 명리학에 오늘의 운세 점수 산식 같은 것은 없습니다. 무작위 함수를 쓰지 않아 같은 날 같은 띠는 언제 눌러도 같은 결과가 나오지만, 그 일관성이 정확성을 뜻하지는 않습니다.</p>
<p>그래도 이 페이지를 만들어 둔 이유는 두 가지입니다. 하나는 흔한 띠별 운세가 열두 개의 글을 돌려 쓰는 데 비해 여기는 <strong>오늘의 일진을 실제로 계산해</strong> 관계를 뽑는다는 것이고, 다른 하나는 그 산식을 숨기지 않고 전부 적어 두었다는 것입니다. 어떻게 나온 숫자인지 알면 그 숫자를 어디까지 믿을지도 스스로 정할 수 있습니다. 더 촘촘한 결과가 필요하면 <a href="/fortune/today/">생년월일로 보는 오늘의 운세</a>가 있습니다. 그쪽은 열두 칸이 아니라 60일주와 오늘 천간 열 가지가 곱해진 격자를 씁니다.</p>
<p>읽는 사람 쪽에서 조심할 것도 하나 적어 둡니다. 점수가 낮게 나온 날 중요한 일정을 미루거나, 높게 나온 날 평소 하지 않던 결정을 내리는 것은 이 페이지가 바라는 사용법이 아닙니다. 이 숫자는 오늘 무슨 일이 일어날지에 대한 예측이 아니라, 하루를 어떤 태도로 시작할지 고르는 작은 프레임에 가깝습니다. 총운 문단이 모두 '~하기 좋은 날입니다', '~해 보세요'로 끝나는 것도 그래서입니다. 관성의 날이라는 말은 오늘 혼난다는 뜻이 아니라 긴장되는 일정이 있다면 우선순위를 줄여 보라는 제안입니다.</p>
<p>마지막으로 <strong>같은 띠 안의 차이</strong>는 이 페이지가 다루지 못합니다. 같은 __NM__띠라도 태어난 달이 여름인지 겨울인지, 태어난 날의 천간이 무엇인지에 따라 오늘의 기운이 반갑게 느껴질 수도 부담스럽게 느껴질 수도 있습니다. 열두 칸짜리 표에서는 그 차이가 전부 지워집니다. 오늘의 점수가 유난히 어긋난다고 느껴진다면 그것은 산식이 틀려서라기보다 칸이 너무 커서일 가능성이 높습니다. 그럴 때는 생년월일을 넣는 쪽으로 한 칸 더 들어가 보시면 됩니다.</p>
"""),
]

# ── 검증 ───────────────────────────────────────────────────────────────────
def _plain(s):
    return re.sub(r"\s+", "", re.sub(r"<[^>]+>", "", s))

def validate():
    errs = []
    for r in range(5):
        for b in range(3):
            n = len(PARA5[r][b].replace(" ", ""))
            n2 = len(PARA5[r][b])
            if not (180 <= n2 <= 240):
                errs.append("PARA5[%d][%d] len=%d (공백제외 %d)" % (r, b, n2, n))
    for k, v in INTRO.items():
        if len(v) < 300:
            errs.append("INTRO[%s] len=%d" % (k, len(v)))
    tot = sum(len(_plain(b)) for _, b in FOLD)
    if tot < 2500:
        errs.append("FOLD 총 %d자 (2500 미만)" % tot)
    return errs, tot

# ── 만세력 (일주) — 파이썬 측 검산용 ───────────────────────────────────────
def jdn2(y, m, d):
    if m <= 2:
        y -= 1; m += 12
    a = y // 100
    b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524

def day_pillar_idx(y, m, d):
    return ((jdn2(y, m, d) + 49) % 60 + 60) % 60

# ── 출생 연도 표 (1936~2032) ───────────────────────────────────────────────
def year_grid(zi):
    cells = []
    for y in range(1936, 2033):
        if ((y - 4) % 12 + 12) % 12 == zi:
            idx = ((y - 4) % 60 + 60) % 60
            cells.append('<span class="yc"><b>%d</b><small>%s%s년</small></span>'
                         % (y, GAN[idx % 10], JI[idx % 12]))
    return "".join(cells)

# ── 템플릿 ─────────────────────────────────────────────────────────────────
def js_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'

def js_arr(a):
    return "[" + ",".join(a) + "]"

def js_corpus():
    P = js_arr([js_arr([js_str(x) for x in row]) for row in PARA5])
    H = js_arr([js_arr([js_str(x) for x in row]) for row in HL5])
    J = js_arr([js_str(x) for x in ZJR_TX])
    S = js_arr([js_arr([js_str(x) for x in row]) for row in SUB_TX])
    L = js_arr(['{el:%s,elh:%s,color:%s,nums:[%d,%d],dir:%s,item:%s}'
                % (js_str(x["el"]), js_str(x["elh"]), js_str(x["color"]),
                   x["nums"][0], x["nums"][1], js_str(x["dir"]), js_str(x["item"]))
                for x in LUCKY5])
    return P, H, J, S, L

TPL = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__NM__띠 오늘의 운세 — 매일 바뀌는 띠별 운세 | 까치테스트</title>
<meta name="description" content="__NM__띠 오늘의 운세. 오늘 날짜의 일진(日辰)을 만세력으로 뽑아 __NM__띠의 지지 __JI__(__JIH__)와 오행 관계·지지 관계를 계산해 총운 점수(1~99)와 재물·애정·일·건강, 행운의 색·숫자·방향까지 보여 줍니다. 열두 개 글을 돌려 쓰지 않고 매일 새로 계산하며 산식을 전부 공개합니다.">
<link rel="canonical" href="https://www.kmagpie.com/fortune/today/zodiac/__SLUG__/">
<link rel="prev" href="https://www.kmagpie.com/fortune/today/zodiac/__PREV__/">
<link rel="next" href="https://www.kmagpie.com/fortune/today/zodiac/__NEXT__/">
<link rel="up" href="https://www.kmagpie.com/fortune/today/">
__RELLINKS__
<meta property="og:title" content="__NM__띠 오늘의 운세 — 매일 바뀌는 띠별 운세">
<meta property="og:description" content="오늘의 일진과 __NM__띠의 지지 __JI__(__JIH__)를 견주어 계산한 오늘의 총운. 점수·총운 문단·재물·애정·일·건강·행운 요소까지, 매일 새로 계산합니다.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.kmagpie.com/fortune/today/zodiac/__SLUG__/">
<meta property="og:image" content="https://www.kmagpie.com/fortune/today/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="까치테스트">
<style>
  :root{
    --bg:#0b1020; --surface:#121a33; --line:#27335c; --line-soft:#1b2544;
    --ink:#eef1fb; --ink-2:#bcc6e6; --ink-3:#8793b8;
    --accent:#f2c75c; --accent-soft:#2c2410;
    --cool:#8fb3ff; --cool-soft:#14213f;
    --btn-ink:#1d1604;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR","Malgun Gothic",sans-serif;
    line-height:1.7;font-size:16px;-webkit-font-smoothing:antialiased;overflow-x:hidden;
    background-image:
      radial-gradient(1.5px 1.5px at 12% 10%, rgba(242,199,92,.28) 50%, transparent 51%),
      radial-gradient(1px 1px at 70% 7%,  rgba(238,241,251,.16) 50%, transparent 51%),
      radial-gradient(2px 2px at 44% 28%, rgba(242,199,92,.18) 50%, transparent 51%),
      radial-gradient(1px 1px at 28% 56%, rgba(238,241,251,.12) 50%, transparent 51%),
      radial-gradient(2px 2px at 88% 40%, rgba(143,179,255,.22) 50%, transparent 51%),
      radial-gradient(1px 1px at 8% 82%,  rgba(242,199,92,.14) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 62% 74%, rgba(143,179,255,.18) 50%, transparent 51%)}
  .wrap{max-width:680px;margin:0 auto;padding:44px 22px 90px}
  .crumb{font-size:13px;color:var(--ink-3);margin:0 0 18px;word-break:keep-all}
  .crumb a{color:var(--ink-3);text-decoration:none}
  .crumb a:hover{color:var(--accent)}
  h1{font-size:27px;line-height:1.35;margin:0 0 10px;letter-spacing:-.02em;font-weight:800;word-break:keep-all}
  h1 .jd{color:var(--accent)}
  .sub{color:var(--ink-2);margin:0 0 22px;font-size:15.5px;word-break:keep-all}
  h2{font-size:19px;margin:44px 0 10px;letter-spacing:-.015em;font-weight:700;word-break:keep-all}
  p{margin:0 0 14px;word-break:keep-all}
  a{color:var(--accent)}

  .today{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:13.5px;color:var(--ink-2);
    border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:0 0 16px;background:var(--surface)}
  .today b{color:var(--accent)}
  .today .el{display:inline-block;padding:1px 9px;border-radius:99px;background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:12.5px}

  .result{background:var(--surface);border:1px solid var(--accent);border-radius:18px;
    padding:28px 24px;margin:20px 0;text-align:center}
  .rk{font-size:13px;font-weight:700;letter-spacing:.12em;color:var(--ink-3);margin:0 0 6px}
  .rdate{font-size:14.5px;color:var(--ink-2);margin:0 0 14px}
  .headline{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.35;margin:0 0 6px;word-break:keep-all}
  .ssTag{display:inline-block;padding:4px 14px;border-radius:99px;background:var(--accent-soft);color:var(--accent);
    font-size:13.5px;font-weight:700;margin:0 0 18px}
  .scoreCap{font-size:13.5px;color:var(--ink-3);margin:0}
  .scoreNum{font-size:clamp(56px,17vw,86px);font-weight:800;letter-spacing:-.04em;line-height:1.05;
    color:var(--accent);font-variant-numeric:tabular-nums}
  .scoreNum small{font-size:.38em;font-weight:700;color:var(--ink-2)}
  .bandLine{font-size:15px;font-weight:800;margin:4px 0 18px}
  .desc{text-align:left;font-size:15px;color:var(--ink-2);margin:0 0 14px;word-break:keep-all}
  .jiLine{text-align:left;margin:0 0 16px;padding:12px 15px;border-left:3px solid var(--cool);
    background:var(--cool-soft);border-radius:0 10px 10px 0;font-size:14.5px;word-break:keep-all}
  .jiLine b{color:var(--cool)}
  .bars{display:grid;grid-template-columns:1fr;gap:11px;text-align:left;margin:0 0 6px}
  .bar{display:grid;grid-template-columns:78px 1fr 34px;gap:10px;align-items:center;font-size:14px}
  .bar .bl{white-space:nowrap;color:var(--ink-2);font-weight:700}
  .bar .bt{height:10px;border-radius:99px;background:var(--line-soft);overflow:hidden}
  .bar .bf{height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--cool),var(--accent));transition:width .9s cubic-bezier(.2,.7,.2,1)}
  .bar .bn{text-align:right;font-variant-numeric:tabular-nums;font-weight:800;color:var(--ink)}
  .bar .bx{grid-column:2/4;font-size:12.5px;color:var(--ink-3);margin-top:-6px;word-break:keep-all}
  .lucky{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0 0}
  .lk{border:1px solid var(--line);border-radius:11px;padding:10px 6px;font-size:13px}
  .lk .k{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--ink-3);margin-bottom:2px}
  .lk b{font-size:15px;color:var(--accent)}
  .btns{display:flex;gap:9px;flex-wrap:wrap;margin:22px 0 0}
  .btns button{flex:1;min-width:140px;padding:13px 8px;border-radius:11px;font-size:14.5px;font-weight:700;
    font-family:inherit;cursor:pointer;transition:.15s;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
  .btns button:hover{border-color:var(--accent);color:var(--accent)}
  .copied{font-size:13px;color:var(--accent);margin:8px 0 0;min-height:20px}

  .funnel{background:linear-gradient(135deg,#1a2247,#0d1330);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin:26px 0 14px}
  .funnel h2{margin:0 0 8px;font-size:17px}
  .funnel p{font-size:14.5px;color:var(--ink-2);margin:0 0 12px}
  .funnel .cta{display:inline-block;padding:12px 18px;border-radius:10px;background:var(--accent);color:var(--btn-ink);
    font-weight:800;text-decoration:none;font-size:15px}
  .funnel .cta2{display:inline-block;padding:12px 16px;border-radius:10px;border:1px solid var(--line);color:var(--ink);
    font-weight:700;text-decoration:none;font-size:14.5px;margin-left:6px}

  .zbox{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin:22px 0}
  .zbox h2{margin:0 0 4px;font-size:18px}
  .zbox .zc{font-size:13.5px;color:var(--ink-3);margin:0 0 14px;word-break:keep-all}
  .zmini{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .zm{display:flex;align-items:center;gap:8px;border:1px solid var(--line-soft);border-radius:11px;
    padding:9px 11px;text-decoration:none;color:var(--ink);font-size:14px;transition:.15s}
  .zm:hover{border-color:var(--accent)}
  .zm.cur{border-color:var(--accent);background:var(--accent-soft)}
  .zm .zme{font-size:17px;flex:none}
  .zm .zmn{flex:1;font-weight:700;white-space:nowrap}
  .zm .zms{font-variant-numeric:tabular-nums;font-weight:800;color:var(--accent);flex:none}
  .zm .zmt{font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;flex:none}
  .zmt.g{background:var(--accent-soft);color:var(--accent)}
  .zmt.n{background:var(--line-soft);color:var(--ink-2)}
  .zmt.w{background:var(--cool-soft);color:var(--cool)}

  .ygrid{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 0}
  .yc{border:1px solid var(--line-soft);border-radius:9px;padding:6px 10px;font-size:13px;text-align:center;min-width:76px}
  .yc b{display:block;font-size:14.5px;font-variant-numeric:tabular-nums}
  .yc small{color:var(--ink-3);font-size:11.5px}

  .gist{font-size:15px;color:var(--ink-2);border-left:3px solid var(--accent);
    padding:2px 0 2px 14px;margin:30px 0 18px;line-height:1.75;word-break:keep-all}
  details.fold{border:1px solid var(--line);border-radius:13px;background:var(--surface);margin:12px 0;overflow:hidden}
  .fold summary{cursor:pointer;list-style:none;display:flex;align-items:center;
    justify-content:space-between;gap:12px;padding:15px 19px;user-select:none}
  .fold summary::-webkit-details-marker{display:none}
  .fold summary h2{margin:0;font-size:16.5px;letter-spacing:-.015em}
  .fold summary::after{content:"+";font-size:20px;color:var(--ink-3);font-weight:400;flex:none;transition:transform .15s}
  .fold[open] summary::after{transform:rotate(45deg)}
  .fold summary:hover h2{color:var(--accent)}
  .fold .fx{padding:0 19px 10px}
  .fold .fx>:first-child{margin-top:4px}
  .fold .fx p{font-size:14.5px;color:var(--ink-2)}
  .fold .fx p strong{color:var(--ink)}

  .basis{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin:14px 0}
  .basis h2{margin:0 0 8px;font-size:17px}
  .basis p{font-size:14.5px;color:var(--ink-2);margin:0 0 8px}
  .tcards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 0}
  .tc{display:block;border:1px solid var(--line-soft);border-radius:11px;padding:10px 12px;
    text-decoration:none;color:var(--ink);font-size:13.5px;word-break:keep-all;transition:.15s}
  .tc:hover{border-color:var(--accent)}
  .tc b{display:block;font-size:14px}
  .tc span{color:var(--ink-3);font-size:12.5px}

  footer{margin-top:56px;padding-top:22px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-3)}
  footer a{color:var(--ink-3)}

  @media (max-width:560px){
    .wrap{padding:32px 16px 70px}
    h1{font-size:22px}
    .result{padding:22px 15px}
    .headline{font-size:20px}
    .zmini,.tcards{grid-template-columns:1fr}
    .fold summary{padding:14px 15px}
    .fold summary h2{font-size:15.5px}
    .fold .fx{padding:0 15px 10px}
    .funnel .cta2{margin:8px 0 0}
    .lucky{grid-template-columns:1fr}
  }
</style>
</head>
<body>
<div class="wrap">

<p class="crumb"><a href="/">K-magpie</a> &rsaquo; <a href="/tests/">까치테스트</a> &rsaquo; <a href="/fortune/today/">오늘의 운세</a> &rsaquo; __NM__띠</p>

<h1>__EMO__ __NM__띠 오늘의 운세 — <span class="jd" id="h1date">오늘</span></h1>
<p class="sub">열두 개의 글을 돌려 쓰지 않습니다. 이 페이지는 접속한 날의 <strong>일진(日辰)</strong>을 만세력으로 직접 뽑아, 오늘의 천간 오행과 __NM__띠의 지지 <strong>__JI__(__JIH__)</strong> 사이의 오행 관계(비겁·식상·재성·관성·인성)와 오늘의 지지와의 관계(육합·삼합·충·형·파·해·평)를 계산해 총운 점수와 문단을 만듭니다. 날짜가 바뀌면 결과도 바뀌고, 무작위 함수는 쓰지 않아 같은 날에는 언제 눌러도 같은 결과가 나옵니다. 물론 재미로 보는 콘텐츠입니다.</p>

<div class="today" id="todayStrip"></div>

<div class="result" id="res">
  <p class="rk">__NM__띠 · TODAY</p>
  <p class="rdate" id="rDate"></p>
  <p class="headline" id="rHead">…</p>
  <span class="ssTag" id="rSS"></span>
  <div>
    <p class="scoreCap">오늘의 총운</p>
    <div class="scoreNum"><span id="rScore">0</span><small>점</small></div>
    <p class="bandLine" id="rBand"></p>
  </div>
  <p class="desc" id="rDesc"></p>
  <p class="jiLine" id="rJi"></p>
  <div class="bars" id="rBars"></div>
  <div class="lucky">
    <div class="lk"><span class="k">행운의 색</span><b id="lkColor"></b></div>
    <div class="lk"><span class="k">행운의 숫자</span><b id="lkNum"></b></div>
    <div class="lk"><span class="k">행운의 방향</span><b id="lkDir"></b></div>
  </div>
  <div class="btns">
    <button type="button" id="copyBtn">🔗 이 페이지 링크 복사</button>
  </div>
  <p class="copied" id="copied"></p>
</div>

<div class="funnel">
  <h2>🌙 띠는 열두 칸, 일주는 예순 칸</h2>
  <p>이 페이지가 __NM__띠 전체에게 같은 글을 주는 동안, <strong>생년월일로 보는 오늘의 운세</strong>는 태어난 날의 일주 60가지와 오늘 천간 10가지를 곱한 600가지 자리에서 당신 한 사람의 칸을 찾습니다. 같은 __NM__띠라도 태어난 날이 다르면 오늘 점수가 달라집니다.</p>
  <a class="cta" href="/fortune/today/">생년월일로 정확히 보기 →</a><a class="cta2" href="/tools/manse/">만세력으로 내 여덟 글자 보기</a>
</div>

<div class="zbox">
  <h2 id="zTitle">오늘의 열두 띠 점수</h2>
  <p class="zc" id="zCap"></p>
  <div class="zmini" id="zMini"></div>
  <p class="zc" style="margin:12px 0 0">점수는 각 띠 페이지에서 계산하는 값과 같습니다. 띠를 눌러 그 띠의 총운 문단과 세부 점수를 볼 수 있습니다.</p>
</div>

<div class="zbox">
  <h2>__NM__띠 출생 연도</h2>
  <p class="zc">1936년부터 2032년까지 __NM__띠에 해당하는 해입니다. 띠는 양력 1월 1일이 아니라 <strong>입춘</strong>(해마다 2월 3~5일)에 바뀌므로, 1월생과 2월 초순생은 표의 연도와 실제 띠가 다를 수 있습니다.</p>
  <div class="ygrid">__YEARGRID__</div>
</div>

<h2>__EMO__ __NM__띠는 어떤 기질인가</h2>
<p class="gist">__INTRO__</p>

__FOLDS__

<div class="basis">
  <h2>같은 하루, 다른 세계 — 까치테스트</h2>
  <p>오늘의 운세와 같은 만세력 엔진으로 돌아가는 재미 테스트입니다. 세계관이 바뀌면 같은 글자가 다른 배역을 받습니다.</p>
  <div class="tcards">
    <a class="tc" href="/tests/guardian/"><b>🐉 수호신수 테스트</b><span>나를 지키는 신수는? N대째 수호 중</span></a>
    <a class="tc" href="/tests/pastlife/"><b>🔮 전생 테스트</b><span>나는 전생에 누구였을까</span></a>
    <a class="tc" href="/tests/name-match/"><b>💞 이름 궁합</b><span>두 이름의 오행으로 보는 궁합</span></a>
  </div>
</div>

<footer>
  <p>__NM__띠 오늘의 운세는 재미로 보는 콘텐츠입니다. 점수와 문단은 이 페이지가 정한 산식의 결과일 뿐이며 어떤 사실도 예측하거나 보장하지 않습니다.</p>
  <p>까치테스트 · 모든 계산은 브라우저 안에서 이루어지며 입력값도 개인정보도 수집하지 않습니다.</p>
  <p><a href="/">홈</a> · <a href="/fortune/today/">오늘의 운세</a> · <a href="/tests/">까치테스트</a> · <a href="/tools/">까치툴</a> · <a href="/disclaimer.html">면책조항</a> · <a href="/privacy-policy.html">개인정보처리방침</a></p>
</footer>

</div>

<script>
/*CORE:S*/
/* 만세력 일주 코어 — /fortune/today/ 와 동일 공식 */
var GAN="갑을병정무기경신임계", JI="자축인묘진사오미신유술해";
var GANH="甲乙丙丁戊己庚辛壬癸", JIH="子丑寅卯辰巳午未申酉戌亥";
function jdn2(y,m,d){ if(m<=2){y--;m+=12;} var a=Math.floor(y/100),b=2-a+Math.floor(a/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+b-1524; }
function dayPillarIdx(y,m,d){ var n=jdn2(y,m,d); return ((n+49)%60+60)%60; }
var ELG=[0,0,1,1,2,2,3,3,4,4];              /* 천간 오행 */
var ELJ=[4,2,0,0,2,1,1,2,3,3,2,4];          /* 지지 오행 */
function hash32(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
/*CORE:E*/

/* 지지 관계 — 0평 1육합 2삼합 3충 4형 5파 6해 (충›삼합›육합›형›파›해›평) */
var YUKHAP=[[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
var SAMHAP=[[8,0,4],[11,3,7],[2,6,10],[5,9,1]];
var CHUNG=[[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
var HYEONG=[[2,5],[5,8],[8,2],[1,10],[10,7],[7,1],[0,3],[4,4],[6,6],[9,9],[11,11]];
var PA=[[0,9],[1,4],[2,11],[3,6],[5,8],[7,10]];
var HAE=[[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];
function inPairs(T,a,b){ for(var i=0;i<T.length;i++){ if((T[i][0]===a&&T[i][1]===b)||(T[i][0]===b&&T[i][1]===a)) return true; } return false; }
function jiRel(a,b){
  if(inPairs(CHUNG,a,b)) return 3;
  if(a!==b){ for(var i=0;i<4;i++){ if(SAMHAP[i].indexOf(a)>=0&&SAMHAP[i].indexOf(b)>=0) return 2; } }
  if(inPairs(YUKHAP,a,b)) return 1;
  if(inPairs(HYEONG,a,b)) return 4;
  if(inPairs(PA,a,b)) return 5;
  if(inPairs(HAE,a,b)) return 6;
  return 0;
}

/* ── 저울 ── */
var BASE5=__BASE5__;
var SUB5=__SUB5__;
var SUB_W=[1.0,1.3,0.9,1.1];
var JMOD=[0,10,12,-12,-9,-7,-5];
var REL5_NM=__REL5NM__;
var REL5_SUB=__REL5SUB__;
var JR_NM=["평","육합","삼합","충","형","파","해"];
var JR_H=["平","六合","三合","沖","刑","破","害"];
var JR_TAG=[["보통","n"],["좋음","g"],["좋음","g"],["변동","w"],["조심","w"],["주의","w"],["주의","w"]];
var BAND_NM=__BANDNM__;
var SUB_LBL=__SUBLBL__;
var EL_NM=["목","화","토","금","수"], EL_H=["木","火","土","金","水"];

/* ── 문안 ── */
var PARA5=__PARA5__;
var HL5=__HL5__;
var ZJR_TX=__ZJR__;
var SUB_TX=__SUBTX__;
var LUCKY5=__LUCKY__;
var ZODIAC=__ZODIAC__;

/* ── 산식 ── */
function pad2(n){ return (n<10?'0':'')+n; }
function clamp99(v){ v=Math.round(v); return v<1?1:(v>99?99:v); }
function parseDate(s){ var m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s||''); if(!m) return null; return {y:+m[1],m:+m[2],d:+m[3]}; }
function todayStr(){ var n=new Date(); return n.getFullYear()+'-'+pad2(n.getMonth()+1)+'-'+pad2(n.getDate()); }
function ymdStr(o){ return o.y+'-'+pad2(o.m)+'-'+pad2(o.d); }
function koDate(o){ return o.m+'월 '+o.d+'일'; }
function bandOf(s){ return s>=70?2:(s>=50?1:0); }
function p60name(i){ return GAN[i%10]+JI[i%12]+"("+GANH[i%10]+JIH[i%12]+")"; }

/* 오늘(또는 지정일)의 일진과 띠 zi 의 관계 → 점수 */
function scoreOf(zi,dateStr){
  var T=parseDate(dateStr)||parseDate(todayStr());
  var ds=ymdStr(T);
  var tdp=dayPillarIdx(T.y,T.m,T.d), tg=tdp%10, tj=tdp%12;
  var rel5=((ELG[tg]-ELJ[zi])%5+5)%5;
  var jr=jiRel(zi,tj);
  var h=hash32('zd:'+ds+'-'+zi);
  var jm=JMOD[jr];
  var s=clamp99(BASE5[rel5]+jm+((h%13)-6));
  var sub=[];
  for(var k=0;k<4;k++){
    sub.push(clamp99(SUB5[rel5][k]+Math.round(jm*SUB_W[k])+(((h>>>(4+5*k))%11)-5)));
  }
  return {s:s, sub:sub, band:bandOf(s), rel5:rel5, jr:jr, tdp:tdp, tg:tg, tj:tj,
          date:T, dateStr:ds, luckyPick:(h>>>26)&1};
}
function readingOf(zi,dateStr){
  var R=scoreOf(zi,dateStr);
  var Z=ZODIAC[zi], L=LUCKY5[ELG[R.tg]];
  R.zi=zi; R.name=Z.nm; R.emo=Z.emo;
  R.headline=HL5[R.rel5][R.band];
  R.para=PARA5[R.rel5][R.band].replace(/\{띠\}/g,Z.nm);
  R.jiText=ZJR_TX[R.jr].replace(/\{띠\}/g,Z.nm);
  R.subText=[SUB_TX[0][bandOf(R.sub[0])],SUB_TX[1][bandOf(R.sub[1])],
             SUB_TX[2][bandOf(R.sub[2])],SUB_TX[3][bandOf(R.sub[3])]];
  R.rel5Name=REL5_NM[R.rel5];
  R.jrName=JR_NM[R.jr];
  R.bandName=BAND_NM[R.band];
  R.lucky={el:L.el, elh:L.elh, color:L.color, num:L.nums[R.luckyPick], dir:L.dir, item:L.item};
  return R;
}
window.ZODIAC_FORTUNE={scoreOf:scoreOf, readingOf:readingOf, jiRel:jiRel,
  dayPillarIdx:dayPillarIdx, hash32:hash32, ZODIAC:ZODIAC, ZI:__ZI__, SLUG:__SLUGQ__,
  BASE5:BASE5, SUB5:SUB5, JMOD:JMOD, PARA5:PARA5, HL5:HL5, ZJR_TX:ZJR_TX, LUCKY5:LUCKY5};

/* ── 렌더 ── */
(function(){
var $=function(id){return document.getElementById(id);};
var ZI=__ZI__;
var CANON='https://www.kmagpie.com/fortune/today/zodiac/__SLUG__/';
var TODAY=parseDate(todayStr());
var R=readingOf(ZI,null);

function renderTop(){
  $('h1date').textContent=koDate(TODAY);
  var L=R.lucky;
  $('todayStrip').innerHTML='<span>오늘 <b>'+TODAY.y+'년 '+koDate(TODAY)+'</b></span>'+
    '<span>일진 <b>'+p60name(R.tdp)+'</b></span>'+
    '<span class="el">'+L.el+'('+L.elh+')의 날</span>'+
    '<span>'+ZODIAC[ZI].emo+' '+ZODIAC[ZI].nm+'띠 <b>'+JI[ZI]+'('+JIH[ZI]+')</b></span>'+
    '<span style="color:var(--ink-3);font-size:12.5px">이 기기 날짜 기준</span>';
}
function renderResult(){
  $('rDate').textContent=TODAY.y+'년 '+koDate(TODAY)+' · 일진 '+p60name(R.tdp)+' · '+R.rel5Name+' / '+R.jrName;
  $('rHead').textContent='“'+R.headline+'”';
  $('rSS').textContent=R.rel5Name+' — '+REL5_SUB[R.rel5];
  $('rScore').textContent=R.s;
  $('rBand').textContent=R.bandName;
  $('rDesc').textContent=R.para;
  $('rJi').innerHTML='<b>'+JR_NM[R.jr]+(R.jr?'('+JR_H[R.jr]+')':'')+'</b> · '+R.jiText;
  var h='';
  for(var k=0;k<4;k++){
    h+='<div class="bar"><span class="bl">'+SUB_LBL[k]+'</span>'+
       '<div class="bt"><div class="bf" id="bf'+k+'"></div></div>'+
       '<span class="bn">'+R.sub[k]+'</span>'+
       '<span class="bx">'+R.subText[k]+'</span></div>';
  }
  $('rBars').innerHTML=h;
  setTimeout(function(){ for(var k=0;k<4;k++){ var e=$('bf'+k); if(e) e.style.width=R.sub[k]+'%'; } },60);
  $('lkColor').textContent=R.lucky.color;
  $('lkNum').textContent=R.lucky.num;
  $('lkDir').textContent=R.lucky.dir;
}
function renderMini(){
  $('zTitle').textContent=koDate(TODAY)+' 열두 띠 점수';
  $('zCap').textContent='오늘의 지지 '+JI[R.tj]+'('+JIH[R.tj]+')와 오늘의 천간 '+GAN[R.tg]+'('+GANH[R.tg]+')를 열두 띠 각각의 지지와 견주어 계산한 오늘의 총운입니다.';
  var h='';
  for(var i=0;i<12;i++){
    var r=readingOf(i,null), tag=JR_TAG[r.jr];
    h+='<a class="zm'+(i===ZI?' cur':'')+'" href="/fortune/today/zodiac/'+ZODIAC[i].slug+'/">'+
       '<span class="zme">'+ZODIAC[i].emo+'</span>'+
       '<span class="zmn">'+ZODIAC[i].nm+'띠</span>'+
       '<span class="zmt '+tag[1]+'">'+tag[0]+'</span>'+
       '<span class="zms" data-zi="'+i+'">'+r.s+'</span></a>';
  }
  $('zMini').innerHTML=h;
}
$('copyBtn').addEventListener('click',function(){
  var done=function(ok){ $('copied').textContent=ok?'링크를 복사했습니다.':('복사에 실패했습니다 — '+CANON); };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(CANON).then(function(){done(true);},function(){done(false);});
  }else{
    try{
      var ta=document.createElement('textarea'); ta.value=CANON;
      ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta);
      ta.select(); var ok=document.execCommand('copy'); document.body.removeChild(ta); done(ok);
    }catch(e){ done(false); }
  }
});
renderTop(); renderResult(); renderMini();
})();
</script>
</body>
</html>
"""


def build_page(i):
    z = Z[i]
    prev = Z[(i - 1) % 12]["slug"]
    nxt = Z[(i + 1) % 12]["slug"]
    rel = "\n".join(
        '<link rel="related" href="https://www.kmagpie.com/fortune/today/zodiac/%s/" title="%s띠 오늘의 운세">'
        % (o["slug"], o["nm"]) for j, o in enumerate(Z) if j != i)
    P, H, J, S, L = js_corpus()
    zjs = js_arr(['{nm:%s,emo:%s,slug:%s}' % (js_str(o["nm"]), js_str(o["emo"]), js_str(o["slug"])) for o in Z])
    folds = "\n".join(
        '<details class="fold" open><summary><h2>%s</h2></summary><div class="fx">%s</div></details>'
        % (t, b.strip()) for t, b in FOLD)

    html = TPL
    reps = [
        ("__RELLINKS__", rel),
        ("__FOLDS__", folds),
        ("__YEARGRID__", year_grid(i)),
        ("__INTRO__", INTRO[z["slug"]]),
        ("__BASE5__", str(BASE5)),
        ("__SUB5__", str(SUB5)),
        ("__REL5NM__", js_arr([js_str(x) for x in REL5_NM])),
        ("__REL5SUB__", js_arr([js_str(x) for x in REL5_SUB])),
        ("__BANDNM__", js_arr([js_str(x) for x in BAND_NM])),
        ("__SUBLBL__", js_arr([js_str(x) for x in SUB_LBL])),
        ("__PARA5__", P), ("__HL5__", H), ("__ZJR__", J), ("__SUBTX__", S),
        ("__LUCKY__", L), ("__ZODIAC__", zjs),
        ("__ZI__", str(i)),
        ("__SLUGQ__", js_str(z["slug"])),
        ("__PREV__", prev), ("__NEXT__", nxt),
        ("__SLUG__", z["slug"]), ("__NM__", z["nm"]), ("__EMO__", z["emo"]),
        ("__JIH__", z["jih"]), ("__JI__", z["ji"]),
    ]
    for k, v in reps:
        html = html.replace(k, v)
    return html


def main():
    errs, foldlen = validate()
    if errs:
        for e in errs:
            print("VALIDATION:", e)
        sys.exit(1)
    total = 0
    sizes = []
    for i, z in enumerate(Z):
        d = os.path.join(OUT_ROOT, z["slug"])
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "index.html")
        html = build_page(i)
        with io.open(p, "w", encoding="utf-8") as f:
            f.write(html)
        b = len(html.encode("utf-8"))
        sizes.append((z["slug"], b))
        total += b
    # 문안 글자수 집계
    corpus = 0
    corpus += sum(len(x) for row in PARA5 for x in row)
    corpus += sum(len(x) for row in HL5 for x in row)
    corpus += sum(len(x) for x in ZJR_TX)
    corpus += sum(len(x) for row in SUB_TX for x in row)
    corpus += sum(len(v) for v in INTRO.values())
    corpus += foldlen
    print("생성 완료: %d 페이지, 총 %d bytes (평균 %d bytes)" % (len(sizes), total, total // len(sizes)))
    for s, b in sizes:
        print("  %-8s %6d bytes" % (s, b))
    print("문안 총 글자수: %d자 (총운 %d · 헤드라인 %d · 지지 %d · 세부 %d · 띠소개 %d · fold본문 %d)" % (
        corpus,
        sum(len(x) for row in PARA5 for x in row),
        sum(len(x) for row in HL5 for x in row),
        sum(len(x) for x in ZJR_TX),
        sum(len(x) for row in SUB_TX for x in row),
        sum(len(v) for v in INTRO.values()),
        foldlen))


if __name__ == "__main__":
    main()
