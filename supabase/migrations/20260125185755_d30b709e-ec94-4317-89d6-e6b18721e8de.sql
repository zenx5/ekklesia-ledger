-- Add deleted_at column to expenses table
ALTER TABLE public.expenses ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at column to financial_reports table
ALTER TABLE public.financial_reports ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at column to members table
ALTER TABLE public.members ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_at column to tithers table
ALTER TABLE public.tithers ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create indexes for better performance on soft delete queries
CREATE INDEX idx_expenses_deleted_at ON public.expenses(deleted_at);
CREATE INDEX idx_financial_reports_deleted_at ON public.financial_reports(deleted_at);
CREATE INDEX idx_members_deleted_at ON public.members(deleted_at);
CREATE INDEX idx_tithers_deleted_at ON public.tithers(deleted_at);

-- Update RLS policies to allow UPDATE for soft delete on expenses
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses" ON public.expenses
FOR UPDATE USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- Update RLS policies to allow UPDATE for soft delete on financial_reports
DROP POLICY IF EXISTS "Users can update own reports" ON public.financial_reports;
CREATE POLICY "Users can update own reports" ON public.financial_reports
FOR UPDATE USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- Update RLS policies to allow UPDATE for soft delete on members (admins only)
DROP POLICY IF EXISTS "Admins can update members" ON public.members;
CREATE POLICY "Admins can update members" ON public.members
FOR UPDATE USING (is_admin(auth.uid()));

-- Update RLS policies to allow UPDATE for soft delete on tithers
DROP POLICY IF EXISTS "Users can update tithers" ON public.tithers;
CREATE POLICY "Users can update tithers" ON public.tithers
FOR UPDATE USING (true);