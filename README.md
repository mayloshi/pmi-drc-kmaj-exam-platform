# PMI RDC / K-Majuscule Exam Platform

Plateforme bilingue d'examens blancs CAPM, PMP et gestion de projet general pour le Chapitre PMI RDC et le centre K-Majuscule.

## Etat initial

- Frontend: Vinext / React
- Lot charge: CAPM 2026 - Lot 1 - Questions 1 a 50, en francais et en anglais
- Stockage principal recommande: Supabase
- Stockage local temporaire: `localStorage` quand Supabase n'est pas configure
- Ancien stockage Google Sheets: conserve comme fallback Apps Script
- Base initiale: vide, avec onglets et en-tetes uniquement

## Base de donnees Supabase

1. Creer un projet Supabase.
2. Dans Authentication > Providers > Email, desactiver temporairement la confirmation email pour le prototype.
3. Ouvrir SQL Editor.
4. Coller et executer `supabase/schema.sql`.
5. Dans le dashboard formateur de l'application, renseigner:
   - `Supabase URL`
   - `Supabase anon key`
   - `Stockage principal`: `Supabase`

Tables creees:

- `profiles`
- `vouchers`
- `exam_lots`
- `question_bank`
- `attempts`
- `attempt_answers`

La base Supabase est initialement vide. Les vouchers seront crees depuis l'interface formateur.

## Base de donnees Google Sheets

Google Sheets reste disponible comme solution de secours. La base etait creee dans Google Drive:

`PMP Prep/DATABASE/PMI RDC K-Majuscule Exam Platform Database`

Onglets prevus:

- `Candidates`
- `TrainerAccounts`
- `Vouchers`
- `QuestionBank`
- `Lots`
- `Attempts`
- `AttemptAnswers`
- `SummaryReports`
- `EmailQueue`
- `Settings`

Le fichier Apps Script dans `google-apps-script/Code.gs` cree les memes onglets si le classeur n'existe pas encore. Il ne charge aucune donnee initiale.

## Developpement local

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite:

```text
http://localhost:3000/
```

## Verification

```bash
pnpm test
```

Le test lance le build Vinext puis controle les capacites principales de la plateforme.

## Deploiement GitHub

Depot cible prevu:

```text
https://github.com/Mayloshi/pmi-drc-kmaj-exam-platform
```

URL publique GitHub Pages:

```text
https://mayloshi.github.io/pmi-drc-kmaj-exam-platform/
```

Le workflow `.github/workflows/github-pages.yml` publie la version statique a chaque push sur `main`.

## Configuration formateur

Mot de passe formateur de demonstration:

```text
221008
```

Pour la production, remplacer ce mecanisme par des comptes formateurs stockes dans `TrainerAccounts` avec mot de passe hache.
