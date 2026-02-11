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
            if (!user?.id) return false;

            // If receiverId is provided, filter for that specific conversation
            if (receiverId) {
                const mid = m.receiver_id?.toLowerCase();
                const rid = receiverId.toLowerCase();
                const uid = user.id.toLowerCase();
                const sid = m.sender_id.toLowerCase();

                const isFromReceiver = sid === rid && mid === uid;
                const isToReceiver = sid === uid && (mid === rid || !mid);

                return isFromReceiver || isToReceiver;
            }
            // If no receiverId, show all messages involvement
            return m.sender_id === user.id || m.receiver_id === user.id;
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

    const placeBulkOrder = async (items: { productId: string; quantity: number; price: number; name: string }[], messageText: string) => {
        await context.placeBulkOrder(items, messageText, receiverId);
    };

    return {
        messages,
        sendMessage,
        placeOrder,
        placeBulkOrder,
        loading: context.loading,
        onlineUsers: context.onlineUsers,
        typingUsers: context.typingUsers,
        sendTyping
    };
};
