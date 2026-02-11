import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Send, Info, Clock, CheckCheck, Smile, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWindowProps {
    isDealer?: boolean;
    receiverId?: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ receiverId = null }) => {
    const { messages, sendMessage, loading, onlineUsers, typingUsers, sendTyping } = useChat(receiverId);
    const { user } = useAuth();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

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
                                                    <CheckCheck size={16} color={msg.status === 'read' ? '#53bdeb' : '#8696a0'} />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Tail SVG would go here for full effect, skipping for simplicity */}
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
        </div>
    );
};

export default ChatWindow;
