-- Allow CISSP lots, questions, and attempts in an existing Supabase database.

alter table public.exam_lots
  drop constraint if exists exam_lots_exam_type_check,
  add constraint exam_lots_exam_type_check
  check (exam_type in ('CAPM', 'PMP', 'CISSP', 'Gestion de projet'));

alter table public.question_bank
  drop constraint if exists question_bank_exam_type_check,
  add constraint question_bank_exam_type_check
  check (exam_type in ('CAPM', 'PMP', 'CISSP', 'Gestion de projet'));

alter table public.attempts
  drop constraint if exists attempts_exam_type_check,
  add constraint attempts_exam_type_check
  check (exam_type in ('CAPM', 'PMP', 'CISSP', 'Gestion de projet'));
