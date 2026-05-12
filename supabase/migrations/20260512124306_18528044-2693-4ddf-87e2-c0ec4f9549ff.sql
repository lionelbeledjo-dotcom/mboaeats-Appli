REVOKE EXECUTE ON FUNCTION public.wallet_apply(uuid, integer, text, text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.wallet_apply(uuid, integer, text, text, text, uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.refund_order_to_wallet(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.refund_order_to_wallet(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.tg_notify_refund() FROM PUBLIC, anon;