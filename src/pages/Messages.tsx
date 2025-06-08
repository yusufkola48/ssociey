import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Send, ArrowLeft, Plus, Search, User, MessageCircle, Users } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';

const Messages: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<any[]>([]);
  const [currentChat, setCurrentChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch all users whom current user is following (userProfile.following)
  useEffect(() => {
    const fetchFollowedUsers = async () => {
      try {
        if (!user || !userProfile?.following || userProfile.following.length === 0) {
          setAllUsers([]);
          setFilteredUsers([]);
          return;
        }

        // Get users only in the following list
        const usersQuery = query(collection(db, 'users'), where('__name__', 'in', userProfile.following));
        const usersSnapshot = await getDocs(usersQuery);

        const users = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user.uid); // Exclude current user

        setAllUsers(users);
        setFilteredUsers(users);
      } catch (error) {
        console.error('Error fetching followed users:', error);
      }
    };

    fetchFollowedUsers();
  }, [user, userProfile]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convs = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();

          if (data.isGroup) {
            // Group conversation
            return {
              id: docSnapshot.id,
              ...data,
              isGroup: true,
              groupName: data.groupName || 'Group Chat'
            };
          } else {
            // Individual conversation
            const otherParticipantId = data.participants.find((p: string) => p !== user.uid);

            let otherUser = null;
            if (otherParticipantId) {
              const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
              if (userDoc.exists()) {
                otherUser = { id: userDoc.id, ...userDoc.data() };
              }
            }

            return {
              id: docSnapshot.id,
              ...data,
              otherUser,
              isGroup: false
            };
          }
        })
      );

      // Sort by last message timestamp
      convs.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp?.toDate?.() || new Date(0);
        const bTime = b.lastMessage?.timestamp?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setConversations(convs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const filtered = allUsers.filter(user =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  // Fetch current chat messages
  useEffect(() => {
    if (!id) {
      setCurrentChat(null);
      setMessages([]);
      return;
    }

    const conv = conversations.find(c => c.id === id);
    setCurrentChat(conv);

    if (!conv) return;

    const messagesRef = collection(db, 'conversations', id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [id, conversations]);

  const startNewChat = async (selectedUserId: string) => {
    if (!user || !selectedUserId) return;

    // Check if conversation already exists
    const existingChat = conversations.find(conv => {
      if (conv.isGroup) return false;
      const participants = conv.participants as string[];
      return participants.length === 2 &&
        participants.includes(user.uid) &&
        participants.includes(selectedUserId);
    });

    if (existingChat) {
      navigate(`/messages/${existingChat.id}`);
      setShowNewChat(false);
      return;
    }

    // Create new conversation
    const convRef = await addDoc(collection(db, 'conversations'), {
      participants: [user.uid, selectedUserId],
      isGroup: false,
      lastMessage: {
        text: '',
        senderId: '',
        timestamp: new Date()
      },
      createdAt: new Date()
    });

    setShowNewChat(false);
    navigate(`/messages/${convRef.id}`);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !currentChat || !user) return;

    const messagesRef = collection(db, 'conversations', currentChat.id, 'messages');
    const message = {
      senderId: user.uid,
      senderName: userProfile?.displayName || user.email?.split('@')[0],
      text: messageText.trim(),
      timestamp: new Date(),
      read: false
    };

    await addDoc(messagesRef, message);

    // Update last message in conversation
    const convRef = doc(db, 'conversations', currentChat.id);
    await updateDoc(convRef, {
      lastMessage: {
        text: messageText.trim(),
        senderId: user.uid,
        timestamp: new Date()
      }
    });

    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`h-[calc(100vh-4rem)] flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {showNewChat ? (
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex items-center justify-between shadow-sm`}>
            <button
              onClick={() => setShowNewChat(false)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-semibold">New Message</h2>
            <div className="w-10" />
          </div>

          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl ${
                  darkMode
                    ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-700'
                    : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
              />
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              <div className="divide-y dark:divide-gray-700 divide-gray-200">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => startNewChat(user.id)}
                    className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center flex-shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.displayName}</div>
                      <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                      {user.bio && (
                        <div className="text-sm text-gray-400 truncate mt-1">{user.bio}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <User size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full">
          {/* Conversations List */}
          <div className={`w-full md:w-80 border-r ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} ${currentChat ? 'hidden md:block' : ''} flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 border-gray-200">
              <h2 className="text-xl font-semibold">Messages</h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map(conv => (
                  <Link
                    key={conv.id}
                    to={`/messages/${conv.id}`}
                    className={`flex items-center p-4 space-x-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      conv.id === id ? 'bg-purple-100 dark:bg-purple-800' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center flex-shrink-0">
                      {conv.isGroup ? (
                        <Users size={24} className="text-white" />
                      ) : conv.otherUser?.photoURL ? (
                        <img
                          src={conv.otherUser.photoURL}
                          alt={conv.otherUser.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {conv.isGroup ? conv.groupName : conv.otherUser?.displayName || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {conv.lastMessage?.text || 'No messages yet'}
                      </div>
                    </div>
                    {conv.lastMessage?.timestamp && (
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {format(conv.lastMessage.timestamp.toDate(), 'p')}
                      </div>
                    )}
                  </Link>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No conversations found.</div>
              )}
            </div>
          </div>

          {/* Chat Box */}
          <div className="flex-1 flex flex-col">
            {currentChat ? (
              <>
                <div className={`p-4 border-b flex items-center space-x-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  <button
                    onClick={() => navigate('/messages')}
                    className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center flex-shrink-0">
                    {currentChat.isGroup ? (
                      <Users size={24} className="text-white" />
                    ) : currentChat.otherUser?.photoURL ? (
                      <img
                        src={currentChat.otherUser.photoURL}
                        alt={currentChat.otherUser.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg truncate">
                      {currentChat.isGroup ? currentChat.groupName : currentChat.otherUser?.displayName}
                    </h3>
                    {currentChat.isGroup && (
                      <p className="text-sm text-gray-500 truncate">{currentChat.description || ''}</p>
                    )}
                  </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {messages.length > 0 ? (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`max-w-xs md:max-w-md p-3 rounded-lg break-words ${
                          msg.senderId === user.uid
                            ? 'bg-purple-500 text-white self-end'
                            : darkMode
                            ? 'bg-gray-700 text-white self-start'
                            : 'bg-white self-start'
                        }`}
                      >
                        <div className="text-sm">{msg.text}</div>
                        <div className="text-xs text-gray-300 mt-1 text-right">
                          {msg.timestamp && format(msg.timestamp.toDate(), 'p')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 mt-8">No messages yet</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className={`p-4 border-t flex space-x-2 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
                >
                  <textarea
                    rows={1}
                    className={`flex-1 resize-none rounded-xl px-4 py-2 focus:outline-none ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className={`p-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Send size={20} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
