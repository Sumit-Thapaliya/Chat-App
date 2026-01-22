const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/Message");

// Get Messages between current user and friend
router.get("/:friendId", auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: req.params.friendId },
                { sender: req.params.friendId, receiver: req.user.id },
            ],
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// Save Message (Optional if using socket exclusively, but good for persistence via API if needed, 
// OR we can save in socket handler. 
// Requirement says "Save chat history". Socket.IO handles real-time. 
// The server.js socket handler should save messages. 
// This route is primarily for fetching history.)

module.exports = router;
