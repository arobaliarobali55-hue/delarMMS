import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

const ProductCRUD: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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

        const { data } = await supabase.from('products').select('*').order('name');
        if (data) setProducts(data);
    };

    const handleDelete = async (id: string) => {
        await supabase.from('products').delete().eq('id', id);
        setProducts(prev => prev.filter(p => p.id !== id));
        setDeleteConfirmId(null);
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {products.map((p) => (
                    <div key={p.id} className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                        {deleteConfirmId === p.id ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                                <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Delete product?</div>
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                    <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '8px', background: 'var(--glass)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                                    <button onClick={() => handleDelete(p.id)} style={{ flex: 1, padding: '8px', background: 'var(--danger)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Delete</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{p.name}</h4>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={() => { setCurrentProduct(p); setIsModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                        <button onClick={() => setDeleteConfirmId(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Price:</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>৳{p.price}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Stock:</span>
                                        <span style={{ color: p.stock < 10 ? 'var(--danger)' : 'var(--success)', fontWeight: 800 }}>
                                            {p.stock} units
                                        </span>
                                    </div>
                                </div>

                                {p.stock < 10 && (
                                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
                                        <AlertCircle size={16} /> Low Stock Alert
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '32px' }}>
                        <h3 style={{ marginBottom: '24px' }}>{currentProduct.id ? 'Edit' : 'Add'} Product</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Product Name</label>
                                <input
                                    placeholder="Enter product name"
                                    value={currentProduct.name}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px', color: '#fff', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Price (৳)</label>
                                <input
                                    type="number"
                                    placeholder="Price in Taka"
                                    value={currentProduct.price}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px', color: '#fff', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stock Quantity</label>
                                <input
                                    type="number"
                                    placeholder="Number of units"
                                    value={currentProduct.stock}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, stock: Number(e.target.value) })}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px', color: '#fff', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', background: 'var(--glass)', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button onClick={handleSave} className="btn-primary" style={{ flex: 1, fontWeight: 700 }}>Save Product</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductCRUD;
