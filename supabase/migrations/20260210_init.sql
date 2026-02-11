-- Create roles enum
CREATE TYPE user_role AS ENUM ('admin', 'dealer');
CREATE TYPE message_type AS ENUM ('text', 'order', 'system');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');

-- 1. Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'dealer',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES profiles(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    receiver_id UUID REFERENCES profiles(id), -- Null for broadcast if needed, otherwise specific recipient
    message TEXT NOT NULL,
    type message_type NOT NULL DEFAULT 'text',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Admins see all, Dealers see self
CREATE POLICY "Admins can see all profiles" ON profiles FOR SELECT TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can see their own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Products: Everyone can see, only admins can manage
CREATE POLICY "Everyone can see products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON products FOR ALL TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Orders: Admins see all, Dealers see own
CREATE POLICY "Admins can see all orders" ON orders FOR SELECT TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Dealers can see own orders" ON orders FOR SELECT TO authenticated USING (dealer_id = auth.uid());

-- Messages: Users see messages they sent or received
CREATE POLICY "Users can see their own messages" ON messages FOR SELECT TO authenticated USING (
    sender_id = auth.uid() OR receiver_id = auth.uid() OR receiver_id IS NULL
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- AUTOMATION: Order processing logic
CREATE OR REPLACE FUNCTION process_chat_order()
RETURNS TRIGGER AS $$
DECLARE
    p_name TEXT;
    p_quantity INTEGER;
    p_id UUID;
    v_admin_id UUID;
BEGIN
    -- Only process text messages from dealers
    IF NEW.type = 'text' AND (SELECT role FROM profiles WHERE id = NEW.sender_id) = 'dealer' THEN
        -- Simple parsing logic: "Item Quantity" (e.g., "Burger 10")
        -- regexp_matches returns an array
        SELECT (regexp_matches(NEW.message, '^([a-zA-Z\s]+)\s+(\d+)$'))[1], (regexp_matches(NEW.message, '^([a-zA-Z\s]+)\s+(\d+)$'))[2]::INTEGER
        INTO p_name, p_quantity;

        IF p_name IS NOT NULL AND p_quantity > 0 THEN
            -- Try to find product (case insensitive)
            SELECT id INTO p_id FROM products WHERE LOWER(name) = LOWER(TRIM(p_name)) LIMIT 1;

            IF p_id IS NOT NULL THEN
                -- Check stock
                IF (SELECT stock FROM products WHERE id = p_id) >= p_quantity THEN
                    -- Reduce stock
                    UPDATE products SET stock = stock - p_quantity WHERE id = p_id;
                    
                    -- Create order
                    INSERT INTO orders (dealer_id, product_id, quantity, status)
                    VALUES (NEW.sender_id, p_id, p_quantity, 'confirmed');

                    -- Mark message as order type (optional, for UI)
                    UPDATE messages SET type = 'order' WHERE id = NEW.id;

                    -- Send system confirmation
                    INSERT INTO messages (sender_id, receiver_id, message, type)
                    SELECT NEW.receiver_id, NEW.sender_id, '✅ Order confirmed: ' || p_quantity || ' ' || p_name || '. Stock updated.', 'system';
                ELSE
                    -- Insufficient stock message
                    INSERT INTO messages (sender_id, receiver_id, message, type)
                    SELECT NEW.receiver_id, NEW.sender_id, '❌ Failed: Insufficient stock for ' || p_name, 'system';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_chat_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION process_chat_order();

-- 5. NEW: Handle new user signup profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'dealer'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
