import assert from "node:assert/strict";
import test from "node:test";

test("exam platform source includes the requested core capabilities", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /Chapitre PMI RDC/);
  assert.match(page, /Centre K-Majuscule/);
  assert.match(page, /capmLot1Data/);
  assert.match(page, /capmLot2Data/);
  assert.match(page, /TRAINER_PASSWORD = "221008"/);
  assert.match(page, /Supabase/);
  assert.match(page, /supabaseSaveAttempt/);
  assert.match(page, /PMIRDC-ACTIF-2026/);
  assert.match(page, /durationFor/);
  assert.match(page, /Need improvement/);

  const lot = JSON.parse(await fs.readFile(new URL("../app/capm-lot1.json", import.meta.url), "utf8"));
  assert.equal(lot.questionCount, 50);
  assert.equal(lot.questions.length, 50);
  assert.match(lot.title.fr, /Questions 1/);

  const lot2 = JSON.parse(await fs.readFile(new URL("../app/capm-lot2.json", import.meta.url), "utf8"));
  assert.equal(lot2.questionCount, 50);
  assert.equal(lot2.questions.length, 50);
  assert.match(lot2.title.fr, /Lot 2/);
  assert.equal(new Set(lot2.questions.map((question) => question.id)).size, 50);
});
