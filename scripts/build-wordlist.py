"""Builds assets/data/words.tsv: the "Palavras do dia" list, by CEFR level and, inside each level,
from the most to the least frequent word.

Sources (downloaded on each run):
  - CEFR-J Vocabulary Profile 1.5 (A1-B2), Tono Laboratory, TUFS. Free for research and commercial use with citation.
  - Octanove Vocabulary Profile C1/C2 1.0, Octanove Labs. CC BY-SA 4.0.
    Both from https://github.com/openlanguageprofiles/olp-en-cefrj
  - New General Service List 1.2 frequencies (Browne, Culligan & Phillips). CC BY-SA 4.0.
    https://www.newgeneralservicelist.com

Run: python3 scripts/build-wordlist.py
"""
import csv
import io
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

OLP = "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/"
CEFRJ = OLP + "cefrj-vocabulary-profile-1.5.csv"
OCTANOVE = OLP + "octanove-vocabulary-profile-c1c2-1.0.csv"
NGSL = "https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv"
NGSL_31K = "https://www.newgeneralservicelist.com/s/NGSLwithSFI-31K.xlsx"
OUT = Path(__file__).resolve().parent.parent / "assets" / "data" / "words.tsv"
LEVELS = ["A1", "A2", "B1", "B2", "C1"]   # C2 is left out on purpose: beyond the route



def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "northbound-wordlist"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def read_csv(url):
    return list(csv.DictReader(io.StringIO(get(url).decode("utf-8-sig"))))


def xlsx_rows(data):
    """Minimal .xlsx reader (first sheet) so the script needs only the standard library."""
    z = zipfile.ZipFile(io.BytesIO(data))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    shared = ["".join(t.text or "" for t in si.iter("{%s}t" % ns["m"])) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)]
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    for row in sheet.iter("{%s}row" % ns["m"]):
        out = {}
        for c in row.findall("m:c", ns):
            col = re.match(r"[A-Z]+", c.get("r")).group(0)
            v = c.find("m:v", ns)
            if v is None:
                continue
            out[col] = shared[int(v.text)] if c.get("t") == "s" else v.text
        yield out


def frequencies():
    """lemma -> SFI (Standard Frequency Index: frequency adjusted for how widely a word is spread
    across texts, so corpus quirks don't push words like "pause" to the top). Higher = more common."""
    sfi = {}
    rows = xlsx_rows(get(NGSL_31K))
    header = next(rows)
    lemma_col = next(k for k, v in header.items() if v == "Lemma")
    sfi_col = next(k for k, v in header.items() if v == "SFI")
    for r in rows:
        lemma, v = r.get(lemma_col), r.get(sfi_col)
        if lemma and v and re.fullmatch(r"[\d.E-]+", v):
            sfi[lemma.lower()] = max(sfi.get(lemma.lower(), 0.0), float(v))
    for r in read_csv(NGSL):
        sfi[r["Lemma"].lower()] = max(sfi.get(r["Lemma"].lower(), 0.0), float(r["SFI"]))
    return sfi


# US/UK spelling pairs ("color/colour"): the app shows the second form when the accent is en-GB
def is_spelling_pair(a, b):
    if a.lower() == b.lower() or abs(len(a) - len(b)) > 2:
        return False
    sm = sum(1 for x, y in zip(a, b) if x == y)
    return sm >= min(len(a), len(b)) - 3


def clean(headword):
    """'color/colour' -> ('color', 'colour'); 'a.m./A.M./am/AM' -> None; 'CD' -> None."""
    forms = [f.strip() for f in headword.split("/") if f.strip()]
    forms = [f for f in forms if re.fullmatch(r"[A-Za-zé][A-Za-zé' \-]*", f) and not re.fullmatch(r"[A-Z]{2,}.*", f)]
    if not forms:
        return None
    main = forms[0].replace("é", "e")
    alt = ""
    if len(forms) > 1 and is_spelling_pair(forms[0], forms[1]):
        alt = forms[1].replace("é", "e")
        if alt.lower() == main.lower():
            alt = ""
    return main, alt


def main():
    sfi = frequencies()
    entries = {}
    for url in (CEFRJ, OCTANOVE):
        for r in read_csv(url):
            lvl = r["CEFR"].strip().upper()
            if lvl not in LEVELS:
                continue
            c = clean(r["headword"])
            if not c:
                continue
            term, alt = c
            key = term.lower().replace("-", " ")   # "face to face" and "face-to-face" are one entry
            pos = r["pos"].strip()
            e = entries.get(key)
            if e is None or LEVELS.index(lvl) < LEVELS.index(e["level"]):
                entries[key] = {"term": term, "alt": alt, "level": lvl, "pos": [pos]}
            elif lvl == e["level"] and pos not in e["pos"]:
                e["pos"].append(pos)

    def freq(e):
        words = e["term"].lower().replace("-", " ").split()
        fs = [sfi.get(w, sfi.get(e["alt"].lower(), 0.0)) for w in words]
        # an expression is rarer than its rarest word: about 10x per extra word (SFI is logarithmic)
        return min(fs) - 10 * (len(fs) - 1) if fs else 0.0

    items = sorted(entries.values(), key=lambda e: (LEVELS.index(e["level"]), -freq(e), e["term"].lower()))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        f.write("# Northbound \"Palavras do dia\": word<TAB>CEFR level<TAB>part of speech<TAB>British spelling (if different)\n")
        f.write("# Levels from the CEFR-J Vocabulary Profile 1.5 (Tono Laboratory, TUFS; free with citation) and the\n")
        f.write("# Octanove Vocabulary Profile C1/C2 1.0 (Octanove Labs, CC BY-SA 4.0), https://github.com/openlanguageprofiles/olp-en-cefrj\n")
        f.write("# Order inside each level by frequency from the New General Service List 1.2 (CC BY-SA 4.0), https://www.newgeneralservicelist.com\n")
        f.write("# This file is licensed CC BY-SA 4.0. Generated by scripts/build-wordlist.py on %s\n" % date.today().isoformat())
        for e in items:
            f.write("\t".join([e["term"], e["level"], "/".join(e["pos"]), e["alt"]]) + "\n")
    counts = {l: sum(1 for e in items if e["level"] == l) for l in LEVELS}
    print("wrote", OUT, len(items), counts)


if __name__ == "__main__":
    main()
