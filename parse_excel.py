import os, zipfile, xml.etree.ElementTree as ET

uploaded_dir = r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded'
files = [f for f in os.listdir(uploaded_dir) if f.endswith('.xlsx')]

def read_xlsx(path):
    with zipfile.ZipFile(path) as z:
        # shared strings
        ss = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text = ''.join(t.text or '' for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
                ss.append(text)
        
        # sheet1
        rows = []
        if 'xl/worksheets/sheet1.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            for row in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                r = []
                for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v.text if v is not None else ''
                    t = c.attrib.get('t')
                    if t == 's' and val.isdigit():
                        val = ss[int(val)]
                    r.append(val)
                rows.append(r)
        return rows

for f in files:
    p = os.path.join(uploaded_dir, f)
    rows = read_xlsx(p)
    print(f"\n=== {f} === (Rows: {len(rows)})")
    if rows:
        print("  Header:", rows[0][:8])
        if len(rows) > 1:
            print("  Row 1:", rows[1][:8])
