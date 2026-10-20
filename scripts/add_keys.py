"""Ajoute des clés de traduction aux trois langues (fr est la référence). Usage : python3 scripts/add_keys.py fichier.json"""
import json, sys
data = json.load(open(sys.argv[1]))
for lang in ("fr", "en", "mg"):
    p = f"lib/messages/{lang}.ts"
    s = open(p).read()
    add = "".join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v[lang], ensure_ascii=False)},\n' for k, v in data.items() if f'"{k}":' not in s)
    if lang == "fr":
        s = s.replace("} as const;", add + "} as const;", 1)
    else:
        i = s.rindex("};")
        s = s[:i] + add + s[i:]
    open(p, "w").write(s)
print(len(data), "clés traitées")
