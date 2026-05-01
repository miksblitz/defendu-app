import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthController } from '../controllers/AuthController';
import { MessageController } from '../controllers/MessageController';

// Local cache key (mirrors mobile design notes):
// { lastSeenByChatId: Record<chatId, number>, unreadByChatId: Record<chatId, number> }
const STORAGE_KEY_CACHE_V1_BASE = 'messagesLastSeenByChat_v1';
const MAX_BADGE = 99;

type UserChatsSnapshot = Record<string, { lastMessage?: { senderId: string; createdAt: number } }>;

type UnreadContextValue = {
  unreadCount: number;
  unreadDisplay: string;
  getUnreadForChat: (chatId: string) => number;
  setActiveChatId: (chatId: string | null) => void;
  clearChatUnread: (chatId: string) => Promise<void>;
};

const UnreadMessagesContext = createContext<UnreadContextValue | undefined>(undefined);

type CacheV1 = {
  lastSeenByChatId: Record<string, number>;
  unreadByChatId: Record<string, number>;
};

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [userChats, setUserChats] = useState<UserChatsSnapshot>({});
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [lastSeenByChatId, setLastSeenByChatId] = useState<Record<string, number>>({});
  const [unreadByChatId, setUnreadByChatId] = useState<Record<string, number>>({});

  const storageKeyCacheV1 = uid ? `${STORAGE_KEY_CACHE_V1_BASE}:${uid}` : STORAGE_KEY_CACHE_V1_BASE;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await AuthController.getCurrentUser();
      if (!mounted) return;
      setUid(user?.uid ?? null);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!uid) {
      setUserChats({});
      setActiveChatIdState(null);
      setLastSeenByChatId({});
      setUnreadByChatId({});
      return undefined;
    }
    const unsub = MessageController.subscribeUserChats(uid, (snapshot) => {
      setUserChats(snapshot || {});
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKeyCacheV1);
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad cache');
        const obj = parsed as Partial<CacheV1>;
        setLastSeenByChatId(obj.lastSeenByChatId && typeof obj.lastSeenByChatId === 'object' ? (obj.lastSeenByChatId as Record<string, number>) : {});
        setUnreadByChatId(obj.unreadByChatId && typeof obj.unreadByChatId === 'object' ? (obj.unreadByChatId as Record<string, number>) : {});
      } catch {
        setLastSeenByChatId({});
        setUnreadByChatId({});
      }
    })();
  }, [uid, storageKeyCacheV1]);

  const persistCacheV1 = useCallback(
    async (nextLastSeen: Record<string, number>, nextUnread: Record<string, number>) => {
      try {
        if (!uid) return;
        const payload: CacheV1 = { lastSeenByChatId: nextLastSeen, unreadByChatId: nextUnread };
        await AsyncStorage.setItem(storageKeyCacheV1, JSON.stringify(payload));
      } catch (e) {
        console.warn('UnreadMessages: failed to persist cache', e);
      }
    },
    [uid, storageKeyCacheV1]
  );

  // Increment algorithm: when lastMessage advances for an incoming message, bump per-chat unread if chat isn't active.
  useEffect(() => {
    if (!uid) return;
    const chatIds = Object.keys(userChats);
    if (chatIds.length === 0) return;

    let changed = false;
    const nextLastSeen = { ...lastSeenByChatId };
    const nextUnread = { ...unreadByChatId };

    for (const chatId of chatIds) {
      const lm = userChats[chatId]?.lastMessage;
      if (!lm) continue;
      if (lm.senderId === uid) continue;

      const prevSeen = nextLastSeen[chatId] ?? 0;
      if (lm.createdAt > prevSeen) {
        if (activeChatId !== chatId) {
          nextUnread[chatId] = (nextUnread[chatId] ?? 0) + 1;
        }
        nextLastSeen[chatId] = lm.createdAt;
        changed = true;
      }
    }

    if (!changed) return;
    setLastSeenByChatId(nextLastSeen);
    setUnreadByChatId(nextUnread);
    persistCacheV1(nextLastSeen, nextUnread);
  }, [uid, userChats, activeChatId, lastSeenByChatId, unreadByChatId, persistCacheV1]);

  const getUnreadForChat = useCallback(
    (chatId: string): number => {
      return unreadByChatId[chatId] ?? 0;
    },
    [unreadByChatId]
  );

  const setActiveChatId = useCallback((chatId: string | null) => {
    setActiveChatIdState(chatId);
  }, []);

  const clearChatUnread = useCallback(
    async (chatId: string) => {
      if (!uid) return;

      // Clear local unread count for this chat only.
      setUnreadByChatId((prev) => {
        if ((prev[chatId] ?? 0) === 0) return prev;
        const nextUnread = { ...prev, [chatId]: 0 };
        persistCacheV1(lastSeenByChatId, nextUnread);
        return nextUnread;
      });

      // Best-effort: consider the chat "seen" at its current lastMessage timestamp (prevents double-count).
      const lm = userChats[chatId]?.lastMessage;
      if (lm?.senderId !== uid && typeof lm.createdAt === 'number') {
        setLastSeenByChatId((prev) => {
          if ((prev[chatId] ?? 0) >= lm.createdAt) return prev;
          const nextSeen = { ...prev, [chatId]: lm.createdAt };
          persistCacheV1(nextSeen, unreadByChatId);
          return nextSeen;
        });
      }
    },
    [uid, userChats, lastSeenByChatId, unreadByChatId, persistCacheV1]
  );

  const unreadCount = (() => {
    let total = 0;
    for (const n of Object.values(unreadByChatId)) total += typeof n === 'number' ? n : 0;
    return total;
  })();

  const cappedCount = unreadCount > MAX_BADGE ? MAX_BADGE : unreadCount;
  const unreadDisplay = unreadCount > MAX_BADGE ? '99+' : String(cappedCount);

  const value: UnreadContextValue = {
    unreadCount: cappedCount,
    unreadDisplay,
    getUnreadForChat,
    setActiveChatId,
    clearChatUnread,
  };

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages(): UnreadContextValue {
  const ctx = useContext(UnreadMessagesContext);
  if (ctx === undefined) {
    return {
      unreadCount: 0,
      unreadDisplay: '0',
      getUnreadForChat: () => 0,
      setActiveChatId: () => {},
      clearChatUnread: async () => {},
    };
  }
  return ctx;
}
