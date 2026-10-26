"""Import the seven locally saved daggerheart.cn SRD pages into built-in data.

The saved HTML is source data only. Run from the repository root with Python and bs4.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\Dql\Desktop")
OLD = ROOT / "data/cards/builtin-base.json"
PACK = ROOT / "public/card-packs/希望与恐惧SRD车卡器卡包v1.0.json"


def page(name):
    return BeautifulSoup(next(SOURCE.glob(name + "*匕首之心 HTML SRD.html")).read_text(encoding="utf-8"), "html.parser")


def plain(node):
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()


def chinese_title(node):
    text = plain(node)
    return re.split(r"\s+[A-Z][A-Z '’&-]*$", text)[0].strip()


def markdown(node):
    if isinstance(node, str):
        return re.sub(r"\s+", " ", node)
    if node.name == "br":
        return "\n"
    content = "".join(markdown(child) for child in node.children).strip()
    if node.name in ("strong", "b"):
        return "**" + content + "**"
    if node.name in ("em", "i"):
        return "*" + content + "*"
    return content


def blocks(nodes):
    result = []
    for node in nodes:
        if not isinstance(node, Tag):
            continue
        if node.name == "p":
            result.append(markdown(node).strip())
        elif node.name in ("ul", "ol"):
            result.append("\n".join("- " + markdown(li).strip() for li in node.find_all("li", recursive=False)))
    return "\n\n".join(x for x in result if x).strip()


def siblings_until(head, stops):
    nodes = []
    for sibling in head.next_siblings:
        if isinstance(sibling, Tag):
            if sibling.name in stops:
                break
            nodes.append(sibling)
    return nodes


def feature(node):
    text = markdown(node).strip()
    # The site includes the English original after the Chinese feature name.
    text = re.sub(r"^\*\*([^*：\n]+?)\s+[A-Z][A-Za-z '&/-]+：\*\*", r"***\1：***", text)
    text = re.sub(r"^([^：\n]+?)\s+[A-Z][A-Za-z '&/-]+：", r"***\1：***", text)
    return text


pack = json.loads(OLD.read_text(encoding="utf-8"))
original = deepcopy(pack)
delta = {key: [] for key in ("profession", "ancestry", "community", "subclass", "domain")}

# Classes and subclasses share a page. Existing IDs and illustrations are retained.
body = page("职业").select_one(".article-body > .lang-zh")
old_prof = {x["名称"]: x for x in pack["profession"]}
old_sub = {(x["主职"], x["子职业"], x["等级"]): x for x in pack["subclass"]}
old_sub_by_id = {x["id"].lower(): x for x in pack["subclass"]}
for heading in body.find_all("h1", recursive=False):
    name = chinese_title(heading)
    section = siblings_until(heading, {"h1"})
    details = next((x for x in section if x.name == "p" and "初始" in plain(x) and "领域" in plain(x)), None)
    if not details:
        continue
    summary = plain(details)
    domains = re.search(r"领域\s*[：:]\s*(\S+)\s*[&＆]\s*(\S+)", summary)
    hp = re.search(r"初始\s*生命点\s*[：:]\s*(\d+)", summary)
    ev = re.search(r"初始\s*闪避值\s*[：:]\s*(\d+)", summary)
    item = re.search(r"职业\s*物品\s*[：:]\s*(.*)", summary)
    if not (domains and hp and ev):
        raise ValueError("Cannot read class statistics: " + name + " " + summary)
    hope_heading = next((x for x in section if x.name == "h4" and plain(x) == "希望特性"), None)
    class_heading = next((x for x in section if x.name == "h4" and plain(x) == "职业特性"), None)
    subclass_headings = [x for x in section if x.name == "h3"]
    intro = blocks(x for x in section[:section.index(details)] if x.name == "p")
    card = old_prof.get(name, {"id": heading.get("id", "").removeprefix("section-").title()})
    card.update({"名称": name, "领域1": domains[1], "领域2": domains[2], "起始生命": int(hp[1]), "起始闪避": int(ev[1]), "起始物品": item[1] if item else "", "简介": intro, "希望特性": blocks(siblings_until(hope_heading, {"h4", "h3", "h1"})) if hope_heading else "", "职业特性": blocks(siblings_until(class_heading, {"h4", "h3", "h1"})) if class_heading else ""})
    if name not in old_prof:
        delta["profession"].append(card)
    for sh in subclass_headings:
        subname = chinese_title(sh)
        subnodes = siblings_until(sh, {"h3", "h1"})
        spell = re.search(r"施法属性\s*[：:]\s*(\S+)", " ".join(plain(x) for x in subnodes[:3]))
        spellname = spell[1] if spell else next((x["施法"] for x in pack["subclass"] if x["主职"] == name), "不可施法")
        for label, level in (("基础特性", "基石"), ("进阶特性", "专精"), ("精通特性", "大师")):
            fh = next((x for x in subnodes if x.name == "h4" and plain(x) == label), None)
            if not fh:
                continue
            desc = blocks(siblings_until(fh, {"h4", "h3", "h1"}))
            key = (name, subname, level)
            candidate_id = sh.get("id", "").removeprefix("section-") + "-" + {"基石":"Foundation","专精":"Specialization","大师":"Mastery"}[level]
            current = old_sub.get(key) or old_sub_by_id.get(candidate_id.lower()) or {"id": candidate_id}
            current.update({"名称": subname + level, "描述": desc, "主职": name, "子职业": subname, "等级": level, "施法": spellname})
            if key not in old_sub and candidate_id.lower() not in old_sub_by_id:
                delta["subclass"].append(current)

for type_name, heading_tag, feature_label in (("ancestry", "h3", "种族特性"), ("community", "h3", "社群特性")):
    body = page("种族" if type_name == "ancestry" else "社群").select_one(".article-body > .lang-zh")
    existing = {(x["种族"], x["类别"]): x for x in pack["ancestry"]} if type_name == "ancestry" else {x["名称"]: x for x in pack["community"]}
    for heading in body.find_all(heading_tag, recursive=False):
        name = chinese_title(heading)
        section = siblings_until(heading, {heading_tag})
        fh = next((x for x in section if x.name == "h4" and plain(x) == feature_label), None)
        if not fh:
            continue
        intro = blocks(x for x in section[:section.index(fh)] if x.name == "p")
        feature_nodes = [x for x in siblings_until(fh, {"h3"}) if x.name == "p"]
        if type_name == "ancestry":
            for idx, node in enumerate(feature_nodes[:2], 1):
                value = feature(node)
                title = re.split(r"[：:]", plain(node), maxsplit=1)[0]
                title = re.sub(r"\s+[A-Z][A-Za-z '&/-]+$", "", title)
                title = re.sub(r"(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])", "", title)
                current = existing.get((name, idx), {"id": heading.get("id", "").removeprefix("section-") + "-" + str(idx)})
                current.update({"名称": title, "种族": name, "简介": intro, "效果": value, "类别": idx})
                if (name, idx) not in existing:
                    delta["ancestry"].append(current)
        else:
            value = feature(feature_nodes[0]) if feature_nodes else ""
            title = re.split(r"[：:]", plain(feature_nodes[0]), maxsplit=1)[0] if feature_nodes else ""
            title = re.sub(r"\s+[A-Z][A-Za-z '&/-]+$", "", title)
            current = existing.get(name, {"id": heading.get("id", "").removeprefix("section-")})
            current.update({"名称": name, "特性": title, "简介": intro, "描述": value})
            if name not in existing:
                delta["community"].append(current)

existing_domain = {x["id"]: x for x in pack["domain"]}
for entry in page("领域卡").select("article.domain-entry"):
    zh = entry.select_one(":scope > .lang-zh")
    if not zh:
        continue
    card_id = entry["id"].removeprefix("domain-")
    name = chinese_title(zh.select_one(".adversary-title"))
    stats = [plain(x.select_one("b")) for x in zh.select(".domain-stats > div")]
    current = existing_domain.get(card_id, {"id": card_id})
    current.update({"名称": name, "领域": stats[0], "等级": int(stats[1]), "属性": stats[2], "回想": int(stats[3]), "描述": blocks(zh.select_one(".stat-content").children)})
    if card_id not in existing_domain:
        delta["domain"].append(current)

# New character options live in a separate importable pack. Existing options are updated in-place.
pack["version"] = "V20261026"
pack["description"] = "系统内置核心卡牌，按希望与恐惧新版 SRD 修订已有条目。"
OLD.write_bytes((json.dumps(pack, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
definitions = {key: deepcopy(original["customFieldDefinitions"][key]) for key in ("professions", "ancestries", "communities", "domains")}
for key, category, field in (("professions", "profession", "名称"), ("ancestries", "ancestry", "种族"), ("communities", "community", "名称"), ("domains", "domain", "领域")):
    definitions[key] = sorted(set(definitions[key]) | {card[field] for card in delta[category]})
delta_pack = {"name": "希望与恐惧", "version": "V20261026", "description": "希望与恐惧新增职业、种族、社群、子职业和领域卡；导入后解锁对应新装备。", "author": "匕首之心 HTML SRD", "customFieldDefinitions": definitions, **delta}
PACK.parent.mkdir(parents=True, exist_ok=True)
PACK.write_bytes((json.dumps(delta_pack, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
print("new cards:", {k: len(v) for k, v in delta.items()})
