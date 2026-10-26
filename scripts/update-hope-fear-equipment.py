"""Update existing equipment from saved SRD pages; export new equipment separately."""
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\Dql\Desktop")
FIELDS = {
    "主武器": ("primary-weapon", ["名称", "等级", "属性", "伤害类型", "范围", "伤害", "负荷", "特性名称", "描述"]),
    "副武器": ("secondary-weapon", ["名称", "等级", "属性", "伤害类型", "范围", "伤害", "负荷", "特性名称", "描述"]),
    "护甲": ("armor", ["名称", "等级", "伤害阈值", "护甲值", "特性名称", "描述"]),
}


def text(node):
    value = re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()
    value = re.sub(r"(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])", "", value)
    return re.sub(r"\s+([，。；：！？])", r"\1", value)


def split_feature(value):
    if value == "—":
        return "", ""
    match = re.match(r"^(.*?)\s+[A-Z][A-Za-z0-9 '&/-]+[：:]\s*(.*)$", value)
    if match:
        return match[1].strip(), match[2].strip()
    match = re.match(r"^([^：:]+)[：:]\s*(.*)$", value)
    return (match[1].strip(), match[2].strip()) if match else ("", value)


def simple_effects(description):
    """Recognize unconditional modifiers at the start of an equipment feature."""
    first = re.split(r"[；;。]", description.strip(), maxsplit=1)[0].replace("−", "-")
    effects = {}
    attr_names = {"敏捷": "agility", "力量": "strength", "灵巧": "finesse", "本能": "instinct", "风度": "presence", "知识": "knowledge"}
    for label, key in (("闪避值", "evasion"), ("护甲值", "armorValue"), *attr_names.items()):
        match = re.fullmatch(rf"(?:{label}\s*([+-]\d+)|([+-]\d+)\s*{label})\s*", first)
        if not match:
            continue
        value = int(match[1] or match[2])
        if key in ("evasion", "armorValue"):
            effects[key] = value
        else:
            effects.setdefault("attributes", {})[key] = value
    return effects


def equipment(name):
    html = next(SOURCE.glob(name + "*匕首之心 HTML SRD.html")).read_text(encoding="utf-8")
    table = BeautifulSoup(html, "html.parser").select_one("table.equipment-table")
    rows = []
    for tr in table.select("tbody tr"):
        cells = {td.get("data-column"): td for td in tr.select("td")}
        name_cell = cells["name"]
        full = text(name_cell)
        english = name_cell.get("data-value", "")
        item_name = full[:-len(english)].strip() if english and full.endswith(english) else full
        feature_name, feature_description = split_feature(text(cells["feature"]))
        item = {"名称": item_name, "等级": "T" + text(cells["tier"]), "特性名称": feature_name, "描述": feature_description}
        if name != "护甲":
            damage = cells["damage"].get("data-value") or text(cells["damage"])
            damage_type = text(cells["type"])
            item.update({"属性": text(cells["trait"]), "伤害类型": damage_type, "范围": text(cells["range"]), "伤害": damage, "负荷": text(cells["burden"])})
        else:
            item.update({"伤害阈值": re.sub(r"\s+", "", text(cells["thresholds"])), "护甲值": int(text(cells["armor"]))})
        effects = simple_effects(feature_description)
        if effects:
            item["effects"] = effects
        rows.append(item)
    return rows


new_equipment = {}
for title, (stem, fields) in FIELDS.items():
    path = ROOT / "data/list" / (stem + ".ts")
    source = path.read_text(encoding="utf-8")
    latest = {x["名称"]: x for x in equipment(title)}
    names = set()
    pattern = re.compile(r"^    \{\n        名称: \"([^\"]+)\",.*?^    \},", re.M | re.S)

    def replace(match):
        name = match[1]
        names.add(name)
        if name not in latest:
            return match[0]
        item = latest[name]
        block = match[0]
        for key in fields:
            if key == "名称":
                continue
            value = json.dumps(item[key], ensure_ascii=False)
            block, count = re.subn(r"(^        " + re.escape(key) + r": ).*$", lambda m: m[1] + value + ",", block, count=1, flags=re.M)
            if count != 1:
                raise ValueError(name + " missing " + key)
        return block

    updated = pattern.sub(replace, source)
    path.write_bytes(updated.replace("\r\n", "\n").encode("utf-8"))
    new_equipment[stem] = [x for x in latest.values() if x["名称"] not in names]
    print(title, "existing", len(names), "updated", len(names & latest.keys()), "new", len(new_equipment[stem]))

output = ROOT / "data/list/hope-fear-equipment.json"
output.write_bytes((json.dumps(new_equipment, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
