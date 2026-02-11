-- Fix Order Placement Permissions
-- Date: 2026-02-11

-- Problem: Dealers cannot UPDATE products (stock deduction) due to RLS.
-- Solution: Make place_bulk_order SECURITY DEFINER so it runs with admin privileges.
-- Security: Added check to ensure users can only place orders for themselves (unless admin).

CREATE OR REPLACE FUNCTION public.place_bulk_order(
    p_dealer_id UUID,
    p_items JSONB,
    p_message_text TEXT,
    p_receiver_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
    v_msg_id UUID;
    v_order_count INTEGER := 0;
BEGIN
    -- 1. Security Check
    -- Allow if user is placing order for themselves OR user is admin
    -- Note: is_admin() checks the role of auth.uid()
    IF auth.uid() != p_dealer_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 2. Loop through items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER) LOOP
        -- Deduct stock and check if sufficient
        UPDATE products
        SET stock = stock - v_item.quantity
        WHERE id = v_item.product_id AND stock >= v_item.quantity;

        IF NOT FOUND THEN
             -- Check if product exists to give better error
            IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_item.product_id) THEN
                RAISE EXCEPTION 'Product not found';
            ELSE
                RAISE EXCEPTION 'Insufficient stock';
            END IF;
        END IF;

        -- Create Order
        INSERT INTO orders (dealer_id, product_id, quantity, status)
        VALUES (p_dealer_id, v_item.product_id, v_item.quantity, 'pending');
        
        v_order_count := v_order_count + 1;
    END LOOP;

    -- 3. Create Message
    INSERT INTO messages (sender_id, receiver_id, message, type)
    VALUES (p_dealer_id, p_receiver_id, p_message_text, 'order')
    RETURNING id INTO v_msg_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_count', v_order_count,
        'message_id', v_msg_id
    );
END;
$$;
