import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
    Send, Smile, Paperclip, ShoppingCart, Info, Search, CheckCheck, Clock, User, Package, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import type { Product } from '../../types/database';

interface ChatWindowProps {
    isDealer?: boolean;
    receiverId?: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isDealer = false, receiverId = null }) => {
    const { messages, sendMessage, placeBulkOrder, loading, onlineUsers, typingUsers, sendTyping } = useChat(receiverId);
    const { user } = useAuth();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    // Order Feature State
    const [showProductList, setShowProductList] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Attachment State (Multi-product)
    const [attachedProducts, setAttachedProducts] = useState<(Product & { orderQty: number })[]>([]);
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

        // If there are attached products, handle as Bulk Order
        if (attachedProducts.length > 0) {
            if (!user) return;
            setOrdering(true);
            try {
                // Construct Summary Message
                const total = attachedProducts.reduce((sum, item) => sum + (item.price * item.orderQty), 0);
                const itemsList = attachedProducts.map(p => `- ${p.name} (x${p.orderQty}) - ৳${(p.price * p.orderQty).toLocaleString()}`).join('\n');
                const messageContent = `📦 Bulk Order Request:\n${itemsList}\n💰 Total: ৳${total.toLocaleString()}\n\n${inputText}`;

                // Prepare items for placement
                const itemsToOrder = attachedProducts.map(p => ({
                    product_id: p.id,
                    quantity: p.orderQty,
                    price: p.price,
                    name: p.name
                }));

                await placeBulkOrder(itemsToOrder, messageContent.trim());

                toast.success('Order request sent!');
                // Clear state on success
                setAttachedProducts([]);
                setInputText('');
                sendTyping(false);
                setShowProductList(false);
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

    const toggleProductSelect = (product: Product) => {
        if (product.stock <= 0) {
            toast.error('Product out of stock');
            return;
        }

        setAttachedProducts(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) {
                return prev.filter(p => p.id !== product.id);
            } else {
                return [...prev, { ...product, orderQty: 1 }];
            }
        });

        // Don't close product list, allow choosing multiple
        // toast.success(`${product.name} added to draft`);
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
                        zIndex: 1,
                        marginBottom: '8px'
                    }}
                >
                    {/* Bubble Tail */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        [isMe ? 'right' : 'left']: '-8px',
                        width: '20px',
                        height: '20px',
                        background: isMe
                            ? (isOrder ? '#005c4b' : 'var(--primary)')
                            : 'rgba(255, 255, 255, 0.05)',
                        clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)',
                        zIndex: -1
                    }} />

                    <div style={{
                        background: isMe
                            ? (isOrder ? 'linear-gradient(135deg, #005c4b, #004d40)' : 'linear-gradient(135deg, var(--secondary), var(--primary))')
                            : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        color: isMe && !isOrder ? '#000' : '#fff',
                        padding: isOrder ? '16px' : '10px 14px',
                        borderRadius: '16px',
                        borderTopRightRadius: isMe ? '0' : '16px',
                        borderTopLeftRadius: !isMe ? '0' : '16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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
                padding: '12px 24px',
                background: 'rgba(32, 44, 51, 0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                zIndex: 20
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <User size={22} />
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Support Team</h3>
                    <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: (isOnline || isTyping) ? 'var(--success)' : 'var(--text-muted)' }}>
                            {isTyping ? 'typing...' : (isOnline ? 'online' : 'click here for contact info')}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.6)' }}>
                    <Search size={20} style={{ cursor: 'pointer' }} />
                    <Info size={20} style={{ cursor: 'pointer' }} />
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
                {/* Background Pattern Overlay */}
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
                background: 'rgba(32, 44, 51, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {/* Products Attachment Preview */}
                <AnimatePresence>
                    {attachedProducts.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}
                        >
                            {attachedProducts.map(p => (
                                <div key={p.id} style={{
                                    background: 'var(--glass)',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid var(--border)',
                                    minWidth: 'fit-content'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: '#fff' }}>{p.name}</span>
                                    {/* Tiny Quantity Input */}
                                    <input
                                        type="number"
                                        min="1"
                                        value={p.orderQty}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setAttachedProducts(prev => prev.map(item => item.id === p.id ? { ...item, orderQty: val } : item));
                                        }}
                                        style={{
                                            width: '40px',
                                            padding: '2px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            textAlign: 'center',
                                            fontSize: '0.8rem'
                                        }}
                                    />
                                    <button
                                        onClick={() => toggleProductSelect(p)}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 4px' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#2a3942',
                        padding: '6px 16px',
                        borderRadius: '24px',
                    }}>
                        <button style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}>
                            <Smile size={24} />
                        </button>
                        <button style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}>
                            <Paperclip size={24} />
                        </button>

                        <form onSubmit={handleSend} style={{ flex: 1 }}>
                            <input
                                type="text"
                                value={inputText}
                                onChange={handleInputChange}
                                onBlur={() => sendTyping(false)}
                                placeholder="Type a message"
                                style={{
                                    width: '100%',
                                    background: 'none',
                                    border: 'none',
                                    padding: '8px 4px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </form>

                        {isDealer && (
                            <button
                                onClick={openProductList}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: attachedProducts.length > 0 ? 'var(--primary)' : '#8696a0',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    position: 'relative'
                                }}
                            >
                                <ShoppingCart size={22} />
                                {attachedProducts.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: 'var(--primary)',
                                        color: '#000',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {attachedProducts.length}
                                    </div>
                                )}
                            </button>
                        )}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                        disabled={ordering}
                        style={{
                            background: (inputText.trim() || attachedProducts.length > 0) ? 'var(--primary)' : '#8696a0',
                            border: 'none',
                            color: '#000',
                            cursor: 'pointer',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Send size={20} />
                    </motion.button>
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
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>Select Products</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tap items to select multiple</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {attachedProducts.length > 0 && (
                                        <button onClick={closeProductList} style={{ background: 'var(--primary)', border: 'none', color: '#000', fontWeight: 600, padding: '6px 16px', borderRadius: '20px', cursor: 'pointer' }}>
                                            Done ({attachedProducts.length})
                                        </button>
                                    )}
                                    <button onClick={closeProductList} style={{ background: 'var(--glass)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={18} />
                                    </button>
                                </div>
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
                                        {filteredProducts.map(p => {
                                            const isSelected = attachedProducts.some(ap => ap.id === p.id);
                                            return (
                                                <motion.div
                                                    whileHover={{ x: 4, background: 'rgba(255,255,255,0.05)' }}
                                                    key={p.id}
                                                    onClick={() => toggleProductSelect(p)}
                                                    style={{
                                                        background: isSelected ? 'rgba(7, 243, 203, 0.1)' : 'rgba(255,255,255,0.02)',
                                                        padding: '16px',
                                                        borderRadius: '14px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: p.stock > 0 ? 'pointer' : 'default',
                                                        opacity: p.stock > 0 ? 1 : 0.5,
                                                        border: '1px solid',
                                                        borderColor: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                            <Package size={20} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                                                            {isSelected && (
                                                                <div style={{ position: 'absolute', top: '-6px', right: '-6px' }}>
                                                                    <CheckCheck size={16} color="var(--primary)" fill="#000" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#fff' }}>{p.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: p.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                                {p.stock > 0 ? `${p.stock} units available` : 'Out of stock'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>৳{p.price}</div>
                                                </motion.div>
                                            );
                                        })}
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
