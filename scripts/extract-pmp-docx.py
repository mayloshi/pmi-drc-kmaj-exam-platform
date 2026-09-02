import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT.parent.parent

BATCHES = [
    {
        "batch": 5,
        "lot": 1,
        "id": "pmp-2026-lot-1-batch-5-med-high",
        "title_fr": "PMP 2026 - Lot 1 - Batch 5 - Niveau moyen à élevé",
        "title_en": "PMP 2026 - Lot 1 - Batch 5 - Medium to High Difficulty",
        "en": SOURCE_ROOT / "60 Questions batch 5 difficulty med-high.docx",
        "fr": SOURCE_ROOT / "60 Questions batch 5 difficulty med-high french.docx",
    },
    {
        "batch": 6,
        "lot": 2,
        "id": "pmp-2026-lot-2-batch-6-med-high",
        "title_fr": "PMP 2026 - Lot 2 - Batch 6 - Niveau moyen à élevé",
        "title_en": "PMP 2026 - Lot 2 - Batch 6 - Medium to High Difficulty",
        "en": SOURCE_ROOT / "60 Questions batch 6 difficulty med-high.docx",
        "fr": SOURCE_ROOT / "60 Questions batch 6 difficulty med-high french.docx",
    },
]

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
LETTERS = ["A", "B", "C", "D", "E", "F"]


def read_docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as docx:
        xml = docx.read("word/document.xml")
    root = ET.fromstring(xml)
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(clean_text(text))
    return paragraphs


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def split_chunks(paragraphs: list[str]) -> dict[int, list[str]]:
    starts: list[tuple[int, int]] = []
    for index, paragraph in enumerate(paragraphs):
        match = re.fullmatch(r"Question\s+(\d+)", paragraph, flags=re.I)
        if match:
            starts.append((int(match.group(1)), index))
    chunks: dict[int, list[str]] = {}
    for position, (number, start) in enumerate(starts):
        end = starts[position + 1][1] if position + 1 < len(starts) else len(paragraphs)
        chunks[number] = paragraphs[start + 1:end]
    return chunks


def normalize(value: str) -> str:
    value = re.sub(r"^[A-F][\.\)]\s*", "", value.strip(), flags=re.I)
    value = value.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    value = re.sub(r"\s+", " ", value)
    return value.strip(" .:;").lower()


def split_lettered_options(value: str) -> list[str]:
    matches = list(re.finditer(r"([A-F])\.\s*", value))
    if not matches:
        return []
    options: list[str] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(value)
        options.append(clean_text(value[start:end]))
    return options


def strip_option_prefix(value: str) -> str:
    return re.sub(r"^[A-F][\.\)]\s*", "", value.strip(), flags=re.I).strip()


def option_type(prompt: str, options: list[str], correct: list[int]) -> str:
    text = f"{prompt} {' '.join(options)}".lower()
    return "multiple" if len(correct) > 1 or "select two" in text or "select three" in text or "choose two" in text or "choose three" in text else "single"


def english_question(chunk: list[str], expected_options: int | None = None) -> dict:
    marker_values = {"Correct answer", "Correct selection"}
    correct_markers = [index for index, item in enumerate(chunk) if item in marker_values]
    if not correct_markers:
        raise ValueError("Missing correct answer marker")
    correct_marker = correct_markers[0]
    explanation_marker = chunk.index("Overall explanation") if "Overall explanation" in chunk else len(chunk)

    pre_explanation = [item for item in chunk[:explanation_marker] if item not in marker_values]
    option_count = expected_options or infer_option_count(chunk)
    options = pre_explanation[-option_count:]
    prompt = " ".join(pre_explanation[:-option_count])

    correct_texts = [
        chunk[index + 1]
        for index in correct_markers
        if index + 1 < explanation_marker and chunk[index + 1] not in marker_values
    ]
    correct = []
    for correct_text in correct_texts:
        matches = [index for index, option in enumerate(options) if normalize(option) == normalize(correct_text)]
        if matches:
            correct.extend(matches)
        elif correct_text[:1].upper() in LETTERS[: len(options)]:
            correct.append(LETTERS.index(correct_text[0].upper()))
    correct = sorted(set(correct)) or [0]

    explanation_end = len(chunk)
    for marker in ("Link to new ECO:", "Link to Process Group Practice Guide", "Link to Agile Practice Guide", "Check Page"):
        for index, item in enumerate(chunk[explanation_marker + 1:], start=explanation_marker + 1):
            if item.startswith(marker):
                explanation_end = min(explanation_end, index)
                break

    explanation = " ".join(chunk[explanation_marker + 1:explanation_end])
    eco = detect_eco(chunk)
    return {
        "prompt": prompt,
        "options": [strip_option_prefix(option) for option in options],
        "correct": correct,
        "explanation": explanation,
        "eco": eco,
    }


def infer_option_count(chunk: list[str]) -> int:
    first = " ".join(chunk[:2]).lower()
    if "select two" in first or "select two options" in first:
        return 5
    if "select three" in first or "select all three" in first or "choose three" in first:
        return 5
    return 4


def french_question(chunk: list[str], expected_options: int | None = None) -> dict:
    option_start = next((index for index, item in enumerate(chunk) if re.match(r"^A\.\s*", item)), None)
    answer_start = next((index for index, item in enumerate(chunk) if item.startswith("Réponse correcte")), len(chunk))
    explanation_start = next((index for index, item in enumerate(chunk) if item.startswith("Explications")), len(chunk))

    if option_start is None:
        prompt = " ".join(chunk[: min(answer_start, explanation_start)])
        options: list[str] = []
    else:
        prompt = " ".join(chunk[:option_start])
        option_text = " ".join(chunk[option_start:answer_start])
        options = [strip_option_prefix(option) for option in split_lettered_options(option_text)]
        if expected_options is not None and len(options) > expected_options:
            options = options[:expected_options]

    explanation_parts = chunk[explanation_start:] if explanation_start < len(chunk) else []
    if explanation_parts:
        explanation_parts[0] = explanation_parts[0].removeprefix("Explications").strip()
    explanation = " ".join(part for part in explanation_parts if not part.startswith("Domaine"))
    explanation = re.split(r"Lien vers|Veuillez consulter|Domaine\s*(?:Processus|Personnes|Environnement)", explanation)[0].strip()
    return {
        "prompt": prompt,
        "options": options,
        "explanation": explanation,
    }


def detect_eco(chunk: list[str]) -> dict[str, str]:
    for index, item in enumerate(chunk):
        if item == "Domain" and index + 1 < len(chunk):
            return eco_label(chunk[index + 1])
    for item in reversed(chunk):
        match = re.search(r"Domain\s+([123])", item, flags=re.I)
        if match:
            return eco_label(match.group(1))
    return eco_label("Process")


def eco_label(value: str) -> dict[str, str]:
    normalized = value.strip().lower()
    if normalized in {"1", "people", "personnes", "personne"}:
        return {"fr": "Personnes", "en": "People"}
    if normalized in {"3", "business environment", "business", "environnement commercial"}:
        return {"fr": "Environnement commercial", "en": "Business Environment"}
    return {"fr": "Processus", "en": "Process"}


def detect_approach(text: str) -> dict[str, str]:
    lower = text.lower()
    agile_score = sum(lower.count(word) for word in ["agile", "scrum", "sprint", "iteration", "backlog", "product owner", "kanban"])
    predictive_score = sum(lower.count(word) for word in ["waterfall", "predictive", "wbs", "baseline", "change control", "earned value", "critical path"])
    if "hybrid" in lower or "hybride" in lower or (agile_score and predictive_score):
        return {"fr": "Hybrid", "en": "Hybrid"}
    if agile_score > predictive_score:
        return {"fr": "Agile", "en": "Agile"}
    return {"fr": "Predictive", "en": "Predictive"}


def detect_performance_domain(text: str) -> dict[str, str]:
    lower = text.lower()
    scores = {
        "Governance": ["governance", "charter", "change control", "decision", "approval", "compliance", "audit"],
        "Scope": ["scope", "requirement", "wbs", "deliverable", "acceptance", "backlog", "story"],
        "Schedule": ["schedule", "timeline", "critical path", "float", "delay", "iteration", "sprint", "milestone"],
        "Finance": ["cost", "budget", "evm", "earned value", "cpi", "spi", "bac", "etc", "estimate"],
        "Stakeholders": ["stakeholder", "sponsor", "customer", "user", "communication", "engagement"],
        "Resources and Risks": ["resource", "team", "risk", "issue", "threat", "opportunity", "impediment", "quality"],
    }
    best = max(scores, key=lambda key: sum(lower.count(term) for term in scores[key]))
    return {"fr": best, "en": best}


def build_lot(config: dict) -> dict:
    en_chunks = split_chunks(read_docx_paragraphs(config["en"]))
    fr_chunks = split_chunks(read_docx_paragraphs(config["fr"]))
    questions = []
    for number in sorted(en_chunks):
        fr = french_question(fr_chunks.get(number, []))
        option_count = infer_option_count(en_chunks[number])
        en = english_question(en_chunks[number], expected_options=option_count)
        if len(fr["options"]) != len(en["options"]):
            print(f"Warning: Q{number} has {len(fr['options'])} FR options vs {len(en['options'])} EN options", file=sys.stderr)
            fr["options"] = fr["options"][: len(en["options"])]
            while len(fr["options"]) < len(en["options"]):
                fr["options"].append(en["options"][len(fr["options"])])
        combined_text = " ".join([en["prompt"], en["explanation"], " ".join(en["options"])])
        questions.append({
            "id": f"PMP{config['lot']}Q{number}",
            "type": option_type(en["prompt"], en["options"], en["correct"]),
            "prompt": {"fr": fr["prompt"] or en["prompt"], "en": en["prompt"]},
            "options": [{"fr": fr_option, "en": en_option} for fr_option, en_option in zip(fr["options"], en["options"])],
            "correct": en["correct"],
            "explanation": {"fr": fr["explanation"] or en["explanation"], "en": en["explanation"]},
            "eco": en["eco"],
            "performanceDomain": detect_performance_domain(combined_text),
            "approach": detect_approach(combined_text),
        })

    return {
        "id": config["id"],
        "title": {"fr": config["title_fr"], "en": config["title_en"]},
        "examType": "PMP",
        "source": f"{config['en'].name} + {config['fr'].name}",
        "questionCount": len(questions),
        "questions": questions,
    }


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def write_seed_sql(lot: dict, path: Path) -> None:
    rows = []
    for question in lot["questions"]:
        rows.append("(" + ", ".join([
            sql_string(question["id"]),
            sql_string(lot["id"]),
            sql_string("PMP"),
            sql_string(question["type"]),
            sql_string(question["prompt"]["fr"]),
            sql_string(question["prompt"]["en"]),
            sql_string(json.dumps([option["fr"] for option in question["options"]], ensure_ascii=False)),
            sql_string(json.dumps([option["en"] for option in question["options"]], ensure_ascii=False)),
            sql_string(json.dumps(question["correct"])),
            sql_string(question["explanation"]["fr"]),
            sql_string(question["explanation"]["en"]),
            sql_string(question["eco"]["fr"]),
            sql_string(question["eco"]["en"]),
            sql_string(question["performanceDomain"]["fr"]),
            sql_string(question["performanceDomain"]["en"]),
            sql_string(question["approach"]["fr"]),
            sql_string(question["approach"]["en"]),
            "true",
        ]) + ")")

    text = f"-- Seed {lot['title']['en']} questions for Supabase\n\n"
    text += "insert into public.exam_lots (id, exam_type, title_fr, title_en, source, question_count, active) values "
    text += "(" + ", ".join([
        sql_string(lot["id"]),
        sql_string("PMP"),
        sql_string(lot["title"]["fr"]),
        sql_string(lot["title"]["en"]),
        sql_string(lot["source"]),
        str(lot["questionCount"]),
        "true",
    ]) + ") on conflict (id) do update set exam_type = excluded.exam_type, title_fr = excluded.title_fr, title_en = excluded.title_en, source = excluded.source, question_count = excluded.question_count, active = excluded.active;\n\n"
    text += "insert into public.question_bank (id, lot_id, exam_type, question_type, prompt_fr, prompt_en, options_fr, options_en, correct_indexes, explanation_fr, explanation_en, eco_fr, eco_en, performance_domain_fr, performance_domain_en, approach_fr, approach_en, active) values\n"
    text += ",\n".join(rows)
    text += "\non conflict (id) do update set lot_id = excluded.lot_id, exam_type = excluded.exam_type, question_type = excluded.question_type, prompt_fr = excluded.prompt_fr, prompt_en = excluded.prompt_en, options_fr = excluded.options_fr, options_en = excluded.options_en, correct_indexes = excluded.correct_indexes, explanation_fr = excluded.explanation_fr, explanation_en = excluded.explanation_en, eco_fr = excluded.eco_fr, eco_en = excluded.eco_en, performance_domain_fr = excluded.performance_domain_fr, performance_domain_en = excluded.performance_domain_en, approach_fr = excluded.approach_fr, approach_en = excluded.approach_en, active = excluded.active;\n"
    path.write_text(text, encoding="utf-8")


def main() -> None:
    for config in BATCHES:
        lot = build_lot(config)
        json_path = ROOT / "app" / f"pmp-lot{config['lot']}.json"
        sql_path = ROOT / "supabase" / f"seed-pmp-lot{config['lot']}.sql"
        json_path.write_text(json.dumps(lot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_seed_sql(lot, sql_path)
        print(f"{json_path.name}: {lot['questionCount']} questions")


if __name__ == "__main__":
    main()
