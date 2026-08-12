# PMI RDC / K-Majuscule Exam Platform

Plateforme bilingue d'examens blancs CAPM, PMP et gestion de projet general pour le Chapitre PMI RDC et le centre K-Majuscule.

## Etat initial

- Frontend: Vinext / React
- Lot charge: CAPM 2026 - Lot 1 - Questions 1 a 50, en francais et en anglais
- Stockage principal: Supabase
- Stockage local temporaire: `localStorage` quand Supabase n'est pas configure
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

La base Supabase est initialement vide. Les vouchers seront crees depuis l'interface formateur. Le bouton `Charger CAPM Lot 1` charge les questions du lot CAPM local dans `exam_lots` et `question_bank`.

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

## Envoi automatique des emails

Le dossier `supabase/functions/send-email-queue` contient une fonction Supabase Edge Function qui lit `email_queue`, envoie les emails via Resend, puis marque chaque email `sent` ou `failed`.

Adresse expediteur configuree:

```text
k.majuscule@pmi-drcongo.org
```

Etapes d'activation:

1. Verifier le domaine `pmi-drcongo.org` dans Resend.
2. Creer une cle API Resend.
3. Dans Supabase, ajouter les secrets:

```text
RESEND_API_KEY=...
MAIL_FROM=k.majuscule@pmi-drcongo.org
SUPABASE_SERVICE_ROLE_KEY=...
EMAIL_BATCH_SIZE=20
```

4. Deployer la fonction:

```text
supabase functions deploy send-email-queue --no-verify-jwt
```

5. Planifier l'envoi automatique avec `supabase/email-queue-cron.sql` apres avoir remplace `PROJECT_REF` et `SUPABASE_ANON_KEY`.
