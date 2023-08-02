require("dotenv").config({ path: "../.env" });
const io = require("socket.io")(8900, {
    cors: {
        origin: process.env.REACT_APP_URL,
    },
});

let users = [];

const addUser = (user, socketId) => {
    const { usersName, randomImage } = user;
    const existingUser = users.find((user) => user.usersName === usersName);
    if (existingUser) {
        existingUser.socketId = socketId;
    } else {
        users.push({ usersName, randomImage, socketId });
    }
};

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId);
};

io.on("connection", (socket) => {
    console.log(`${socket.id} has connected`);

    socket.on("addUser", (user) => {
        addUser(user, socket.id);

        io.emit("getUsers", users);
    });

    socket.on("disconnect", () => {
        console.log(`${socket.id} has disconnected`);
        removeUser(socket.id);
        io.emit("getUsers", users);
    });

    socket.on("joinRoom", (chatId) => {
        socket.join(chatId);
    });

    socket.on("sendMessageToRoom", (messageData) => {
        // Broadcast the message to the room based on the chatId
        socket.to(messageData.chatId).emit("receiveMessage", messageData);
    });

    socket.on("sendMessage", (messageData) => {
        const { id, chatId, sender, message, createdAt, receiver, randomImage } = messageData;

        // Perform basic validations on the required fields
        if (!id || !chatId || !sender || !message || !createdAt) {
            // Handle invalid message data (e.g., log an error, send an error response)
            console.error("Invalid message data:", messageData);
            return;
        }

        // Check if the sender is online (present in the users array)
        const recipient = users.find((user) => user.usersName === receiver);
        if (recipient) {
            // User is online, emit the message to their socket
            io.to(recipient.socketId).emit("receiveMessage", {
                id,
                chatId,
                sender,
                message,
                createdAt,
                randomImage,
            });
        } else {
            // User is offline, handle the message accordingly (e.g., store in the database)
            // ...
        }
    });
});
