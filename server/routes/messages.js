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

// Delete Message
router.delete("/:id", auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ msg: "Message not found" });

        // Check ownership
        if (message.sender.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }

        await Message.findByIdAndDelete(req.params.id);
        res.json({ msg: "Message deleted" });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;
