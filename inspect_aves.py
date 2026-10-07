import zipfile
import xml.etree.ElementTree as ET

fpath_aves = r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392868962.xlsx'
with zipfile.ZipFile(fpath_aves, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
            if t is not None and t.text:
                shared_strings.append(t.text)
            else:
                shared_strings.append(''.join(si.itertext()))
    sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = sheet_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
    def get_row_vals(row):
        vals = []
        for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            if v is not None and v.text:
                if c.attrib.get('t') == 's':
                    vals.append(shared_strings[int(v.text)])
                else:
                    vals.append(v.text)
            else:
                vals.append('')
        return vals
    
    header = get_row_vals(rows[0])
    print('Header:', header)
    for i in range(1, 15):
        v = get_row_vals(rows[i])
        d = dict(zip(header, v))
        print(f"Row {i}: sci={d.get('scientific_name')}, com={d.get('common_name')}, sp_guess={d.get('species_guess')}")
