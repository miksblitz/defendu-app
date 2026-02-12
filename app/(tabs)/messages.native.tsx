import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from '../../components/Toast';
import { useLogout } from '../../hooks/useLogout';
import { useToast } from '../../hooks/useToast';
import { User } from '../_models/User';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';
import {
    ChatMessage,
    ConversationSummary,
    MessageAttachment,
    MessageController,
} from '../controllers/MessageController';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CHATS = 150;
const SPAM_COOLDOWN_MS = 2000;
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const { width: screenWidth } = Dimensions.get('window');

export default function MessagesPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ with?: string; name?: string; photo?: string }>();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();

  useFocusEffect(
    React.useCallback(() => {
      clearUnread();
    }, [clearUnread])
  );

  const openWithUid = params.with;
  const openWithName = params.name ? decodeURIComponent(params.name) : '';
  const openWithPhoto = params.photo ? decodeURIComponent(params.photo) : '';

  const [currentUser, setCurrentUser] = useState<{ uid: string; firstName: string; lastName: string; profilePicture?: string | null } | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  // Mobile: track if we're viewing chat or list
  const [viewingChat, setViewingChat] = useState(false);
  const profileAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    const init = async () => {
      const user = await AuthController.getCurrentUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      setCurrentUser({
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      });

      const list = await MessageController.getConversations(user.uid);
      setConversations(list);

      if (openWithUid && openWithName) {
        const existingChat = list.find((c) => c.otherUserId === openWithUid);
        if (list.length >= MAX_CHATS && !existingChat) {
          showToast(`Maximum number of chats (${MAX_CHATS}) reached. You cannot start new conversations until you remove some.`);
          setLoading(false);
          if (list.length > 0) {
            setSelectedChat(list[0]);
            setViewingChat(true);
          }
          return;
        }
        const chatId = MessageController.getChatId(user.uid, openWithUid);
        const displayName = openWithName;
        const photoURL = openWithPhoto || null;
        await MessageController.getOrCreateChat(
          user.uid,
          openWithUid,
          `${user.firstName} ${user.lastName}`.trim() || user.email,
          user.profilePicture || null,
          displayName,
          photoURL
        );
        const conv: ConversationSummary = {
          chatId,
          otherUserId: openWithUid,
          otherUserDisplayName: displayName,
          otherUserPhotoURL: photoURL || null,
          lastMessage: null,
        };
        setSelectedChat(conv);
        setViewingChat(true);
        const listUpdated = await MessageController.getConversations(user.uid);
        setConversations(listUpdated);
      }
      setLoading(false);
    };
    init();
  }, [openWithUid]);

  useEffect(() => {
    if (!selectedChat?.chatId || !currentUser) return;
    unsubscribeRef.current = MessageController.subscribeMessages(selectedChat.chatId, setMessages);
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [selectedChat?.chatId, currentUser?.uid]);

  const filteredConversations = (searchQuery.trim()
    ? conversations.filter(
        (c) =>
          c.otherUserDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations
  ).slice(0, MAX_CHATS);

  const handleSend = async (messageOverride?: string, attachment?: MessageAttachment) => {
    const text = (messageOverride !== undefined ? messageOverride : inputText).trim();
    if ((!text && !attachment) || !selectedChat || !currentUser) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      showToast(`Message must be at most ${MAX_MESSAGE_LENGTH} characters (UTF-8).`);
      return;
    }
    const now = Date.now();
    if (now - lastSentAtRef.current < SPAM_COOLDOWN_MS) {
      showToast('Sending too quickly can trigger spam restrictions. Please wait a moment.');
      return;
    }
    try {
      await MessageController.sendMessage(selectedChat.chatId, currentUser.uid, text || (attachment ? (attachment.type === 'image' ? '[Image]' : '[Document]') : ''), attachment);
      lastSentAtRef.current = now;
      setInputText('');
    } catch (e) {
      console.error('Send message error:', e);
      showToast(e instanceof Error ? e.message : 'Failed to send message');
    }
  };

  const handleMessageChange = (t: string) => {
    if (t.length <= MAX_MESSAGE_LENGTH) setInputText(t);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const handlePickImage = async () => {
    if (!selectedChat || !currentUser || uploadingAttachment) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('Permission to access photos is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const size = asset.fileSize ?? (await (await fetch(uri)).blob()).size;
      if (size > MAX_FILE_SIZE_BYTES) {
        showToast(`Image exceeds the maximum size of 100 MB. Your file is ${(size / (1024 * 1024)).toFixed(1)} MB.`);
        return;
      }
      setUploadingAttachment(true);
      const url = await AuthController.uploadMessageImage(uri, `image_${Date.now()}.jpg`);
      await handleSend('', { url, type: 'image', name: 'image.jpg' });
    } catch (e) {
      console.error('Image upload error:', e);
      showToast(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handlePickDocument = async () => {
    if (!selectedChat || !currentUser || uploadingAttachment) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const size = file.size ?? 0;
      if (size > MAX_FILE_SIZE_BYTES) {
        showToast(`Document exceeds the maximum size of 100 MB. Your file is ${(size / (1024 * 1024)).toFixed(1)} MB.`);
        return;
      }
      setUploadingAttachment(true);
      const url = await AuthController.uploadDocumentToCloudinary(file.uri, file.name ?? 'document');
      await handleSend('', { url, type: 'document', name: file.name });
    } catch (e) {
      console.error('Document upload error:', e);
      showToast(e instanceof Error ? e.message : 'Failed to upload document');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const openProfileModal = async () => {
    if (!selectedChat) return;
    setShowProfileModal(true);
    setProfileLoading(true);
    profileAnim.setValue(0);
    try {
      const user = await AuthController.getUserByUid(selectedChat.otherUserId);
      setProfileUser(user ?? null);
    } catch (e) {
      console.error('Error loading profile:', e);
      setProfileUser(null);
    } finally {
      setProfileLoading(false);
      Animated.spring(profileAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  };

  const closeProfileModal = () => {
    Animated.timing(profileAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowProfileModal(false);
      setProfileUser(null);
    });
  };

  const selectConversation = (conv: ConversationSummary) => {
    setSelectedChat(conv);
    setViewingChat(true);
  };

  const goBackToList = () => {
    setViewingChat(false);
  };

  if (!currentUser && !loading) return null;

  // Mobile: Conversation List View
  const renderConversationList = () => (
    <View style={styles.listContainer}>
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require('../../assets/images/backbuttonicon.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Image
          source={require('../../assets/images/defendulogo.png')}
          style={styles.logoImage}
        />
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
          <Image
            source={require('../../assets/images/threedoticon.png')}
            style={styles.menuIcon}
          />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.messagesTitle}>Messages</Text>

      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#6b8693" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Messages"
          placeholderTextColor="#6b8693"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.conversationList}
        contentContainerStyle={styles.conversationListContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#07bbc0" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#6b8693" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubText}>Contact a trainer to start chatting</Text>
          </View>
        ) : (
          filteredConversations.map((conv) => (
            <TouchableOpacity
              key={conv.chatId}
              style={styles.conversationItem}
              onPress={() => selectConversation(conv)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrapper}>
                {conv.otherUserPhotoURL ? (
                  <Image source={{ uri: conv.otherUserPhotoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={22} color="#07bbc0" />
                  </View>
                )}
              </View>
              <View style={styles.conversationInfo}>
                <Text style={styles.conversationName} numberOfLines={1}>
                  {conv.otherUserDisplayName}
                </Text>
                <Text style={styles.conversationPreview} numberOfLines={1}>
                  {conv.lastMessage?.text ?? 'No messages yet'}
                </Text>
              </View>
              <View style={styles.conversationRight}>
                <Text style={styles.conversationTime}>
                  {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#6b8693" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  // Mobile: Chat View
  const renderChatView = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBackToList} style={styles.chatBackButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatHeaderInfo}
          onPress={openProfileModal}
          activeOpacity={0.7}
        >
          {selectedChat?.otherUserPhotoURL ? (
            <Image source={{ uri: selectedChat.otherUserPhotoURL }} style={styles.chatHeaderAvatar} />
          ) : (
            <View style={[styles.chatHeaderAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={18} color="#07bbc0" />
            </View>
          )}
          <Text style={styles.chatHeaderName} numberOfLines={1}>
            {selectedChat?.otherUserDisplayName}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.chatMenuButton}>
          <Image
            source={require('../../assets/images/threedoticon.png')}
            style={styles.chatMenuIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Messages Area */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={styles.dateLabel}>Today</Text>
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.uid;
          return (
            <View
              key={msg.messageId}
              style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}
            >
              <View style={[styles.bubble, isMe ? styles.bubbleSent : styles.bubbleReceived]}>
                {msg.attachment?.type === 'image' && msg.attachment?.url ? (
                  <Image source={{ uri: msg.attachment.url }} style={styles.bubbleImage} />
                ) : null}
                {msg.attachment?.type === 'document' && msg.attachment?.url ? (
                  <TouchableOpacity
                    style={styles.bubbleDocLink}
                    onPress={() => Linking.openURL(msg.attachment!.url)}
                  >
                    <Ionicons name="document-outline" size={18} color="#07bbc0" style={{ marginRight: 6 }} />
                    <Text style={styles.bubbleDocLinkText} numberOfLines={1}>
                      {msg.attachment.name || 'Document'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {msg.text ? <Text style={styles.bubbleText}>{msg.text}</Text> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.attachIcon, uploadingAttachment && styles.attachIconDisabled]}
          onPress={handlePickImage}
          disabled={uploadingAttachment}
        >
          <Ionicons name="image-outline" size={22} color="#6b8693" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attachIcon, uploadingAttachment && styles.attachIconDisabled]}
          onPress={handlePickDocument}
          disabled={uploadingAttachment}
        >
          <Ionicons name="attach-outline" size={22} color="#6b8693" />
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          placeholder="Type your message"
          placeholderTextColor="#6b8693"
          value={inputText}
          onChangeText={handleMessageChange}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {viewingChat && selectedChat ? renderChatView() : renderConversationList()}

      {/* Profile modal - Bottom Sheet Style */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="none"
        onRequestClose={closeProfileModal}
      >
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={closeProfileModal}
        >
          <Animated.View
            style={[
              styles.profileModalCard,
              {
                opacity: profileAnim,
                transform: [
                  { translateY: profileAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.profileModalHandle} />
            <TouchableOpacity
              style={styles.profileModalClose}
              onPress={closeProfileModal}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {profileLoading ? (
              <View style={styles.profileModalLoading}>
                <ActivityIndicator size="large" color="#07bbc0" />
                <Text style={styles.profileModalLoadingText}>Loading profile...</Text>
              </View>
            ) : (
              <ScrollView style={styles.profileModalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.profileModalAvatarWrap}>
                  {(profileUser?.profilePicture || selectedChat?.otherUserPhotoURL) ? (
                    <Image
                      source={{ uri: profileUser?.profilePicture || selectedChat?.otherUserPhotoURL || '' }}
                      style={styles.profileModalAvatar}
                    />
                  ) : (
                    <View style={[styles.profileModalAvatar, styles.profileModalAvatarPlaceholder]}>
                      <Ionicons name="person" size={48} color="#07bbc0" />
                    </View>
                  )}
                </View>
                <Text style={styles.profileModalName}>
                  {profileUser
                    ? `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim() || selectedChat?.otherUserDisplayName
                    : selectedChat?.otherUserDisplayName}
                </Text>
                {profileUser?.username ? (
                  <Text style={styles.profileModalUsername}>@{profileUser.username}</Text>
                ) : null}
                {profileUser?.email ? (
                  <View style={styles.profileModalRow}>
                    <Ionicons name="mail-outline" size={16} color="#6b8693" style={styles.profileModalRowIcon} />
                    <Text style={styles.profileModalRowText}>{profileUser.email}</Text>
                  </View>
                ) : null}
                {profileUser?.role && profileUser.role !== 'individual' ? (
                  <View style={styles.profileModalBadge}>
                    <Text style={styles.profileModalBadgeText}>
                      {profileUser.role === 'trainer' ? 'Trainer' : profileUser.role}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Overlay */}
      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { clearUnread(); setShowMenu(false); router.push('/messages'); }}>
              <Image source={require('../../assets/images/messageicon.png')} style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.menuUnreadBadge}>
                  <Text style={styles.menuUnreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <Toast visible={toastVisible} message={toastMessage} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#041527',
  },
  // List View Styles
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  logoImage: {
    width: 100,
    height: 28,
    resizeMode: 'contain',
  },
  menuButton: {
    padding: 8,
    position: 'relative',
  },
  menuIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  messagesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 10,
  },
  conversationList: {
    flex: 1,
  },
  conversationListContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#6b8693',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#6b8693',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    color: '#6b8693',
    fontSize: 13,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#011f36',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a3645',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
  },
  conversationName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  conversationPreview: {
    color: '#6b8693',
    fontSize: 13,
  },
  conversationRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  conversationTime: {
    color: '#6b8693',
    fontSize: 11,
  },
  // Chat View Styles
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
    backgroundColor: '#000E1C',
  },
  chatBackButton: {
    padding: 8,
    marginRight: 8,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#0a3645',
  },
  chatHeaderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chatMenuButton: {
    padding: 8,
  },
  chatMenuIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 16,
  },
  dateLabel: {
    color: '#6b8693',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
  },
  bubbleWrapper: {
    marginBottom: 8,
  },
  bubbleWrapperLeft: {
    alignItems: 'flex-start',
  },
  bubbleWrapperRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  bubbleSent: {
    backgroundColor: '#07bbc0',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#062731',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  bubbleImage: {
    width: screenWidth * 0.55,
    maxHeight: 180,
    borderRadius: 10,
    marginBottom: 4,
  },
  bubbleDocLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginBottom: 4,
  },
  bubbleDocLinkText: {
    color: '#07bbc0',
    fontSize: 13,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingBottom: 100,
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
    gap: 6,
    backgroundColor: '#041527',
  },
  attachIcon: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIconDisabled: {
    opacity: 0.5,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#011f36',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#07bbc0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Profile Modal - Bottom Sheet Style
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  profileModalCard: {
    backgroundColor: '#011f36',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  profileModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6b8693',
    alignSelf: 'center',
    marginBottom: 16,
  },
  profileModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  profileModalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  profileModalLoadingText: {
    color: '#6b8693',
    fontSize: 13,
  },
  profileModalScroll: {
    flex: 1,
  },
  profileModalAvatarWrap: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  profileModalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a3645',
  },
  profileModalAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileModalUsername: {
    color: '#6b8693',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  profileModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 54, 69, 0.5)',
  },
  profileModalRowIcon: {
    marginRight: 10,
  },
  profileModalRowText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  profileModalBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(7, 187, 192, 0.2)',
    borderRadius: 8,
  },
  profileModalBadgeText: {
    color: '#07bbc0',
    fontSize: 13,
    fontWeight: '600',
  },
  // Menu Overlay
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.85)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#000E1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6b8693',
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: 'contain',
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  menuUnreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  menuUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
