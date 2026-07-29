"use client";

import { useEffect, useMemo, useState } from "react";
import capmLot1Data from "./capm-lot1.json";

type Language = "fr" | "en";
type ExamType = "CAPM" | "PMP" | "Gestion de projet";
type QuestionType = "single" | "multiple";

type LocalizedText = {
  fr: string;
  en: string;
};

type Question = {
  id: string;
  type: QuestionType;
  prompt: LocalizedText;
  options: LocalizedText[];
  correct: number[];
  explanation: LocalizedText;
  eco: LocalizedText;
  performanceDomain: LocalizedText;
  approach: LocalizedText;
};

type ExamLot = {
  id: string;
  title: LocalizedText;
  examType: ExamType;
  source: string;
  questionCount: number;
  questions: Question[];
};

type Candidate = {
  name: string;
  email: string;
  organization: string;
  cohort: string;
  examType: ExamType;
  sendEmail: boolean;
  hasAccount: boolean;
  voucher: string;
  password: string;
  language: Language;
};

type Attempt = {
  id: string;
  candidate: Candidate;
  lotId: string;
  lotTitle: string;
  startedAt: string;
  submittedAt?: string;
  status: "saved" | "submitted" | "cancelled";
  answers: Record<string, number[]>;
  highlighted: string[];
  score: number;
  total: number;
  percent: number;
  remainingSeconds: number;
};

type VoucherRecord = {
  code: string;
  role: string;
  status: "available" | "assigned" | "used";
  assignedTo: string;
  usedBy: string;
  createdAt: string;
  usedAt: string;
};

type UserAccount = {
  name: string;
  email: string;
  organization: string;
  cohort: string;
  role: string;
  voucherCode: string;
  password: string;
  defaultLanguage: Language;
  createdAt: string;
};

const VERSION = "v0.1.3";
const UPDATED_AT = "2026-07-30";
const TRAINER_PASSWORD = "221008";
const STORAGE_ATTEMPTS = "pmi-drc-kmaj-attempts";
const STORAGE_DRAFT = "pmi-drc-kmaj-draft";
const STORAGE_CANDIDATE = "pmi-drc-kmaj-candidate";
const STORAGE_SETTINGS = "pmi-drc-kmaj-settings";
const STORAGE_VOUCHERS = "pmi-drc-kmaj-vouchers";
const STORAGE_USERS = "pmi-drc-kmaj-users";
const DEFAULT_SETTINGS = { appsScriptUrl: "", sheetName: "PMP Prep / DATABASE", trainerAccount: "admin@pmi-drcongo.org" };

const seedVouchers: VoucherRecord[] = [
  { code: "PMIRDC-ACTIF-2026", role: "Volontaire actif", status: "available", assignedTo: "", usedBy: "", createdAt: UPDATED_AT, usedAt: "" },
  { code: "KMAJ-CENTRE-2026", role: "Candidat centre", status: "available", assignedTo: "", usedBy: "", createdAt: UPDATED_AT, usedAt: "" },
  { code: "MEMBRE-PMI-2026", role: "Membre effectif", status: "available", assignedTo: "", usedBy: "", createdAt: UPDATED_AT, usedAt: "" },
];

const GITHUB_PAGES_BASE = "/pmi-drc-kmaj-exam-platform";

function assetPath(path: string) {
  if (typeof window !== "undefined" && window.location.pathname.startsWith(GITHUB_PAGES_BASE)) {
    return `${GITHUB_PAGES_BASE}${path}`;
  }
  return path;
}

const CAPM_ECO = {
  fundamentals: {
    en: "Project Management Fundamentals and Core Concepts",
    fr: "Principes fondamentaux du management de projet et concepts clés",
  },
  predictive: {
    en: "Predictive, Plan-Based Methodologies",
    fr: "Méthodologies prédictives et méthodologies basées sur la planification",
  },
  agile: {
    en: "Agile Frameworks/Methodologies",
    fr: "Cadres de travail/méthodologies agiles",
  },
  businessAnalysis: {
    en: "Business Analysis Frameworks",
    fr: "Cadres d'analyse d'affaires",
  },
} satisfies Record<string, LocalizedText>;

const PERFORMANCE_DOMAINS = {
  governance: { en: "Gouvernance", fr: "Gouvernance" },
  scope: { en: "Scope", fr: "Scope" },
  schedule: { en: "Schedule", fr: "Schedule" },
  finance: { en: "Finance", fr: "Finance" },
  stakeholders: { en: "Stakeholders", fr: "Stakeholders" },
  resourcesRisks: { en: "resources and Risks", fr: "resources and Risks" },
} satisfies Record<string, LocalizedText>;

const APPROACHES = {
  predictive: { en: "Predictive", fr: "Predictive" },
  agile: { en: "Agile", fr: "Agile" },
  hybrid: { en: "Hybrid", fr: "Hybrid" },
} satisfies Record<string, LocalizedText>;

const optionLetters = ["A", "B", "C", "D", "E", "F"];

const capmLot1 = capmLot1Data as ExamLot;
const lots: ExamLot[] = [
  capmLot1,
  {
    id: "pmp-placeholder",
    examType: "PMP",
    source: "A charger",
    questionCount: 0,
    title: { fr: "PMP - Lots à charger", en: "PMP - Lots to upload" },
    questions: [],
  },
  {
    id: "gp-placeholder",
    examType: "Gestion de projet",
    source: "A charger",
    questionCount: 0,
    title: { fr: "Gestion de projet - Tests généraux", en: "Project Management - General tests" },
    questions: [],
  },
];

function lotIcon(lot: ExamLot) {
  if (lot.examType === "PMP") return "⚡";
  if (lot.examType === "Gestion de projet") return "🎯";
  return "🌱";
}

function lotTone(lot: ExamLot, index = 0) {
  if (lot.examType === "PMP") return "cyan";
  if (lot.examType === "Gestion de projet") return "orange";
  return index % 2 === 0 ? "purple" : "cyan";
}

function lotDescription(lot: ExamLot, language: Language) {
  if (!lot.questions.length) {
    return language === "fr"
      ? "Lot prêt à recevoir les questions depuis Google Sheets."
      : "Lot ready to receive questions from Google Sheets.";
  }
  if (lot.examType === "CAPM") {
    return language === "fr"
      ? "Questions fondamentales CAPM : concepts clés, gouvernance, parties prenantes, risques et contraintes."
      : "CAPM fundamentals: core concepts, governance, stakeholders, risks, and constraints.";
  }
  return language === "fr"
    ? "Questions situationnelles selon le niveau et le domaine sélectionnés."
    : "Situational questions based on the selected level and domain.";
}

const copy = {
  fr: {
    home: "Accueil candidat",
    trainer: "Espace formateur",
    start: "Démarrer",
    save: "Sauvegarder",
    submit: "Soumettre",
    cancel: "Annuler",
    resume: "Continuer plus tard",
    answered: "répondues",
    highlighted: "Marquer pour révision",
    results: "Résultats",
    details: "Détails par question",
    account: "Créer un compte",
    guest: "Accès ponctuel",
    password: "Mot de passe",
    voucher: "Voucher code",
    defaultLanguage: "Langue par défaut",
    attempts: "Tentatives",
    platformEyebrow: "Plateforme d'examens blancs",
    heroTitle: "Examens blancs PMP, CAPM et gestion de projet",
    heroText: "Choisissez votre langue, renseignez vos informations, puis lancez une tentative chronométrée.",
    updated: "Dernière mise à jour",
    pmiMembership: "Devenir membre PMI",
    pmiExam: "Demande d'examen PMI",
    chapterLink: "chapitre PMI RDC",
    centerLink: "centre K-majuscule",
    top: "Au-dessus",
    exams: "Examens",
    refresh: "Actualiser",
    participantInfo: "Informations du participant",
    participantLead: "Renseignez vos coordonnées ou utilisez un compte avec voucher. Les lots apparaîtront après validation du profil et du type d'examen.",
    participantName: "Nom du participant",
    email: "Adresse email",
    org: "Entreprise / Organisation",
    cohort: "Cohorte",
    examType: "Type d'examen",
    emailResults: "Je souhaite recevoir mes résultats par email.",
    seeLots: "Voir les lots",
    clear: "Annuler",
    accessMissingNameEmail: "Indiquez au minimum le nom, ou connectez-vous avec un compte voucher valide.",
    accessRequired: "Accès requis : nom pour un accès ponctuel, ou compte avec voucher reconnu et mot de passe.",
    platformStructure: "Structure de la plateforme",
    selectedType: "Type choisi",
    availableLots: "Lots disponibles",
    correction: "Correction",
    endCorrection: "À la fin",
    dashboard: "Dashboard",
    trainerShort: "Formateur",
    platformStructureNote: "Les lots sont filtrés selon le type d'examen choisi. Les questions sont bilingues FR/EN selon la langue sélectionnée. Les domaines ECO, approches et performance domains ne s'affichent pas pendant l'examen.",
    accountWithVoucher: "Créer ou utiliser un compte avec voucher",
    resetPassword: "Réinitialiser le mot de passe",
    voucherUnknown: "Voucher non reconnu ou deja utilise.",
    loginUnknown: "Email ou mot de passe non reconnu.",
    selectLot: "Sélection du lot",
    editInfo: "Modifier mes informations",
    source: "Source",
    confirmStart: "Confirmez-vous le démarrage de cet examen ?",
    startLot: "Commencer",
    chapterName: "Chapitre PMI RDC",
    centerName: "Centre K-Majuscule",
    generalPm: "Gestion de projet général",
    trainerAccess: "Accès protégé. Les comptes formateurs sont prévus pour la version Google Sheets.",
    trainerPassword: "Mot de passe formateur",
    enter: "Entrer",
    trainerDashboard: "Dashboard formateur",
    accountManagement: "Vouchers et comptes utilisateur",
    voucherRole: "Profil du voucher",
    assignedTo: "Attribue a",
    assignedEmails: "Emails a attribuer",
    assignedEmailsHelp: "Saisissez un email par ligne, ou separez-les par virgule/point-virgule.",
    generateVoucher: "Generer un voucher",
    generateVouchers: "Generer et attribuer",
    createUserAccount: "Creer un compte utilisateur",
    generatedVouchers: "Vouchers generes",
    userAccounts: "Comptes utilisateur",
    accountCreated: "Compte cree avec voucher",
    copyVoucher: "Copier le voucher",
    attemptsLabel: "Tentatives",
    average: "Moyenne",
    tests: "Tests",
    exportCsv: "Export CSV",
    uploadLot: "Charger un lot",
    allowRetake: "Autoriser reprise",
    googleConnection: "Connexion Google Sheets",
    syncStatus: "Statut sync",
    endpoint: "Endpoint Apps Script",
    folderBase: "Dossier / Base",
    cumulativeEco: "Performance cumulée - ECO",
    attemptHistory: "Historique des tentatives",
    date: "Date",
    participant: "Participant",
    result: "Résultat",
    action: "Action",
    see: "Voir",
    results: "Résultats",
    total: "Total",
    percentage: "Pourcentage",
    lot: "Lot",
    status: "Statut",
    detailedCorrection: "Corrigé détaillé",
    yourAnswer: "Votre réponse",
    correctAnswer: "Bonne réponse",
    explanation: "Explication",
    noAnswer: "Aucune réponse",
  },
  en: {
    home: "Candidate home",
    trainer: "Trainer area",
    start: "Start",
    save: "Save",
    submit: "Submit",
    cancel: "Cancel",
    resume: "Continue later",
    answered: "answered",
    highlighted: "Mark for review",
    results: "Results",
    details: "Question details",
    account: "Create account",
    guest: "One-time access",
    password: "Password",
    voucher: "Voucher code",
    defaultLanguage: "Default language",
    attempts: "Attempts",
    platformEyebrow: "Practice exam platform",
    heroTitle: "PMP, CAPM, and project management practice exams",
    heroText: "Choose your language, enter your information, then start a timed attempt.",
    updated: "Last updated",
    pmiMembership: "Become a PMI member",
    pmiExam: "Submit a PMI exam application",
    chapterLink: "PMI DRC Chapter",
    centerLink: "K-majuscule Center",
    top: "Top",
    exams: "Exams",
    refresh: "Refresh",
    participantInfo: "Participant information",
    participantLead: "Enter your details or use an account with a voucher. Exam lots appear only after your profile and exam type are validated.",
    participantName: "Participant name",
    email: "Email address",
    org: "Company / Organization",
    cohort: "Cohort",
    examType: "Exam type",
    emailResults: "I would like to receive my results by email.",
    seeLots: "See exam lots",
    clear: "Cancel",
    accessMissingNameEmail: "Enter at least the name, or sign in with a valid voucher account.",
    accessRequired: "Required access: name for guest access, or a valid voucher account with password.",
    platformStructure: "Platform structure",
    selectedType: "Selected type",
    availableLots: "Available lots",
    correction: "Correction",
    endCorrection: "At the end",
    dashboard: "Dashboard",
    trainerShort: "Trainer",
    platformStructureNote: "Lots are filtered by the selected exam type. Questions are bilingual FR/EN based on the selected language. ECO domains, approaches, and performance domains are hidden during the exam.",
    accountWithVoucher: "Create or use an account with voucher",
    resetPassword: "Reset password",
    voucherUnknown: "Voucher not recognized or already used.",
    loginUnknown: "Email or password not recognized.",
    selectLot: "Lot selection",
    editInfo: "Edit my information",
    source: "Source",
    confirmStart: "Do you confirm that you want to start this exam?",
    startLot: "Start",
    chapterName: "PMI DRC Chapter",
    centerName: "K-Majuscule Center",
    generalPm: "General project management",
    trainerAccess: "Protected access. Trainer accounts are planned for the Google Sheets version.",
    trainerPassword: "Trainer password",
    enter: "Enter",
    trainerDashboard: "Trainer dashboard",
    accountManagement: "Vouchers and user accounts",
    voucherRole: "Voucher profile",
    assignedTo: "Assigned to",
    assignedEmails: "Emails to assign",
    assignedEmailsHelp: "Enter one email per line, or separate emails with commas/semicolons.",
    generateVoucher: "Generate voucher",
    generateVouchers: "Generate and assign",
    createUserAccount: "Create user account",
    generatedVouchers: "Generated vouchers",
    userAccounts: "User accounts",
    accountCreated: "Account created with voucher",
    copyVoucher: "Copy voucher",
    attemptsLabel: "Attempts",
    average: "Average",
    tests: "Tests",
    exportCsv: "Export CSV",
    uploadLot: "Upload a lot",
    allowRetake: "Allow retake",
    googleConnection: "Google Sheets connection",
    syncStatus: "Sync status",
    endpoint: "Apps Script endpoint",
    folderBase: "Folder / Database",
    cumulativeEco: "Cumulative performance - ECO",
    attemptHistory: "Attempt history",
    date: "Date",
    participant: "Participant",
    result: "Result",
    action: "Action",
    see: "View",
    results: "Results",
    total: "Total",
    percentage: "Percentage",
    lot: "Lot",
    status: "Status",
    detailedCorrection: "Detailed correction",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    explanation: "Explanation",
    noAnswer: "No answer",
  },
};

function durationFor(count: number) {
  const minutesByCount: Record<number, number> = {
    50: 60,
    60: 75,
    80: 100,
    100: 125,
    120: 150,
    140: 175,
    150: 180,
    160: 200,
    180: 235,
  };

  if (minutesByCount[count]) return minutesByCount[count] * 60;
  return Math.ceil(count * (60 / 50)) * 60;
}

function grade(percent: number) {
  if (percent < 50) return { label: "Need improvement", className: "need" };
  if (percent <= 64) return { label: "Below target", className: "below" };
  if (percent <= 80) return { label: "On Target", className: "target" };
  return { label: "Above Target", className: "above" };
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const remainder = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function sameAnswer(a: number[] = [], b: number[] = []) {
  return a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

function scoreAttempt(lot: ExamLot, answers: Record<string, number[]>) {
  const score = lot.questions.reduce((total, question) => {
    return total + (sameAnswer(answers[question.id], question.correct) ? 1 : 0);
  }, 0);
  const total = lot.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  return { score, total, percent };
}

function groupedScores(lot: ExamLot, answers: Record<string, number[]>, key: "eco" | "performanceDomain" | "approach", language: Language) {
  const rows = new Map<string, { label: string; score: number; total: number }>();

  lot.questions.forEach((question) => {
    const label = question[key][language];
    const row = rows.get(label) ?? { label, score: 0, total: 0 };
    row.total += 1;
    if (sameAnswer(answers[question.id], question.correct)) row.score += 1;
    rows.set(label, row);
  });

  return [...rows.values()].map((row) => ({
    ...row,
    percent: row.total ? Math.round((row.score / row.total) * 100) : 0,
  }));
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function normalizeVoucher(code: string) {
  return code.trim().toUpperCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseEmailList(value: string) {
  return [...new Set(value.split(/[\n,;]+/).map((email) => normalizeEmail(email)).filter(Boolean))];
}

function candidateKey(candidate: Candidate) {
  return (candidate.email || candidate.name).trim().toLowerCase();
}

function isSameGuest(candidate: Candidate, attempt: Attempt) {
  const key = candidateKey(candidate);
  if (!key) return false;
  const attemptKey = candidateKey(attempt.candidate);
  return attemptKey === key;
}

function isCurrentMonth(date: string) {
  const current = new Date();
  const attemptDate = new Date(date);
  return attemptDate.getFullYear() === current.getFullYear() && attemptDate.getMonth() === current.getMonth();
}

function countGuestMonthlyLots(candidate: Candidate, attempts: Attempt[]) {
  const lotIds = new Set(
    attempts
      .filter((attempt) => !attempt.candidate.hasAccount && isSameGuest(candidate, attempt) && isCurrentMonth(attempt.startedAt))
      .map((attempt) => attempt.lotId),
  );
  return lotIds.size;
}

function hasGuestTriedLotThisMonth(candidate: Candidate, attempts: Attempt[], lotId: string) {
  return attempts.some((attempt) =>
    !attempt.candidate.hasAccount &&
    attempt.lotId === lotId &&
    isSameGuest(candidate, attempt) &&
    isCurrentMonth(attempt.startedAt),
  );
}

function initialCandidate(): Candidate {
  return {
    name: "",
    email: "",
    organization: "",
    cohort: "",
    examType: "CAPM",
    sendEmail: false,
    hasAccount: false,
    voucher: "",
    password: "",
    language: "fr",
  };
}

export default function Home() {
  const [candidate, setCandidate] = useState<Candidate>(() => loadJson<Candidate>(STORAGE_CANDIDATE, initialCandidate()));
  const [language, setLanguage] = useState<Language>(() => loadJson<Candidate>(STORAGE_CANDIDATE, initialCandidate()).language ?? "fr");
  const [view, setView] = useState<"home" | "select" | "exam" | "results" | "trainer">("home");
  const [selectedLotId, setSelectedLotId] = useState(capmLot1.id);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(durationFor(capmLot1.questionCount));
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadJson<Attempt[]>(STORAGE_ATTEMPTS, []));
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [trainerPassword, setTrainerPassword] = useState("");
  const [trainerUnlocked, setTrainerUnlocked] = useState(false);
  const [settings, setSettings] = useState(() => loadJson(STORAGE_SETTINGS, DEFAULT_SETTINGS));
  const [voucherRecords, setVoucherRecords] = useState<VoucherRecord[]>(() => loadJson<VoucherRecord[]>(STORAGE_VOUCHERS, seedVouchers));
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => loadJson<UserAccount[]>(STORAGE_USERS, []));
  const [voucherForm, setVoucherForm] = useState({ role: "Volontaire actif", assignedTo: "" });
  const [accountNotice, setAccountNotice] = useState("");
  const [accessNotice, setAccessNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  const selectedLot = useMemo(() => lots.find((lot) => lot.id === selectedLotId) ?? capmLot1, [selectedLotId]);
  const t = copy[language];
  const progress = selectedLot.questions.length ? Object.keys(answers).filter((id) => answers[id]?.length).length : 0;
  const duration = durationFor(selectedLot.questionCount || selectedLot.questions.length || 15);
  const timePercent = duration ? remainingSeconds / duration : 1;
  const currentScore = scoreAttempt(selectedLot, answers);
  const visibleLots = lots.filter((lot) => lot.examType === candidate.examType);
  const canAccessLots =
    Boolean(!candidate.hasAccount && candidate.name.trim()) ||
    Boolean(candidate.hasAccount && candidate.email.trim() && candidate.password && canUseAccount());
  const guestMonthlyLotCount = countGuestMonthlyLots(candidate, attempts);
  const candidateAttempts = attempts.filter((attempt) => {
    const sameEmail = candidate.email && attempt.candidate.email === candidate.email;
    const sameName = candidate.name && attempt.candidate.name.toLowerCase() === candidate.name.toLowerCase();
    return sameEmail || sameName;
  });

  useEffect(() => {
    if (view !== "exam") return;
    if (remainingSeconds <= 0) {
      submitAttempt("submitted");
      return;
    }
    const timer = window.setTimeout(() => setRemainingSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [view, remainingSeconds]);

  function updateCandidate(patch: Partial<Candidate>) {
    const next = { ...candidate, ...patch };
    setCandidate(next);
    setLanguage(next.language);
    setAccessNotice("");
    saveJson(STORAGE_CANDIDATE, next);
  }

  function canUseAccount() {
    if (!candidate.hasAccount) return true;
    const email = normalizeEmail(candidate.email);
    return userAccounts.some((user) => normalizeEmail(user.email) === email && user.password === candidate.password);
  }

  function startSelect() {
    if (!canAccessLots) {
      setAccessNotice(t.accessMissingNameEmail);
      return;
    }
    if (candidate.hasAccount && (!candidate.password || !canUseAccount())) {
      setAccessNotice(t.loginUnknown);
      return;
    }
    if (candidate.hasAccount) {
      const account = userAccounts.find((user) => normalizeEmail(user.email) === normalizeEmail(candidate.email));
      if (account) {
        const nextCandidate = {
          ...candidate,
          name: account.name,
          organization: account.organization,
          cohort: account.cohort,
          language: account.defaultLanguage,
          voucher: account.voucherCode,
        };
        setCandidate(nextCandidate);
        setLanguage(nextCandidate.language);
        saveJson(STORAGE_CANDIDATE, nextCandidate);
      }
    }
    if (!candidate.hasAccount) saveJson(STORAGE_CANDIDATE, candidate);
    setView("select");
  }

  async function postToAppsScript(action: string, payload: Record<string, unknown>) {
    if (!settings.appsScriptUrl.trim()) {
      setSyncStatus(language === "fr" ? "Endpoint Apps Script non configure." : "Apps Script endpoint is not configured.");
      return false;
    }
    try {
      await fetch(settings.appsScriptUrl.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...payload }),
      });
      setSyncStatus(`${action}: ${new Date().toISOString()}`);
      return true;
    } catch (error) {
      setSyncStatus(`${action}: ${error instanceof Error ? error.message : "sync error"}`);
      return false;
    }
  }

  async function generateVoucher() {
    const prefix = voucherForm.role.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12) || "VOUCHER";
    const emails = parseEmailList(voucherForm.assignedTo);
    const recipients = emails.length ? emails : [voucherForm.assignedTo.trim()];
    const createdAt = new Date().toISOString();
    const created = recipients.map((assignedTo) => ({
        code: `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        role: voucherForm.role,
        status: assignedTo ? "assigned" as const : "available" as const,
        assignedTo,
        usedBy: "",
        createdAt,
        usedAt: "",
      }));
    const next = [...created, ...voucherRecords];
    setVoucherRecords(next);
    saveJson(STORAGE_VOUCHERS, next);
    setAccountNotice(`${t.copyVoucher}: ${created.map((voucher) => voucher.code).join(", ")}`);
    await postToAppsScript("saveVouchers", { vouchers: created });
  }

  async function createUserAccount() {
    if (!candidate.name.trim()) {
      setAccountNotice(t.accessMissingNameEmail);
      return;
    }
    if (!candidate.email.trim()) {
      setAccountNotice(language === "fr" ? "Email requis pour creer un compte utilisateur." : "Email is required to create a user account.");
      return;
    }
    const code = normalizeVoucher(candidate.voucher);
    const voucher = voucherRecords.find((item) => normalizeVoucher(item.code) === code && item.status !== "used");
    if (!voucher || !candidate.password.trim()) {
      setAccountNotice(t.voucherUnknown);
      return;
    }
    if (voucher.assignedTo && normalizeEmail(voucher.assignedTo) !== normalizeEmail(candidate.email)) {
      setAccountNotice(language === "fr" ? "Ce voucher est attribue a un autre email." : "This voucher is assigned to another email.");
      return;
    }
    const account: UserAccount = {
      name: candidate.name.trim(),
      email: candidate.email.trim(),
      organization: candidate.organization.trim(),
      cohort: candidate.cohort.trim(),
      role: voucher.role,
      voucherCode: voucher.code,
      password: candidate.password,
      defaultLanguage: candidate.language,
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [
      account,
      ...userAccounts.filter((user) =>
        account.email
          ? normalizeEmail(user.email) !== normalizeEmail(account.email)
          : normalizeVoucher(user.voucherCode) !== normalizeVoucher(account.voucherCode),
      ),
    ];
    const nextVouchers = voucherRecords.map((item) =>
      item.code === voucher.code
        ? { ...item, status: "used" as const, usedBy: account.email, usedAt: account.createdAt }
        : item,
    );
    setUserAccounts(nextUsers);
    setVoucherRecords(nextVouchers);
    saveJson(STORAGE_USERS, nextUsers);
    saveJson(STORAGE_VOUCHERS, nextVouchers);
    updateCandidate({ hasAccount: true, voucher: voucher.code });
    setAccountNotice(`${t.accountCreated}: ${account.email}`);
    await postToAppsScript("saveUserAccount", { user: account, voucher: nextVouchers.find((item) => item.code === voucher.code) });
  }

  function startExam(lot: ExamLot) {
    if (!lot.questions.length) return;
    if (!candidate.hasAccount && guestMonthlyLotCount >= 2 && !hasGuestTriedLotThisMonth(candidate, attempts, lot.id)) {
      setAccessNotice(language === "fr"
        ? "Accès ponctuel limité à 2 lots d'examen par mois. Connectez-vous avec un compte voucher pour continuer."
        : "Guest access is limited to 2 exam lots per month. Sign in with a voucher account to continue.");
      setView("home");
      return;
    }
    const draft = loadJson<Attempt | null>(STORAGE_DRAFT, null);
    const useDraft = draft?.lotId === lot.id && draft.status === "saved";
    setSelectedLotId(lot.id);
    setAnswers(useDraft ? draft.answers : {});
    setHighlighted(useDraft ? draft.highlighted : []);
    setRemainingSeconds(useDraft ? draft.remainingSeconds : durationFor(lot.questionCount));
    setActiveAttempt(useDraft ? draft : null);
    setView("exam");
  }

  async function syncAttempt(attempt: Attempt) {
    await postToAppsScript("saveAttempt", { attempt });
  }

  function submitAttempt(status: Attempt["status"]) {
    const score = status === "submitted" ? scoreAttempt(selectedLot, answers) : { score: 0, total: selectedLot.questions.length, percent: 0 };
    const attempt: Attempt = {
      id: activeAttempt?.id ?? crypto.randomUUID(),
      candidate,
      lotId: selectedLot.id,
      lotTitle: selectedLot.title[language],
      startedAt: activeAttempt?.startedAt ?? new Date().toISOString(),
      submittedAt: status === "submitted" ? new Date().toISOString() : undefined,
      status,
      answers,
      highlighted,
      remainingSeconds,
      ...score,
    };

    if (status === "saved") {
      saveJson(STORAGE_DRAFT, attempt);
      setActiveAttempt(attempt);
      setView("select");
      return;
    }

    const nextAttempts = [attempt, ...attempts.filter((item) => item.id !== attempt.id)];
    setAttempts(nextAttempts);
    saveJson(STORAGE_ATTEMPTS, nextAttempts);
    window.localStorage.removeItem(STORAGE_DRAFT);
    setActiveAttempt(attempt);
    syncAttempt(attempt);
    setView(status === "submitted" ? "results" : "home");
  }

  function toggleAnswer(question: Question, optionIndex: number) {
    setAnswers((current) => {
      const previous = current[question.id] ?? [];
      const next = question.type === "single"
        ? [optionIndex]
        : previous.includes(optionIndex)
          ? previous.filter((item) => item !== optionIndex)
          : [...previous, optionIndex];
      return { ...current, [question.id]: next };
    });
  }

  function exportCsv() {
    const header = "Date,Participant,Email,Organisation,Cohorte,Test,Score,Pourcentage,Resultat,Statut";
    const rows = attempts.map((attempt) => [
      attempt.submittedAt ?? attempt.startedAt,
      attempt.candidate.name,
      attempt.candidate.email || "-",
      attempt.candidate.organization,
      attempt.candidate.cohort,
      attempt.lotTitle,
      `${attempt.score}/${attempt.total}`,
      `${attempt.percent}%`,
      grade(attempt.percent).label,
      attempt.status,
    ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resultats-pmi-rdc-kmaj-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function goHome() {
    setView("home");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function goTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goExams() {
    if (canAccessLots) {
      setView("select");
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      return;
    }

    setView("home");
    window.setTimeout(() => {
      document.getElementById("participant-info")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  return (
    <main>
      <header className="hero-shell">
        <div className="hero-top">
          <div className="brand-card">
            <img src={assetPath("/logo-pmi-drc.png")} alt="Logo Chapitre PMI RDC" />
            <div>
              <strong>PMI DRC Chapter</strong>
              <span>{t.chapterName}</span>
            </div>
          </div>
          <div className="brand-card">
            <img src={assetPath("/logo-kmaj.jpg")} alt="Logo Centre K-Majuscule" />
            <div>
              <strong>K Majuscule</strong>
              <span>{t.centerName}</span>
            </div>
          </div>
          <div className="language-toggle" aria-label="Langue">
            <span aria-hidden="true">🌐</span>
            <button className={language === "fr" ? "active" : ""} onClick={() => updateCandidate({ language: "fr" })}>FR Français</button>
            <button className={language === "en" ? "active" : ""} onClick={() => updateCandidate({ language: "en" })}>GB English</button>
          </div>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">{t.platformEyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p>Version {VERSION} - {t.heroText}</p>
          <p>{t.updated} : <strong>{UPDATED_AT}</strong></p>
        </div>
      </header>

      <section className="version-band">
        <a href="https://www.pmi.org/membership" target="_blank">
          <img src={assetPath("/logo-pmi-global.png")} alt="" />
          {t.pmiMembership}
        </a>
        <a href="https://www.pmi.org/certifications" target="_blank">
          <img src={assetPath("/logo-pmi-global.png")} alt="" />
          {t.pmiExam}
        </a>
        <a href="https://pmi-drcongo.org" target="_blank">
          <img src={assetPath("/logo-pmi-drc.png")} alt="" />
          {t.chapterLink}
        </a>
        <a href="https://www.kmajuscule.com" target="_blank">
          <img src={assetPath("/logo-kmaj.jpg")} alt="" />
          {t.centerLink}
        </a>
        <button onClick={() => setView("trainer")}>🔐 {t.trainer}</button>
      </section>

      <nav className="quick-nav" aria-label="Navigation rapide">
        <button onClick={goHome}>⌂ {t.home}</button>
        <button onClick={goTop}>↑ {t.top}</button>
        <button onClick={goExams}>▦ {t.exams}</button>
        <button onClick={() => window.location.reload()}>↻ {t.refresh}</button>
      </nav>

      {view === "home" && (
        <>
          <section className="participant-layout" id="participant-info">
          <div className="panel participant-panel">
            <h2>{t.participantInfo}</h2>
            <p className="lead">{t.participantLead}</p>
            <div className="form-grid">
              <label>{t.participantName}<input value={candidate.name} onChange={(event) => updateCandidate({ name: event.target.value })} placeholder="Ex. Andry Kavul" /></label>
              <label>{t.email}<input type="email" value={candidate.email} onChange={(event) => updateCandidate({ email: event.target.value })} placeholder="Ex. jean@email.com" /></label>
              <label>{t.org}<input value={candidate.organization} onChange={(event) => updateCandidate({ organization: event.target.value })} /></label>
              <label>{t.cohort}<input value={candidate.cohort} onChange={(event) => updateCandidate({ cohort: event.target.value })} /></label>
              <label>{t.examType}<select value={candidate.examType} onChange={(event) => updateCandidate({ examType: event.target.value as ExamType })}>
                <option>CAPM</option>
                <option>PMP</option>
                <option value="Gestion de projet">{t.generalPm}</option>
              </select></label>
              <label>{t.defaultLanguage}<select value={candidate.language} onChange={(event) => updateCandidate({ language: event.target.value as Language })}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select></label>
            </div>
            <label className="check-row soft-check"><input type="checkbox" checked={candidate.sendEmail} onChange={(event) => updateCandidate({ sendEmail: event.target.checked })} /> {t.emailResults}</label>
            <div className="actions">
              <button className="primary" onClick={startSelect}>▶ {t.seeLots}</button>
              <button onClick={() => setCandidate(initialCandidate())}>× {t.clear}</button>
              <button onClick={() => setView("trainer")}>🔐 {t.trainerShort}</button>
            </div>
            <p className="helper-note">{accessNotice || (!canAccessLots ? t.accessRequired : "")}</p>
          </div>

          <div className="panel structure-panel">
            <h2>{t.platformStructure}</h2>
            <div className="metric-grid">
              <Metric label={t.selectedType} value={candidate.examType} />
              <Metric label={t.availableLots} value={String(visibleLots.length)} />
              <Metric label={t.correction} value={t.endCorrection} />
              <Metric label={t.dashboard} value={t.trainerShort} />
            </div>
            <p className="muted">{t.platformStructureNote}</p>
            <div className="account-strip">
              <label className="check-row"><input type="checkbox" checked={candidate.hasAccount} onChange={(event) => updateCandidate({ hasAccount: event.target.checked })} /> {t.accountWithVoucher}</label>
              <div className="form-grid">
                <label>{t.voucher}<input value={candidate.voucher} onChange={(event) => updateCandidate({ voucher: event.target.value })} placeholder="PMIRDC-ACTIF-2026" /></label>
                <label>{t.password}<input type="password" value={candidate.password} onChange={(event) => updateCandidate({ password: event.target.value })} /></label>
              </div>
              <button onClick={() => alert(language === "fr" ? "Réinitialisation prévue via Apps Script : email avec lien sécurisé." : "Reset planned through Apps Script: email with secure link.")}>↻ {t.resetPassword}</button>
              <button className="primary" onClick={createUserAccount}>✓ {t.createUserAccount}</button>
            </div>
            {accountNotice && <p className="helper-note">{accountNotice}</p>}
            {candidate.hasAccount && candidate.email && candidate.password && !canUseAccount() && <p className="error">{t.loginUnknown}</p>}
          </div>
          </section>
        </>
      )}

      {view === "select" && (
        <section className="select-shell">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t.selectLot}</p>
              <h1>{candidate.examType}</h1>
            </div>
            <button onClick={() => setView("home")}>✎ {t.editInfo}</button>
          </div>
          <div className="catalog-grid compact">
            {visibleLots.map((lot, index) => (
              <article className={`test-card ${lotTone(lot, index)}`} key={lot.id}>
                <div className="test-icon">{lotIcon(lot)}</div>
                <h2>{lot.title[language]}</h2>
                <p>{lotDescription(lot, language)}</p>
                <div className="chips">
                  <span>{lot.questions.length} questions</span>
                  <span>{lot.questions.length ? Math.round(durationFor(lot.questionCount) / 60) : "-"} min</span>
                  <span>FR / EN</span>
                </div>
                <small>{t.source} : {lot.source}</small>
                <button className={`start-button ${lotTone(lot, index)}`} disabled={!lot.questions.length} onClick={() => window.confirm(t.confirmStart) && startExam(lot)}>▶ {t.startLot}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "exam" && (
        <section className="exam-shell">
          <aside className="exam-status">
            <h2>{selectedLot.title[language]}</h2>
            <p>{candidate.name}</p>
            <div className={`timer ${timePercent <= 0.1 ? "danger" : ""}`}>
              <strong>{formatTime(remainingSeconds)}</strong>
              <span style={{ width: `${Math.max(0, timePercent * 100)}%` }} />
            </div>
            <p>{progress}/{selectedLot.questions.length} {t.answered}</p>
            <div className="question-pills">
              {selectedLot.questions.map((question, index) => (
                <a key={question.id} href={`#${question.id}`} className={`${answers[question.id]?.length ? "done" : ""} ${highlighted.includes(question.id) ? "flagged" : ""}`}>{index + 1}</a>
              ))}
            </div>
            <button onClick={() => submitAttempt("saved")}>{t.save}</button>
            <button className="primary" onClick={() => submitAttempt("submitted")}>{t.submit}</button>
            <button className="danger-button" onClick={() => window.confirm("Annuler cet examen ? Aucun score ne sera enregistré.") && submitAttempt("cancelled")}>{t.cancel}</button>
          </aside>
          <div className="questions">
            {selectedLot.questions.map((question, index) => (
              <article className="question-card" id={question.id} key={question.id}>
                <div className="question-top">
                  <span>Question {index + 1}</span>
                  <button onClick={() => setHighlighted((items) => items.includes(question.id) ? items.filter((item) => item !== question.id) : [...items, question.id])}>{highlighted.includes(question.id) ? "Retirer la surbrillance" : t.highlighted}</button>
                </div>
                <h2>{question.prompt[language]}</h2>
                <div className="options">
                  {question.options.map((option, optionIndex) => (
                    <label className="option" key={option[language]}>
                      <input
                        type={question.type === "single" ? "radio" : "checkbox"}
                        name={question.id}
                        checked={(answers[question.id] ?? []).includes(optionIndex)}
                        onChange={() => toggleAnswer(question, optionIndex)}
                      />
                      <span>{option[language]}</span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "results" && activeAttempt && (
        <ResultsPanel lot={selectedLot} attempt={activeAttempt} language={language} onHome={() => setView("home")} />
      )}

      {view === "trainer" && (
        <section className="trainer-grid">
          {!trainerUnlocked ? (
            <div className="panel trainer-login">
              <h1>{t.trainer}</h1>
              <p>{t.trainerAccess}</p>
              <input type="password" value={trainerPassword} onChange={(event) => setTrainerPassword(event.target.value)} placeholder={t.trainerPassword} />
              <button className="primary" onClick={() => setTrainerUnlocked(trainerPassword === TRAINER_PASSWORD)}>▶ {t.enter}</button>
            </div>
          ) : (
            <>
              <div className="panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Source : Google Sheets</p>
                    <h1>{t.trainerDashboard}</h1>
                  </div>
                  <button onClick={() => setView("home")}>⌂ {t.home}</button>
                </div>
                <div className="metric-grid">
                  <Metric label={t.attemptsLabel} value={String(attempts.length)} />
                  <Metric label={t.average} value={`${Math.round(attempts.reduce((sum, item) => sum + item.percent, 0) / Math.max(1, attempts.length))}%`} />
                  <Metric label={t.tests} value={`${lots.length} standards + import`} />
                  <Metric label={t.syncStatus} value={syncStatus || "-"} />
                </div>
                <div className="actions">
                  <button onClick={exportCsv}>⇩ {t.exportCsv}</button>
                  <button onClick={() => alert(language === "fr" ? "Import prévu : collez un JSON/CSV de questions dans la base Google Sheets via Apps Script." : "Import planned: paste a question JSON/CSV into the Google Sheets database through Apps Script.")}>＋ {t.uploadLot}</button>
                  <button onClick={() => alert(language === "fr" ? "Autorisation de reprise prévue : modification du quota dans la feuille Attempts." : "Retake authorization planned: update the quota in the Attempts sheet.")}>↻ {t.allowRetake}</button>
                </div>
              </div>

              <div className="panel">
                <h2>{t.googleConnection}</h2>
                <div className="form-grid single">
                  <label>{t.endpoint}<input value={settings.appsScriptUrl} onChange={(event) => {
                    const next = { ...settings, appsScriptUrl: event.target.value };
                    setSettings(next);
                    saveJson(STORAGE_SETTINGS, next);
                  }} placeholder="https://script.google.com/macros/s/..." /></label>
                  <label>{t.folderBase}<input value={settings.sheetName} onChange={(event) => {
                    const next = { ...settings, sheetName: event.target.value };
                    setSettings(next);
                    saveJson(STORAGE_SETTINGS, next);
                  }} /></label>
                </div>
                <p className="muted">Feuilles prévues : Candidates, TrainerAccounts, Vouchers, QuestionBank, Attempts, AttemptAnswers, SummaryReports, EmailQueue.</p>
              </div>

              <div className="panel wide">
                <h2>{t.accountManagement}</h2>
                <div className="form-grid">
                  <label>{t.voucherRole}
                    <select value={voucherForm.role} onChange={(event) => setVoucherForm({ ...voucherForm, role: event.target.value })}>
                      <option>Volontaire actif</option>
                      <option>Membre effectif</option>
                      <option>Candidat centre</option>
                      <option>Formateur</option>
                    </select>
                  </label>
                  <label>{t.assignedEmails}
                    <textarea value={voucherForm.assignedTo} onChange={(event) => setVoucherForm({ ...voucherForm, assignedTo: event.target.value })} placeholder="email1@example.com&#10;email2@example.com" />
                    <span className="field-help">{t.assignedEmailsHelp}</span>
                  </label>
                </div>
                <div className="actions">
                  <button className="primary" onClick={generateVoucher}>＋ {t.generateVouchers}</button>
                  <button onClick={createUserAccount}>✓ {t.createUserAccount}</button>
                </div>
                {accountNotice && <p className="helper-note">{accountNotice}</p>}
                <div className="account-admin-grid">
                  <div>
                    <h3>{t.generatedVouchers}</h3>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Code</th><th>{t.voucherRole}</th><th>{t.assignedTo}</th><th>{t.status}</th><th>{t.date}</th></tr></thead>
                        <tbody>
                          {voucherRecords.map((voucher) => (
                            <tr key={voucher.code}>
                              <td><strong>{voucher.code}</strong></td>
                              <td>{voucher.role}</td>
                              <td>{voucher.assignedTo || "-"}</td>
                              <td>{voucher.status}</td>
                              <td>{voucher.createdAt.slice(0, 10)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3>{t.userAccounts}</h3>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>{t.participant}</th><th>Email</th><th>{t.voucher}</th><th>{t.defaultLanguage}</th><th>{t.date}</th></tr></thead>
                        <tbody>
                          {userAccounts.map((user) => (
                            <tr key={user.email}>
                              <td>{user.name}</td>
                              <td>{user.email}</td>
                              <td>{user.voucherCode}</td>
                              <td>{user.defaultLanguage.toUpperCase()}</td>
                              <td>{user.createdAt.slice(0, 10)}</td>
                            </tr>
                          ))}
                          {!userAccounts.length && (
                            <tr><td colSpan={5}>-</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel wide">
                <h2>{t.cumulativeEco}</h2>
                <Aggregate attempts={attempts} language={language} group="eco" />
              </div>
              <div className="panel wide">
                <h2>{t.attemptHistory} ({attempts.length})</h2>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t.date}</th><th>{t.participant}</th><th>Email</th><th>{t.org}</th><th>{t.cohort}</th><th>{t.tests}</th><th>Score</th><th>%</th><th>{t.result}</th><th>{t.action}</th></tr></thead>
                    <tbody>
                      {attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td>{(attempt.submittedAt ?? attempt.startedAt).slice(0, 19)}</td>
                          <td>{attempt.candidate.name}</td>
                          <td>{attempt.candidate.email || "-"}</td>
                          <td>{attempt.candidate.organization || "-"}</td>
                          <td>{attempt.candidate.cohort || "-"}</td>
                          <td>{attempt.lotTitle}</td>
                          <td>{attempt.score}/{attempt.total}</td>
                          <td>{attempt.percent}%</td>
                          <td><Badge percent={attempt.percent} /></td>
                          <td><button onClick={() => { setActiveAttempt(attempt); setSelectedLotId(attempt.lotId); setView("results"); }}>◉ {t.see}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {candidateAttempts.length > 0 && view === "home" && (
        <section className="panel">
          <h2>Rapport de suivi candidat</h2>
          <div className="metric-grid">
            <Metric label={t.attempts} value={String(candidateAttempts.length)} />
            <Metric label="Dernier score" value={`${candidateAttempts[0].percent}%`} />
            <Metric label="Meilleure performance" value={`${Math.max(...candidateAttempts.map((attempt) => attempt.percent))}%`} />
            <Metric label="Mention actuelle" value={grade(candidateAttempts[0].percent).label} />
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Badge({ percent }: { percent: number }) {
  const result = grade(percent);
  return <span className={`badge ${result.className}`}>{result.label}</span>;
}

function ScoreRows({ title, rows }: { title: string; rows: { label: string; score: number; total: number; percent: number }[] }) {
  return (
    <div className="score-card">
      <h3>{title}</h3>
      {rows.map((row) => (
        <div className="score-row" key={row.label}>
          <div><strong>{row.label}</strong><span>{row.score}/{row.total} ({row.percent}%)</span></div>
          <Badge percent={row.percent} />
          <em><i style={{ width: `${row.percent}%` }} /></em>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({ lot, attempt, language, onHome }: { lot: ExamLot; attempt: Attempt; language: Language; onHome: () => void }) {
  const t = copy[language];

  return (
    <section className="panel results-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t.results} - {attempt.candidate.name}</p>
          <h1>{attempt.percent}% - {grade(attempt.percent).label}</h1>
        </div>
        <button onClick={onHome}>⌂ {t.home}</button>
      </div>
      <div className="metric-grid">
        <Metric label={t.total} value={`${attempt.score}/${attempt.total}`} />
        <Metric label={t.percentage} value={`${attempt.percent}%`} />
        <Metric label={t.lot} value={attempt.lotTitle} />
        <Metric label={t.status} value={attempt.status} />
      </div>
      <div className="score-grid">
        <ScoreRows title="ECO domain" rows={groupedScores(lot, attempt.answers, "eco", language)} />
        <ScoreRows title="Development approach" rows={groupedScores(lot, attempt.answers, "approach", language)} />
        <ScoreRows title="Performance Domain PMBOK 8" rows={groupedScores(lot, attempt.answers, "performanceDomain", language)} />
      </div>
      <h2>▤ {t.detailedCorrection}</h2>
      <div className="review-list">
        {lot.questions.map((question, index) => {
          const given = attempt.answers[question.id] ?? [];
          return (
            <QuestionReview
              key={question.id}
              question={question}
              index={index}
              given={given}
              language={language}
            />
          );
        })}
      </div>
    </section>
  );
}

function QuestionReview({ question, index, given, language }: { question: Question; index: number; given: number[]; language: Language }) {
  const correct = sameAnswer(given, question.correct);
  const t = copy[language];
  const givenText = given.length
    ? given.map((item) => optionLetters[item]).join(", ")
    : t.noAnswer;
  const correctText = question.correct.map((item) => optionLetters[item]).join(", ");

  return (
    <article className="correction-card">
      <div className="correction-tags">
        <span>{question.approach[language]}</span>
        <span>ECO: {question.eco[language]}</span>
        <span>#{index + 1}</span>
      </div>
      <h3>{index + 1}. {question.prompt[language]}</h3>
      <div className="correction-options">
        {question.options.map((option, optionIndex) => {
          const selected = given.includes(optionIndex);
          const isCorrect = question.correct.includes(optionIndex);
          const className = isCorrect ? "option-correct" : selected ? "option-wrong" : "";
          return (
            <div className={`correction-option ${className}`} key={option[language]}>
              <strong>{optionLetters[optionIndex]}.</strong>
              <span>{option[language]}</span>
              {isCorrect && <em>✓</em>}
              {selected && !isCorrect && <em>✕</em>}
            </div>
          );
        })}
      </div>
      <div className={`answer-explanation ${correct ? "correct" : "wrong"}`}>
        <p><strong>{t.yourAnswer}:</strong> {givenText}</p>
        <p><strong>{t.correctAnswer}:</strong> {correctText}</p>
        <p><strong>{t.explanation}:</strong> {question.explanation[language]}</p>
      </div>
    </article>
  );
}

function Aggregate({ attempts, language, group }: { attempts: Attempt[]; language: Language; group: "eco" | "performanceDomain" | "approach" }) {
  const rows = new Map<string, { label: string; score: number; total: number }>();
  attempts.filter((attempt) => attempt.status === "submitted").forEach((attempt) => {
    const lot = lots.find((item) => item.id === attempt.lotId);
    if (!lot) return;
    groupedScores(lot, attempt.answers, group, language).forEach((row) => {
      const aggregate = rows.get(row.label) ?? { label: row.label, score: 0, total: 0 };
      aggregate.score += row.score;
      aggregate.total += row.total;
      rows.set(row.label, aggregate);
    });
  });
  const scored = [...rows.values()].map((row) => ({ ...row, percent: row.total ? Math.round((row.score / row.total) * 100) : 0 }));
  return <ScoreRows title="Cumul" rows={scored.length ? scored : [{ label: "Aucune tentative soumise", score: 0, total: 0, percent: 0 }]} />;
}
