"use client";

import { useEffect, useMemo, useState } from "react";
import capmLot1Data from "./capm-lot1.json";
import capmLot2Data from "./capm-lot2.json";
import capmLot3Data from "./capm-lot3.json";

type Language = "fr" | "en";
type ExamType = "CAPM" | "PMP" | "CISSP" | "Gestion de projet";
type QuestionType = "single" | "multiple";
type VoucherCategory = "formation" | "volontaire" | "membre" | "partenaire";

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
  category: VoucherCategory;
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
  category: VoucherCategory;
  validityMonths: number;
  accessPercent: number;
  status: "available" | "assigned" | "used";
  assignedTo: string;
  usedBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string;
};

type UserAccount = {
  id?: string;
  name: string;
  email: string;
  organization: string;
  cohort: string;
  role: string;
  category: VoucherCategory;
  voucherCode: string;
  password: string;
  passwordHash?: string;
  defaultLanguage: Language;
  createdAt: string;
};

type AttemptLimit = {
  id: string;
  identifier: string;
  identifierType: "email" | "name" | "account";
  maxAttempts: number;
  active: boolean;
  note: string;
  createdAt: string;
};

type AppSettings = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  trainerAccount: string;
};

type SupabaseAuthSession = {
  access_token?: string;
  refresh_token?: string;
  user?: { id: string; email?: string };
};

const VERSION = "v0.2.10";
const UPDATED_AT = "2026-09-01";
const PLATFORM_URL = "https://test.pmi-drcongo.org/";
const TRAINER_PASSWORD = "221008";
const STORAGE_ATTEMPTS = "pmi-drc-kmaj-attempts";
const STORAGE_DRAFT = "pmi-drc-kmaj-draft";
const STORAGE_CANDIDATE = "pmi-drc-kmaj-candidate";
const STORAGE_SETTINGS = "pmi-drc-kmaj-settings";
const STORAGE_VOUCHERS = "pmi-drc-kmaj-vouchers";
const STORAGE_USERS = "pmi-drc-kmaj-users";
const STORAGE_ATTEMPT_LIMITS = "pmi-drc-kmaj-attempt-limits";
const STORAGE_SUPABASE_SESSION = "pmi-drc-kmaj-supabase-session";
const STORAGE_VOUCHER_SETTINGS = "pmi-drc-kmaj-voucher-settings";
const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: "https://wfsdsrmnxwxdebahznoq.supabase.co",
  supabaseAnonKey: "sb_publishable_A6yU8ee1-QFB4iSF8eGQbQ_ikc65MPG",
  trainerAccount: "admin@pmi-drcongo.org",
};

type VoucherSetting = {
  category: VoucherCategory;
  labelFr: string;
  labelEn: string;
  validityMonths: number;
  accessPercent: number;
  prefix: string;
};

const DEFAULT_VOUCHER_SETTINGS: VoucherSetting[] = [
  { category: "formation", labelFr: "Participant formation", labelEn: "Training participant", validityMonths: 4, accessPercent: 100, prefix: "FORMATION" },
  { category: "volontaire", labelFr: "Volontaire", labelEn: "Volunteer", validityMonths: 3, accessPercent: 60, prefix: "VOLONTAIRE" },
  { category: "membre", labelFr: "Membre", labelEn: "Member", validityMonths: 12, accessPercent: 60, prefix: "MEMBRE" },
  { category: "partenaire", labelFr: "Partenaire", labelEn: "Partner", validityMonths: 3, accessPercent: 50, prefix: "PARTENAIRE" },
];

const seedVouchers: VoucherRecord[] = [
  { code: "PMIRDC-ACTIF-2026", role: "Volontaire", category: "volontaire", validityMonths: 3, accessPercent: 60, status: "available", assignedTo: "", usedBy: "", createdAt: UPDATED_AT, expiresAt: "", usedAt: "" },
  { code: "KMAJ-FORMATION-2026", role: "Participant formation", category: "formation", validityMonths: 4, accessPercent: 100, status: "available", assignedTo: "", usedBy: "", createdAt: UPDATED_AT, expiresAt: "", usedAt: "" },
  { code: "MEMBRE-PMI-2026", role: "Membre", category: "membre", validityMonths: 12, accessPercent: 60, status: "available", assignedTo: "", usedBy: "", createdAt: UPDATED_AT, expiresAt: "", usedAt: "" },
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
const EXAM_SECTIONS: ExamType[] = ["CAPM", "PMP", "CISSP"];

const capmLot1 = capmLot1Data as ExamLot;
const capmLot2 = capmLot2Data as ExamLot;
const capmLot3 = capmLot3Data as ExamLot;
const cisspLotTitles = [
  "CISSP Mock Exam (Baseline)",
  "CISSP Mock Exam (LITE) - 1",
  "Domain Area Test: Security and Risk Management",
  "CISSP Mock Exam (LITE) - 2",
  "Domain Area Test: Identity and Access Management",
  "CISSP Mock Exam (LITE) - 3",
  "Domain Area Test: Security Engineering",
  "CISSP Mock Exam (LITE) - 4",
  "Domain Area Test: Communications and Network Security",
  "CISSP Mock Exam (LITE) - 5",
  "Domain Area Test: Security Assessment and Testing",
  "CISSP Mock Exam (LITE) - 6",
  "Domain Area Test: Asset Security",
  "CISSP Mock Exam (LITE) - 7",
  "Domain Area Test: Software Development Security",
  "CISSP Mock Exam (LITE) - 8",
  "Domain Area Test: Security Operations",
  "CISSP Mock Exam (LITE) - 9",
  "CISSP Mock Exam (LITE) - 10",
  "CISSP Mock Exam (LITE) - 11",
  "CISSP Mock Exam (LITE) - 12",
  "Domain Area Test: Multi Domain",
  "CISSP Mock Exam (LITE) - 13",
  "CISSP Mock Exam (LITE) - 14",
  "CISSP Extended Quiz",
  "CISSP Mock Exam (LITE)15",
  "CISSP Mock Exam (LITE)16",
  "CISSP Mock Exam (LITE)17",
  "CISSP Mock Exam (LITE)18",
  "CISSP Mock Exam (LITE)19",
  "Extra Domain Area Test: Security and Risk Management",
  "Extra Domain Area Test: Security Operations",
];
const cisspLots: ExamLot[] = cisspLotTitles.map((title, index) => ({
  id: `cissp-${String(index + 1).padStart(2, "0")}`,
  examType: "CISSP",
  source: "Supabase CISSP question bank",
  questionCount: 0,
  title: { fr: title, en: title },
  questions: [],
}));
const seedLots: ExamLot[] = [
  capmLot1,
  capmLot2,
  capmLot3,
  {
    id: "pmp-placeholder",
    examType: "PMP",
    source: "A charger",
    questionCount: 0,
    title: { fr: "PMP - Lots à charger", en: "PMP - Lots to upload" },
    questions: [],
  },
  ...cisspLots,
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
  if (lot.examType === "CISSP") return "🛡️";
  if (lot.examType === "Gestion de projet") return "🎯";
  return "🌱";
}

function lotTone(lot: ExamLot, index = 0) {
  if (lot.examType === "PMP") return "cyan";
  if (lot.examType === "CISSP") return "orange";
  if (lot.examType === "Gestion de projet") return "orange";
  return index % 2 === 0 ? "purple" : "cyan";
}

function lotDescription(lot: ExamLot, language: Language) {
  if (!lot.questions.length) {
    return language === "fr"
      ? "Lot prêt à recevoir les questions depuis Supabase."
      : "Lot ready to receive questions from Supabase.";
  }
  if (lot.examType === "CAPM") {
    return language === "fr"
      ? "Questions fondamentales CAPM : concepts clés, gouvernance, parties prenantes, risques et contraintes."
      : "CAPM fundamentals: core concepts, governance, stakeholders, risks, and constraints.";
  }
  if (lot.examType === "CISSP") {
    return language === "fr"
      ? "Questions CISSP en anglais uniquement : securite, risques, architecture, reseaux, operations et developpement."
      : "CISSP questions in English only: security, risk, architecture, networks, operations, and development.";
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
    heroTitle: "Examens blancs CAPM, PMP et CISSP",
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
    category: "Nature du candidat",
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
    platformStructureNote: "Les lots sont organises par sections CAPM, PMP et CISSP. CISSP reste en anglais uniquement. Les domaines ECO, approches et performance domains ne s'affichent pas pendant l'examen.",
    accountWithVoucher: "Créer ou utiliser un compte avec voucher",
    candidateAccount: "Compte candidat",
    accountHelp: "Pour creer un compte, renseignez votre nom, email, nature et mot de passe. Le voucher est associe automatiquement si le formateur l'a deja attribue a votre email.",
    signIn: "Se connecter",
    resetPassword: "Réinitialiser le mot de passe",
    voucherUnknown: "Aucun voucher actif n'est lie a ce compte. Acces limite applique.",
    loginUnknown: "Email ou mot de passe non reconnu.",
    selectLot: "Sélection du lot",
    selectExamCategory: "Choisissez une categorie d'examen",
    categoryHelp: "Les lots seront affiches apres le choix de la categorie.",
    openCategory: "Voir les lots",
    backToCategories: "Retour aux categories",
    cisspCategoryHint: "Acces protege par le mot de passe formateur.",
    editInfo: "Modifier mes informations",
    source: "Source",
    confirmStart: "Confirmez-vous le démarrage de cet examen ?",
    startLot: "Commencer",
    chapterName: "Chapitre PMI RDC",
    centerName: "Centre K-Majuscule",
    generalPm: "Gestion de projet général",
    cissp: "CISSP",
    cisspLocked: "CISSP est protege par le meme mot de passe que l'espace formateur.",
    cisspUnlock: "Debloquer CISSP",
    cisspPasswordError: "Mot de passe CISSP incorrect.",
    trainerAccess: "Accès protégé. Les données formateur sont prévues pour Supabase.",
    trainerPassword: "Mot de passe formateur",
    enter: "Entrer",
    trainerDashboard: "Dashboard formateur",
    accountManagement: "Vouchers et comptes utilisateur",
    voucherSettings: "Parametrage voucher",
    voucherRole: "Profil du voucher",
    validityMonths: "Duree de vie (mois)",
    accessPercent: "Acces aux lots (%)",
    assignedTo: "Attribue a",
    assignedEmails: "Emails a attribuer",
    assignedEmailsHelp: "Saisissez un email par ligne, ou separez-les par virgule/point-virgule.",
    generateVoucher: "Generer un voucher",
    generateVouchers: "Generer et attribuer",
    createUserAccount: "Créer mon compte",
    generatedVouchers: "Vouchers generes",
    userAccounts: "Comptes utilisateur",
    accountCreated: "Compte cree",
    accountCreatedNoVoucher: "Compte cree sans voucher lie. Une notification a ete preparee pour l'administrateur.",
    voucherAssignedEmail: "Email d'attribution prepare pour le candidat.",
    restrictedAccess: "Sans compte ou sans voucher lie, l'acces est limite a un seul lot de moins de 100 questions pendant 3 mois.",
    voucherAccessDenied: "Ce voucher ne donne pas acces a ce lot. Demandez une extension au formateur.",
    voucherExpired: "Le voucher lie a ce compte est expire.",
    profileDashboard: "Profil candidat",
    readiness: "Preparation examen",
    ready: "Pret",
    notReady: "Pas encore pret",
    qualifyingLots: "Lots valides au 1er essai",
    copyVoucher: "Copier le voucher",
    attemptsLabel: "Tentatives",
    average: "Moyenne",
    tests: "Tests",
    exportCsv: "Export CSV",
    uploadLot: "Charger un lot",
    allowRetake: "Autoriser reprise",
    syncStatus: "Statut sync",
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
    heroTitle: "CAPM, PMP, and CISSP practice exams",
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
    category: "Candidate category",
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
    platformStructureNote: "Lots are organized into CAPM, PMP, and CISSP sections. CISSP stays English-only. ECO domains, approaches, and performance domains are hidden during the exam.",
    accountWithVoucher: "Create or use an account with voucher",
    candidateAccount: "Candidate account",
    accountHelp: "To create an account, enter your name, email, category, and password. The voucher is linked automatically if the trainer already assigned it to your email.",
    signIn: "Sign in",
    resetPassword: "Reset password",
    voucherUnknown: "No active voucher is linked to this account. Restricted access applies.",
    loginUnknown: "Email or password not recognized.",
    selectLot: "Lot selection",
    selectExamCategory: "Choose an exam category",
    categoryHelp: "Lots appear after you choose the category.",
    openCategory: "See lots",
    backToCategories: "Back to categories",
    cisspCategoryHint: "Access protected by the trainer password.",
    editInfo: "Edit my information",
    source: "Source",
    confirmStart: "Do you confirm that you want to start this exam?",
    startLot: "Start",
    chapterName: "PMI DRC Chapter",
    centerName: "K-Majuscule Center",
    generalPm: "General project management",
    cissp: "CISSP",
    cisspLocked: "CISSP is protected with the same password as the trainer area.",
    cisspUnlock: "Unlock CISSP",
    cisspPasswordError: "Incorrect CISSP password.",
    trainerAccess: "Protected access. Trainer data is designed for Supabase.",
    trainerPassword: "Trainer password",
    enter: "Enter",
    trainerDashboard: "Trainer dashboard",
    accountManagement: "Vouchers and user accounts",
    voucherSettings: "Voucher settings",
    voucherRole: "Voucher profile",
    validityMonths: "Validity (months)",
    accessPercent: "Lot access (%)",
    assignedTo: "Assigned to",
    assignedEmails: "Emails to assign",
    assignedEmailsHelp: "Enter one email per line, or separate emails with commas/semicolons.",
    generateVoucher: "Generate voucher",
    generateVouchers: "Generate and assign",
    createUserAccount: "Create my account",
    generatedVouchers: "Generated vouchers",
    userAccounts: "User accounts",
    accountCreated: "Account created",
    accountCreatedNoVoucher: "Account created without a linked voucher. A notification was prepared for the administrator.",
    voucherAssignedEmail: "Voucher assignment email prepared for the candidate.",
    restrictedAccess: "Without an account or linked voucher, access is limited to one lot under 100 questions for 3 months.",
    voucherAccessDenied: "This voucher does not grant access to this lot. Ask the trainer for an extension.",
    voucherExpired: "The voucher linked to this account is expired.",
    profileDashboard: "Candidate profile",
    readiness: "Exam readiness",
    ready: "Ready",
    notReady: "Not ready yet",
    qualifyingLots: "First-attempt qualifying lots",
    copyVoucher: "Copy voucher",
    attemptsLabel: "Attempts",
    average: "Average",
    tests: "Tests",
    exportCsv: "Export CSV",
    uploadLot: "Upload a lot",
    allowRetake: "Allow retake",
    syncStatus: "Sync status",
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

function voucherSettingLabel(setting: VoucherSetting, language: Language) {
  return language === "fr" ? setting.labelFr : setting.labelEn;
}

function voucherSettingFor(category: VoucherCategory, settings: VoucherSetting[] = DEFAULT_VOUCHER_SETTINGS) {
  return settings.find((item) => item.category === category) ?? DEFAULT_VOUCHER_SETTINGS[0];
}

function voucherCategoryFromRole(role: string): VoucherCategory {
  const value = role.toLowerCase();
  if (value.includes("volont")) return "volontaire";
  if (value.includes("membre")) return "membre";
  if (value.includes("partenaire")) return "partenaire";
  return "formation";
}

function normalizeVoucherCategory(value: unknown, role = ""): VoucherCategory {
  if (value === "formation" || value === "volontaire" || value === "membre" || value === "partenaire") return value;
  return voucherCategoryFromRole(role);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isExpired(date: string) {
  return Boolean(date && new Date(date).getTime() < Date.now());
}

function normalizeVoucherRecord(row: Record<string, string | number | null>): VoucherRecord {
  const status = row.status === "used" || row.status === "assigned" ? row.status : "available";
  const role = String(row.role || "");
  const category = normalizeVoucherCategory(row.category, role);
  const defaultSetting = voucherSettingFor(category);
  return {
    code: String(row.code || row.voucherCode || row.voucher_code || ""),
    role: role || defaultSetting.labelFr,
    category,
    validityMonths: Number(row.validityMonths || row.validity_months || defaultSetting.validityMonths),
    accessPercent: Number(row.accessPercent || row.access_percent || defaultSetting.accessPercent),
    status,
    assignedTo: String(row.assignedTo || row.assigned_to || ""),
    usedBy: String(row.usedBy || row.used_by || ""),
    createdAt: String(row.createdAt || row.created_at || ""),
    expiresAt: String(row.expiresAt || row.expires_at || ""),
    usedAt: String(row.usedAt || row.used_at || ""),
  };
}

function normalizeUserAccount(row: Record<string, string>): UserAccount {
  const role = row.role || "";
  return {
    id: row.id || row.userId || row.user_id || "",
    name: row.name || "",
    email: row.email || "",
    organization: row.organization || "",
    cohort: row.cohort || "",
    role,
    category: normalizeVoucherCategory(row.category, role),
    voucherCode: row.voucherCode || row.voucher_code || "",
    password: row.password || "",
    passwordHash: row.passwordHash || row.password_hash || "",
    defaultLanguage: row.defaultLanguage === "en" || row.default_language === "en" ? "en" : "fr",
    createdAt: row.createdAt || row.created_at || "",
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

function isSupabaseConfigured(settings: AppSettings) {
  return Boolean(cleanSupabaseUrl(settings.supabaseUrl) && settings.supabaseAnonKey.trim());
}

function supabaseHeaders(settings: AppSettings, token?: string, prefer?: string) {
  const headers: Record<string, string> = {
    apikey: settings.supabaseAnonKey.trim(),
    Authorization: `Bearer ${token || settings.supabaseAnonKey.trim()}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function parseSupabaseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText);
  }
  return text ? JSON.parse(text) as T : ([] as T);
}

function voucherToSupabase(voucher: VoucherRecord) {
  return {
    code: voucher.code,
    role: voucher.role,
    category: voucher.category,
    validity_months: voucher.validityMonths,
    access_percent: voucher.accessPercent,
    status: voucher.status,
    assigned_to: voucher.assignedTo,
    used_by: voucher.usedBy,
    created_at: voucher.createdAt,
    expires_at: voucher.expiresAt || null,
    used_at: voucher.usedAt || null,
  };
}

function profileToSupabase(user: UserAccount) {
  return {
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
    organization: user.organization,
    cohort: user.cohort,
    role: user.role,
    category: user.category,
    voucher_code: user.voucherCode,
    default_language: user.defaultLanguage,
    created_at: user.createdAt,
  };
}

function attemptToSupabase(attempt: Attempt) {
  return {
    id: attempt.id,
    candidate_name: attempt.candidate.name,
    email: normalizeEmail(attempt.candidate.email),
    organization: attempt.candidate.organization,
    cohort: attempt.candidate.cohort,
    has_account: attempt.candidate.hasAccount,
    exam_type: attempt.candidate.examType,
    lot_id: attempt.lotId,
    lot_title: attempt.lotTitle,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt || null,
    status: attempt.status,
    score: attempt.score,
    total: attempt.total,
    percent: attempt.percent,
    remaining_seconds: attempt.remainingSeconds,
  };
}

function attemptAnswerRows(attempt: Attempt, lot: ExamLot) {
  return lot.questions.map((question) => ({
    attempt_id: attempt.id,
    question_id: question.id,
    answer_indexes: attempt.answers[question.id] || [],
    is_correct: sameAnswer(attempt.answers[question.id] || [], question.correct),
    highlighted: attempt.highlighted.includes(question.id),
  }));
}

function lotToSupabase(lot: ExamLot) {
  return {
    id: lot.id,
    exam_type: lot.examType,
    title_fr: lot.title.fr,
    title_en: lot.title.en,
    source: lot.source,
    question_count: lot.questionCount || lot.questions.length,
    active: true,
  };
}

function questionToSupabase(question: Question, lot: ExamLot) {
  return {
    id: question.id,
    lot_id: lot.id,
    exam_type: lot.examType,
    question_type: question.type,
    prompt_fr: question.prompt.fr,
    prompt_en: question.prompt.en,
    options_fr: question.options.map((option) => option.fr),
    options_en: question.options.map((option) => option.en),
    correct_indexes: question.correct,
    explanation_fr: question.explanation.fr,
    explanation_en: question.explanation.en,
    eco_fr: question.eco.fr,
    eco_en: question.eco.en,
    performance_domain_fr: question.performanceDomain.fr,
    performance_domain_en: question.performanceDomain.en,
    approach_fr: question.approach.fr,
    approach_en: question.approach.en,
    active: true,
  };
}

function attemptLimitToSupabase(limit: AttemptLimit) {
  return {
    id: limit.id,
    identifier: limit.identifier,
    identifier_type: limit.identifierType,
    max_attempts: limit.maxAttempts,
    active: limit.active,
    note: limit.note,
    created_at: limit.createdAt,
  };
}

function voucherSettingToSupabase(setting: VoucherSetting) {
  return {
    category: setting.category,
    label_fr: setting.labelFr,
    label_en: setting.labelEn,
    validity_months: setting.validityMonths,
    access_percent: setting.accessPercent,
    prefix: setting.prefix,
    updated_at: new Date().toISOString(),
  };
}

function normalizeVoucherSetting(row: Record<string, unknown>): VoucherSetting {
  const category = normalizeVoucherCategory(row.category);
  const fallback = voucherSettingFor(category);
  return {
    category,
    labelFr: String(row.label_fr || row.labelFr || fallback.labelFr),
    labelEn: String(row.label_en || row.labelEn || fallback.labelEn),
    validityMonths: Number(row.validity_months || row.validityMonths || fallback.validityMonths),
    accessPercent: Number(row.access_percent || row.accessPercent || fallback.accessPercent),
    prefix: String(row.prefix || fallback.prefix),
  };
}

function normalizeAttemptLimit(row: Record<string, unknown>): AttemptLimit {
  const identifierType = row.identifier_type === "name" || row.identifier_type === "account" ? row.identifier_type : "email";
  return {
    id: String(row.id || crypto.randomUUID()),
    identifier: String(row.identifier || ""),
    identifierType,
    maxAttempts: Math.max(0, Number(row.max_attempts || row.maxAttempts || 0)),
    active: row.active !== false,
    note: String(row.note || ""),
    createdAt: String(row.created_at || row.createdAt || ""),
  };
}

function normalizeSupabaseAttempt(row: Record<string, string | number | boolean | null>, answerRows: Record<string, unknown>[]): Attempt {
  const attemptAnswers = answerRows.filter((answer) => answer.attempt_id === row.id);
  const answers = Object.fromEntries(attemptAnswers.map((answer) => [
    String(answer.question_id),
    Array.isArray(answer.answer_indexes) ? answer.answer_indexes as number[] : [],
  ]));
  const highlighted = attemptAnswers
    .filter((answer) => Boolean(answer.highlighted))
    .map((answer) => String(answer.question_id));

  return {
    id: String(row.id),
    candidate: {
      name: String(row.candidate_name || ""),
      email: String(row.email || ""),
      organization: String(row.organization || ""),
      cohort: String(row.cohort || ""),
      category: "formation",
      examType: parseExamType(row.exam_type),
      sendEmail: false,
      hasAccount: Boolean(row.has_account),
      voucher: "",
      password: "",
      language: "fr",
    },
    lotId: String(row.lot_id || ""),
    lotTitle: String(row.lot_title || ""),
    startedAt: String(row.started_at || ""),
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    status: row.status === "saved" || row.status === "cancelled" ? row.status : "submitted",
    answers,
    highlighted,
    score: Number(row.score || 0),
    total: Number(row.total || 0),
    percent: Number(row.percent || 0),
    remainingSeconds: Number(row.remaining_seconds || 0),
  };
}

function arrayFromJson(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function numberArrayFromJson(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeSupabaseLots(lotRows: Record<string, unknown>[], questionRows: Record<string, unknown>[]): ExamLot[] {
  return lotRows.map((lot) => {
    const questions = questionRows
      .filter((question) => question.lot_id === lot.id)
      .map((question): Question => {
        const optionsFr = arrayFromJson(question.options_fr);
        const optionsEn = arrayFromJson(question.options_en);
        return {
          id: String(question.id),
          type: question.question_type === "multiple" ? "multiple" : "single",
          prompt: { fr: String(question.prompt_fr || ""), en: String(question.prompt_en || "") },
          options: optionsFr.map((option, index) => ({ fr: option, en: optionsEn[index] || option })),
          correct: numberArrayFromJson(question.correct_indexes),
          explanation: { fr: String(question.explanation_fr || ""), en: String(question.explanation_en || "") },
          eco: { fr: String(question.eco_fr || ""), en: String(question.eco_en || "") },
          performanceDomain: {
            fr: String(question.performance_domain_fr || ""),
            en: String(question.performance_domain_en || ""),
          },
          approach: { fr: String(question.approach_fr || ""), en: String(question.approach_en || "") },
        };
      });
    return {
      id: String(lot.id),
      examType: parseExamType(lot.exam_type),
      title: { fr: String(lot.title_fr || ""), en: String(lot.title_en || "") },
      source: String(lot.source || "Supabase"),
      questionCount: Number(lot.question_count || questions.length),
      questions,
    };
  });
}

function mergeExamLots(localLots: ExamLot[], remoteLots: ExamLot[]) {
  const remoteById = new Map(remoteLots.map((lot) => [lot.id, lot]));
  const merged = localLots.map((lot) => remoteById.get(lot.id) ?? lot);
  const localIds = new Set(localLots.map((lot) => lot.id));
  remoteLots.forEach((lot) => {
    if (!localIds.has(lot.id)) merged.push(lot);
  });
  return merged;
}

function parseExamType(value: unknown): ExamType {
  if (value === "PMP" || value === "CISSP" || value === "Gestion de projet") return value;
  return "CAPM";
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

function candidateLinkedVoucher(candidate: Candidate, vouchers: VoucherRecord[], users: UserAccount[]) {
  const email = normalizeEmail(candidate.email);
  const account = users.find((user) => email && normalizeEmail(user.email) === email);
  const code = normalizeVoucher(candidate.voucher || account?.voucherCode || "");
  const voucher = code
    ? vouchers.find((item) => normalizeVoucher(item.code) === code)
    : vouchers.find((item) =>
        email &&
        item.status === "used" &&
        normalizeEmail(item.usedBy) === email,
      ) || vouchers.find((item) =>
        email &&
        item.status !== "used" &&
        normalizeEmail(item.assignedTo) === email,
      );
  if (!voucher || isExpired(voucher.expiresAt)) return null;
  if (email && voucher.assignedTo && normalizeEmail(voucher.assignedTo) !== email) return null;
  if (email && voucher.usedBy && normalizeEmail(voucher.usedBy) !== email) return null;
  return voucher;
}

function allowedLotsForVoucher(lots: ExamLot[], voucher: VoucherRecord) {
  const allowedCount = Math.max(1, Math.ceil(lots.length * Math.min(100, Math.max(0, voucher.accessPercent)) / 100));
  return lots.slice(0, allowedCount);
}

function hasRestrictedAttemptInLastThreeMonths(candidate: Candidate, attempts: Attempt[]) {
  const floor = addMonths(new Date(), -3).getTime();
  return attempts.some((attempt) =>
    attempt.status !== "cancelled" &&
    (!attempt.candidate.hasAccount || !attempt.candidate.voucher) &&
    isSameGuest(candidate, attempt) &&
    new Date(attempt.startedAt).getTime() >= floor,
  );
}

function readinessSummary(attempts: Attempt[], examType: ExamType) {
  const submitted = attempts
    .filter((attempt) => attempt.status === "submitted" && attempt.candidate.examType === examType)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const firstByLot = new Map<string, Attempt>();
  submitted.forEach((attempt) => {
    if (!firstByLot.has(attempt.lotId)) firstByLot.set(attempt.lotId, attempt);
  });
  const threshold = examType === "PMP" ? 75 : examType === "CAPM" ? 80 : 70;
  const qualifying = [...firstByLot.values()].filter((attempt) => attempt.percent >= threshold);
  return {
    submitted: submitted.length,
    lots: new Set(submitted.map((attempt) => attempt.lotId)).size,
    best: submitted.length ? Math.max(...submitted.map((attempt) => attempt.percent)) : 0,
    average: submitted.length ? Math.round(submitted.reduce((sum, attempt) => sum + attempt.percent, 0) / submitted.length) : 0,
    threshold,
    qualifyingLots: qualifying.length,
    ready: qualifying.length >= 2,
  };
}

function matchesAttemptLimit(candidate: Candidate, limit: AttemptLimit) {
  const identifier = limit.identifier.trim().toLowerCase();
  if (!identifier || !limit.active) return false;
  if (limit.identifierType === "email") return normalizeEmail(candidate.email) === identifier;
  if (limit.identifierType === "account") return candidate.hasAccount && normalizeEmail(candidate.email) === identifier;
  return candidate.name.trim().toLowerCase() === identifier;
}

function candidateMatchesAttempt(candidate: Candidate, attempt: Attempt) {
  const email = normalizeEmail(candidate.email);
  const attemptEmail = normalizeEmail(attempt.candidate.email);
  if (email && attemptEmail && email === attemptEmail) return true;
  const name = candidate.name.trim().toLowerCase();
  return Boolean(name && name === attempt.candidate.name.trim().toLowerCase());
}

function initialCandidate(): Candidate {
  return {
    name: "",
    email: "",
    organization: "",
    cohort: "",
    category: "formation",
    examType: "CAPM",
    sendEmail: false,
    hasAccount: false,
    voucher: "",
    password: "",
    language: "fr",
  };
}

export default function Home() {
  const [candidate, setCandidate] = useState<Candidate>(() => ({ ...initialCandidate(), ...loadJson<Partial<Candidate>>(STORAGE_CANDIDATE, {}) }));
  const [language, setLanguage] = useState<Language>(() => loadJson<Partial<Candidate>>(STORAGE_CANDIDATE, {}).language ?? "fr");
  const [view, setView] = useState<"home" | "select" | "exam" | "results" | "trainer">("home");
  const [examLots, setExamLots] = useState<ExamLot[]>(seedLots);
  const [selectedExamCategory, setSelectedExamCategory] = useState<ExamType | null>(null);
  const [selectedLotId, setSelectedLotId] = useState(capmLot1.id);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(durationFor(capmLot1.questionCount));
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadJson<Attempt[]>(STORAGE_ATTEMPTS, []));
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [trainerPassword, setTrainerPassword] = useState("");
  const [trainerUnlocked, setTrainerUnlocked] = useState(false);
  const [cisspPassword, setCisspPassword] = useState("");
  const [cisspNotice, setCisspNotice] = useState("");
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS, ...loadJson<Partial<AppSettings>>(STORAGE_SETTINGS, {}) }));
  const [supabaseSession, setSupabaseSession] = useState<SupabaseAuthSession | null>(() => loadJson<SupabaseAuthSession | null>(STORAGE_SUPABASE_SESSION, null));
  const [voucherRecords, setVoucherRecords] = useState<VoucherRecord[]>(() => loadJson<VoucherRecord[]>(STORAGE_VOUCHERS, seedVouchers));
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => loadJson<UserAccount[]>(STORAGE_USERS, []));
  const [voucherSettings, setVoucherSettings] = useState<VoucherSetting[]>(() => loadJson<VoucherSetting[]>(STORAGE_VOUCHER_SETTINGS, DEFAULT_VOUCHER_SETTINGS));
  const [voucherForm, setVoucherForm] = useState({ category: "formation" as VoucherCategory, assignedTo: "" });
  const [attemptLimits, setAttemptLimits] = useState<AttemptLimit[]>(() => loadJson<AttemptLimit[]>(STORAGE_ATTEMPT_LIMITS, []));
  const [limitForm, setLimitForm] = useState({ identifier: "", identifierType: "email" as AttemptLimit["identifierType"], maxAttempts: 2, note: "" });
  const [accountNotice, setAccountNotice] = useState("");
  const [accessNotice, setAccessNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  const selectedLot = useMemo(() => examLots.find((lot) => lot.id === selectedLotId) ?? capmLot1, [examLots, selectedLotId]);
  const t = copy[language];
  const progress = selectedLot.questions.length ? Object.keys(answers).filter((id) => answers[id]?.length).length : 0;
  const duration = durationFor(selectedLot.questionCount || selectedLot.questions.length || 15);
  const timePercent = duration ? remainingSeconds / duration : 1;
  const currentScore = scoreAttempt(selectedLot, answers);
  const visibleLots = examLots.filter((lot) => lot.examType === candidate.examType);
  const lotSections = EXAM_SECTIONS.map((examType) => ({
    examType,
    lots: examLots.filter((lot) => lot.examType === examType),
  }));
  const selectedSection = selectedExamCategory
    ? {
        examType: selectedExamCategory,
        lots: examLots.filter((lot) => lot.examType === selectedExamCategory),
      }
    : null;
  const canAccessLots =
    Boolean(!candidate.hasAccount && candidate.name.trim()) ||
    Boolean(candidate.hasAccount && candidate.email.trim() && candidate.password);
  const candidateAttempts = attempts.filter((attempt) => {
    const sameEmail = candidate.email && attempt.candidate.email === candidate.email;
    const sameName = candidate.name && attempt.candidate.name.toLowerCase() === candidate.name.toLowerCase();
    return sameEmail || sameName;
  });
  const candidateReadiness = readinessSummary(candidateAttempts, candidate.examType);

  async function unlockCissp() {
    if (cisspPassword === TRAINER_PASSWORD) {
      setTrainerUnlocked(true);
      setSelectedExamCategory("CISSP");
      setCisspNotice("");
      if (isSupabaseConfigured(settings)) await refreshRemoteData();
      return;
    }
    setCisspNotice(t.cisspPasswordError);
  }

  function chooseExamCategory(examType: ExamType) {
    setAccessNotice("");
    setCisspNotice("");
    setSelectedExamCategory(examType);
    updateCandidate({ examType, language: examType === "CISSP" ? "en" : candidate.language });
    if (examType === "CISSP") setLanguage("en");
  }

  useEffect(() => {
    if (view !== "exam") return;
    if (remainingSeconds <= 0) {
      submitAttempt("submitted");
      return;
    }
    const timer = window.setTimeout(() => setRemainingSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [view, remainingSeconds]);

  useEffect(() => {
    if (view === "trainer" && trainerUnlocked && isSupabaseConfigured(settings)) {
      refreshRemoteData();
    }
  }, [view, trainerUnlocked]);

  function updateCandidate(patch: Partial<Candidate>) {
    const next = { ...candidate, ...patch };
    setCandidate(next);
    setLanguage(next.language);
    setAccessNotice("");
    saveJson(STORAGE_CANDIDATE, next);
  }

  async function supabaseRequest<T>(path: string, options: { method?: string; body?: unknown; token?: string; prefer?: string } = {}) {
    if (!isSupabaseConfigured(settings)) {
      throw new Error(language === "fr" ? "Supabase n'est pas configure." : "Supabase is not configured.");
    }
    const response = await fetch(`${cleanSupabaseUrl(settings.supabaseUrl)}${path}`, {
      method: options.method || "GET",
      headers: supabaseHeaders(settings, options.token || supabaseSession?.access_token, options.prefer),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    return parseSupabaseResponse<T>(response);
  }

  async function supabaseAuth<T>(path: string, body: unknown) {
    if (!isSupabaseConfigured(settings)) {
      throw new Error(language === "fr" ? "Supabase n'est pas configure." : "Supabase is not configured.");
    }
    const response = await fetch(`${cleanSupabaseUrl(settings.supabaseUrl)}${path}`, {
      method: "POST",
      headers: supabaseHeaders(settings),
      body: JSON.stringify(body),
    });
    return parseSupabaseResponse<T>(response);
  }

  async function supabaseSignIn(email: string, password: string) {
    const session = await supabaseAuth<SupabaseAuthSession>("/auth/v1/token?grant_type=password", {
      email: normalizeEmail(email),
      password,
    });
    if (!session.access_token) throw new Error(language === "fr" ? "Session Supabase introuvable." : "Supabase session is missing.");
    setSupabaseSession(session);
    saveJson(STORAGE_SUPABASE_SESSION, session);
    return session;
  }

  async function supabaseGetProfile(userId: string, token: string) {
    const rows = await supabaseRequest<Record<string, string>[]>(
      `/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { token },
    );
    return rows[0] ? normalizeUserAccount(rows[0]) : null;
  }

  async function supabaseSaveVouchers(vouchers: VoucherRecord[]) {
    await supabaseRequest("/rest/v1/vouchers?on_conflict=code", {
      method: "POST",
      body: vouchers.map(voucherToSupabase),
      prefer: "resolution=merge-duplicates,return=representation",
    });
  }

  async function supabaseFindVoucher(code: string) {
    const rows = await supabaseRequest<Record<string, string>[]>(
      `/rest/v1/vouchers?select=*&code=eq.${encodeURIComponent(normalizeVoucher(code))}&limit=1`,
    );
    return rows[0] ? normalizeVoucherRecord(rows[0]) : null;
  }

  async function supabaseFindVoucherForEmail(email: string, category: VoucherCategory) {
    const rows = await supabaseRequest<Record<string, string | number | null>[]>(
      `/rest/v1/vouchers?select=*&assigned_to=eq.${encodeURIComponent(normalizeEmail(email))}&category=eq.${encodeURIComponent(category)}&status=neq.used&order=created_at.desc&limit=1`,
    );
    return rows[0] ? normalizeVoucherRecord(rows[0]) : null;
  }

  async function queueEmail(toEmail: string, subject: string, body: string, attemptId: string | null = null) {
    if (!isSupabaseConfigured(settings) || !toEmail.trim()) return;
    await supabaseRequest("/rest/v1/email_queue", {
      method: "POST",
      body: [{
        attempt_id: attemptId,
        to_email: normalizeEmail(toEmail),
        subject,
        payload_json: { body },
        status: "queued",
        created_at: new Date().toISOString(),
      }],
    });
  }

  async function supabaseCreateUserAccount(account: UserAccount, voucher: VoucherRecord | null) {
    const auth = await supabaseAuth<SupabaseAuthSession>("/auth/v1/signup", {
      email: normalizeEmail(account.email),
      password: account.password,
      data: {
        name: account.name,
        organization: account.organization,
        cohort: account.cohort,
        role: account.role,
        category: account.category,
        voucher_code: account.voucherCode,
        default_language: account.defaultLanguage,
      },
    });
    const authUser = auth.user;
    if (!auth.access_token && authUser?.id) {
      return { ...account, id: authUser.id, password: "" };
    }
    const session = auth.access_token ? auth : await supabaseSignIn(account.email, account.password);
    const userId = session.user?.id;
    if (!userId || !session.access_token) throw new Error(language === "fr" ? "Compte cree, mais session Supabase introuvable." : "Account created, but Supabase session is missing.");

    const savedAccount = { ...account, id: userId, password: "" };
    await supabaseRequest("/rest/v1/profiles?on_conflict=id", {
      method: "POST",
      token: session.access_token,
      body: [profileToSupabase(savedAccount)],
      prefer: "resolution=merge-duplicates,return=representation",
    });
    if (voucher) {
      await supabaseRequest(`/rest/v1/vouchers?code=eq.${encodeURIComponent(voucher.code)}`, {
        method: "PATCH",
        token: session.access_token,
        body: {
          status: "used",
          used_by: normalizeEmail(account.email),
          used_at: account.createdAt,
        },
        prefer: "return=representation",
      });
    }
    setSupabaseSession(session);
    saveJson(STORAGE_SUPABASE_SESSION, session);
    return savedAccount;
  }

  async function supabaseSaveAttempt(attempt: Attempt) {
    await supabaseRequest("/rest/v1/attempts?on_conflict=id", {
      method: "POST",
      body: [attemptToSupabase(attempt)],
      prefer: "resolution=merge-duplicates,return=representation",
    });
    await supabaseRequest(`/rest/v1/attempt_answers?attempt_id=eq.${encodeURIComponent(attempt.id)}`, {
      method: "DELETE",
    });
    await supabaseRequest("/rest/v1/attempt_answers", {
      method: "POST",
      body: attemptAnswerRows(attempt, selectedLot),
      prefer: "return=representation",
    });
  }

  async function testSupabaseConnection() {
    try {
      if (!isSupabaseConfigured(settings)) {
        setSyncStatus(language === "fr" ? "Supabase non configure." : "Supabase is not configured.");
        return;
      }
      const testVoucher: VoucherRecord = {
        code: `DBTEST-${Date.now()}`,
        role: "Test connexion",
        category: "formation",
        validityMonths: 4,
        accessPercent: 100,
        status: "available",
        assignedTo: "",
        usedBy: "",
        createdAt: new Date().toISOString(),
        expiresAt: addMonths(new Date(), 4).toISOString(),
        usedAt: "",
      };
      await supabaseSaveVouchers([testVoucher]);
      const [vouchers, attemptsRows, questionRows] = await Promise.all([
        supabaseRequest<Record<string, string>[]>("/rest/v1/vouchers?select=code,role,status&order=created_at.desc&limit=3"),
        supabaseRequest<Array<{ id: string }>>("/rest/v1/attempts?select=id&limit=10000"),
        supabaseRequest<Array<{ id: string }>>("/rest/v1/question_bank?select=id&limit=10000"),
      ]);
      const summary = {
        testVoucher: testVoucher.code,
        recentVouchers: vouchers.length,
        attemptsRows: attemptsRows.length,
        questionRows: questionRows.length,
      };
      setSyncStatus(`supabase test OK: ${JSON.stringify(summary)}`);
    } catch (error) {
      setSyncStatus(`supabase test ERROR: ${error instanceof Error ? error.message : "sync error"}`);
    }
  }

  async function seedCapmLotsToSupabase() {
    try {
      if (!isSupabaseConfigured(settings)) {
        setSyncStatus(language === "fr" ? "Supabase non configure." : "Supabase is not configured.");
        return;
      }
      const capmLots = [capmLot1, capmLot2, capmLot3];
      await supabaseRequest("/rest/v1/exam_lots?on_conflict=id", {
        method: "POST",
        body: capmLots.map(lotToSupabase),
        prefer: "resolution=merge-duplicates,return=representation",
      });
      await supabaseRequest("/rest/v1/question_bank?on_conflict=id", {
        method: "POST",
        body: capmLots.flatMap((lot) => lot.questions.map((question) => questionToSupabase(question, lot))),
        prefer: "resolution=merge-duplicates,return=representation",
      });
      setExamLots(seedLots);
      setSyncStatus(`supabase seed OK: ${capmLots.reduce((sum, lot) => sum + lot.questions.length, 0)} questions CAPM Lots 1-3`);
    } catch (error) {
      setSyncStatus(`supabase seed ERROR: ${error instanceof Error ? error.message : "sync error"}`);
    }
  }

  async function seedCisspLotsToSupabase() {
    try {
      if (!isSupabaseConfigured(settings)) {
        setSyncStatus(language === "fr" ? "Supabase non configure." : "Supabase is not configured.");
        return;
      }
      await supabaseRequest("/rest/v1/exam_lots?on_conflict=id", {
        method: "POST",
        body: cisspLots.map(lotToSupabase),
        prefer: "resolution=merge-duplicates,return=representation",
      });
      setExamLots(mergeExamLots(seedLots, cisspLots));
      setSyncStatus(`supabase seed OK: ${cisspLots.length} CISSP lot shells`);
    } catch (error) {
      setSyncStatus(`supabase seed CISSP ERROR: ${error instanceof Error ? error.message : "sync error"}`);
    }
  }

  async function validateAccountLogin(profile: Candidate = candidate) {
    if (isSupabaseConfigured(settings)) {
      const session = await supabaseSignIn(profile.email, profile.password);
      const accountProfile = session.user?.id && session.access_token ? await supabaseGetProfile(session.user.id, session.access_token) : null;
      if (accountProfile) return accountProfile;
      return {
        name: profile.name || session.user?.email || "",
        email: session.user?.email || profile.email,
        organization: profile.organization,
        cohort: profile.cohort,
        role: "Candidat",
        category: profile.category,
        voucherCode: profile.voucher,
        password: "",
        defaultLanguage: profile.language,
        createdAt: new Date().toISOString(),
      };
    }
    const email = normalizeEmail(profile.email);
    const account = userAccounts.find((user) => normalizeEmail(user.email) === email);
    if (!account) return null;
    if (account.password && account.password === profile.password) return account;
    if (account.passwordHash) {
      const passwordHash = await sha256(profile.password);
      if (passwordHash === account.passwordHash) return account;
    }
    return null;
  }

  async function startSelect(forceAccount = false) {
    const profile = forceAccount ? { ...candidate, hasAccount: true } : candidate;
    const profileCanAccessLots =
      Boolean(!profile.hasAccount && profile.name.trim()) ||
      Boolean(profile.hasAccount && profile.email.trim() && profile.password);
    if (!profileCanAccessLots) {
      setAccessNotice(t.accessMissingNameEmail);
      return;
    }
    let account: UserAccount | null = null;
    try {
      account = profile.hasAccount ? await validateAccountLogin(profile) : null;
    } catch {
      account = null;
    }
    if (profile.hasAccount && (!profile.password || !account)) {
      setAccessNotice(t.loginUnknown);
      return;
    }
    if (profile.hasAccount) {
      if (account) {
        const nextCandidate = {
          ...profile,
          name: account.name,
          organization: account.organization,
          cohort: account.cohort,
          category: account.category,
          language: account.defaultLanguage,
          voucher: account.voucherCode,
        };
        if (isSupabaseConfigured(settings) && account.voucherCode) {
          try {
            const linkedVoucher = await supabaseFindVoucher(account.voucherCode);
            if (linkedVoucher) {
              const nextVouchers = [
                linkedVoucher,
                ...voucherRecords.filter((voucher) => normalizeVoucher(voucher.code) !== normalizeVoucher(linkedVoucher.code)),
              ];
              setVoucherRecords(nextVouchers);
              saveJson(STORAGE_VOUCHERS, nextVouchers);
            }
          } catch {
            // Account login can continue; access rules will use local data if the live voucher lookup fails.
          }
        }
        setCandidate(nextCandidate);
        setLanguage(nextCandidate.language);
        saveJson(STORAGE_CANDIDATE, nextCandidate);
      }
    }
    if (!profile.hasAccount) saveJson(STORAGE_CANDIDATE, profile);
    setSelectedExamCategory(null);
    setView("select");
  }

  async function refreshRemoteData() {
    try {
      if (isSupabaseConfigured(settings)) {
        const [remoteVouchers, remoteUsers, remoteAttempts, remoteAnswers, remoteLots, remoteQuestions] = await Promise.all([
          supabaseRequest<Record<string, string>[]>("/rest/v1/vouchers?select=*&order=created_at.desc"),
          supabaseRequest<Record<string, string>[]>("/rest/v1/profiles?select=*&order=created_at.desc"),
          supabaseRequest<Record<string, string | number | boolean | null>[]>("/rest/v1/attempts?select=*&order=started_at.desc"),
          supabaseRequest<Record<string, unknown>[]>("/rest/v1/attempt_answers?select=*"),
          supabaseRequest<Record<string, unknown>[]>("/rest/v1/exam_lots?select=*&active=eq.true&order=created_at.asc"),
          supabaseRequest<Record<string, unknown>[]>("/rest/v1/question_bank?select=*&active=eq.true&order=created_at.asc"),
        ]);
        const nextVouchers = remoteVouchers.map(normalizeVoucherRecord).filter((voucher) => voucher.code);
        const nextUsers = remoteUsers.map(normalizeUserAccount).filter((user) => user.email);
        const nextAttempts = remoteAttempts.map((attempt) => normalizeSupabaseAttempt(attempt, remoteAnswers));
        const nextLots = normalizeSupabaseLots(remoteLots, remoteQuestions);
        setVoucherRecords(nextVouchers);
        setUserAccounts(nextUsers);
        setAttempts(nextAttempts);
        if (nextLots.length) setExamLots(mergeExamLots(seedLots, nextLots));
        saveJson(STORAGE_VOUCHERS, nextVouchers);
        saveJson(STORAGE_USERS, nextUsers);
        saveJson(STORAGE_ATTEMPTS, nextAttempts);
        try {
          const remoteSettings = await supabaseRequest<Record<string, unknown>[]>("/rest/v1/voucher_settings?select=*&order=category.asc");
          if (remoteSettings.length) {
            const nextSettings = DEFAULT_VOUCHER_SETTINGS.map((fallback) =>
              remoteSettings.map(normalizeVoucherSetting).find((setting) => setting.category === fallback.category) ?? fallback,
            );
            setVoucherSettings(nextSettings);
            saveJson(STORAGE_VOUCHER_SETTINGS, nextSettings);
          }
        } catch {
          // Older databases may not have voucher_settings yet; the default rules remain active.
        }
        try {
          const remoteLimits = await supabaseRequest<Record<string, unknown>[]>("/rest/v1/attempt_limits?select=*&order=created_at.desc");
          const nextLimits = remoteLimits.map(normalizeAttemptLimit).filter((limit) => limit.identifier);
          setAttemptLimits(nextLimits);
          saveJson(STORAGE_ATTEMPT_LIMITS, nextLimits);
        } catch (error) {
          setSyncStatus(`supabase read: ${new Date().toISOString()} | attempt_limits: ${error instanceof Error ? error.message : "not ready"}`);
          return;
        }
        setSyncStatus(`supabase read: ${new Date().toISOString()}`);
        return;
      }
      setSyncStatus(language === "fr" ? "Supabase non configure." : "Supabase is not configured.");
    } catch (error) {
      setSyncStatus(`read: ${error instanceof Error ? error.message : "sync error"}`);
    }
  }

  function updateVoucherSetting(category: VoucherCategory, patch: Partial<VoucherSetting>) {
    const next = voucherSettings.map((setting) =>
      setting.category === category ? { ...setting, ...patch } : setting,
    );
    setVoucherSettings(next);
    saveJson(STORAGE_VOUCHER_SETTINGS, next);
  }

  async function saveVoucherSettings() {
    saveJson(STORAGE_VOUCHER_SETTINGS, voucherSettings);
    if (!isSupabaseConfigured(settings)) {
      setSyncStatus(language === "fr" ? "Parametrage voucher sauvegarde localement." : "Voucher settings saved locally.");
      return;
    }
    try {
      await supabaseRequest("/rest/v1/voucher_settings?on_conflict=category", {
        method: "POST",
        body: voucherSettings.map(voucherSettingToSupabase),
        prefer: "resolution=merge-duplicates,return=representation",
      });
      setSyncStatus(`supabase saveVoucherSettings: ${new Date().toISOString()}`);
    } catch (error) {
      setSyncStatus(`supabase saveVoucherSettings: ${error instanceof Error ? error.message : "sync error"}`);
    }
  }

  async function generateVoucher() {
    const setting = voucherSettingFor(voucherForm.category, voucherSettings);
    const prefix = setting.prefix.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12) || "VOUCHER";
    const emails = parseEmailList(voucherForm.assignedTo);
    const recipients = emails.length ? emails : [voucherForm.assignedTo.trim()];
    const createdAt = new Date().toISOString();
    const expiresAt = addMonths(new Date(createdAt), setting.validityMonths).toISOString();
    const created = recipients.map((assignedTo) => ({
        code: `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        role: setting.labelFr,
        category: setting.category,
        validityMonths: setting.validityMonths,
        accessPercent: setting.accessPercent,
        status: assignedTo ? "assigned" as const : "available" as const,
        assignedTo,
        usedBy: "",
        createdAt,
        expiresAt,
        usedAt: "",
      }));
    const next = [...created, ...voucherRecords];
    setVoucherRecords(next);
    saveJson(STORAGE_VOUCHERS, next);
    setAccountNotice(`${t.copyVoucher}: ${created.map((voucher) => voucher.code).join(", ")}`);
    if (isSupabaseConfigured(settings)) {
      try {
        await supabaseSaveVouchers(created);
        await Promise.all(created
          .filter((voucher) => voucher.assignedTo)
          .map((voucher) => {
            const existingAccount = userAccounts.some((user) => normalizeEmail(user.email) === normalizeEmail(voucher.assignedTo));
            const subject = language === "fr" ? "Votre voucher d'acces aux examens blancs" : "Your practice exam access voucher";
            const body = language === "fr"
              ? `Bonjour,\n\nUn voucher ${voucher.role} vous a ete attribue pour la plateforme d'examens blancs PMI RDC / K-Majuscule.\n\nCode: ${voucher.code}\nValidite: ${voucher.validityMonths} mois\nAcces: ${voucher.accessPercent}% des lots\nLien: ${PLATFORM_URL}\n\nVotre compte est ${existingAccount ? "deja cree" : "pas encore cree"}. Bonne chance pour vos essais.`
              : `Hello,\n\nA ${voucher.role} voucher has been assigned to you for the PMI DRC / K-Majuscule practice exam platform.\n\nCode: ${voucher.code}\nValidity: ${voucher.validityMonths} months\nAccess: ${voucher.accessPercent}% of lots\nLink: ${PLATFORM_URL}\n\nYour account is ${existingAccount ? "already created" : "not created yet"}. Good luck with your attempts.`;
            return queueEmail(voucher.assignedTo, subject, body);
          }));
        setSyncStatus(`supabase saveVouchers: ${new Date().toISOString()}`);
        if (created.some((voucher) => voucher.assignedTo)) setAccountNotice(`${accountNotice ? `${accountNotice} | ` : ""}${t.voucherAssignedEmail}`);
      } catch (error) {
        setSyncStatus(`supabase saveVouchers: ${error instanceof Error ? error.message : "sync error"}`);
      }
    }
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
    let voucher = code
      ? voucherRecords.find((item) => normalizeVoucher(item.code) === code && item.status !== "used") || null
      : voucherRecords.find((item) =>
          normalizeEmail(item.assignedTo) === normalizeEmail(candidate.email) &&
          item.category === candidate.category &&
          item.status !== "used",
        ) || null;
    if (!voucher && isSupabaseConfigured(settings) && code) {
      try {
        voucher = await supabaseFindVoucher(code);
      } catch (error) {
        setAccountNotice(`Supabase: ${error instanceof Error ? error.message : "sync error"}`);
        return;
      }
    }
    if (!voucher && isSupabaseConfigured(settings)) {
      try {
        voucher = await supabaseFindVoucherForEmail(candidate.email, candidate.category);
      } catch {
        voucher = null;
      }
    }
    if (!candidate.password.trim()) {
      setAccountNotice(language === "fr" ? "Mot de passe requis pour creer le compte." : "Password is required to create the account.");
      return;
    }
    if (voucher && voucher.status === "used") {
      setAccountNotice(t.voucherUnknown);
      return;
    }
    if (voucher && isExpired(voucher.expiresAt)) {
      setAccountNotice(t.voucherExpired);
      return;
    }
    if (voucher && voucher.assignedTo && normalizeEmail(voucher.assignedTo) !== normalizeEmail(candidate.email)) {
      setAccountNotice(language === "fr" ? "Ce voucher est attribue a un autre email." : "This voucher is assigned to another email.");
      return;
    }
    const accountRole = voucher?.role ?? voucherSettingLabel(voucherSettingFor(candidate.category, voucherSettings), "fr");
    const account: UserAccount = {
      name: candidate.name.trim(),
      email: candidate.email.trim(),
      organization: candidate.organization.trim(),
      cohort: candidate.cohort.trim(),
      role: accountRole,
      category: candidate.category,
      voucherCode: voucher?.code ?? "",
      password: candidate.password,
      passwordHash: await sha256(candidate.password),
      defaultLanguage: candidate.language,
      createdAt: new Date().toISOString(),
    };
    let savedAccount = account;
    try {
      savedAccount = isSupabaseConfigured(settings)
        ? await supabaseCreateUserAccount(account, voucher)
        : account;
      if (!voucher) {
        await queueEmail(
          settings.trainerAccount,
          language === "fr" ? "Compte candidat sans voucher" : "Candidate account without voucher",
          language === "fr"
            ? `Un compte a ete cree sans voucher lie.\n\nNom: ${account.name}\nEmail: ${account.email}\nNature: ${voucherSettingLabel(voucherSettingFor(account.category, voucherSettings), "fr")}\nOrganisation: ${account.organization || "-"}\nCohorte: ${account.cohort || "-"}`
            : `An account was created without a linked voucher.\n\nName: ${account.name}\nEmail: ${account.email}\nCategory: ${voucherSettingLabel(voucherSettingFor(account.category, voucherSettings), "en")}\nOrganization: ${account.organization || "-"}\nCohort: ${account.cohort || "-"}`,
        );
      }
    } catch (error) {
      setAccountNotice(`Supabase: ${error instanceof Error ? error.message : "sync error"}`);
      return;
    }
    const nextUsers = [
      savedAccount,
      ...userAccounts.filter((user) =>
        account.email
          ? normalizeEmail(user.email) !== normalizeEmail(account.email)
          : normalizeVoucher(user.voucherCode) !== normalizeVoucher(account.voucherCode),
      ),
    ];
    const usedVoucher = voucher ? { ...voucher, status: "used" as const, usedBy: account.email, usedAt: account.createdAt } : null;
    const nextVouchers = usedVoucher
      ? [
        usedVoucher,
        ...voucherRecords.filter((item) => normalizeVoucher(item.code) !== normalizeVoucher(usedVoucher.code)),
      ]
      : voucherRecords;
    setUserAccounts(nextUsers);
    setVoucherRecords(nextVouchers);
    saveJson(STORAGE_USERS, nextUsers);
    saveJson(STORAGE_VOUCHERS, nextVouchers);
    updateCandidate({ hasAccount: true, voucher: voucher?.code ?? "" });
    setAccountNotice(voucher ? `${t.accountCreated}: ${account.email}` : t.accountCreatedNoVoucher);
    if (isSupabaseConfigured(settings)) {
      setSyncStatus(`supabase saveUserAccount: ${new Date().toISOString()}`);
    }
  }

  function startExam(lot: ExamLot) {
    if (!lot.questions.length) return;
    if (lot.examType === "CISSP" && !trainerUnlocked) {
      setAccessNotice(t.cisspLocked);
      return;
    }
    if (candidate.examType !== lot.examType || (lot.examType === "CISSP" && language !== "en")) {
      updateCandidate({ examType: lot.examType, language: lot.examType === "CISSP" ? "en" : candidate.language });
      if (lot.examType === "CISSP") setLanguage("en");
    }
    const voucher = candidateLinkedVoucher(candidate, voucherRecords, userAccounts);
    if (!voucher) {
      if (lot.questionCount >= 100 || hasRestrictedAttemptInLastThreeMonths(candidate, attempts)) {
        setAccessNotice(t.restrictedAccess);
        setView("home");
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
        return;
      }
    } else {
      const typedLots = examLots.filter((item) => item.examType === lot.examType);
      const allowedLots = allowedLotsForVoucher(typedLots, voucher);
      if (!allowedLots.some((item) => item.id === lot.id)) {
        setAccessNotice(t.voucherAccessDenied);
        setView("home");
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
        return;
      }
    }
    const matchingLimit = attemptLimits.find((limit) => matchesAttemptLimit(candidate, limit));
    if (matchingLimit) {
      const usedAttempts = attempts.filter((attempt) => attempt.status !== "cancelled" && candidateMatchesAttempt(candidate, attempt)).length;
      if (usedAttempts >= matchingLimit.maxAttempts) {
        setAccessNotice(language === "fr"
          ? `Limite atteinte pour ce candidat: ${usedAttempts}/${matchingLimit.maxAttempts} tentative(s).`
          : `Limit reached for this candidate: ${usedAttempts}/${matchingLimit.maxAttempts} attempt(s).`);
        setView("home");
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
        return;
      }
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
    if (isSupabaseConfigured(settings)) {
      try {
        await supabaseSaveAttempt(attempt);
        setSyncStatus(`supabase saveAttempt: ${new Date().toISOString()}`);
      } catch (error) {
        setSyncStatus(`supabase saveAttempt: ${error instanceof Error ? error.message : "sync error"}`);
      }
    }
  }

  async function saveAttemptLimit() {
    const identifier = limitForm.identifier.trim();
    if (!identifier) {
      setSyncStatus(language === "fr" ? "Limite: email, nom ou compte requis." : "Limit: email, name, or account is required.");
      return;
    }
    const normalizedIdentifier = limitForm.identifierType === "name" ? identifier.toLowerCase() : normalizeEmail(identifier);
    const limit: AttemptLimit = {
      id: crypto.randomUUID(),
      identifier: normalizedIdentifier,
      identifierType: limitForm.identifierType,
      maxAttempts: Math.max(0, Number(limitForm.maxAttempts || 0)),
      active: true,
      note: limitForm.note.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextLimits = [limit, ...attemptLimits.filter((item) =>
      !(item.identifierType === limit.identifierType && item.identifier.toLowerCase() === limit.identifier.toLowerCase()),
    )];
    setAttemptLimits(nextLimits);
    saveJson(STORAGE_ATTEMPT_LIMITS, nextLimits);
    setLimitForm({ identifier: "", identifierType: "email", maxAttempts: 2, note: "" });
    if (isSupabaseConfigured(settings)) {
      try {
        await supabaseRequest("/rest/v1/attempt_limits?on_conflict=id", {
          method: "POST",
          prefer: "resolution=merge-duplicates",
          body: [attemptLimitToSupabase(limit)],
        });
        setSyncStatus(`supabase saveLimit: ${new Date().toISOString()}`);
      } catch (error) {
        setSyncStatus(`supabase saveLimit: ${error instanceof Error ? error.message : "sync error"}`);
      }
    }
  }

  async function deleteAttempt(attempt: Attempt) {
    if (!window.confirm(language === "fr" ? "Supprimer cette tentative ?" : "Delete this attempt?")) return;
    const nextAttempts = attempts.filter((item) => item.id !== attempt.id);
    setAttempts(nextAttempts);
    saveJson(STORAGE_ATTEMPTS, nextAttempts);
    if (isSupabaseConfigured(settings)) {
      try {
        await supabaseRequest(`/rest/v1/attempt_answers?attempt_id=eq.${encodeURIComponent(attempt.id)}`, { method: "DELETE" });
        await supabaseRequest(`/rest/v1/attempts?id=eq.${encodeURIComponent(attempt.id)}`, { method: "DELETE" });
        setSyncStatus(`supabase deleteAttempt: ${new Date().toISOString()}`);
      } catch (error) {
        setSyncStatus(`supabase deleteAttempt: ${error instanceof Error ? error.message : "sync error"}`);
      }
    }
  }

  function detailedAttemptText(attempt: Attempt) {
    const lot = examLots.find((item) => item.id === attempt.lotId);
    const lines = [
      `${language === "fr" ? "Resultats detailles" : "Detailed results"} - ${attempt.candidate.name}`,
      `${language === "fr" ? "Test" : "Test"}: ${attempt.lotTitle}`,
      `Score: ${attempt.score}/${attempt.total} (${attempt.percent}%) - ${grade(attempt.percent).label}`,
      `${language === "fr" ? "Date" : "Date"}: ${(attempt.submittedAt ?? attempt.startedAt).slice(0, 19)}`,
      "",
    ];
    if (!lot) return lines.join("\n");
    lot.questions.forEach((question, index) => {
      const given = attempt.answers[question.id] ?? [];
      lines.push(`${index + 1}. ${question.prompt[language]}`);
      lines.push(`${language === "fr" ? "Votre reponse" : "Your answer"}: ${given.length ? given.map((item) => optionLetters[item]).join(", ") : copy[language].noAnswer}`);
      lines.push(`${language === "fr" ? "Bonne reponse" : "Correct answer"}: ${question.correct.map((item) => optionLetters[item]).join(", ")}`);
      lines.push(`${language === "fr" ? "Explication" : "Explanation"}: ${question.explanation[language]}`);
      lines.push("");
    });
    return lines.join("\n");
  }

  async function sendDetailedResults(attempt: Attempt) {
    const email = normalizeEmail(attempt.candidate.email);
    if (!email) {
      setSyncStatus(language === "fr" ? "Email impossible: ce candidat n'a pas d'adresse email." : "Email unavailable: this candidate has no email address.");
      return;
    }
    const subject = `${language === "fr" ? "Resultats detailles" : "Detailed results"} - ${attempt.lotTitle}`;
    const body = detailedAttemptText(attempt);
    if (isSupabaseConfigured(settings)) {
      try {
        await supabaseRequest("/rest/v1/email_queue", {
          method: "POST",
          body: [{
            attempt_id: attempt.id,
            to_email: email,
            subject,
            payload_json: { body },
            status: "queued",
            created_at: new Date().toISOString(),
          }],
        });
      } catch {
        // The mailto fallback remains available if the optional queue table is not installed yet.
      }
    }
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSyncStatus(language === "fr" ? "Email detaille prepare." : "Detailed email prepared.");
  }

  function submitAttempt(status: Attempt["status"]) {
    const score = status === "submitted" ? scoreAttempt(selectedLot, answers) : { score: 0, total: selectedLot.questions.length, percent: 0 };
    const attemptCandidate: Candidate = {
      ...candidate,
      examType: selectedLot.examType,
      language: selectedLot.examType === "CISSP" ? "en" : candidate.language,
    };
    const titleLanguage: Language = selectedLot.examType === "CISSP" ? "en" : language;
    const attempt: Attempt = {
      id: activeAttempt?.id ?? crypto.randomUUID(),
      candidate: attemptCandidate,
      lotId: selectedLot.id,
      lotTitle: selectedLot.title[titleLanguage],
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
    if (status === "submitted") {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
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

  async function goExams() {
    if (candidate.hasAccount && canAccessLots) {
      await startSelect();
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      return;
    }
    if (!candidate.hasAccount && canAccessLots) {
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
        <button onClick={isSupabaseConfigured(settings) ? refreshRemoteData : () => window.location.reload()}>↻ {t.refresh}</button>
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
              <label>{t.category}<select value={candidate.category} onChange={(event) => updateCandidate({ category: event.target.value as VoucherCategory })}>
                {voucherSettings.map((setting) => (
                  <option key={setting.category} value={setting.category}>{voucherSettingLabel(setting, language)}</option>
                ))}
              </select></label>
              <label>{t.examType}<select value={candidate.examType} onChange={(event) => updateCandidate({ examType: event.target.value as ExamType })}>
                <option>CAPM</option>
                <option>PMP</option>
                <option>CISSP</option>
                <option value="Gestion de projet">{t.generalPm}</option>
              </select></label>
              <label>{t.defaultLanguage}<select value={candidate.language} onChange={(event) => updateCandidate({ language: event.target.value as Language })}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select></label>
            </div>
            <label className="check-row soft-check"><input type="checkbox" checked={candidate.sendEmail} onChange={(event) => updateCandidate({ sendEmail: event.target.checked })} /> {t.emailResults}</label>
            <div className="actions">
              <button className="primary" onClick={() => startSelect()}>▶ {t.seeLots}</button>
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
              <div className="account-heading">
                <div>
                  <h3>{t.candidateAccount}</h3>
                  <p>{t.accountHelp}</p>
                </div>
                <label className="check-row"><input type="checkbox" checked={candidate.hasAccount} onChange={(event) => updateCandidate({ hasAccount: event.target.checked })} /> {t.accountWithVoucher}</label>
              </div>
              <div className="form-grid">
                <label>{t.voucher}<input value={candidate.voucher} onChange={(event) => updateCandidate({ voucher: event.target.value })} placeholder={language === "fr" ? "Facultatif si deja attribue a votre email" : "Optional if already assigned to your email"} /></label>
                <label>{t.password}<input type="password" value={candidate.password} onChange={(event) => updateCandidate({ password: event.target.value })} /></label>
              </div>
              <div className="actions">
                <button className="primary" onClick={createUserAccount}>✓ {t.createUserAccount}</button>
                <button onClick={() => startSelect(true)}>▶ {t.signIn}</button>
                <button onClick={() => alert(language === "fr" ? "Réinitialisation prévue via Supabase Auth : email avec lien sécurisé." : "Reset planned through Supabase Auth: email with secure link.")}>↻ {t.resetPassword}</button>
              </div>
            </div>
            {accountNotice && <p className="helper-note">{accountNotice}</p>}
            {accessNotice && <p className="error">{accessNotice}</p>}
          </div>
          </section>
        </>
      )}

      {view === "select" && (
        <section className="select-shell">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t.selectLot}</p>
              <h1>{selectedExamCategory ?? t.selectExamCategory}</h1>
              {!selectedExamCategory && <p className="lead">{t.categoryHelp}</p>}
            </div>
            <div className="actions">
              {selectedExamCategory && <button onClick={() => setSelectedExamCategory(null)}>← {t.backToCategories}</button>}
              <button onClick={() => setView("home")}>✎ {t.editInfo}</button>
            </div>
          </div>
          {!selectedExamCategory ? (
            <div className="exam-category-grid">
              {lotSections.map((section, index) => (
                <button className={`exam-category-card ${lotTone(section.lots[0] ?? capmLot1, index)}`} key={section.examType} onClick={() => chooseExamCategory(section.examType)}>
                  <span className="test-icon">{section.examType}</span>
                  <strong>{section.examType}</strong>
                  <em>{section.lots.length} lot(s)</em>
                  {section.examType === "CISSP" && <small>{t.cisspCategoryHint}</small>}
                  <span>{t.openCategory}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="lot-sections">
              {selectedSection && (
                <section className="lot-section" key={selectedSection.examType}>
                <div className="lot-section-head">
                  <h2>{selectedSection.examType}</h2>
                  <span>{selectedSection.lots.length} {language === "fr" ? "lot(s)" : "lot(s)"}</span>
                </div>
                {selectedSection.examType === "CISSP" && !trainerUnlocked ? (
                  <div className="cissp-lock">
                    <p>{t.cisspLocked}</p>
                    <div className="actions">
                      <input type="password" value={cisspPassword} onChange={(event) => setCisspPassword(event.target.value)} placeholder={t.trainerPassword} />
                      <button className="primary" onClick={unlockCissp}>🔐 {t.cisspUnlock}</button>
                    </div>
                    {cisspNotice && <p className="error">{cisspNotice}</p>}
                  </div>
                ) : (
                  <div className="catalog-grid compact">
                    {selectedSection.lots.map((lot, index) => (
                      <article className={`test-card ${lotTone(lot, index)}`} key={lot.id}>
                        <div className="test-icon">{lotIcon(lot)}</div>
                        <h2>{lot.title[lot.examType === "CISSP" ? "en" : language]}</h2>
                        <p>{lotDescription(lot, language)}</p>
                        <div className="chips">
                          <span>{lot.questions.length} questions</span>
                          <span>{lot.questions.length ? Math.round(durationFor(lot.questionCount) / 60) : "-"} min</span>
                          <span>{lot.examType === "CISSP" ? "EN" : "FR / EN"}</span>
                        </div>
                        <button className={`start-button ${lotTone(lot, index)}`} disabled={!lot.questions.length} onClick={() => window.confirm(t.confirmStart) && startExam(lot)}>▶ {t.startLot}</button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              )}
            </div>
          )}
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
                    <p className="eyebrow">Source : Supabase</p>
                    <h1>{t.trainerDashboard}</h1>
                  </div>
                  <button onClick={() => setView("home")}>⌂ {t.home}</button>
                </div>
                <div className="metric-grid">
                  <Metric label={t.attemptsLabel} value={String(attempts.length)} />
                  <Metric label={t.average} value={`${Math.round(attempts.reduce((sum, item) => sum + item.percent, 0) / Math.max(1, attempts.length))}%`} />
                  <Metric label={t.tests} value={`${examLots.length} standards + import`} />
                  <Metric label={t.syncStatus} value={syncStatus || "-"} />
                </div>
                <div className="actions">
                  <button onClick={exportCsv}>⇩ {t.exportCsv}</button>
                  <button onClick={() => alert(language === "fr" ? "Import prevu : chargez les lots dans les tables Supabase exam_lots et question_bank." : "Import planned: upload lots into the Supabase exam_lots and question_bank tables.")}>＋ {t.uploadLot}</button>
                  <button onClick={() => alert(language === "fr" ? "Autorisation de reprise prevue via les tables Supabase attempts et vouchers." : "Retake authorization planned through the Supabase attempts and vouchers tables.")}>↻ {t.allowRetake}</button>
                </div>
              </div>

              <div className="panel">
                <h2>{language === "fr" ? "Connexion Supabase" : "Supabase connection"}</h2>
                <div className="form-grid single">
                  <label>Supabase URL<input value={settings.supabaseUrl} onChange={(event) => {
                    const next = { ...settings, supabaseUrl: event.target.value };
                    setSettings(next);
                    saveJson(STORAGE_SETTINGS, next);
                  }} placeholder="https://xxxx.supabase.co" /></label>
                  <label>Supabase anon key<input value={settings.supabaseAnonKey} onChange={(event) => {
                    const next = { ...settings, supabaseAnonKey: event.target.value };
                    setSettings(next);
                    saveJson(STORAGE_SETTINGS, next);
                  }} placeholder="eyJhbGciOi..." /></label>
                </div>
                <p className="muted">{language === "fr" ? "Le bouton de test ecrit un voucher DBTEST dans Supabase puis relit les tables. Si les tables manquent, le statut affichera l'erreur exacte." : "The test button writes a DBTEST voucher to Supabase and reads the tables back. If tables are missing, the status displays the exact error."}</p>
                <div className="actions">
                  <button className="primary" onClick={testSupabaseConnection}>⇄ {language === "fr" ? "Tester Supabase" : "Test Supabase"}</button>
                  <button onClick={seedCapmLotsToSupabase}>＋ {language === "fr" ? "Charger CAPM Lots 1-3" : "Load CAPM Lots 1-3"}</button>
                  <button onClick={seedCisspLotsToSupabase}>＋ {language === "fr" ? "Charger lots CISSP" : "Load CISSP lots"}</button>
                  <button onClick={refreshRemoteData}>↻ {t.refresh}</button>
                </div>
              </div>

              <div className="panel wide">
                <h2>{t.accountManagement}</h2>
                <h3>{t.voucherSettings}</h3>
                <div className="voucher-settings-grid">
                  {voucherSettings.map((setting) => (
                    <div className="metric" key={setting.category}>
                      <span>{voucherSettingLabel(setting, language)}</span>
                      <label>{t.validityMonths}
                        <input type="number" min="1" value={setting.validityMonths} onChange={(event) => updateVoucherSetting(setting.category, { validityMonths: Number(event.target.value || 1) })} />
                      </label>
                      <label>{t.accessPercent}
                        <input type="number" min="1" max="100" value={setting.accessPercent} onChange={(event) => updateVoucherSetting(setting.category, { accessPercent: Number(event.target.value || 1) })} />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="actions">
                  <button onClick={saveVoucherSettings}>↻ {language === "fr" ? "Enregistrer le parametrage" : "Save settings"}</button>
                </div>
                <div className="form-grid">
                  <label>{t.voucherRole}
                    <select value={voucherForm.category} onChange={(event) => setVoucherForm({ ...voucherForm, category: event.target.value as VoucherCategory })}>
                      {voucherSettings.map((setting) => (
                        <option key={setting.category} value={setting.category}>{voucherSettingLabel(setting, language)}</option>
                      ))}
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
                        <thead><tr><th>Code</th><th>{t.voucherRole}</th><th>{t.accessPercent}</th><th>{t.assignedTo}</th><th>{t.status}</th><th>{t.date}</th></tr></thead>
                        <tbody>
                          {voucherRecords.map((voucher) => (
                            <tr key={voucher.code}>
                              <td><strong>{voucher.code}</strong></td>
                              <td>{voucher.role}</td>
                              <td>{voucher.accessPercent}%</td>
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
                        <thead><tr><th>{t.participant}</th><th>Email</th><th>{t.category}</th><th>{t.voucher}</th><th>{t.defaultLanguage}</th><th>{t.date}</th></tr></thead>
                        <tbody>
                          {userAccounts.map((user) => (
                            <tr key={user.email}>
                              <td>{user.name}</td>
                              <td>{user.email}</td>
                              <td>{voucherSettingLabel(voucherSettingFor(user.category, voucherSettings), language)}</td>
                              <td>{user.voucherCode}</td>
                              <td>{user.defaultLanguage.toUpperCase()}</td>
                              <td>{user.createdAt.slice(0, 10)}</td>
                            </tr>
                          ))}
                          {!userAccounts.length && (
                            <tr><td colSpan={6}>-</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel wide">
                <h2>{language === "fr" ? "Limites des essais" : "Attempt limits"}</h2>
                <div className="form-grid">
                  <label>{language === "fr" ? "Email, nom ou compte" : "Email, name, or account"}
                    <input value={limitForm.identifier} onChange={(event) => setLimitForm({ ...limitForm, identifier: event.target.value })} placeholder="candidat@email.com" />
                  </label>
                  <label>{language === "fr" ? "Type de recherche" : "Match type"}
                    <select value={limitForm.identifierType} onChange={(event) => setLimitForm({ ...limitForm, identifierType: event.target.value as AttemptLimit["identifierType"] })}>
                      <option value="email">Email</option>
                      <option value="name">{language === "fr" ? "Nom" : "Name"}</option>
                      <option value="account">{language === "fr" ? "Compte" : "Account"}</option>
                    </select>
                  </label>
                  <label>{language === "fr" ? "Nombre maximal d'essais" : "Maximum attempts"}
                    <input type="number" min="0" value={limitForm.maxAttempts} onChange={(event) => setLimitForm({ ...limitForm, maxAttempts: Number(event.target.value) })} />
                  </label>
                  <label>Note
                    <input value={limitForm.note} onChange={(event) => setLimitForm({ ...limitForm, note: event.target.value })} placeholder={language === "fr" ? "Ex. reprise autorisee" : "Ex. retake authorized"} />
                  </label>
                </div>
                <div className="actions">
                  <button className="primary" onClick={saveAttemptLimit}>! {language === "fr" ? "Enregistrer la limite" : "Save limit"}</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{language === "fr" ? "Candidat" : "Candidate"}</th><th>Type</th><th>{language === "fr" ? "Limite" : "Limit"}</th><th>Note</th><th>{t.date}</th></tr></thead>
                    <tbody>
                      {attemptLimits.map((limit) => (
                        <tr key={limit.id}>
                          <td>{limit.identifier}</td>
                          <td>{limit.identifierType}</td>
                          <td>{limit.maxAttempts}</td>
                          <td>{limit.note || "-"}</td>
                          <td>{limit.createdAt.slice(0, 10)}</td>
                        </tr>
                      ))}
                      {!attemptLimits.length && <tr><td colSpan={5}>-</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel wide">
                <h2>{t.cumulativeEco}</h2>
                <Aggregate attempts={attempts} language={language} group="eco" lots={examLots} />
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
                          <td>
                            <div className="row-actions">
                              <button onClick={() => { setActiveAttempt(attempt); setSelectedLotId(attempt.lotId); setView("results"); window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0); }}>o {t.see}</button>
                              <button onClick={() => sendDetailedResults(attempt)}>@ Email</button>
                              <button className="danger-button" onClick={() => deleteAttempt(attempt)}>x {language === "fr" ? "Supprimer" : "Delete"}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!attempts.length && <tr><td colSpan={10}>-</td></tr>}
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
          <h2>{t.profileDashboard}</h2>
          <div className="metric-grid">
            <Metric label={t.attempts} value={String(candidateReadiness.submitted)} />
            <Metric label={language === "fr" ? "Lots travailles" : "Lots practiced"} value={String(candidateReadiness.lots)} />
            <Metric label={language === "fr" ? "Meilleure performance" : "Best performance"} value={`${candidateReadiness.best}%`} />
            <Metric label={language === "fr" ? "Moyenne" : "Average"} value={`${candidateReadiness.average}%`} />
            <Metric label={t.qualifyingLots} value={`${candidateReadiness.qualifyingLots}/2`} />
            <Metric label={t.readiness} value={candidateReadiness.ready ? t.ready : t.notReady} />
          </div>
          <p className="muted">{candidate.examType === "PMP"
            ? (language === "fr" ? "Pret pour PMP: au moins 75% sur 2 lots, chacun au premier essai." : "PMP readiness: at least 75% on 2 lots, each on the first attempt.")
            : (language === "fr" ? "Pret pour CAPM: au moins 80% sur 2 lots, chacun au premier essai." : "CAPM readiness: at least 80% on 2 lots, each on the first attempt.")}</p>
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

function Aggregate({ attempts, language, group, lots }: { attempts: Attempt[]; language: Language; group: "eco" | "performanceDomain" | "approach"; lots: ExamLot[] }) {
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
