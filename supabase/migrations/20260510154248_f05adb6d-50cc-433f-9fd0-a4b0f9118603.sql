
-- Wipe & reseed document_templates with new Editorial Magazine collection
DELETE FROM public.document_templates;

INSERT INTO public.document_templates (id, kind, name, description, category, sort_order) VALUES
-- DOCUMENT
('broadsheet',    'document', 'Broadsheet',   'Magazine-style editorial with giant Fraunces serif headline, drop cap, and pull quotes on warm cream paper.',           'standard', 10),
('quiet',         'document', 'Quiet',        'Minimal Apple-Newsroom feel: pure white, narrow centered measure, thin gold rule, calm Inter Tight typography.',         'standard', 20),
('manuscript',    'document', 'Manuscript',   'Literary book aesthetic with Cormorant serif, paper-tone background, Roman section numbers and margin notes.',           'premium',  30),

-- REPORT
('quarterly',     'report',   'Quarterly',    'Editorial business report: cream/black, oversized mono KPI numbers, hairline tables, numbered footnotes.',                'standard', 10),
('field-notes',   'report',   'Field Notes',  'Research-paper feel on kraft background with sidebars, classic serif body and stat callouts.',                            'premium',  20),
('briefing',      'report',   'Briefing',     'Executive briefing on white with bold short Sans headlines, accent summary card, dividers and clean bullets.',             'standard', 30),

-- LETTER
('correspondence','letter',   'Correspondence','Personal editorial letter on cream with italic Fraunces salutation, mono date, and signed-off close.',                   'standard', 10),
('memorandum',    'letter',   'Memorandum',   'Corporate memo on white with FROM / TO / RE / DATE mono header table and crisp Sans body.',                                'standard', 20),
('invitation',    'letter',   'Invitation',   'Luxe dark-and-gold invitation with centered italic serif and elegant generous spacing.',                                  'premium',  30),

-- RESUME
('editorial-cv',  'resume',   'Editorial CV', 'Magazine CV: huge serif name, italic pull-quote summary, mono-numbered timeline, borderless skill tags.',                  'standard', 10),
('two-column',    'resume',   'Two Column',   'Balanced two-column resume — dark sidebar (contact + skills) and white main column with experience cards.',                'premium',  20),
('minimalist',    'resume',   'Minimalist',   'Pure Swiss minimalism on white with Inter Tight, single hairline rule and generous breathing room. Ideal for tech roles.', 'standard', 30);
