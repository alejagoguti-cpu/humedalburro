import os, glob, zipfile, json
import xml.etree.ElementTree as ET

def parse_excel_rows(path):
    with zipfile.ZipFile(path, 'r') as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                shared.append(''.join([t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]))
        
        stree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row in stree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            r_vals = []
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                t = c.attrib.get('t')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit() and int(val) < len(shared):
                    val = shared[int(val)]
                r_vals.append(val)
            if any(r_vals):
                rows.append(r_vals)
        return rows

brain_dir = r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded'
xlsx_files = glob.glob(os.path.join(brain_dir, '*.xlsx'))

for xf in sorted(xlsx_files):
    rows = parse_excel_rows(xf)
    print(f"\n=== {os.path.basename(xf)} ({len(rows)-1} rows) ===")
    if len(rows) > 0:
        headers = rows[0]
        # Inspect iconic taxon
        taxa_col = headers.index('iconic_taxon_name') if 'iconic_taxon_name' in headers else -1
        taxa_set = set()
        for r in rows[1:]:
            if taxa_col >= 0 and taxa_col < len(r):
                taxa_set.add(r[taxa_col])
        print(f"  Iconic taxa found: {taxa_set}")
