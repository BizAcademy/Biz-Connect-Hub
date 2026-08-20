ALTER TABLE "site_content"
  ADD COLUMN IF NOT EXISTS "presentation_title" text NOT NULL DEFAULT 'Découvrez Biz Connect Academy',
  ADD COLUMN IF NOT EXISTS "countries_title" text NOT NULL DEFAULT 'Disponible dans plus de 20 pays d''Afrique',
  ADD COLUMN IF NOT EXISTS "benefits_title" text NOT NULL DEFAULT 'Voici ce que tu vas gagner en nous rejoignant',
  ADD COLUMN IF NOT EXISTS "ambassadors_title" text NOT NULL DEFAULT 'Nos ambassadeurs',
  ADD COLUMN IF NOT EXISTS "gains_title" text NOT NULL DEFAULT 'Tes gains par affiliation',
  ADD COLUMN IF NOT EXISTS "gains_secondary_title" text NOT NULL DEFAULT 'À la Biz Connect Academy, même si tu dors, ton téléphone travaille pour toi.',
  ADD COLUMN IF NOT EXISTS "testimonials_title" text NOT NULL DEFAULT 'De nombreux jeunes venant de plusieurs pays se sont lancés et voilà leurs résultats et témoignages',
  ADD COLUMN IF NOT EXISTS "trainings_title" text NOT NULL DEFAULT 'Catalogue de formations',
  ADD COLUMN IF NOT EXISTS "cta_title" text NOT NULL DEFAULT 'Tu veux commencer ?',
  ADD COLUMN IF NOT EXISTS "faq_title" text NOT NULL DEFAULT 'Questions fréquentes',
  ADD COLUMN IF NOT EXISTS "support_title" text NOT NULL DEFAULT 'Contacte le support',
  ADD COLUMN IF NOT EXISTS "partners_title" text NOT NULL DEFAULT 'Nos partenaires',
  ADD COLUMN IF NOT EXISTS "payment_methods_title" text NOT NULL DEFAULT 'Moyens de paiement acceptés';