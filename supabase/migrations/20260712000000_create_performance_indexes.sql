-- Create indexes for performance optimization
create index if not exists idx_anvat_orders_created_at on public.anvat_orders(created_at desc);
create index if not exists idx_anvat_orders_customer_phone on public.anvat_orders(customer_phone);
create index if not exists idx_anvat_point_history_customer_phone on public.anvat_point_history(customer_phone);
create index if not exists idx_anvat_point_history_order_id on public.anvat_point_history(order_id);
