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
    friends: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            }
        ],
        default: []
    },
    avatar: {
        type: String,
        default: "",
    },
    friendRequests: {
        type: [
            {
                from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
            }
        ],
        default: []
    }
});

module.exports = mongoose.model("User", UserSchema);
