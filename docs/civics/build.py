import re,sys
from docx import Document
from docx.shared import Pt,Mm,RGBColor
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
FS=float(sys.argv[1]) if len(sys.argv)>1 else 8
LINE=sys.argv[2] if len(sys.argv)>2 else '220'
SPA=int(sys.argv[3]) if len(sys.argv)>3 else 30
FONT='Arial'; TEXT='262626'
COLS=['16396B','9B2C2C','1F6B45','5B2C83','9A5B00','0B6577']
TINT=['E8EFFA','FBE9E7','E5F4EB','F0E8F8','FCF0D9','E1F2F5']
doc=Document()
st=doc.styles['Normal']; st.font.name=FONT; st.font.size=Pt(FS)
rf=st.element.get_or_add_rPr().find(qn('w:rFonts'))
for a in ('w:ascii','w:hAnsi','w:cs','w:eastAsia'): rf.set(qn(a),FONT)
def setsec(sec,cols):
    sec.page_width=Mm(210); sec.page_height=Mm(297)
    sec.left_margin=sec.right_margin=Mm(7); sec.top_margin=sec.bottom_margin=Mm(7)
    sp=sec._sectPr
    c=sp.find(qn('w:cols'))
    if c is None: c=OxmlElement('w:cols'); sp.append(c)
    c.set(qn('w:num'),str(cols)); c.set(qn('w:space'),'180')
    if cols>1: c.set(qn('w:sep'),'1')
    if sp.find(qn('w:bidi')) is None:
        b=OxmlElement('w:bidi'); dg=sp.find(qn('w:docGrid'))
        (dg.addprevious(b) if dg is not None else sp.append(b))
def para(spb=0,spa=0,fill=None,keep=False,rborder=None,line=None):
    p=doc.add_paragraph(); pPr=p._p.get_or_add_pPr()
    if keep: pPr.append(OxmlElement('w:keepNext'))
    if rborder:
        bd=OxmlElement('w:pBdr'); e=OxmlElement('w:right')
        for k,v in (('val','single'),('sz','24'),('space','3'),('color',rborder)): e.set(qn('w:'+k),v)
        bd.append(e); pPr.append(bd)
    if fill:
        sh=OxmlElement('w:shd')
        for k,v in (('val','clear'),('color','auto'),('fill',fill)): sh.set(qn('w:'+k),v)
        pPr.append(sh)
    pPr.append(OxmlElement('w:bidi'))
    sp=OxmlElement('w:spacing')
    for k,v in (('before',spb),('after',spa),('line',line or LINE),('lineRule','auto')): sp.set(qn('w:'+k),str(v))
    pPr.append(sp)
    return p
def run(p,t,bold=False,hl=False,color=None,size=None):
    r=p.add_run(t); sz=size or FS; r.font.size=Pt(sz); r.font.name=FONT
    rPr=r._r.get_or_add_rPr()
    rPr.append(OxmlElement('w:rtl'))
    z=OxmlElement('w:szCs'); z.set(qn('w:val'),str(int(sz*2))); rPr.append(z)
    if bold: r.bold=True; rPr.append(OxmlElement('w:bCs'))
    r.font.color.rgb=RGBColor.from_string(color or TEXT)
    if hl:
        h=OxmlElement('w:highlight'); h.set(qn('w:val'),'yellow'); rPr.append(h)
def rich(p,text,acc):
    bold=hl=False
    for tok in re.split(r'(\*\*|==)',text):
        if tok=='**': bold=not bold
        elif tok=='==': hl=not hl
        elif tok: run(p,tok,bold=bold,hl=hl,color=acc if bold else None)
def banner(t1,t2):
    p=para(0,0,'0F2A4D',line='260'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    run(p,t1,bold=True,color='FFFFFF',size=17)
    p=para(0,40,'C8A24A',line='220'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    run(p,t2,bold=True,color='0F2A4D',size=8.5)
def emit(fn,fs,start):
    global FS,SPA_N
    FS=fs; ci=start-1; n=start-1
    for line in open(fn,encoding='utf-8'):
        line=line.rstrip('\n')
        if not line: continue
        if line.startswith('# '):
            ci+=1; n+=1; c=COLS[ci%6]
            p=para(110,40,c,keep=True)
            run(p,'%02d  '%n,bold=True,color='FFD966',size=FS+3); run(p,line[2:],bold=True,color='FFFFFF',size=FS+2.5)
        elif line.startswith('> '):
            c=COLS[ci%6]; p=para(30,SPA+10,TINT[ci%6],rborder=c); run(p,'◆ ',bold=True,color=c); rich(p,line[2:],c)
        elif line.startswith('- '):
            c=COLS[ci%6]; p=para(0,SPA); run(p,'▪ ',bold=True,color=c); rich(p,line[2:],c)
        else:
            p=para(0,SPA); rich(p,line,COLS[ci%6])
setsec(doc.sections[0],1)
banner('אזרחות לבגרות · דף עזר מסכם','מגילת העצמאות · בלפור · בחירות · חוקי יסוד · פסקת ההגבלה · חוק השבות · זכויות · הגדרות · שיטות פתרון לכל סוג שאלה')
setsec(doc.add_section(WD_SECTION.CONTINUOUS),3)
emit('content.txt',FS,1)
emit('methods.txt',FS,15)
doc.save('civics_cheatsheet.docx')
