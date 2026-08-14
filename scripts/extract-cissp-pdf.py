import json
import re
from pathlib import Path

import pdfplumber


PDF_PATH = Path(r"C:\Users\andry\OneDrive\Pictures\Moi\My development plan\CISSP\394883921-CISSP-Exam-Prep-Questions-Answers-Explanations.pdf")
OUT_JSON = Path("app/cissp-lots.json")
OUT_SQL = Path("supabase/seed-cissp-questions.sql")


def clean(text: str) -> str:
    text = text.replace("\u00ae", "").replace("\u2013", "-").replace("\u2014", "-")
    text = re.sub(r"-\s*\n\s*", "-", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def sql(value):
    return "'" + str(value).replace("'", "''") + "'"


def json_sql(value):
    return sql(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def slug_title(title: str, index: int) -> str:
    return f"cissp-{index:02d}"


def parse_questions(block: str):
    if "Test Questions" in block:
        block = block.split("Test Questions", 1)[1]
    parts = re.split(r"(?m)^\s*([1-9]|[1-3][0-9]|40)\.\s+", block)
    questions = {}
    for i in range(1, len(parts), 2):
        number = int(parts[i])
        body = parts[i + 1].strip()
        option_matches = list(re.finditer(r"(?m)^\s*([A-F])\.\s+", body))
        if not option_matches:
            continue
        prompt = clean(body[: option_matches[0].start()])
        options = []
        for idx, match in enumerate(option_matches):
            start = match.end()
            end = option_matches[idx + 1].start() if idx + 1 < len(option_matches) else len(body)
            options.append(clean(body[start:end]))
        questions[number] = {"prompt": prompt, "options": options}
    return questions


def parse_answers(block: str):
    if "Answer Key and Explanations" in block:
        block = block.split("Answer Key and Explanations", 1)[1]
    block = re.sub(
        r"(?m)^\s*([A-F])\s*[-–—]\s*(.+?)\s*\n\s*([1-9]|[1-3][0-9]|40)\.\s*(.+?)\s*$",
        lambda match: f"{match.group(3)}. {match.group(1)} - {match.group(2)} {match.group(4)}",
        block,
    )
    parts = re.split(r"(?m)^\s*([1-9]|[1-3][0-9]|40)\.\s+([A-F0-9]+)\s*[-–—]\s+", block)
    answers = {}
    for i in range(1, len(parts), 3):
        number = int(parts[i])
        token = parts[i + 1]
        answer_letters = re.findall(r"[A-F]", token)
        if not answer_letters:
            continue
        answer = answer_letters[-1]
        explanation = clean(parts[i + 2])
        domain = "CISSP"
        domain_match = re.search(r"\[([^\[\]]+)\]\s*$", explanation)
        if domain_match:
            domain = clean(domain_match.group(1))
            explanation = clean(explanation[: domain_match.start()])
        answers[number] = {"answer": answer, "domain": domain, "explanation": explanation}
    return answers


def main():
    with pdfplumber.open(PDF_PATH) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]

    events = []
    for idx, text in enumerate(pages):
        if "Practice Questions" in text and "Test Name:" in text:
            title_match = re.search(r"Test Name:\s*(.+)", text)
            total_match = re.search(r"Total Questions:\s*(\d+)", text)
            time_match = re.search(r"Time Allowed:\s*(\d+)\s*Minutes", text)
            title = clean(title_match.group(1)) if title_match else f"CISSP Lot {len(events) + 1}"
            events.append({
                "kind": "questions",
                "page": idx,
                "title": title,
                "total": int(total_match.group(1)) if total_match else 0,
                "minutes": int(time_match.group(1)) if time_match else 60,
            })
        elif "Answer Key and Explanations" in text:
            events.append({"kind": "answers", "page": idx})

    lots = []
    i = 0
    lot_index = 1
    while i < len(events) - 1:
        current = events[i]
        next_event = events[i + 1]
        if current["kind"] != "questions" or next_event["kind"] != "answers":
            i += 1
            continue
        next_question_pages = [event["page"] for event in events[i + 2 :] if event["kind"] == "questions"]
        end_page = next_question_pages[0] if next_question_pages else len(pages)
        question_text = "\n".join(pages[current["page"] : next_event["page"]])
        answer_text = "\n".join(pages[next_event["page"] : end_page])
        question_items = parse_questions(question_text)
        answer_items = parse_answers(answer_text)

        questions = []
        for number in sorted(question_items):
            question = question_items[number]
            answer = answer_items.get(number)
            if not answer:
                continue
            correct_index = ord(answer["answer"]) - ord("A")
            if correct_index < 0 or correct_index >= len(question["options"]):
                continue
            domain = answer["domain"]
            questions.append({
                "id": f"CISSP{lot_index:02d}Q{number:03d}",
                "type": "single",
                "prompt": {"fr": question["prompt"], "en": question["prompt"]},
                "options": [{"fr": option, "en": option} for option in question["options"]],
                "correct": [correct_index],
                "explanation": {"fr": answer["explanation"], "en": answer["explanation"]},
                "eco": {"fr": domain, "en": domain},
                "performanceDomain": {"fr": domain, "en": domain},
                "approach": {"fr": "CISSP", "en": "CISSP"},
            })

        lot_id = slug_title(current["title"], lot_index)
        lots.append({
            "id": lot_id,
            "title": {"fr": current["title"], "en": current["title"]},
            "examType": "CISSP",
            "source": PDF_PATH.name,
        "questionCount": len(questions),
        "expectedQuestionCount": current["total"],
            "durationMinutes": current["minutes"],
            "questions": questions,
        })
        lot_index += 1
        i += 2

    OUT_JSON.write_text(json.dumps(lots, ensure_ascii=False, indent=2), encoding="utf-8")

    rows = []
    lot_rows = []
    for lot in lots:
        lot_rows.append(
            "("
            + ", ".join([
                sql(lot["id"]),
                sql("CISSP"),
                sql(lot["title"]["fr"]),
                sql(lot["title"]["en"]),
                sql(lot["source"]),
                str(lot["questionCount"]),
                "true",
            ])
            + ")"
        )
        for question in lot["questions"]:
            rows.append(
                "("
                + ", ".join([
                    sql(question["id"]),
                    sql(lot["id"]),
                    sql("CISSP"),
                    sql(question["type"]),
                    sql(question["prompt"]["fr"]),
                    sql(question["prompt"]["en"]),
                    json_sql([item["fr"] for item in question["options"]]),
                    json_sql([item["en"] for item in question["options"]]),
                    json_sql(question["correct"]),
                    sql(question["explanation"]["fr"]),
                    sql(question["explanation"]["en"]),
                    sql(question["eco"]["fr"]),
                    sql(question["eco"]["en"]),
                    sql(question["performanceDomain"]["fr"]),
                    sql(question["performanceDomain"]["en"]),
                    sql(question["approach"]["fr"]),
                    sql(question["approach"]["en"]),
                    "true",
                ])
                + ")"
            )

    sql_text = "-- Seed CISSP lots and questions extracted from the authorized PDF.\n"
    sql_text += "insert into public.exam_lots (id, exam_type, title_fr, title_en, source, question_count, active) values\n"
    sql_text += ",\n".join(lot_rows)
    sql_text += "\non conflict (id) do update set exam_type = excluded.exam_type, title_fr = excluded.title_fr, title_en = excluded.title_en, source = excluded.source, question_count = excluded.question_count, active = excluded.active;\n\n"
    sql_text += "insert into public.question_bank (id, lot_id, exam_type, question_type, prompt_fr, prompt_en, options_fr, options_en, correct_indexes, explanation_fr, explanation_en, eco_fr, eco_en, performance_domain_fr, performance_domain_en, approach_fr, approach_en, active) values\n"
    sql_text += ",\n".join(rows)
    sql_text += "\non conflict (id) do update set lot_id = excluded.lot_id, exam_type = excluded.exam_type, question_type = excluded.question_type, prompt_fr = excluded.prompt_fr, prompt_en = excluded.prompt_en, options_fr = excluded.options_fr, options_en = excluded.options_en, correct_indexes = excluded.correct_indexes, explanation_fr = excluded.explanation_fr, explanation_en = excluded.explanation_en, eco_fr = excluded.eco_fr, eco_en = excluded.eco_en, performance_domain_fr = excluded.performance_domain_fr, performance_domain_en = excluded.performance_domain_en, approach_fr = excluded.approach_fr, approach_en = excluded.approach_en, active = excluded.active;\n"
    OUT_SQL.write_text(sql_text, encoding="utf-8")

    print(json.dumps({
        "lots": len(lots),
        "questions": sum(len(lot["questions"]) for lot in lots),
        "per_lot": {lot["id"]: len(lot["questions"]) for lot in lots},
        "titles": [lot["title"]["en"] for lot in lots],
    }, indent=2))


if __name__ == "__main__":
    main()
