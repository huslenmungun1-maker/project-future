-- ============================================================
--  Enkhverse — credit_wallet function
--  Atomic wallet credit with a configurable description.
--  Used by the Stripe webhook for real top-ups.
-- ============================================================

create or replace function public.credit_wallet(
  p_user_id     uuid,
  p_amount      numeric,
  p_description text default 'Wallet top-up'
)
returns jsonb language plpgsql security definer as $$
declare
  v_wallet_id uuid;
begin
  select id into v_wallet_id from public.wallets where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_wallet');
  end if;

  update public.wallets set balance = balance + p_amount where id = v_wallet_id;

  insert into public.transactions (wallet_id, type, amount, description)
  values (v_wallet_id, 'credit', p_amount, p_description);

  return jsonb_build_object('ok', true);
end;
$$;
