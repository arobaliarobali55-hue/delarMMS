import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Send, Info, Clock, CheckCheck, Smile, Paperclip, ShoppingCart, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';

interface ChatWindowProps {
    isDealer?: boolean;
    receiverId?: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isDealer = false, receiverId = null }) => {
    const { messages, sendMessage, loading, onlineUsers, typingUsers, sendTyping } = useChat(receiverId);
    const { user } = useAuth();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    // Order Feature State
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [ordering, setOrdering] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!loading) {
            scrollToBottom();
        }
    }, [messages, loading]);

    // Play sound on new message (if not from me)
    useEffect(() => {
        if (!loading && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            // Check if message is new (within last 5 seconds) to avoid sound on initial load
            const isNew = new Date(lastMsg.timestamp).getTime() > Date.now() - 5000;

            if (lastMsg.sender_id !== user?.id && isNew) {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed', e));
            }
        }
    }, [messages.length, user?.id, loading]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);

        if (receiverId) {
            sendTyping(true);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                sendTyping(false);
            }, 2000);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const content = inputText;
        setInputText(''); // Clear input immediately
        sendTyping(false); // Stop typing status

        try {
            await sendMessage(content);
        } catch {
            alert('Failed to send message');
            setInputText(content); // Revert on failure
        }
    };

    // --- Order Logic ---
    const openOrderModal = async () => {
        setShowOrderModal(true);
        if (products.length === 0) {
            setLoadingProducts(true);
            const { data } = await supabase.from('products').select('*').order('name');
            if (data) setProducts(data);
            setLoadingProducts(false);
        }
    };

    const closeOrderModal = () => {
        setShowOrderModal(false);
        setSelectedProduct(null);
        setQuantity(1);
        setSearchTerm('');
    };

    const handleProductSelect = (product: Product) => {
        if (product.stock > 0) {
            setSelectedProduct(product);
            setQuantity(1);
        }
    };

    const submitOrder = async () => {
        if (!selectedProduct || !user || !receiverId) return;
        setOrdering(true);

        try {
            // 1. Create DB Record
            const { error } = await supabase.from('orders').insert([{
                dealer_id: user.id,
                product_id: selectedProduct.id,
                quantity: quantity,
                status: 'pending'
            }]);

            if (error) throw error;

            // 2. Send Message
            const message = `New Order Request:\n📦 ${selectedProduct.name} (x${quantity})\n💰 Total: $${selectedProduct.price * quantity}`;
            await sendMessage(message);

            closeOrderModal();
        } catch (err: any) {
            alert('Failed to place order: ' + err.message);
        } finally {
            setOrdering(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8696a0' }}>
            <div className="loader"></div>
        </div>
    );

    const isOnline = receiverId ? onlineUsers.has(receiverId) : false;
    const isTyping = receiverId ? typingUsers.has(receiverId) : false;

    return (
        <div className="glass-panel chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b141a', position: 'relative' }}>
            <div style={{ padding: '10px 16px', background: '#202c33', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #2f3b43' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6a7f8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Info size={24} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#e9edef' }}>Support</h3>
                    <span style={{ fontSize: '0.8rem', color: '#8696a0' }}>
                        {isTyping ? 'Typing...' : (isOnline ? 'Online' : 'Offline')}
                    </span>
                </div>
            </div>

            {/* Messaging Area */}
            <div style={{
                flex: 1,
                padding: '20px 5%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px', // Closer messages like WhatsApp
                backgroundColor: '#0b141a'
            }}>
                {/* Encryption Notice */}
                <div style={{ textAlign: 'center', margin: '10px 0 20px', padding: '5px 10px', background: '#182229', borderRadius: '8px', color: '#8696a0', fontSize: '0.75rem', alignSelf: 'center', boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)' }}>
                    Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                </div>

                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => {
                        const isMe = msg.sender_id === user?.id;
                        const showTail = index === 0 || messages[index - 1].sender_id !== msg.sender_id; // Simple logic for tail

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '65%',
                                    position: 'relative',
                                    marginBottom: '4px'
                                }}
                            >
                                <div style={{
                                    backgroundColor: isMe ? '#005c4b' : '#202c33',
                                    color: '#e9edef',
                                    padding: '6px 7px 8px 9px',
                                    borderRadius: '7.5px',
                                    borderTopRightRadius: isMe && showTail ? 0 : '7.5px',
                                    borderTopLeftRadius: !isMe && showTail ? 0 : '7.5px',
                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                    fontSize: '0.9rem',
                                    lineHeight: '19px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    <span style={{ wordWrap: 'break-word' }}>{msg.message}</span>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        gap: '3px',
                                        fontSize: '0.68rem',
                                        color: '#8696a0',
                                        marginLeft: 'auto',
                                        height: '15px',
                                        marginTop: 'auto'
                                    }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && (
                                            <span style={{ display: 'flex' }}>
                                                {msg.status === 'sending' ? (
                                                    <Clock size={14} />
                                                ) : (
                                                    <CheckCheck size={16} color={(msg.status as any) === 'read' ? '#53bdeb' : '#8696a0'} />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '10px 16px',
                background: '#202c33',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minHeight: '62px'
            }}>
                <div style={{ display: 'flex', gap: '16px', color: '#8696a0' }}>
                    <Smile size={24} style={{ cursor: 'pointer' }} />
                    <Paperclip size={24} style={{ cursor: 'pointer' }} />
                    {isDealer && (
                        <ShoppingCart
                            size={24}
                            style={{ cursor: 'pointer', color: '#00a884' }}
                            onClick={openOrderModal}
                        />
                    )}
                </div>

                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onBlur={() => sendTyping(false)}
                        placeholder="Type a message"
                        style={{
                            flex: 1,
                            background: '#2a3942',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '9px 12px',
                            color: '#e9edef',
                            fontSize: '0.95rem',
                            outline: 'none'
                        }}
                    />
                    {inputText.trim() && (
                        <button
                            type="submit"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#8696a0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px'
                            }}
                        >
                            <Send size={24} />
                        </button>
                    )}
                </form>
            </div>

            {/* Order Modal Overlay */}
            <AnimatePresence>
                {showOrderModal && (
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end'
                    }}>
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                background: '#202c33',
                                borderTopLeftRadius: '16px',
                                borderTopRightRadius: '16px',
                                height: '80%',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 -4px 20px rgba(0,0,0,0.4)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '16px', borderBottom: '1px solid #2f3b43', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: '#e9edef' }}>
                                    {selectedProduct ? 'Confirm Order' : 'Select Product'}
                                </h3>
                                <button onClick={closeOrderModal} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                                {!selectedProduct ? (
                                    <>
                                        {/* Search */}
                                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8696a0' }} />
                                            <input
                                                placeholder="Search products..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    background: '#2a3942',
                                                    border: 'none',
                                                    padding: '10px 10px 10px 40px',
                                                    borderRadius: '8px',
                                                    color: '#e9edef',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>

                                        {/* Product List */}
                                        {loadingProducts ? (
                                            <div style={{ textAlign: 'center', color: '#8696a0', marginTop: '20px' }}>Loading products...</div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '12px' }}>
                                                {filteredProducts.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleProductSelect(p)}
                                                        style={{
                                                            background: '#111b21',
                                                            padding: '12px',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            cursor: p.stock > 0 ? 'pointer' : 'default',
                                                            opacity: p.stock > 0 ? 1 : 0.6
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#e9edef' }}>{p.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#8696a0' }}>Stock: {p.stock}</div>
                                                        </div>
                                                        <div style={{ fontWeight: 600, color: '#00a884' }}>${p.price}</div>
                                                    </div>
                                                ))}
                                                {filteredProducts.length === 0 && (
                                                    <div style={{ textAlign: 'center', color: '#8696a0', marginTop: '20px' }}>No products found</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Order Confirmation Form */
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ background: '#111b21', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                                                <h4 style={{ margin: '0 0 8px 0', color: '#e9edef', fontSize: '1.2rem' }}>{selectedProduct.name}</h4>
                                                <p style={{ margin: 0, color: '#00a884', fontSize: '1.1rem', fontWeight: 600 }}>${selectedProduct.price} / unit</p>
                                            </div>

                                            <div style={{ marginBottom: '32px' }}>
                                                <label style={{ display: 'block', color: '#8696a0', marginBottom: '12px' }}>Quantity</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <button
                                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                        style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2a3942', border: 'none', color: '#e9edef', fontSize: '1.2rem', cursor: 'pointer' }}
                                                    >-</button>
                                                    <div style={{ flex: 1, textAlign: 'center', fontSize: '1.5rem', fontWeight: 600, color: '#e9edef' }}>
                                                        {quantity}
                                                    </div>
                                                    <button
                                                        onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                                                        style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2a3942', border: 'none', color: '#e9edef', fontSize: '1.2rem', cursor: 'pointer' }}
                                                    >+</button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#111b21', borderRadius: '12px' }}>
                                                <span style={{ color: '#8696a0' }}>Total</span>
                                                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e9edef' }}>${(selectedProduct.price * quantity).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => setSelectedProduct(null)}
                                                style={{ flex: 1, padding: '16px', borderRadius: '24px', background: '#2a3942', border: 'none', color: '#e9edef', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={submitOrder}
                                                disabled={ordering}
                                                style={{ flex: 2, padding: '16px', borderRadius: '24px', background: '#00a884', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                {ordering ? 'Sending...' : 'Confirm Order'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatWindow;
