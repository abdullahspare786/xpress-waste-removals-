/*
# Create quote requests for Xpress Waste Removals

1. New Tables
- `quote_requests` stores website quote enquiries from prospective customers.
- `id` identifies each enquiry.
- `name`, `email`, `phone`, `postcode`, `service`, and `message` contain the customer-provided details.
- `created_at` records when the enquiry was submitted.

2. Security
- Row Level Security is enabled.
- The public website may insert enquiries and read/update/delete rows for this single-business workflow.
- The table intentionally contains only contact and service details needed to respond to a quote request.

3. Important Notes
- No sign-in is required for customers to request a quote.
- Policies are split by operation for explicit access control.
*/

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  postcode text NOT NULL,
  service text NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read quote requests" ON public.quote_requests;
CREATE POLICY "Public can read quote requests" ON public.quote_requests
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can submit quote requests" ON public.quote_requests;
CREATE POLICY "Public can submit quote requests" ON public.quote_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update quote requests" ON public.quote_requests;
CREATE POLICY "Public can update quote requests" ON public.quote_requests
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete quote requests" ON public.quote_requests;
CREATE POLICY "Public can delete quote requests" ON public.quote_requests
  FOR DELETE TO anon, authenticated USING (true);
