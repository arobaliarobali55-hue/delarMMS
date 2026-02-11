
-- 1. Create RPC function for atomic ordering
CREATE OR REPLACE FUNCTION place_order(
    p_dealer_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_message_text TEXT,
    p_receiver_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for stock update and order insertion
AS $$
DECLARE
    v_product_price DECIMAL;
    v_product_name TEXT;
    v_current_stock INTEGER;
    v_order_id UUID;
    v_new_stock INTEGER;
    v_total_price DECIMAL;
BEGIN
    -- 1. Get product details and lock row (optional, but good for concurrency)
    SELECT price, name, stock INTO v_product_price, v_product_name, v_current_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE; -- Lock to prevent race conditions

    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
    END IF;

    -- 2. Deduct Stock
    v_new_stock := v_current_stock - p_quantity;
    UPDATE products
    SET stock = v_new_stock
    WHERE id = p_product_id;

    -- 3. Create Order
    INSERT INTO orders (dealer_id, product_id, quantity, status)
    VALUES (p_dealer_id, p_product_id, p_quantity, 'pending')
    RETURNING id INTO v_order_id;

    -- 4. Create Message (Type: 'order')
    INSERT INTO messages (sender_id, receiver_id, message, type)
    VALUES (p_dealer_id, p_receiver_id, p_message_text, 'order');

    -- Return success object
    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'new_stock', v_new_stock,
        'product_name', v_product_name,
        'quantity', p_quantity
    );
END;
$$;
