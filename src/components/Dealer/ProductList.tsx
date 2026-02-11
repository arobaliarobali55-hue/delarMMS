import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { Package } from 'lucide-react';

const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div>Loading collection...</div>;

    return (
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
                </div>
            ))}
        </div>
    );
};

export default ProductList;
