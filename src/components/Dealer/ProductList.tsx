import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { Package, ShoppingCart, X, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';

interface ProductListProps {
    adminId?: string | null;
}

const ProductList: React.FC<ProductListProps> = ({ adminId }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    // Initialize chat with adminId to enable sending messages
    const { sendMessage } = useChat(adminId || undefined);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [ordering, setOrdering] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (!error && data) setProducts(data);
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

    const handleOrderClick = (product: Product) => {
        setSelectedProduct(product);
        setQuantity(1);
    };

    const confirmOrder = async () => {
        if (!selectedProduct || !user || !adminId) return;
        setOrdering(true);

        try {
            // 1. Create Order Record
            const { error: orderError } = await supabase
                .from('orders')
                .insert([{
                    dealer_id: user.id,
                    product_id: selectedProduct.id,
                    quantity: quantity,
                    status: 'pending'
                }]);

            if (orderError) throw orderError;

            // 2. Decrement Stock
            const { error: stockError } = await supabase
                .from('products')
                .update({ stock: selectedProduct.stock - quantity })
                .eq('id', selectedProduct.id);

            if (stockError) console.error('Stock update failed:', stockError);

            // 3. Send Chat Notification
            const message = `New Order Request:\n📦 ${selectedProduct.name} (x${quantity})\n💰 Total: $${selectedProduct.price * quantity}`;
            await sendMessage(message);

            alert('Order placed successfully! Check your Order History.');
            setSelectedProduct(null);
        } catch (error: any) {
            console.error('Order failed:', error);
            alert('Failed to place order: ' + error.message);
        } finally {
            setOrdering(false);
        }
    };

    if (loading) return <div>Loading collection...</div>;

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {products.map((product) => (
                    <div key={product.id} className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '12px',
                                background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: product.stock > 0 ? 'var(--primary)' : 'var(--danger)'
                            }}>
                                <Package size={32} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ marginBottom: '4px' }}>{product.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
                                    Price: <span style={{ color: '#fff', fontWeight: 600 }}>${product.price}</span>
                                </p>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: product.stock < 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    color: product.stock < 10 ? 'var(--danger)' : 'var(--success)',
                                    border: product.stock < 10 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    {product.stock} in stock
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleOrderClick(product)}
                            disabled={product.stock === 0}
                            style={{
                                marginTop: 'auto',
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: product.stock > 0 ? 'var(--primary)' : 'var(--bg-dark)',
                                color: product.stock > 0 ? '#000' : 'var(--text-muted)',
                                fontWeight: 600,
                                cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: '0.2s'
                            }}
                        >
                            <ShoppingCart size={18} />
                            {product.stock > 0 ? 'Order Now' : 'Out of Stock'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Order Modal */}
            {selectedProduct && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Confirm Order</h3>
                            <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Product</p>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedProduct.name}</div>
                            <div style={{ color: 'var(--primary)', fontWeight: 600 }}>${selectedProduct.price} / unit</div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Quantity</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer' }}
                                >-</button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{ flex: 1, padding: '10px', textAlign: 'center', background: 'var(--bg-dark)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1.1rem' }}
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                                    style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer' }}
                                >+</button>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Total Amount</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>${(selectedProduct.price * quantity).toLocaleString()}</span>
                        </div>

                        <button
                            onClick={confirmOrder}
                            disabled={ordering}
                            className="btn-primary"
                            style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {ordering ? 'Processing...' : (
                                <>
                                    <Check size={20} /> Confirm Order
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductList;
