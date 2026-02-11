import { useContext, useMemo } from 'react';
import { ChatContext } from '../context/ChatContext';
import { useAuth } from './useAuth';

export const useChat = (receiverId: string | null = null) => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    
    const { user } = useAuth();
    
    const messages = useMemo(() => {
        if (!context.messages) return [];
        
        return context.messages.filter(m => {
            // If receiverId is provided, filter for that specific conversation
            if (receiverId) {
                return (m.sender_id === receiverId && m.receiver_id === user?.id) ||
                       (m.sender_id === user?.id && m.receiver_id === receiverId);
            }
            // If no receiverId, return all messages where the user is involved (which is already what the context has)
            return true;
        });
    }, [context.messages, receiverId, user?.id]);

    const sendMessage = async (content: string) => {
        if (!receiverId) {
             console.error('Cannot send message: No receiverId provided');
             return;
        }
        await context.sendMessage(content, receiverId);
    };
    
    const sendTyping = (isTyping: boolean) => {
         if (receiverId) {
             context.sendTyping(receiverId, isTyping);
         }
    };

    const placeOrder = async (productId: string, quantity: number, messageText: string, productName: string, productPrice: number) => {
        await context.placeOrder(productId, quantity, messageText, receiverId, productName, productPrice);
    };

    return {
        messages,
        sendMessage,
        placeOrder,
        loading: context.loading,
        onlineUsers: context.onlineUsers,
        typingUsers: context.typingUsers,
        sendTyping
    };
};
