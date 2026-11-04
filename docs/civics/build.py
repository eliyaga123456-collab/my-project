import re,sys
from docx import Document
from docx.shared import Pt,Mm,RGBColor
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
FS=float(sys.argv[1]) if len(sys.argv)>1 else 7
LINE=sys.argv[2] if len(sys.argv)>2 else '230'
SPA=sys.argv[3] if len(sys.argv)>3 else '40'
FONT='Arial'
doc=Document()
st=doc.styles['Normal']; st.font.name=FONT; st.font.size=Pt(FS)
rf=st.element.get_or_add_rPr().find(qn('w:rFonts'))
for a in ('w:ascii','w:hAnsi','w:cs','w:eastAsia'): rf.set(qn(a),FONT)
def setsec(sec,cols):
    sec.page_width=Mm(210); sec.page_height=Mm(297)
    for m in ('left_margin','right_margin'): setattr(sec,m,Mm(7))
    sec.top_margin=Mm(7); sec.bottom_margin=Mm(7)
    sp=sec._sectPr
    c=sp.find(qn('w:cols'))
    if c is None:
        c=OxmlElement('w:cols'); sp.append(c)
    c.set(qn('w:num'),str(cols)); c.set(qn('w:space'),'170')
    if cols>1: c.set(qn('w:sep'),'1')
    if sp.find(qn('w:bidi')) is None:
        b=OxmlElement('w:bidi')
        dg=sp.find(qn('w:docGrid'))
        (dg.addprevious(b) if dg is not None else sp.append(b))
def para(spb=0,spa=0,shade=None,keep=False,border=None):
    p=doc.add_paragraph()
    pPr=p._p.get_or_add_pPr()
    if keep:
        k=OxmlElement('w:keepNext'); pPr.append(k)
    b=OxmlElement('w:bidi'); pPr.append(b)
    if shade:
        sh=OxmlElement('w:shd'); sh.set(qn('w:val'),'clear'); sh.set(qn('w:color'),'auto'); sh.set(qn('w:fill'),shade); pPr.append(sh)
    if border:
        bd=OxmlElement('w:pBdr')
        for side in ('top','left','bottom','right'):
            e=OxmlElement('w:'+side); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'6'); e.set(qn('w:space'),'1'); e.set(qn('w:color'),border); bd.append(e)
        pPr.insert(1,bd)
    sp=OxmlElement('w:spacing'); sp.set(qn('w:before'),str(spb)); sp.set(qn('w:after'),str(spa)); sp.set(qn('w:line'),LINE); sp.set(qn('w:lineRule'),'auto')
    pPr.append(sp)
    return p
def run(p,t,bold=False,hl=False,color=None,size=None):
    r=p.add_run(t); r.font.size=Pt(size or FS); r.font.name=FONT
    rPr=r._r.get_or_add_rPr()
    rt=OxmlElement('w:rtl'); rPr.append(rt)
    szcs=OxmlElement('w:szCs'); szcs.set(qn('w:val'),str(int((size or FS)*2))); rPr.append(szcs)
    if bold:
        r.bold=True; rPr.append(OxmlElement('w:bCs'))
    if color: r.font.color.rgb=RGBColor.from_string(color)
    if hl:
        h=OxmlElement('w:highlight'); h.set(qn('w:val'),'yellow'); rPr.append(h)
    return r
def rich(p,text):
    bold=False;hl=False
    for tok in re.split(r'(\*\*|==)',text):
        if tok=='**': bold=not bold
        elif tok=='==': hl=not hl
        elif tok: run(p,tok,bold=bold,hl=hl,color='1F3864' if bold else None)
setsec(doc.sections[0],1)
p=para(0,20,'1F3864'); 
from docx.enum.text import WD_ALIGN_PARAGRAPH
p.alignment=WD_ALIGN_PARAGRAPH.CENTER
run(p,'דף עזר לבגרות באזרחות – מדינת ישראל כמדינה יהודית ודמוקרטית',bold=True,color='FFFFFF',size=13)
s2=doc.add_section(WD_SECTION.CONTINUOUS); setsec(s2,3)
SPA_N=int(SPA)
COLS=['1F3864','7B2D26','1B5E3B','5B2C83','8A5A00','0B5C6B']
ci=-1
for line in open('content.txt',encoding='utf-8'):
    line=line.rstrip('\n')
    if not line: continue
    if line.startswith('# '):
        ci+=1; p=para(90,30,COLS[ci%6],keep=True,border=COLS[ci%6]); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(p,line[2:],bold=True,color='FFFFFF',size=FS+2)
    elif line.startswith('> '):
        p=para(20,SPA_N,'FFF4CC',border='C9A227'); run(p,'★ ',bold=True,color='C00000'); rich(p,line[2:])
    elif line.startswith('- '):
        p=para(0,SPA_N); run(p,'• ',bold=True,color='C00000'); rich(p,line[2:])
    else:
        p=para(0,SPA_N); rich(p,line)
doc.save('civics_cheatsheet.docx')
