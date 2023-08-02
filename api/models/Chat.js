const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
    {
        groupName: { type: String },
        members: { type: [String], required: true, min: 2 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
