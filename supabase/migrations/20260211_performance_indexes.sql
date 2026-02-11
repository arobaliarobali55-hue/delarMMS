-- Performance Optimization Indexes
-- Date: 2026-02-11

-- 1. Orders table optimizations
-- Index for filtering orders by dealer (Dashboard/History)
CREATE INDEX IF NOT EXISTS orders_dealer_id_idx ON public.orders(dealer_id);

-- Index for analytics filtering by product
CREATE INDEX IF NOT EXISTS orders_product_id_idx ON public.orders(product_id);

-- Index for time-series analytics and sorting
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);


-- 2. Products table optimizations
-- (No category column found in products table)


-- 3. Messages table optimizations
-- Composite index for chat history lookups (sender+receiver+time)
-- This significantly speeds up the .or().order() query in ChatProvider
CREATE INDEX IF NOT EXISTS messages_composition_idx ON public.messages(sender_id, receiver_id, timestamp DESC);
