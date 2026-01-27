const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Middleware
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
// Robust CORS: Allow both the exact URL and the version without a trailing slash
const allowedOrigins = [clientUrl, clientUrl.replace(/\/$/, "")];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`[CORS Error] Origin: ${origin} not allowed. Allowed: ${clientUrl}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[DEBUG] Incoming Request: ${req.method} ${req.url}`);
    next();
});

console.log(`[CONFIG] Allowed Client URL: ${clientUrl}`);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
});

app.set("socketio", io);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));

// Catch-all for undefined routes
app.use((req, res) => {
    console.warn(`[404 Error] No route for: ${req.method} ${req.url}`);
    res.status(404).json({ msg: `Route ${req.method} ${req.url} not found on this server` });
});

const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_room", (userId) => {
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} joined room ${userId}`);

        // Broadcast new online list
        io.emit("get_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("send_message", async (data) => {
        const { senderId, receiverId, message } = data;
        try {
            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                text: message
            });
            await newMessage.save();
            io.to(receiverId).emit("receive_message", data);
            io.to(senderId).emit("receive_message", data);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on("typing", (data) => {
        // data: { senderId, receiverId }
        io.to(data.receiverId).emit("user_typing", data.senderId);
    });

    socket.on("stop_typing", (data) => {
        // data: { senderId, receiverId }
        io.to(data.receiverId).emit("user_stop_typing", data.senderId);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
        // Find and remove the user from online list
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
        io.emit("get_online_users", Array.from(onlineUsers.keys()));
    });
});

// MongoDB Connection
console.log("Connecting to MongoDB...");
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log(">>> MONGODB CONNECTED SUCCESSFULLY <<<"))
    .catch((err) => {
        console.error("!!! MONGODB CONNECTION ERROR !!!");
        console.error(err);
    });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
