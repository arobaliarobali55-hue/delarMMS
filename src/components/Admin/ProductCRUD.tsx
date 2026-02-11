import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

const ProductCRUD: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ name: '', stock: 0, price: 0 });
    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase.from('products').select('*').order('name');
            if (!error && data) setProducts(data);
            setLoading(false);
        };
        fetchProducts();
    }, []);

    const handleSave = async () => {
        const { id, name, stock, price } = currentProduct;
        if (!name || stock === undefined || price === undefined) return;

        if (id) {
            await supabase.from('products').update({ name, stock: Number(stock), price: Number(price) }).eq('id', id);
        } else {
            await supabase.from('products').insert([{ name, stock: Number(stock), price: Number(price) }]);
        }

        setIsModalOpen(false);
        setCurrentProduct({ name: '', stock: 0, price: 0 });

        // Refresh products
        const { data } = await supabase.from('products').select('*').order('name');
        if (data) setProducts(data);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this product?')) {
            await supabase.from('products').delete().eq('id', id);
            const { data } = await supabase.from('products').select('*').order('name');
            if (data) setProducts(data);
        }
    };

    if (loading) return <div>Loading inventory...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                    <h3>Inventory Management</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your catalog and stock levels</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> Add Product
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {products.map((p) => (
                    <div key={p.id} className="glass-panel" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '1.1rem' }}>{p.name}</h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setCurrentProduct(p); setIsModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Price:</span>
                                <span>${p.price}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Stock:</span>
                                <span style={{ color: p.stock < 10 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                                    {p.stock} units
                                </span>
                            </div>
                        </div>

                        {
                            p.stock < 10 && (
                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <AlertCircle size={14} /> Low Stock Alert
                                </div>
                            )
                        }
                    </div>
                ))}
            </div>

            {
                isModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
                            <h3>{currentProduct.id ? 'Edit' : 'Add'} Product</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                                <input
                                    placeholder="Product Name"
                                    value={currentProduct.name}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={currentProduct.price}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                />
                                <input
                                    type="number"
                                    placeholder="Initial Stock"
                                    value={currentProduct.stock}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, stock: Number(e.target.value) })}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                />
                                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                    <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'var(--glass)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ProductCRUD;
