const DATABASE_FOLDER = "PMP Prep/DATABASE";
const SPREADSHEET_NAME = "PMI RDC K-Majuscule Exam Platform Database";

const SHEETS = {
  Candidates: [
    "candidateId",
    "name",
    "email",
    "organization",
    "cohort",
    "examType",
    "defaultLanguage",
    "hasAccount",
    "createdAt",
  ],
  TrainerAccounts: ["trainerId", "name", "email", "role", "passwordHash", "active", "createdAt"],
  UserAccounts: ["userId", "name", "email", "organization", "cohort", "role", "voucherCode", "passwordHash", "defaultLanguage", "active", "createdAt"],
  Vouchers: ["voucherCode", "role", "status", "assignedTo", "usedBy", "createdAt", "usedAt"],
  QuestionBank: [
    "questionId",
    "lotId",
    "examType",
    "questionType",
    "promptFr",
    "promptEn",
    "optionsFrJson",
    "optionsEnJson",
    "correctIndexesJson",
    "explanationFr",
    "explanationEn",
    "ecoFr",
    "ecoEn",
    "performanceDomainFr",
    "performanceDomainEn",
    "approachFr",
    "approachEn",
    "active",
  ],
  Lots: ["lotId", "examType", "titleFr", "titleEn", "questionCount", "durationMinutes", "source", "active"],
  Attempts: [
    "attemptId",
    "candidateId",
    "candidateName",
    "email",
    "organization",
    "cohort",
    "lotId",
    "lotTitle",
    "startedAt",
    "submittedAt",
    "status",
    "score",
    "total",
    "percent",
    "remainingSeconds",
  ],
  AttemptAnswers: ["attemptId", "questionId", "answerIndexesJson", "isCorrect", "highlighted"],
  SummaryReports: ["reportId", "scope", "organization", "cohort", "generatedAt", "payloadJson"],
  EmailQueue: ["emailId", "attemptId", "to", "subject", "payloadJson", "status", "createdAt", "sentAt"],
};

function setupDatabase() {
  const spreadsheet = getOrCreateSpreadsheet_();
  Object.keys(SHEETS).forEach((name) => ensureSheet_(spreadsheet, name, SHEETS[name]));
  return { ok: true, spreadsheetId: spreadsheet.getId(), url: spreadsheet.getUrl() };
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "health";
  const spreadsheet = getOrCreateSpreadsheet_();
  let payload = { ok: true, database: SPREADSHEET_NAME };
  if (action === "lots") payload = readRows_(spreadsheet, "Lots");
  if (action === "questions") payload = readRows_(spreadsheet, "QuestionBank").filter((row) => row.active !== "false");
  if (action === "attempts") payload = readRows_(spreadsheet, "Attempts");
  if (action === "vouchers") payload = readRows_(spreadsheet, "Vouchers");
  if (action === "userAccounts") payload = readRows_(spreadsheet, "UserAccounts");
  return output_(payload, e);
}

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  const spreadsheet = getOrCreateSpreadsheet_();

  if (body.action === "saveAttempt") {
    saveAttempt_(spreadsheet, body.attempt);
    return json_({ ok: true });
  }

  if (body.action === "saveVouchers") {
    saveVouchers_(spreadsheet, body.vouchers || []);
    return json_({ ok: true });
  }

  if (body.action === "saveUserAccount") {
    saveUserAccount_(spreadsheet, body.user, body.voucher);
    return json_({ ok: true });
  }

  if (body.action === "sendResultEmail") {
    sendResultEmail_(body);
    return json_({ ok: true });
  }

  return json_({ ok: false, error: "Unknown action" });
}

function saveVouchers_(spreadsheet, vouchers) {
  vouchers.forEach((voucher) => upsertObject_(spreadsheet, "Vouchers", "voucherCode", {
    voucherCode: voucher.code || voucher.voucherCode,
    role: voucher.role,
    status: voucher.status,
    assignedTo: voucher.assignedTo,
    usedBy: voucher.usedBy || "",
    createdAt: voucher.createdAt || new Date().toISOString(),
    usedAt: voucher.usedAt || "",
  }));
}

function saveUserAccount_(spreadsheet, user, voucher) {
  if (!user) return;
  upsertObject_(spreadsheet, "UserAccounts", "userId", {
    userId: getUserId_(user),
    name: user.name,
    email: user.email,
    organization: user.organization,
    cohort: user.cohort,
    role: user.role,
    voucherCode: user.voucherCode,
    passwordHash: hashPassword_(user.password || ""),
    defaultLanguage: user.defaultLanguage,
    active: true,
    createdAt: user.createdAt || new Date().toISOString(),
  });

  if (voucher) {
    upsertObject_(spreadsheet, "Vouchers", "voucherCode", {
      voucherCode: voucher.code || voucher.voucherCode,
      role: voucher.role,
      status: voucher.status,
      assignedTo: voucher.assignedTo,
      usedBy: voucher.usedBy,
      createdAt: voucher.createdAt,
      usedAt: voucher.usedAt,
    });
  }
}

function saveAttempt_(spreadsheet, attempt) {
  const candidateId = getCandidateId_(attempt.candidate);
  appendObject_(spreadsheet, "Candidates", {
    candidateId,
    name: attempt.candidate.name,
    email: attempt.candidate.email,
    organization: attempt.candidate.organization,
    cohort: attempt.candidate.cohort,
    examType: attempt.candidate.examType,
    defaultLanguage: attempt.candidate.language,
    hasAccount: attempt.candidate.hasAccount,
    createdAt: new Date().toISOString(),
  });

  appendObject_(spreadsheet, "Attempts", {
    attemptId: attempt.id,
    candidateId,
    candidateName: attempt.candidate.name,
    email: attempt.candidate.email,
    organization: attempt.candidate.organization,
    cohort: attempt.candidate.cohort,
    lotId: attempt.lotId,
    lotTitle: attempt.lotTitle,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt || "",
    status: attempt.status,
    score: attempt.score,
    total: attempt.total,
    percent: attempt.percent,
    remainingSeconds: attempt.remainingSeconds,
  });

  Object.keys(attempt.answers || {}).forEach((questionId) => {
    appendObject_(spreadsheet, "AttemptAnswers", {
      attemptId: attempt.id,
      questionId,
      answerIndexesJson: JSON.stringify(attempt.answers[questionId]),
      isCorrect: "",
      highlighted: (attempt.highlighted || []).indexOf(questionId) >= 0,
    });
  });

  if (attempt.candidate.sendEmail && attempt.candidate.email) {
    sendResultEmail_({
      to: attempt.candidate.email,
      subject: "Résultats examen blanc PMI RDC / K-Majuscule",
      text: `Bonjour ${attempt.candidate.name},\n\nVotre score est ${attempt.score}/${attempt.total}, soit ${attempt.percent}%.\n\nChapitre PMI RDC - Centre K-Majuscule`,
    });
  }
}

function sendResultEmail_(message) {
  MailApp.sendEmail({
    to: message.to,
    subject: message.subject,
    body: message.text || "Vos résultats sont disponibles dans la plateforme.",
  });
}

function getOrCreateSpreadsheet_() {
  const folder = ensureFolderPath_(DATABASE_FOLDER);
  const files = folder.getFilesByName(SPREADSHEET_NAME);
  let spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    const file = DriveApp.getFileById(spreadsheet.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }
  Object.keys(SHEETS).forEach((name) => ensureSheet_(spreadsheet, name, SHEETS[name]));
  return spreadsheet;
}

function ensureFolderPath_(path) {
  return path.split("/").reduce((parent, name) => {
    const folders = parent.getFoldersByName(name);
    return folders.hasNext() ? folders.next() : parent.createFolder(name);
  }, DriveApp.getRootFolder());
}

function ensureSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function appendObject_(spreadsheet, sheetName, object) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map((header) => object[header] === undefined ? "" : object[header]));
}

function upsertObject_(spreadsheet, sheetName, keyHeader, object) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyIndex = headers.indexOf(keyHeader);
  const keyValue = object[keyHeader];

  if (keyIndex < 0 || !keyValue || sheet.getLastRow() < 2) {
    appendObject_(spreadsheet, sheetName, object);
    return;
  }

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const existingIndex = values.findIndex((row) => String(row[keyIndex]).toUpperCase() === String(keyValue).toUpperCase());
  const rowValues = headers.map((header) => object[header] === undefined ? "" : object[header]);

  if (existingIndex >= 0) {
    sheet.getRange(existingIndex + 2, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function readRows_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map((row) => headers.reduce((object, header, index) => {
    object[header] = row[index];
    return object;
  }, {}));
}

function getCandidateId_(candidate) {
  return Utilities.base64EncodeWebSafe(`${candidate.email || candidate.name}|${candidate.organization || ""}`).replace(/=+$/, "");
}

function getUserId_(user) {
  return Utilities.base64EncodeWebSafe(`${user.email || user.name}|${user.voucherCode || ""}`).replace(/=+$/, "");
}

function hashPassword_(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return bytes.map((byte) => (byte + 256).toString(16).slice(-2)).join("");
}

function output_(payload, e) {
  const callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(callback)) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(payload);
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
