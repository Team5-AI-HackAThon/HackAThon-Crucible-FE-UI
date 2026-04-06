-- Seed lookup tables: industries & project stages (align with onboarding + PRD taxonomies)

INSERT INTO public.project_stages (slug, name, sort_order)
VALUES
  ('pre-seed', 'Pre-Seed', 10),
  ('seed', 'Seed', 20),
  ('series-a', 'Series A', 30),
  ('series-b', 'Series B', 40),
  ('series-c', 'Series C', 50)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.industries (slug, name, sort_order)
VALUES
  ('ai-ml', 'AI / ML', 10),
  ('b2b-saas', 'B2B SaaS', 20),
  ('fintech', 'Fintech', 30),
  ('climate', 'Climate', 40),
  ('health-tech', 'Health Tech', 50),
  ('dev-tools', 'Dev Tools', 60),
  ('consumer', 'Consumer', 70),
  ('deep-tech', 'Deep Tech', 80),
  ('security', 'Security', 90),
  ('other', 'Other', 100)
ON CONFLICT (slug) DO NOTHING;
