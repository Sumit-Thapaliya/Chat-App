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

// Add Friend
router.post("/add-friend", auth, async (req, res) => {
    const { friendId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const friend = await User.findById(friendId);

        if (!friend) return res.status(404).json({ msg: "User not found" });

        if (user.friends.includes(friendId)) {
            return res.status(400).json({ msg: "Already friends" });
        }

        user.friends.push(friendId);
        friend.friends.push(req.user.id); // Mutual friendship ? Standard for simple apps usually mutual or request based. I'll make it mutual.

        await user.save();
        await friend.save();

        res.json(user.friends);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// Get Friends
router.get("/friends", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("friends", "-password");
        res.json(user.friends);
    } catch (err) {
        res.status(500).send("Server Error");
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
