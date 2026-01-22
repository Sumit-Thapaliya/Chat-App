const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    console.log("Registration attempt for:", username);
    try {
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ msg: "User already exists" });

        user = new User({ username, password });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        console.log("User saved successfully:", username);

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username } });
        });
    } catch (err) {
        console.error("Registration Error Detail:", err);
        res.status(500).json({ msg: "Server error during registration", error: err.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt for:", username);
    try {
        let user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username } });
        });
    } catch (err) {
        console.error("Login Error Detail:", err);
        res.status(500).json({ msg: "Server error during login", error: err.message });
    }
});

module.exports = router;
