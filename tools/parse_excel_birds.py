import os, zipfile, json
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

excel_path = r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392868962.xlsx'
rows = parse_excel_rows(excel_path)
print(f"Total rows in Aves Excel: {len(rows)-1}")

birds = []
for idx, r in enumerate(rows[1:], 1):
    c_name = r[37].strip() if len(r) > 37 and r[37] else ''
    s_guess = r[35].strip() if len(r) > 35 and r[35] else ''
    s_name = r[36].strip() if len(r) > 36 and r[36] else ''
    img = r[14].strip() if len(r) > 14 and r[14] else ''
    place = r[22].strip() if len(r) > 22 and r[22] else 'Humedales & Arbolado de Kennedy'
    
    # Clean name
    display_name = s_guess or c_name or s_name or f"Ave {idx}"
    sci_display = s_name or s_guess or "Aves"
    
    # Clean non-printable / encoding artifacts
    display_name = display_name.replace('\x81', 'Á').replace('\xad', 'í').replace('\xa9', 'é').replace('\xb3', 'ó').replace('\xba', 'ú').replace('\xb1', 'ñ')
    sci_display = sci_display.replace('\x81', 'Á').replace('\xad', 'í').replace('\xa9', 'é').replace('\xb3', 'ó').replace('\xba', 'ú').replace('\xb1', 'ñ')
    
    birds.append({
        'idx': idx,
        'id': f"AVE-{idx:03d}",
        'name': display_name,
        'sciname': sci_display,
        'img': img,
        'place': place,
        'cat': 1
    })

print("Sample birds:")
for b in birds[:10]:
    print(b)

with open('tools/extracted_birds.json', 'w', encoding='utf-8') as out:
    json.dump(birds, out, indent=2, ensure_ascii=False)
print("Saved tools/extracted_birds.json successfully")
