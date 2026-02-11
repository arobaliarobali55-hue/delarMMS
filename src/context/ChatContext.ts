import { createContext } from 'react';
import type { Message } from '../types/database';

export interface ChatContextType {
    messages: Message[];
    sendMessage: (content: string, receiverId: string) => Promise<void>;
    onlineUsers: Set<string>;
    typingUsers: Set<string>;
    sendTyping: (receiverId: string, isTyping: boolean) => Promise<void>;
    loading: boolean;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);
