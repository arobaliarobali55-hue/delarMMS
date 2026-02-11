import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { Package, ShoppingCart, Plus, Minus } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface ProductListProps {
    adminId: string | null;
}

const ProductList: React.FC<ProductListProps> = ({ adminId }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [orderingId, setOrderingId] = useState<string | null>(null);
    const { placeOrder } = useChat(adminId);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (!error && data) {
                setProducts(data);
                const initialQuants: Record<string, number> = {};
                data.forEach(p => initialQuants[p.id] = 1);
                setQuantities(initialQuants);
            }
            setLoading(false);
        };

        fetchProducts();

        const channel = supabase
            .channel('products_stock')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const updateQuantity = (id: string, delta: number) => {
        setQuantities(prev => ({
            ...prev,
            [id]: Math.max(1, (prev[id] || 1) + delta)
        }));
    };

    const handleOrder = async (product: Product) => {
        if (!adminId) {
            toast.error('Admin support is currently offline. Please try again later.');
            return;
        }

        const qty = quantities[product.id] || 1;
        if (qty > product.stock) {
            toast.error('Insufficient stock available');
            return;
        }

        setOrderingId(product.id);
        const toastId = toast.loading(`Placing order for ${product.name}...`);

        try {
            const messageText = `📦 New Order via Catalog:\n${product.name} (x${qty})\n💰 Total: $${(product.price * qty).toFixed(2)}`;

            await placeOrder(product.id, qty, messageText, product.name, product.price);

            toast.success('Order placed successfully!', { id: toastId });
            setQuantities(prev => ({ ...prev, [product.id]: 1 }));
        } catch (err: any) {
            toast.error('Failed to place order: ' + err.message, { id: toastId });
        } finally {
            setOrderingId(null);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {products.map((product) => (
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={product.id}
                    className="glass-panel"
                    style={{ padding: '24px', display: 'flex', gap: '20px', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: product.stock > 0 ? 'var(--primary)' : 'var(--danger)',
                            border: '1px solid var(--border)'
                        }}>
                            <Package size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: '4px', fontSize: '1.25rem' }}>{product.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>${product.price}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>per unit</span>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: product.stock < 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: product.stock < 10 ? 'var(--danger)' : 'var(--success)',
                                border: product.stock < 10 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                {product.stock} units left
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                        {product.stock > 0 ? (
                            <>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'var(--glass)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    padding: '4px'
                                }}>
                                    <button
                                        onClick={() => updateQuantity(product.id, -1)}
                                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#fff' }}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: 600 }}>{quantities[product.id] || 1}</span>
                                    <button
                                        onClick={() => updateQuantity(product.id, 1)}
                                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#fff' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleOrder(product)}
                                    disabled={orderingId === product.id}
                                    className="btn-primary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: orderingId === product.id ? 0.7 : 1 }}
                                >
                                    {orderingId === product.id ? (
                                        <div className="loader" style={{ width: '16px', height: '16px', border: '2px solid #000', borderTopColor: 'transparent' }}></div>
                                    ) : (
                                        <>
                                            <ShoppingCart size={18} />
                                            <span>Quick Order</span>
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button disabled style={{ flex: 1, background: 'var(--glass)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '12px', borderRadius: '12px', cursor: 'not-allowed' }}>
                                Out of Stock
                            </button>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default ProductList;
