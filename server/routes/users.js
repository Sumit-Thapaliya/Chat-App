const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Search Users
router.get("/search", auth, async (req, res) => {
    const { username } = req.query;
    try {
        const users = await User.find({ username: { $regex: username, $options: "i" } }).select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// Send Friend Request
router.post("/send-request", auth, async (req, res) => {
    const { friendId } = req.body;
    try {
        if (req.user.id === friendId) return res.status(400).json({ msg: "Cannot request yourself" });

        const friend = await User.findById(friendId);
        if (!friend) return res.status(404).json({ msg: "User not found" });

        // Check if already friends
        if (friend.friends && friend.friends.some(fId => fId.toString() === req.user.id)) {
            return res.status(400).json({ msg: "Already friends" });
        }

        // Check if request already pending
        const existing = friend.friendRequests && friend.friendRequests.find(r => r.from.toString() === req.user.id);
        if (existing) return res.status(400).json({ msg: "Request already sent" });

        friend.friendRequests.push({ from: req.user.id });
        await friend.save();

        const io = req.app.get("socketio");
        if (io) {
            io.to(friendId).emit("new_friend_request");
        }

        res.json({ msg: "Request sent" });
    } catch (err) {
        console.error("Send Friend Request Error:", err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

// Accept Friend Request
router.post("/accept-request", auth, async (req, res) => {
    const { requestId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const reqIdx = user.friendRequests.findIndex(r => r._id.toString() === requestId);

        if (reqIdx === -1) return res.status(404).json({ msg: "Request not found" });

        const fromId = user.friendRequests[reqIdx].from;
        const fromUser = await User.findById(fromId);

        // Add to each other's friends list
        user.friends.push(fromId);
        fromUser.friends.push(req.user.id);

        // Remove the request
        user.friendRequests.splice(reqIdx, 1);

        await user.save();
        await fromUser.save();

        const io = req.app.get("socketio");
        io.to(fromId.toString()).emit("request_accepted", {
            userId: req.user.id,
            username: user.username
        });

        res.json({ msg: "Request accepted", friends: user.friends });
    } catch (err) {
        console.error("Accept Friend Request Error:", err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

// Reject Friend Request
router.post("/reject-request", auth, async (req, res) => {
    const { requestId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        user.friendRequests = user.friendRequests.filter(r => r._id.toString() !== requestId);
        await user.save();
        res.json({ msg: "Request rejected" });
    } catch (err) {
        console.error("Reject Friend Request Error:", err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

// Get Pending Requests
router.get("/requests", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("friendRequests.from", "username avatar");
        res.json(user.friendRequests);
    } catch (err) {
        console.error("Get Pending Requests Error:", err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

// Get Friends
router.get("/friends", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("friends", "username avatar online");
        res.json(user.friends);
    } catch (err) {
        console.error("Get Friends Error:", err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

// Update Profile
router.put("/profile", auth, async (req, res) => {
    const { username, avatar } = req.body;
    try {
        let user = await User.findById(req.user.id);
        if (username) user.username = username;
        if (avatar) user.avatar = avatar;

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// Delete Account
router.delete("/delete", auth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        // Also remove from friends lists of other users? ideally yes.
        // For MVP, just delete user.
        res.json({ msg: "User deleted" });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;
