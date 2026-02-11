import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { Package } from 'lucide-react';
import { motion } from 'framer-motion';

const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (!error && data) {
                setProducts(data);
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
                                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>৳{product.price}</span>
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
                                {product.stock > 0 ? `${product.stock} units available` : 'Out of Stock'}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default ProductList;
