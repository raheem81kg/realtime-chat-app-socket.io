const mongoose = require("mongoose");

const UnreadMessageSchema = new mongoose.Schema(
    {
        chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
        sender: { type: String, required: true },
        receiver: { type: String, required: true },
        message: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("UnreadMessage", UnreadMessageSchema);
