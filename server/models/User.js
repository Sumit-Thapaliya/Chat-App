const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    avatar: {
        type: String,
        default: "",
    },
    friendRequests: [
        {
            from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
        }
    ]
});

module.exports = mongoose.model("User", UserSchema);
