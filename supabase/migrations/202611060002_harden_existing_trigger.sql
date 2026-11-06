-- Supabase's pre-existing event trigger is internal administration, not a public RPC.
-- Its owner can still execute it; this does not disable automatic RLS enforcement.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
