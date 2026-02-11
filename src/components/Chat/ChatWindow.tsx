import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
    Send, Clock, CheckCheck, Smile, Paperclip,
    ShoppingCart, X, Search, Plus, Minus, User, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import type { Product } from '../../types/database';

interface ChatWindowProps {
    isDealer?: boolean;
    receiverId?: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isDealer = false, receiverId = null }) => {
    const { messages, sendMessage, placeOrder, loading, onlineUsers, typingUsers, sendTyping } = useChat(receiverId);
    const { user } = useAuth();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    // Order Feature State
    const [showProductList, setShowProductList] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Attachment State
    const [attachedProduct, setAttachedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [ordering, setOrdering] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!loading) {
            // Use requestAnimationFrame for smoother scroll after render
            requestAnimationFrame(() => scrollToBottom());
        }
    }, [messages, loading]);

    // Real-time stock updates for Product List
    useEffect(() => {
        if (!showProductList) return;

        const fetchProducts = async () => {
            const { data } = await supabase.from('products').select('*').order('name');
            if (data) setProducts(data);
        };

        const channel = supabase
            .channel('chat_product_list_stock')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [showProductList]);

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

        // If there's an attached product, handle as Order
        if (attachedProduct) {
            if (!user) return;
            setOrdering(true);
            try {
                const messageContent = `📦 Order Request:\n${attachedProduct.name} (x${quantity})\n💰 Total: $${(attachedProduct.price * quantity).toFixed(2)}\n\n${inputText}`;

                await placeOrder(
                    attachedProduct.id,
                    quantity,
                    messageContent.trim(),
                    attachedProduct.name,
                    attachedProduct.price
                );

                toast.success('Order request sent!');
                // Clear state on success
                setAttachedProduct(null);
                setQuantity(1);
                setInputText('');
                sendTyping(false);
                setShowProductList(false); // Ensure list is closed
            } catch (err: any) {
                toast.error('Failed to place order: ' + err.message);
            } finally {
                setOrdering(false);
            }
            return;
        }

        // Standard Message Send
        if (!inputText.trim()) return;

        const content = inputText;
        setInputText(''); // Clear input immediately
        sendTyping(false); // Stop typing status

        try {
            await sendMessage(content);
        } catch {
            toast.error('Failed to send message');
            setInputText(content); // Revert on failure
        }
    };

    // --- Product Selection Logic ---
    const openProductList = async () => {
        setShowProductList(true);
        if (products.length === 0) {
            setLoadingProducts(true);
            const { data } = await supabase.from('products').select('*').order('name');
            if (data) setProducts(data);
            setLoadingProducts(false);
        }
    };

    const closeProductList = () => {
        setShowProductList(false);
        setSearchTerm('');
    };

    const handleProductSelect = (product: Product) => {
        if (product.stock > 0) {
            setAttachedProduct(product);
            setQuantity(1);
            closeProductList();
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

    // Memoize the message list to prevent unnecessary re-renders of the entire list
    const memoizedMessages = useMemo(() => {
        return messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const isOrder = msg.type === 'order';

            return (
                <motion.div
                    key={msg.id}
                    initial={msg.id.startsWith('temp-') ? { opacity: 0, scale: 0.9, y: 10 } : false}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: isOrder ? '85%' : '75%',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    <div style={{
                        background: isMe
                            ? (isOrder ? 'linear-gradient(135deg, #005c4b, #004d40)' : 'linear-gradient(135deg, var(--secondary), var(--primary))')
                            : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        color: isMe && !isOrder ? '#000' : '#fff',
                        padding: isOrder ? '16px' : '10px 14px',
                        borderRadius: '16px',
                        borderBottomRightRadius: isMe ? '4px' : '16px',
                        borderBottomLeftRadius: !isMe ? '4px' : '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        border: '1px solid',
                        borderColor: isMe ? 'transparent' : 'rgba(255,255,255,0.08)',
                        fontSize: '0.95rem',
                        position: 'relative',
                        fontWeight: isMe && !isOrder ? 500 : 400
                    }}>
                        <div style={{ wordWrap: 'break-word', whiteSpace: 'pre-line' }}>{msg.message}</div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '6px',
                            fontSize: '0.7rem',
                            color: isMe && !isOrder ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                            marginTop: '6px'
                        }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && (
                                <span style={{ display: 'flex' }}>
                                    {msg.status === 'sending' ? (
                                        <Clock size={12} />
                                    ) : (
                                        <CheckCheck size={14} color={(msg.status as any) === 'read' ? 'var(--primary)' : 'currentColor'} />
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            );
        });
    }, [messages, user?.id]);

    return (
        <div className="chat-container" style={{ position: 'relative', background: 'transparent' }}>
            {/* Chat Header */}
            <div style={{
                padding: '16px 24px',
                background: 'rgba(18, 18, 20, 0.4)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderBottom: '1px solid var(--border)',
                borderTopLeftRadius: isDealer ? '0' : '20px',
                borderTopRightRadius: '20px'
            }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--glass)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    border: '1px solid var(--border)'
                }}>
                    <User size={24} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Support</h3>
                    <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (isOnline || isTyping) ? 'var(--success)' : 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-muted)' }}>
                            {isTyping ? 'Typing...' : (isOnline ? 'Online Now' : 'Offline')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messaging Area */}
            <div style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(7, 7, 8, 0.2)',
                position: 'relative'
            }}>
                {/* Background Pattern Overlay (Optional but premium) */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0.03, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(var(--primary) 0.5px, transparent 0.5px)',
                    backgroundSize: '24px 24px'
                }} />

                {/* Encryption Notice */}
                <div style={{
                    textAlign: 'center',
                    margin: '0 auto 24px',
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    maxWidth: '80%',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    🔒 Messages are end-to-end encrypted for your security.
                </div>

                <AnimatePresence initial={false}>
                    {memoizedMessages}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                background: 'rgba(18, 18, 20, 0.6)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid var(--border)',
                borderBottomLeftRadius: isDealer ? '0' : '20px',
                borderBottomRightRadius: '20px',
                padding: '16px 24px'
            }}>
                {/* Product Attachment Preview */}
                <AnimatePresence>
                    {attachedProduct && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, margin: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                            exit={{ height: 0, opacity: 0, margin: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--glass)' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: 'rgba(0, 242, 254, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Package size={24} color="var(--primary)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Quick Order</div>
                                    <div style={{ color: '#fff', fontWeight: 600 }}>{attachedProduct.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>${attachedProduct.price} / unit</div>
                                </div>

                                {/* Quantity Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '10px' }}>
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex', opacity: 0.7 }}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span style={{ color: '#fff', minWidth: '20px', textAlign: 'center', fontWeight: 700 }}>{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(attachedProduct.stock, quantity + 1))}
                                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex', opacity: 0.7 }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div style={{ minWidth: '80px', textAlign: 'right', color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem' }}>
                                    ${(attachedProduct.price * quantity).toFixed(2)}
                                </div>

                                <button
                                    onClick={() => setAttachedProduct(null)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                            <Smile size={24} />
                        </button>
                        <button className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                            <Paperclip size={24} />
                        </button>
                        {isDealer && (
                            <button
                                onClick={openProductList}
                                style={{
                                    background: attachedProduct ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: attachedProduct ? '#000' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    width: '40px', height: '40px',
                                    borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <ShoppingCart size={20} />
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            onBlur={() => sendTyping(false)}
                            placeholder={attachedProduct ? "Add a message to your order..." : "Type your message here..."}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            }}
                        />
                        {(inputText.trim() || attachedProduct) && (
                            <motion.button
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={ordering}
                                style={{
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    border: 'none',
                                    color: '#000',
                                    cursor: ordering ? 'default' : 'pointer',
                                    width: '48px', height: '48px',
                                    borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)'
                                }}
                            >
                                <Send size={20} />
                            </motion.button>
                        )}
                    </form>
                </div>
            </div>

            {/* Product List Modal */}
            <AnimatePresence>
                {showProductList && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                maxHeight: '80vh',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                border: '1px solid var(--border)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass)' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>Select Product</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose an item to attach to your chat</p>
                                </div>
                                <button onClick={closeProductList} style={{ background: 'var(--glass)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* List Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                                {/* Search */}
                                <div style={{ position: 'relative', marginBottom: '24px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        placeholder="Search inventory..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            padding: '12px 12px 12px 48px',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            outline: 'none',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </div>

                                {loadingProducts ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
                                        <span style={{ color: 'var(--text-muted)' }}>Loading catalog...</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {filteredProducts.map(p => (
                                            <motion.div
                                                whileHover={{ x: 4, background: 'rgba(255,255,255,0.05)' }}
                                                key={p.id}
                                                onClick={() => handleProductSelect(p)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    padding: '16px',
                                                    borderRadius: '14px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: p.stock > 0 ? 'pointer' : 'default',
                                                    opacity: p.stock > 0 ? 1 : 0.5,
                                                    border: '1px solid transparent',
                                                    borderColor: attachedProduct?.id === p.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={20} color={p.stock > 0 ? 'var(--primary)' : 'var(--text-muted)'} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#fff' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: p.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                            {p.stock > 0 ? `${p.stock} units available` : 'Out of stock'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>${p.price}</div>
                                            </motion.div>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                No products found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatWindow;
