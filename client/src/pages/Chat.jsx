import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import io from "socket.io-client";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from 'emoji-picker-react';
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
    const [theme, setTheme] = useState('dark');
    const typingTimeoutRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const scrollRef = useRef();

    useEffect(() => {
        if (user) {
            socket.emit("join_room", user.id);
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
        return () => {
            socket.off("get_online_users");
            socket.off("user_typing");
            socket.off("user_stop_typing");
            socket.off("receive_message");
        };
    }, [currentChat, user.id]);

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
        document.documentElement.className = newTheme + '-theme';
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
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
        getFriends();
    }, [user]);

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

    const addFriend = async (friendId) => {
        try {
            await axios.post(`${apiUrl}/api/users/add-friend`, { friendId }, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            const res = await axios.get(`${apiUrl}/api/users/friends`, {
                headers: { "x-auth-token": localStorage.getItem("token") },
            });
            setFriends(res.data);
            setSearchResults([]);
            setSearchQuery("");
        } catch (err) {
            alert("Error adding friend");
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

        // Optimistic update for "instant" feel
        setMessages((prev) => [...prev, {
            sender: user.id,
            text: newMessage,
            timestamp: Date.now()
        }]);
        setNewMessage("");
    };

    return (
        <div className="chat-container">
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="sidebar"
            >
                <div className="sidebar-header">
                    <h3>Messages</h3>
                    <div className="sidebar-actions">
                        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <Link to="/profile">Profile</Link>
                    </div>
                </div>
                <div className="search-users">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch}>Search</button>
                </div>
                {searchResults.length > 0 && (
                    <div className="search-results">
                        <h4>Results:</h4>
                        {searchResults.map(u => (
                            <div key={u._id} className="search-item">
                                <span>{u.username}</span>
                                <button onClick={() => addFriend(u._id)}>+</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="friends-list">
                    <h4>All Chats</h4>
                    {friends.map(f => (
                        <div
                            key={f._id}
                            className={`friend-item ${currentChat?._id === f._id ? 'active' : ''}`}
                            onClick={() => setCurrentChat(f)}
                        >
                            <div className="avatar-placeholder">
                                {f.username[0].toUpperCase()}
                                {onlineUsers.includes(f._id) && <span className="online-dot" />}
                            </div>
                            <span>{f.username}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
            <div className="chat-window">
                {currentChat ? (
                    <>
                        <div className="chat-header">
                            <div>
                                <h3>{currentChat.username}</h3>
                                {typingUsers[currentChat._id] && <span className="typing-indicator">typing...</span>}
                            </div>
                        </div>
                        <div className="messages">
                            <AnimatePresence initial={false}>
                                {messages.map((m, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className={`message ${m.sender === user.id ? 'own' : ''}`}
                                    >
                                        <div className="message-content">{m.text}</div>
                                        <span className="message-meta">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <div ref={scrollRef} />
                        </div>
                        <form className="chat-input" onSubmit={sendMessage}>
                            <div className="emoji-container" ref={emojiPickerRef}>
                                <button
                                    type="button"
                                    className="emoji-btn"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    😊
                                </button>
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
                    <div className="no-chat">Select a conversation to start messaging</div>
                )}
            </div>
        </div>
    );
};

export default Chat;
