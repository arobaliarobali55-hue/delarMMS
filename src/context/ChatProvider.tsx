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
                    const optimistic = prev.filter(m => m.id.startsWith('temp-'));
                    // Fast dedup: use a Map for better performance with 100+ messages
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
                const newMessage = payload.new as Message;

                // Filter messages for current user
                if (newMessage.sender_id !== user.id && newMessage.receiver_id !== user.id) {
                    return;
                }

                // Ignore our own messages to avoid duplicates (handled by optimistic update)
                // BUT allow 'order' type messages because they are generated server-side without local optimistic update
                if (newMessage.sender_id === user.id && newMessage.type !== 'order') {
                    return;
                }

                // Fetch sender details if needed
                let sender = null;
                try {
                    const { data } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', newMessage.sender_id)
                        .single();
                    sender = data;
                } catch (e) {
                    console.error('Failed to fetch sender profile', e);
                }

                if (isMounted) {
                    setMessages((prev) => {
                        // Dedup
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, { ...newMessage, sender } as any];
                    });

                    // Play sound
                    if (newMessage.sender_id !== user.id) {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                        audio.volume = 0.5;
                        audio.play().catch(e => console.log('Audio play failed', e));
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

    return (
        <ChatContext.Provider value={{ messages, sendMessage, onlineUsers, typingUsers, sendTyping, loading }}>
            {children}
        </ChatContext.Provider>
    );
};
