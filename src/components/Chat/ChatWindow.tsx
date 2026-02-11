import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
    Send, Info, Clock, CheckCheck, Smile, Paperclip,
    ShoppingCart, X, Search, Plus, Minus, MessageSquare, Package, User, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import type { Message, Product } from '../../types/database';

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
            scrollToBottom();
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
        return messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const showTail = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

            return (
                <motion.div
                    key={msg.id}
                    initial={msg.id.startsWith('temp-') ? { opacity: 0, scale: 0.9, y: 10 } : false}
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
                        <span style={{ wordWrap: 'break-word', whiteSpace: 'pre-line' }}>{msg.message}</span>
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
        });
    }, [messages, user?.id]);

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
                    {memoizedMessages}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                background: '#202c33',
                minHeight: '62px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Product Attachment Preview */}
                <AnimatePresence>
                    {attachedProduct && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{
                                background: '#182229',
                                borderBottom: '1px solid #2f3b43',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#00a884', fontSize: '0.9rem', fontWeight: 600 }}>Order Request</div>
                                    <div style={{ color: '#e9edef', fontWeight: 500 }}>{attachedProduct.name}</div>
                                    <div style={{ color: '#8696a0', fontSize: '0.85rem' }}>${attachedProduct.price} / unit</div>
                                </div>

                                {/* Quantity Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#202c33', padding: '4px 8px', borderRadius: '8px' }}>
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="icon-btn"
                                        style={{ background: 'none', border: 'none', color: '#e9edef', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span style={{ color: '#e9edef', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(attachedProduct.stock, quantity + 1))}
                                        className="icon-btn"
                                        style={{ background: 'none', border: 'none', color: '#e9edef', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div style={{ minWidth: '60px', textAlign: 'right', color: '#e9edef', fontWeight: 600 }}>
                                    ${(attachedProduct.price * quantity).toFixed(2)}
                                </div>

                                <button
                                    onClick={() => setAttachedProduct(null)}
                                    style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', gap: '16px', color: '#8696a0' }}>
                        <Smile size={24} style={{ cursor: 'pointer' }} />
                        <Paperclip size={24} style={{ cursor: 'pointer' }} />
                        {isDealer && (
                            <ShoppingCart
                                size={24}
                                style={{ cursor: 'pointer', color: attachedProduct ? '#00a884' : '#8696a0' }}
                                onClick={openProductList}
                            />
                        )}
                    </div>

                    <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            onBlur={() => sendTyping(false)}
                            placeholder={attachedProduct ? "Add a note..." : "Type a message"}
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
                        {(inputText.trim() || attachedProduct) && (
                            <button
                                type="submit"
                                disabled={ordering}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: ordering ? '#8696a0' : '#8696a0',
                                    cursor: ordering ? 'default' : 'pointer',
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
            </div>

            {/* Product List Modal */}
            <AnimatePresence>
                {showProductList && (
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
                                height: '70%',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 -4px 20px rgba(0,0,0,0.4)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '16px', borderBottom: '1px solid #2f3b43', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: '#e9edef' }}>Select Product</h3>
                                <button onClick={closeProductList} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* List Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
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
                                                    opacity: p.stock > 0 ? 1 : 0.6,
                                                    border: attachedProduct?.id === p.id ? '1px solid #00a884' : 'none'
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
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatWindow;
