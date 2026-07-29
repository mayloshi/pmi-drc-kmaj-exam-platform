# PMI RDC / K-Majuscule Exam Platform

Plateforme bilingue d'examens blancs CAPM, PMP et gestion de projet general pour le Chapitre PMI RDC et le centre K-Majuscule.

## Etat initial

- Frontend: Vinext / React
- Lot charge: CAPM 2026 - Lot 1 - Questions 1 a 50, en francais et en anglais
- Stockage local temporaire: `localStorage` quand aucun endpoint Apps Script n'est configure
- Base Google Sheets cible: `PMP Prep/DATABASE/PMI RDC K-Majuscule Exam Platform Database`
- Base initiale: vide, avec onglets et en-tetes uniquement

## Base de donnees Google Sheets

La base est creee dans Google Drive:

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

Si le depot n'existe pas encore, le creer dans le compte GitHub `Mayloshi`, puis pousser ce dossier local.

## Configuration formateur

Mot de passe formateur de demonstration:

```text
221008
```

Pour la production, remplacer ce mecanisme par des comptes formateurs stockes dans `TrainerAccounts` avec mot de passe hache.
