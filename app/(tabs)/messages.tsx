import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthController } from '../controllers/AuthController';
import { User } from '../_models/User';
import {
  MessageController,
  ConversationSummary,
  ChatMessage,
  MessageAttachment,
} from '../controllers/MessageController';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useLogout } from '../../hooks/useLogout';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CHATS = 150;
const SPAM_COOLDOWN_MS = 2000;
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

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
          if (list.length > 0) setSelectedChat(list[0]);
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
        const listUpdated = await MessageController.getConversations(user.uid);
        setConversations(listUpdated);
      } else if (list.length > 0) {
        setSelectedChat(list[0]);
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

  const handleMessageChange = (txt: string) => {
    if (txt.length > MAX_MESSAGE_LENGTH) {
      showToast(`Message must be at most ${MAX_MESSAGE_LENGTH} characters (UTF-8 encoded).`);
      return;
    }
    if (/\n/.test(txt)) {
      const toSend = txt.replace(/\n.*/s, '').trim();
      if (toSend) handleSend(toSend);
      else setInputText('');
      return;
    }
    setInputText(txt);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const openProfileModal = async () => {
    if (!selectedChat) return;
    setShowProfileModal(true);
    setProfileUser(null);
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

  if (!currentUser && !loading) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Nav */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarTopButtonWrap}>
            <TouchableOpacity style={styles.sidebarTopButton} onPress={() => { clearUnread(); setShowMenu(true); }}>
              <Image source={require('../../assets/images/threedoticon.png')} style={styles.threeDotIcon} />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
              </View>
            )}
          </View>
          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity style={styles.sidebarButton} onPress={() => router.push('/profile')}>
              <Image source={require('../../assets/images/blueprofileicon.png')} style={styles.iconImage} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarButton} onPress={() => router.push('/trainer')}>
              <Image source={require('../../assets/images/trainericon.png')} style={styles.iconImage} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarButton} onPress={() => router.push('/dashboard')}>
              <Image source={require('../../assets/images/homeicon.png')} style={styles.iconImage} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Left: Conversation list */}
        <View style={styles.listPane}>
          <View style={styles.messagesHeaderRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Image
                source={require('../../assets/images/backbuttonicon.png')}
                style={styles.backButtonIcon}
              />
            </TouchableOpacity>
            <Text style={styles.messagesTitle}>Messages</Text>
          </View>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color="#6b8693" style={styles.searchIcon} />
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
            showsVerticalScrollIndicator={true}
          >
            {loading ? (
              <Text style={styles.placeholderText}>Loading...</Text>
            ) : filteredConversations.length === 0 ? (
              <Text style={styles.placeholderText}>No conversations yet</Text>
            ) : (
              filteredConversations.map((conv) => (
                <TouchableOpacity
                  key={conv.chatId}
                  style={[
                    styles.conversationItem,
                    selectedChat?.chatId === conv.chatId && styles.conversationItemSelected,
                  ]}
                  onPress={() => setSelectedChat(conv)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarWrapper}>
                    {conv.otherUserPhotoURL ? (
                      <Image source={{ uri: conv.otherUserPhotoURL }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={24} color="#07bbc0" />
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
                  <Text style={styles.conversationTime}>
                    {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Right: Chat */}
        <View style={styles.chatPane}>
          {selectedChat ? (
            <>
              <View style={styles.chatHeader}>
                <TouchableOpacity
                  style={styles.chatHeaderLeft}
                  onPress={openProfileModal}
                  activeOpacity={0.7}
                >
                  {selectedChat.otherUserPhotoURL ? (
                    <Image source={{ uri: selectedChat.otherUserPhotoURL }} style={styles.chatHeaderAvatar} />
                  ) : (
                    <View style={[styles.chatHeaderAvatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={24} color="#07bbc0" />
                    </View>
                  )}
                  <Text style={styles.chatHeaderName} numberOfLines={1}>
                    {selectedChat.otherUserDisplayName}
                  </Text>
                </TouchableOpacity>
              </View>

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
                            <Ionicons name="document-outline" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
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

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputRow}
              >
                <TouchableOpacity
                  style={[styles.attachIcon, uploadingAttachment && styles.attachIconDisabled]}
                  onPress={handlePickImage}
                  disabled={uploadingAttachment}
                >
                  <Ionicons name="image-outline" size={24} color="#6b8693" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.attachIcon, uploadingAttachment && styles.attachIconDisabled]}
                  onPress={handlePickDocument}
                  disabled={uploadingAttachment}
                >
                  <Ionicons name="attach-outline" size={24} color="#6b8693" />
                </TouchableOpacity>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type your message"
                  placeholderTextColor="#6b8693"
                  value={inputText}
                  onChangeText={handleMessageChange}
                  multiline
                  maxLength={MAX_MESSAGE_LENGTH}
                  onSubmitEditing={() => handleSend()}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={() => handleSend()}
                  disabled={!inputText.trim()}
                >
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </>
          ) : (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={64} color="#6b8693" />
              <Text style={styles.emptyChatText}>Select a conversation or contact a trainer</Text>
            </View>
          )}
        </View>
      </View>

      {/* Profile modal */}
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
                  { scale: profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  { translateY: profileAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.profileModalClose}
              onPress={closeProfileModal}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {profileLoading ? (
              <View style={styles.profileModalLoading}>
                <ActivityIndicator size="large" color="#07bbc0" />
                <Text style={styles.profileModalLoadingText}>Loading profile...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.profileModalScrollTouch} activeOpacity={1} onPress={() => {}}>
              <ScrollView style={styles.profileModalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.profileModalAvatarWrap}>
                  {(profileUser?.profilePicture || selectedChat?.otherUserPhotoURL) ? (
                    <Image
                      source={{ uri: profileUser?.profilePicture || selectedChat?.otherUserPhotoURL || '' }}
                      style={styles.profileModalAvatar}
                    />
                  ) : (
                    <View style={[styles.profileModalAvatar, styles.profileModalAvatarPlaceholder]}>
                      <Ionicons name="person" size={64} color="#07bbc0" />
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
                    <Ionicons name="mail-outline" size={18} color="#6b8693" style={styles.profileModalRowIcon} />
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
              </TouchableOpacity>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { clearUnread(); setShowMenu(false); router.push('/messages'); }}>
              <Image source={require('../../assets/images/messageicon.png')} style={styles.menuIcon} />
              <Text style={styles.menuText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.menuUnreadBadge}>
                  <Text style={styles.menuUnreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={styles.menuIcon} />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <Toast visible={toastVisible} message={toastMessage} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 80,
    backgroundColor: '#000E1C',
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTopButtonWrap: { position: 'relative' },
  sidebarTopButton: { padding: 8 },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  threeDotIcon: { width: 24, height: 24, resizeMode: 'contain' },
  menuUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  menuUnreadBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sidebarIconsBottom: { alignItems: 'center', gap: 16 },
  sidebarButton: { padding: 8 },
  iconImage: { width: 28, height: 28, resizeMode: 'contain' },
  listPane: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#0a3645',
    backgroundColor: '#041527',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  messagesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  messagesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 10,
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  conversationList: { flex: 1 },
  conversationListContent: { paddingBottom: 24 },
  placeholderText: { color: '#6b8693', fontSize: 14, paddingVertical: 20, textAlign: 'center' },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  conversationItemSelected: {
    backgroundColor: '#062731',
    borderLeftWidth: 3,
    borderLeftColor: '#07bbc0',
    paddingLeft: 5,
  },
  avatarWrapper: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0a3645' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  conversationInfo: { flex: 1, minWidth: 0 },
  conversationName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  conversationPreview: { color: '#6b8693', fontSize: 13 },
  conversationTime: { color: '#6b8693', fontSize: 12 },
  chatPane: {
    flex: 1,
    backgroundColor: '#041527',
    minWidth: 0,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  chatHeaderAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#0a3645' },
  chatHeaderName: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', flex: 1 },
  chatHeaderIcons: { flexDirection: 'row', gap: 16 },
  chatHeaderIcon: { padding: 4 },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 24 },
  dateLabel: {
    color: '#6b8693',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  bubbleWrapper: { marginBottom: 10 },
  bubbleWrapperLeft: { alignItems: 'flex-start' },
  bubbleWrapperRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  bubbleSent: { backgroundColor: '#07bbc0', borderBottomRightRadius: 4 },
  bubbleReceived: { backgroundColor: '#062731', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#FFFFFF', fontSize: 15 },
  bubbleImage: { width: 200, maxHeight: 200, borderRadius: 12, marginBottom: 4 },
  bubbleDocLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginBottom: 4,
  },
  bubbleDocLinkText: { color: '#07bbc0', fontSize: 14, flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
    gap: 8,
  },
  attachIcon: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIconDisabled: { opacity: 0.5 },
  messageInput: {
    flex: 1,
    backgroundColor: '#011f36',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#0a3645',
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#07bbc0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyChatText: { color: '#6b8693', fontSize: 16 },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#011f36',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  profileModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  profileModalLoading: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  profileModalLoadingText: { color: '#6b8693', fontSize: 14 },
  profileModalScrollTouch: { flex: 1 },
  profileModalScroll: { flex: 1 },
  profileModalAvatarWrap: { alignItems: 'center', marginBottom: 16 },
  profileModalAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0a3645' },
  profileModalAvatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  profileModalName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileModalUsername: {
    color: '#6b8693',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  profileModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 54, 69, 0.5)',
  },
  profileModalRowIcon: { marginRight: 10 },
  profileModalRowText: { color: '#FFFFFF', fontSize: 15, flex: 1 },
  profileModalBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.2)',
    borderRadius: 8,
  },
  profileModalBadgeText: { color: '#07bbc0', fontSize: 14, fontWeight: '600' },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.75)',
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    left: 90,
    backgroundColor: '#000E1C',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#6b8693',
    paddingVertical: 10,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
