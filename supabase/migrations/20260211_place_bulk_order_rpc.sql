-- Create RPC function for atomic bulk ordering
CREATE OR REPLACE FUNCTION place_bulk_order(
    p_dealer_id UUID,
    p_items JSONB,
    p_message_text TEXT,
    p_receiver_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_msg_id UUID;
    v_order_count INTEGER := 0;
BEGIN
    -- 1. Loop through items to check stock and deduct
    -- Note: This is an atomic transaction
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER) LOOP
        -- Deduct stock and check if sufficient in one go
        UPDATE products
        SET stock = stock - v_item.quantity
        WHERE id = v_item.product_id AND stock >= v_item.quantity;

        IF NOT FOUND THEN
            -- Check if product exists at all
            IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_item.product_id) THEN
                RAISE EXCEPTION 'Product not found: %', v_item.product_id;
            ELSE
                RAISE EXCEPTION 'Insufficient stock for product ID: %', v_item.product_id;
            END IF;
        END IF;

        -- 2. Create Order
        -- Ensure we are using the dealer_id from parameters and NOT auth.uid() directly if we want flexibility
        INSERT INTO orders (dealer_id, product_id, quantity, status)
        VALUES (p_dealer_id, v_item.product_id, v_item.quantity, 'pending');
        
        v_order_count := v_order_count + 1;
    END LOOP;

    -- 3. Create Single Message (Type: 'order')
    -- If p_receiver_id is null, it should be sent to the system or admin but current table allows NULL
    INSERT INTO messages (sender_id, receiver_id, message, type)
    VALUES (p_dealer_id, p_receiver_id, p_message_text, 'order')
    RETURNING id INTO v_msg_id;

    -- Return success object
    RETURN jsonb_build_object(
        'success', true,
        'order_count', v_order_count,
        'message_id', v_msg_id
    );
END;
$$;
