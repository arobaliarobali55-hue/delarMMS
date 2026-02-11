import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types/database';
import { ChatContext } from './ChatContext';
import { useAuth } from '../hooks/useAuth';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const typingTimeoutRef = useRef<Record<string, any>>({});

    // Load from local storage immediately
    useEffect(() => {
        if (!user) {
            setMessages([]);
            return;
        }

        const cached = localStorage.getItem(`chat_messages_${user.id}`);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setMessages(parsed);
                setLoading(false);
            } catch (e) {
                console.error('Failed to parse cached messages', e);
            }
        }
    }, [user?.id]);

    // Persist to local storage efficiently
    const lastSavedRef = useRef<string>('');
    useEffect(() => {
        if (user && messages.length > 0) {
            const messagesStr = JSON.stringify(messages);
            if (messagesStr !== lastSavedRef.current) {
                localStorage.setItem(`chat_messages_${user.id}`, messagesStr);
                lastSavedRef.current = messagesStr;
            }
        }
    }, [messages, user?.id]);

    // Fetch and Subscribe
    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    message,
                    timestamp,
                    sender_id,
                    receiver_id,
                    type,
                    sender:profiles!sender_id(name)
                `)
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('timestamp', { ascending: false })
                .limit(100);

            if (isMounted && !error && data) {
                const serverMessages = data.reverse();
                setMessages((prev) => {
                    // Keep optimistic messages that are NOT yet sent (sending/error)
                    // If they are 'sent', they should be in the serverMessages now.
                    // This prevents duplication on reload.
                    const optimistic = prev.filter(m => m.id.startsWith('temp-') && m.status !== 'sent');

                    const messageMap = new Map();
                    serverMessages.forEach(m => messageMap.set(m.id, m));
                    optimistic.forEach(m => messageMap.set(m.id, m));
                    return Array.from(messageMap.values()) as any;
                });
                setLoading(false);
            }
        };

        fetchMessages();

        // Realtime Subscription
        const channel = supabase
            .channel('global_chat')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, async (payload) => {
                const newMessage = payload.new as any;

                // Filter messages for current user
                if (newMessage.sender_id !== user.id && newMessage.receiver_id !== user.id) {
                    return;
                }

                // Dedup and handle optimistic replacement
                setMessages((prev) => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;

                    // If it's our own message, it might be a replacement for an optimistic one
                    if (newMessage.sender_id === user.id) {
                        const tempMatch = prev.find(m =>
                            m.id.startsWith('temp-') &&
                            m.message.trim() === newMessage.message.trim()
                        );
                        if (tempMatch) {
                            return prev.map(m => m.id === tempMatch.id ? { ...newMessage, sender: { name: 'You' } } : m);
                        }
                    }

                    return [...prev, newMessage];
                });

                // Fetch sender name if it's an incoming message
                if (newMessage.sender_id !== user.id) {
                    try {
                        const { data } = await supabase.from('profiles').select('name').eq('id', newMessage.sender_id).single();
                        if (data && isMounted) {
                            setMessages(current => current.map(m =>
                                m.id === newMessage.id ? { ...m, sender: { name: data.name } } as any : m
                            ));
                        }
                    } catch (e) {
                        console.error('Failed to fetch sender profile', e);
                    }
                }
            })
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const userIds = new Set<string>();
                for (const key in newState) {
                    newState[key].forEach((presence: any) => {
                        if (presence.user_id) userIds.add(presence.user_id);
                    });
                }
                setOnlineUsers(userIds);
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                const { userId, isTyping } = payload.payload;
                if (userId === user.id) return;

                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    if (isTyping) {
                        next.add(userId);
                        if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
                        typingTimeoutRef.current[userId] = setTimeout(() => {
                            setTypingUsers(current => {
                                const updated = new Set(current);
                                updated.delete(userId);
                                return updated;
                            });
                        }, 3000);
                    } else {
                        next.delete(userId);
                        if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
                    }
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                }
            });

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
        };
    }, [user?.id]);

    const sendMessage = useCallback(async (content: string, receiverId: string) => {
        if (!user) return;

        const tempId = 'temp-' + Date.now();
        const optimisticMessage: Message = {
            id: tempId,
            sender_id: user.id,
            receiver_id: receiverId,
            message: content,
            type: 'text',
            timestamp: new Date().toISOString(),
            status: 'sending',
            sender: {
                id: user.id,
                name: 'You',
                email: user.email || '',
                role: 'dealer'
            }
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: user.id,
                    receiver_id: receiverId,
                    message: content,
                    type: 'text',
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setMessages((prev) => prev.map(msg =>
                    msg.id === tempId ? { ...msg, ...data, status: 'sent', sender: optimisticMessage.sender } : msg
                ));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => prev.map(msg =>
                msg.id === tempId ? { ...msg, status: 'error' } : msg
            ));
            throw error;
        }
    }, [user]);

    const sendTyping = useCallback(async (receiverId: string, isTyping: boolean) => {
        if (!user) return;
        // We broadcast to the same channel everyone is listening on
        const channel = supabase.channel('global_chat');
        await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, receiverId, isTyping }
        });
    }, [user]);

    const placeOrder = useCallback(async (
        productId: string,
        quantity: number,
        messageText: string,
        receiverId: string | null,
        productName: string,
        productPrice: number
    ) => {
        if (!user) return;
        console.log(`Placing order for ${productName} (৳${productPrice}/ea)`);

        const tempId = 'temp-order-' + Date.now();
        const optimisticMessage: Message = {
            id: tempId,
            sender_id: user.id,
            receiver_id: receiverId,
            message: messageText,
            type: 'order',
            timestamp: new Date().toISOString(),
            status: 'sending',
            sender: {
                id: user.id,
                name: 'You',
                email: user.email || '',
                role: 'dealer'
            }
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            const { error } = await supabase.rpc('place_order', {
                p_dealer_id: user.id,
                p_product_id: productId,
                p_quantity: quantity,
                p_message_text: messageText,
                p_receiver_id: receiverId
            });

            if (error) throw error;

            // Note: The real message will be picked up by the real-time listener
            // which handles 'order' type messages from ourselves.
            // We just need to remove the temp message once the real one arrives or after success.
            // For now, the real-time listener will dedup by message content or ID.

            // To be safe, we can update the status to 'sent'
            setMessages((prev) => prev.map(msg =>
                msg.id === tempId ? { ...msg, status: 'sent' } : msg
            ));

        } catch (error) {
            console.error('Error placing order:', error);
            setMessages((prev) => prev.map(msg =>
                msg.id === tempId ? { ...msg, status: 'error' } : msg
            ));
            throw error;
        }
    }, [user]);

    const placeBulkOrder = useCallback(async (
        items: { product_id: string; quantity: number; price: number; name: string }[],
        messageText: string,
        receiverId: string | null
    ) => {
        if (!user || items.length === 0) return;

        console.log(`Placing bulk order for ${items.length} items`);

        const tempId = 'temp-order-' + Date.now();
        const optimisticMessage: Message = {
            id: tempId,
            sender_id: user.id,
            receiver_id: receiverId,
            message: messageText,
            type: 'order',
            timestamp: new Date().toISOString(),
            status: 'sending',
            sender: {
                id: user.id,
                name: 'You',
                email: user.email || '',
                role: 'dealer'
            }
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            // Atomic Bulk Order RPC
            const { error: rpcError } = await supabase.rpc('place_bulk_order', {
                p_dealer_id: user.id,
                p_items: items,
                p_message_text: messageText,
                p_receiver_id: receiverId
            });

            if (rpcError) throw rpcError;

            // Mark optimistic message as sent
            setMessages((prev) => prev.map(msg =>
                msg.id === tempId ? { ...msg, status: 'sent' } : msg
            ));

        } catch (error) {
            console.error('Error placing bulk order:', error);
            setMessages((prev) => prev.map(msg =>
                msg.id === tempId ? { ...msg, status: 'error' } : msg
            ));
            throw error;
        }
    }, [user]);

    return (
        <ChatContext.Provider value={{ messages, sendMessage, onlineUsers, typingUsers, sendTyping, placeOrder, placeBulkOrder, loading }}>
            {children}
        </ChatContext.Provider>
    );
};
