"""Export the generated report to PDF using ReportLab (pip install reportlab).

The SVG reader below supports the simple vector shapes emitted by our own
package-report.py; it is deliberately not a general SVG interpreter.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
import re
import textwrap
from package_source import build_source_zip

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, Flowable, KeepTogether

ROOT=Path(__file__).resolve().parent.parent
DOCS=ROOT/'docs'
OUT=ROOT/'output'/'pdf'
OUT.mkdir(parents=True,exist_ok=True)
fonts=Path('C:/Windows/Fonts')
if (fonts/'arial.ttf').exists():
    pdfmetrics.registerFont(TTFont('Body',str(fonts/'arial.ttf')))
    pdfmetrics.registerFont(TTFont('BodyBold',str(fonts/'arialbd.ttf')))
else:
    # Standard fonts keep the exporter portable; unsupported symbols are
    # transliterated in text() below.
    from reportlab.pdfbase.pdfmetrics import Font
    pdfmetrics.registerFont(Font('Body','Helvetica','WinAnsiEncoding'))
    pdfmetrics.registerFont(Font('BodyBold','Helvetica-Bold','WinAnsiEncoding'))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='Body',boldItalic='BodyBold')
WIDTH=A4[0]-100
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportBody',fontName='Body',fontSize=9,leading=14,spaceAfter=8,textColor=colors.HexColor('#263e52')))
styles.add(ParagraphStyle(name='ReportH1',fontName='BodyBold',fontSize=22,leading=29,spaceBefore=12,spaceAfter=17,keepWithNext=True,textColor=colors.HexColor('#24475f')))
styles.add(ParagraphStyle(name='ReportH2',fontName='BodyBold',fontSize=14,leading=20,spaceBefore=17,spaceAfter=10,keepWithNext=True,textColor=colors.HexColor('#24475f')))
styles.add(ParagraphStyle(name='ReportH3',fontName='BodyBold',fontSize=11,leading=16,spaceBefore=12,spaceAfter=8,keepWithNext=True))
styles.add(ParagraphStyle(name='Cell',fontName='Body',fontSize=7,leading=10,splitLongWords=True))
styles.add(ParagraphStyle(name='CodeLine',fontName='Courier',fontSize=6.4,leading=9,spaceAfter=0,backColor=colors.HexColor('#f1f4f8')))
styles.add(ParagraphStyle(name='Caption',fontName='Body',fontSize=8,leading=12,textColor=colors.HexColor('#71879b'),spaceAfter=15))


def text(s):
    for old,new in [('→',' -> '),('↔',' <-> '),('–','-'),('—','-'),('’',"'"),('“','"'),('”','"'),('⊕','Earth'),('..','..')]:
        s=s.replace(old,new)
    s=escape(s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',s)
    return s


class SVGFigure(Flowable):
    def __init__(self,path):
        super().__init__()
        self.root=ET.parse(path).getroot()
        self.w=float(self.root.attrib['width']); self.h=float(self.root.attrib['height'])
        self.factor=min(WIDTH/self.w,660/self.h)
        self.width=self.w*self.factor; self.height=self.h*self.factor

    def draw(self):
        c=self.canv; c.saveState(); c.scale(self.factor,self.factor)
        for el in self.root:
            kind=el.tag.split('}')[-1]; a=el.attrib
            if kind not in ['rect','path','text']:
                continue
            cls=a.get('class','')
            fill=a.get('fill','#233e54' if kind=='text' else 'none')
            stroke=a.get('stroke','#8b9eaf' if cls=='edge' else 'none')
            c.setLineWidth(1.5 if cls=='edge' else 1)
            if fill!='none': c.setFillColor(colors.toColor(fill))
            if stroke!='none': c.setStrokeColor(colors.toColor(stroke))
            if kind=='rect':
                x=float(a.get('x',0)); y=float(a.get('y',0))
                w=self.w if a['width']=='100%' else float(a['width'])
                h=self.h if a['height']=='100%' else float(a['height'])
                c.roundRect(x,self.h-y-h,w,h,float(a.get('rx',0)),stroke=stroke!='none',fill=fill!='none')
            elif kind=='text':
                size={'title':27,'sub':12,'name':13,'field':11,'label':10}.get(cls,11)
                if cls=='name': c.setFillColor(colors.white)
                elif cls in ['sub','label']: c.setFillColor(colors.HexColor('#71879b'))
                c.setFont('BodyBold' if cls in ['title','name'] else 'Body',size)
                c.drawString(float(a.get('x',0)),self.h-float(a.get('y',0)),''.join(el.itertext()))
            else:
                tokens=re.findall(r'[MHVLQZ]|-?\d+(?:\.\d+)?',a.get('d',''))
                p=c.beginPath(); i=0; x=y=0
                while i<len(tokens):
                    command=tokens[i]; i+=1
                    if command in ['M','L']:
                        x,y=float(tokens[i]),float(tokens[i+1]); i+=2
                        (p.moveTo if command=='M' else p.lineTo)(x,self.h-y)
                    elif command=='H':
                        x=float(tokens[i]); i+=1; p.lineTo(x,self.h-y)
                    elif command=='V':
                        y=float(tokens[i]); i+=1; p.lineTo(x,self.h-y)
                    elif command=='Q':
                        cx,cy,nx,ny=map(float,tokens[i:i+4]); i+=4
                        p.curveTo(x+2*(cx-x)/3,self.h-(y+2*(cy-y)/3),nx+2*(cx-nx)/3,self.h-(ny+2*(cy-ny)/3),nx,self.h-ny)
                        x,y=nx,ny
                    elif command=='Z': p.close()
                c.drawPath(p,stroke=stroke!='none',fill=fill!='none')
        c.restoreState()


def table(rows):
    if len(rows[0])==6:
        widths=[WIDTH*x for x in [.2,.25,.10,.15,.10,.20]]
    elif len(rows[0])==2:
        widths=[WIDTH*.84,WIDTH*.16]
    else:
        widths=[WIDTH/len(rows[0])]*len(rows[0])
    data=[[Paragraph(text(cell),styles['Cell']) for cell in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e7eef5')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#cfdbe5')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t


story=[]; rows=[]; code=False; first_heading=True; references_start=None
def flush_table():
    if rows:
        story.append(table(rows.copy())); story.append(Spacer(1,12)); rows.clear()

for line in (DOCS/'project-report.md').read_text(encoding='utf-8').splitlines():
    if line.startswith('```'):
        flush_table(); code=not code; story.append(Spacer(1,6)); continue
    if code:
        for part in textwrap.wrap(line,104,replace_whitespace=False,drop_whitespace=False) or [' ']:
            story.append(Paragraph(escape(part).replace(' ','&#160;'),styles['CodeLine']))
        continue
    if line.startswith('|'):
        if not re.match(r'^\|[\s:|\-]+\|$',line): rows.append([c.strip() for c in line.strip('|').split('|')])
        continue
    flush_table()
    if not line.strip(): continue
    if line.startswith('#'):
        level=min(len(line)-len(line.lstrip('#')),3); heading=line.lstrip('#').strip()
        if references_start is not None:
            story=story[:references_start]+[KeepTogether(story[references_start:])]
            references_start=None
        if heading=='References': references_start=len(story)
        if level==1:
            if not first_heading and heading not in ['Individual contributions','Conclusion']: story.append(PageBreak())
            first_heading=False
        displayed='Database and system diagrams' if heading=='Testing and results' else heading
        story.append(Paragraph(text(displayed),styles[f'ReportH{level}']))
        if heading=='Testing and results':
            # Put diagrams and screenshots immediately before the results text.
            for filename in ['er-diagram.svg','architecture.svg']:
                story.append(SVGFigure(DOCS/filename)); story.append(Paragraph(filename,styles['Caption'])); story.append(PageBreak())
            for image in sorted((DOCS/'evidence').glob('*.jpg')):
                from PIL import Image as PILImage
                with PILImage.open(image) as im: w,h=im.size
                scale=min(WIDTH/w,650/h)
                story.append(Image(str(image),width=w*scale,height=h*scale))
                story.append(Paragraph(text(image.stem.replace('-',' '))+' - actual browser capture',styles['Caption']))
                story.append(PageBreak())
            story.append(Paragraph('Testing and results',styles['ReportH1']))
    else:
        match=re.match(r'^(?:- |\d+\. )(.*)',line)
        story.append(Paragraph(text(match[1] if match else line),styles['ReportBody'],bulletText='•' if match else None))
flush_table()


def page(canvas,doc):
    canvas.saveState(); canvas.setStrokeColor(colors.HexColor('#d9e2e9')); canvas.line(50,43,A4[0]-50,43)
    canvas.setFont('Body',7); canvas.setFillColor(colors.HexColor('#71879b'))
    canvas.drawString(50,29,'ORBIT ARCHIVE / DBMS LEVEL 3')
    canvas.drawRightString(A4[0]-50,29,str(doc.page)); canvas.restoreState()

path=OUT/'orbit-archive-project-report.pdf'
doc=SimpleDocTemplate(str(path),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=48,bottomMargin=58,title='Orbit Archive - DBMS Level 3 Project',author='Arundhathi K and Bhadra R S')
doc.build(story,onFirstPage=page,onLaterPages=page)
build_source_zip(path)
print(path)
