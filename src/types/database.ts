export type UserRole = 'admin' | 'dealer';
export type MessageType = 'text' | 'order' | 'system';
export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  created_at?: string;
}

export interface Order {
  id: string;
  dealer_id: string;
  product_id: string;
  quantity: number;
  status: OrderStatus;
  created_at: string;
  // Joined fields (Supabase relations)
  dealer?: { name: string };
  products?: { name: string; price: number };
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  type: MessageType;
  timestamp: string;
  // Joined fields
  sender?: Profile;
  // Local-only state for UI
  status?: 'sending' | 'sent' | 'error';
}
