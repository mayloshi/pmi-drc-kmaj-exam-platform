-- Seed CISSP lot shells from the PDF table of contents.
-- Questions are intentionally not copied from the copyrighted PDF.

insert into public.exam_lots (id, exam_type, title_fr, title_en, source, question_count, active) values
('cissp-01', 'CISSP', 'CISSP Mock Exam (Baseline)', 'CISSP Mock Exam (Baseline)', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-02', 'CISSP', 'CISSP Mock Exam (LITE) - 1 - Security and Risk Management', 'CISSP Mock Exam (LITE) - 1 - Security and Risk Management', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-03', 'CISSP', 'CISSP Mock Exam (LITE) - 2 - Identity and Access Management', 'CISSP Mock Exam (LITE) - 2 - Identity and Access Management', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-04', 'CISSP', 'CISSP Mock Exam (LITE) - 3 - Security Engineering', 'CISSP Mock Exam (LITE) - 3 - Security Engineering', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-05', 'CISSP', 'CISSP Mock Exam (LITE) - 4 - Communications and Network Security', 'CISSP Mock Exam (LITE) - 4 - Communications and Network Security', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-06', 'CISSP', 'CISSP Mock Exam (LITE) - 5 - Security Assessment and Testing', 'CISSP Mock Exam (LITE) - 5 - Security Assessment and Testing', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-07', 'CISSP', 'CISSP Mock Exam (LITE) - 6 - Asset Security Practice', 'CISSP Mock Exam (LITE) - 6 - Asset Security Practice', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-08', 'CISSP', 'CISSP Mock Exam (LITE) - 7 - Software Development Security', 'CISSP Mock Exam (LITE) - 7 - Software Development Security', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-09', 'CISSP', 'CISSP Mock Exam (LITE) - 8 - Security Operations', 'CISSP Mock Exam (LITE) - 8 - Security Operations', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-10', 'CISSP', 'CISSP Mock Exam (LITE) - 9', 'CISSP Mock Exam (LITE) - 9', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-11', 'CISSP', 'CISSP Mock Exam (LITE) - 10', 'CISSP Mock Exam (LITE) - 10', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-12', 'CISSP', 'CISSP Mock Exam (LITE) - 11', 'CISSP Mock Exam (LITE) - 11', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-13', 'CISSP', 'CISSP Mock Exam (LITE) - 12 - Multi Domain', 'CISSP Mock Exam (LITE) - 12 - Multi Domain', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-14', 'CISSP', 'CISSP Mock Exam (LITE) - 13', 'CISSP Mock Exam (LITE) - 13', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-15', 'CISSP', 'CISSP Mock Exam (LITE) - 14', 'CISSP Mock Exam (LITE) - 14', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-16', 'CISSP', 'CISSP Mock Exam (LITE) - 15', 'CISSP Mock Exam (LITE) - 15', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-17', 'CISSP', 'CISSP Mock Exam (LITE) - 16', 'CISSP Mock Exam (LITE) - 16', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-18', 'CISSP', 'CISSP Mock Exam (LITE) - 17', 'CISSP Mock Exam (LITE) - 17', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-19', 'CISSP', 'CISSP Mock Exam (LITE) - 18', 'CISSP Mock Exam (LITE) - 18', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-20', 'CISSP', 'CISSP Mock Exam (LITE) - 19', 'CISSP Mock Exam (LITE) - 19', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-21', 'CISSP', 'Extra Domain Area Test - Security and Risk Management', 'Extra Domain Area Test - Security and Risk Management', 'CISSP PDF table of contents - questions require authorized import', 0, true),
('cissp-22', 'CISSP', 'Extra Domain Area Test - Security Operations', 'Extra Domain Area Test - Security Operations', 'CISSP PDF table of contents - questions require authorized import', 0, true)
on conflict (id) do update set exam_type = excluded.exam_type, title_fr = excluded.title_fr, title_en = excluded.title_en, source = excluded.source, question_count = excluded.question_count, active = excluded.active;
