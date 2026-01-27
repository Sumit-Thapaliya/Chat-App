import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import io from "socket.io-client";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from 'emoji-picker-react';
import Profile from "./Profile";
import "../styles/Chat.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(apiUrl);

const Chat = () => {
    const { user } = useContext(AuthContext);
    const [friends, setFriends] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState({}); // friendId -> boolean
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [requests, setRequests] = useState([]);
    const [theme, setTheme] = useState('dark');
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const typingTimeoutRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const scrollRef = useRef();

    useEffect(() => {
        if (user) {
            const onConnect = () => {
                socket.emit("join_room", user.id);
            };

            if (socket.connected) {
                onConnect();
            }

            socket.on("connect", onConnect);
            getRequests();

            return () => {
                socket.off("connect", onConnect);
            };
        }
    }, [user]);

    useEffect(() => {
        socket.on("get_online_users", (users) => {
            setOnlineUsers(users);
        });

        socket.on("user_typing", (id) => {
            setTypingUsers(prev => ({ ...prev, [id]: true }));
        });

        socket.on("user_stop_typing", (id) => {
            setTypingUsers(prev => ({ ...prev, [id]: false }));
        });

        socket.on("receive_message", (data) => {
            if (currentChat && (data.senderId === currentChat._id || data.receiverId === currentChat._id)) {
                setMessages((prev) => {
                    if (data.senderId !== user.id) {
                        return [...prev, {
                            sender: data.senderId,
                            text: data.message,
                            timestamp: Date.now()
                        }];
                    }
                    return prev;
                });
            }
        });

        socket.on("new_friend_request", () => {
            getRequests();
        });

        socket.on("request_accepted", (data) => {
            getFriends();
        });

        return () => {
            socket.off("get_online_users");
            socket.off("user_typing");
            socket.off("user_stop_typing");
            socket.off("receive_message");
            socket.off("new_friend_request");
            socket.off("request_accepted");
        };
    }, [currentChat, user.id]);

    const getRequests = async () => {
        try {
            const res = await axios.get(`${apiUrl}/api/users/requests`, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const getFriends = async () => {
        try {
            const res = await axios.get(`${apiUrl}/api/users/friends`, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            setFriends(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        getFriends();
    }, [user]);

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!currentChat) return;

        socket.emit("typing", { senderId: user.id, receiverId: currentChat._id });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop_typing", { senderId: user.id, receiverId: currentChat._id });
        }, 2000);
    };

    const onEmojiClick = (emojiData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
            // Close notifications if clicking outside
            if (!event.target.closest('.notification-container')) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sendRequest = async (friendId) => {
        try {
            await axios.post(`${apiUrl}/api/users/send-request`, { friendId }, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            alert("Friend request sent!");
            setSearchQuery("");
            setSearchResults([]);
        } catch (err) {
            alert(err.response?.data?.msg || "Error sending request");
        }
    };

    const acceptRequest = async (requestId) => {
        try {
            const res = await axios.post(`${apiUrl}/api/users/accept-request`, { requestId }, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });

            // Re-fetch friends to get the latest list
            const friendsRes = await axios.get(`${apiUrl}/api/users/friends`, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            const updatedFriends = friendsRes.data;
            setFriends(updatedFriends);
            getRequests();

            // Auto-switch to the new friend's chat
            // The API returns the new friend list, find the one that was just added (who sent the request)
            // We need to find the user who sent the request. We had it in 'requests' state.
            const acceptedReq = requests.find(r => r._id === requestId);
            if (acceptedReq) {
                const newFriend = updatedFriends.find(f => f._id === acceptedReq.from._id);
                if (newFriend) setCurrentChat(newFriend);
            }

            setShowNotifications(false);
        } catch (err) {
            alert(err.response?.data?.msg || "Error accepting request");
        }
    };

    const rejectRequest = async (requestId) => {
        try {
            await axios.post(`${apiUrl}/api/users/reject-request`, { requestId }, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            getRequests();
        } catch (err) {
            alert("Error rejecting request");
        }
    };

    useEffect(() => {
        const getMessages = async () => {
            if (currentChat) {
                try {
                    const res = await axios.get(`${apiUrl}/api/messages/${currentChat._id}`, {
                        headers: { "x-auth-token": localStorage.getItem("token") },
                    });
                    setMessages(res.data);
                } catch (err) {
                    console.error(err);
                }
            }
        };
        getMessages();
    }, [currentChat]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSearch = async () => {
        if (!searchQuery) return;
        try {
            const res = await axios.get(`${apiUrl}/api/users/search?username=${searchQuery}`, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            setSearchResults(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            senderId: user.id,
            receiverId: currentChat._id,
            message: newMessage,
        };

        socket.emit("send_message", messageData);

        // Optimistic update
        setMessages((prev) => [...prev, {
            sender: user.id,
            text: newMessage,
            timestamp: Date.now()
        }]);
        setNewMessage("");
    };

    return (
        <div className="chat-container">
            <div className="mesh-bg"></div>
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="sidebar"
            >
                <div className="sidebar-header">
                    <h3>Messages</h3>
                    <div className="sidebar-actions">
                        <div className="notification-container">
                            <button
                                className={`notification-btn ${requests.length > 0 ? 'has-notifications' : ''}`}
                                onClick={() => setShowNotifications(!showNotifications)}
                                title="Notifications"
                            >
                                🔔
                                {requests.length > 0 && <span className="notification-badge">{requests.length}</span>}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="notifications-dropdown"
                                    >
                                        <div className="dropdown-header">
                                            <span>Friend Requests</span>
                                        </div>
                                        <div className="dropdown-content">
                                            {requests.length > 0 ? (
                                                requests.map(r => (
                                                    <div key={r._id} className="dropdown-item">
                                                        <div className="item-user">
                                                            <div className="item-avatar">
                                                                {r.from.username[0].toUpperCase()}
                                                            </div>
                                                            <div className="item-info">
                                                                <span className="item-name">{r.from.username}</span>
                                                                <span className="item-text">sent you a request</span>
                                                            </div>
                                                        </div>
                                                        <div className="item-actions">
                                                            <button className="dropdown-acc-btn" onClick={() => acceptRequest(r._id)}>Accept</button>
                                                            <button className="dropdown-rej-btn" onClick={() => rejectRequest(r._id)}>✕</button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="empty-notifications">
                                                    No new requests ✨
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <button className="profile-toggle" onClick={() => setShowProfile(!showProfile)}>
                            {user?.username?.[0].toUpperCase()}
                        </button>
                    </div>
                </div>
                <div className="search-users">
                    <input
                        type="text"
                        placeholder="Search for people..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch}>Search</button>
                </div>

                {searchResults.length > 0 && (
                    <div className="search-results">
                        <h4>Discovery</h4>
                        <div className="search-grid">
                            {searchResults.map(u => (
                                <motion.div
                                    key={u._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="search-card"
                                >
                                    <div className="card-avatar">
                                        {u.username[0].toUpperCase()}
                                    </div>
                                    <div className="card-info">
                                        <span className="card-name">{u.username}</span>
                                        <button className="add-btn" onClick={() => sendRequest(u._id)}>
                                            Request
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="friends-list">
                    {requests.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pending-section">
                            <h4>Requests ({requests.length})</h4>
                            {requests.map(r => (
                                <div key={r._id} className="request-item">
                                    <span>{r.from.username}</span>
                                    <div className="request-btns">
                                        <button className="acc-btn" onClick={() => acceptRequest(r._id)}>Accept</button>
                                        <button className="rej-btn" onClick={() => rejectRequest(r._id)}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    <h4>Conversations</h4>
                    <div className="conversations-grid">
                        {friends.map((f, i) => (
                            <motion.div
                                key={f._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`friend-item ${currentChat?._id === f._id ? 'active' : ''}`}
                                onClick={() => setCurrentChat(f)}
                            >
                                <div className="avatar-placeholder">
                                    {f.username[0].toUpperCase()}
                                    {onlineUsers.includes(f._id) && <span className="online-dot" />}
                                </div>
                                <div className="friend-info">
                                    <span className="name">{f.username}</span>
                                    <span className="status-text">{onlineUsers.includes(f._id) ? 'Active Now' : 'Last seen recently'}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {friends.length === 0 && <p className="empty-msg">No friends yet. Start searching!</p>}
                </div>
            </motion.div>

            <div className="chat-window">
                {currentChat ? (
                    <>
                        <div className="chat-header">
                            <div className="header-user-info">
                                <div className="header-avatar">
                                    {currentChat.username[0].toUpperCase()}
                                    {onlineUsers.includes(currentChat._id) && <span className="online-dot-large" />}
                                </div>
                                <div>
                                    <h3>{currentChat.username}</h3>
                                    <span className="header-status">
                                        {typingUsers[currentChat._id] ? (
                                            <span className="typing-indicator-text">typing...</span>
                                        ) : (
                                            onlineUsers.includes(currentChat._id) ? 'Online' : 'Offline'
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="header-actions">
                                <button className="header-tool-btn" title="Search">🔍</button>
                                <button className="header-tool-btn" title="More Info">ℹ️</button>
                            </div>
                        </div>
                        <div className="messages">
                            <AnimatePresence initial={false}>
                                {messages.map((m, index) => {
                                    const messageDate = new Date(m.timestamp).toLocaleDateString();
                                    const prevDate = index > 0 ? new Date(messages[index - 1].timestamp).toLocaleDateString() : null;
                                    const showDateHeader = messageDate !== prevDate;

                                    return (
                                        <div key={index} className="message-wrapper">
                                            {showDateHeader && (
                                                <div className="date-separator">
                                                    <span>
                                                        {messageDate === new Date().toLocaleDateString() ? "Today" :
                                                            messageDate === new Date(Date.now() - 86400000).toLocaleDateString() ? "Yesterday" :
                                                                messageDate}
                                                    </span>
                                                </div>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                whileHover={{ x: m.sender === user.id ? -4 : 4 }}
                                                className={`message ${m.sender === user.id ? 'own' : ''}`}
                                            >
                                                <div className="message-content">{m.text}</div>
                                                <div className="message-meta-container">
                                                    <span className="message-meta">
                                                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {m.sender === user.id && (
                                                        <span className="status-icon">✓✓</span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </AnimatePresence>
                            <div ref={scrollRef} />
                        </div>
                        <form className="chat-input" onSubmit={sendMessage}>
                            <div className="emoji-container" ref={emojiPickerRef}>
                                <button type="button" className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                                {showEmojiPicker && (
                                    <div className="emoji-picker-wrapper">
                                        <EmojiPicker onEmojiClick={onEmojiClick} theme={theme} />
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={handleInputChange}
                                autoFocus
                            />
                            <button type="submit">Send</button>
                        </form>
                    </>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="no-chat">
                        <div className="welcome-icon">🌌</div>
                        <h2>Your Galaxy of Chats</h2>
                        <p>Pick a friend to start a vibrant conversation or discover new people to connect with.</p>
                        <div className="stats-preview">
                            <div className="stat"><span>{friends.length}</span><label>Friends</label></div>
                            <div className="stat"><span>{requests.length}</span><label>Invites</label></div>
                        </div>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {showProfile && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="profile-overlay" onClick={() => setShowProfile(false)} />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="profile-sidebar">
                            <div className="profile-sidebar-header">
                                <h3>Settings</h3>
                                <button onClick={() => setShowProfile(false)}>✕</button>
                            </div>
                            <Profile />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Chat;
