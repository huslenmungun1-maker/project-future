-- ============================================================
--  Enkhverse — approve_milestone function
--  Atomically: check balance, debit offeror, credit creator,
--  mark milestone paid, complete contract if all milestones paid.
-- ============================================================

create or replace function public.approve_milestone(
  p_milestone_id uuid,
  p_offeror_id   uuid,
  p_creator_id   uuid
)
returns jsonb language plpgsql security definer as $$
declare
  v_amount        numeric(12,2);
  v_title         text;
  v_contract_id   uuid;
  v_ms_status     text;
  v_contract_status text;
  v_offeror_wallet uuid;
  v_creator_wallet uuid;
  v_offeror_bal   numeric(12,2);
  v_all_paid      boolean;
begin
  -- Lock and read milestone
  select amount, title, contract_id, status
  into v_amount, v_title, v_contract_id, v_ms_status
  from public.contract_milestones
  where id = p_milestone_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'milestone_not_found');
  end if;

  if v_ms_status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'milestone_not_submitted');
  end if;

  -- Verify contract is active
  select status into v_contract_status
  from public.contracts
  where id = v_contract_id;

  if v_contract_status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'contract_not_active');
  end if;

  -- Lock offeror wallet and check balance
  select id, balance into v_offeror_wallet, v_offeror_bal
  from public.wallets
  where user_id = p_offeror_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_wallet');
  end if;

  if v_offeror_bal < v_amount then
    return jsonb_build_object(
      'ok',       false,
      'error',    'insufficient_balance',
      'balance',  v_offeror_bal,
      'required', v_amount
    );
  end if;

  -- Lock creator wallet
  select id into v_creator_wallet
  from public.wallets
  where user_id = p_creator_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'creator_no_wallet');
  end if;

  -- Debit offeror
  update public.wallets set balance = balance - v_amount where id = v_offeror_wallet;
  insert into public.transactions (wallet_id, type, amount, description)
  values (v_offeror_wallet, 'debit', v_amount, 'Contract milestone: ' || v_title);

  -- Credit creator
  update public.wallets set balance = balance + v_amount where id = v_creator_wallet;
  insert into public.transactions (wallet_id, type, amount, description)
  values (v_creator_wallet, 'credit', v_amount, 'Contract milestone: ' || v_title);

  -- Mark milestone paid
  update public.contract_milestones
  set status = 'paid', updated_at = now()
  where id = p_milestone_id;

  -- Complete contract if all milestones are now paid
  select not exists (
    select 1 from public.contract_milestones
    where contract_id = v_contract_id and status <> 'paid'
  ) into v_all_paid;

  if v_all_paid then
    update public.contracts
    set status = 'completed', updated_at = now()
    where id = v_contract_id;
  end if;

  return jsonb_build_object(
    'ok',      true,
    'allPaid', v_all_paid,
    'amount',  v_amount
  );
end;
$$;
