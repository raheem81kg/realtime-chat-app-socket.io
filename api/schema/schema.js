// Mongoose Models
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const UnreadMessage = require("../models/UnreadMessage");

const Redis = require("ioredis");

// I set up SLL in redis so the extra "s" in "rediss" is very important.
const redisClient = new Redis(process.env.REDIS_URL);

const {
    GraphQLObjectType,
    GraphQLID,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLSchema,
    GraphQLInputObjectType,
    GraphQLInt,
} = require("graphql");

// Chat Type
const ChatType = new GraphQLObjectType({
    name: "Chat",
    fields: () => ({
        id: { type: GraphQLID },
        groupName: { type: GraphQLString },
        members: { type: GraphQLList(GraphQLID) },
    }),
});

// Message Type
const MessageType = new GraphQLObjectType({
    name: "Message",
    fields: () => ({
        id: { type: GraphQLID },
        chatId: { type: GraphQLString },
        sender: { type: GraphQLString },
        message: { type: GraphQLString },
        createdAt: { type: GraphQLString },
    }),
});

// Unread Message Type
const UnreadMessageType = new GraphQLObjectType({
    name: "UnreadMessage",
    fields: () => ({
        id: { type: GraphQLID },
        chatId: { type: GraphQLID },
        sender: { type: GraphQLString },
        receiver: { type: GraphQLString },
        message: { type: GraphQLString },
    }),
});

// Defining the UnreadMessageInputType for the messages argument in addUnreadMessages mutation
const UnreadMessageInputType = new GraphQLInputObjectType({
    name: "UnreadMessageInput",
    fields: () => ({
        chatId: { type: GraphQLNonNull(GraphQLID) },
        sender: { type: GraphQLNonNull(GraphQLString) },
        receiver: { type: GraphQLNonNull(GraphQLString) },
        message: { type: GraphQLNonNull(GraphQLString) },
    }),
});

const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        singleChat: {
            type: ChatType,
            args: {
                member1: { type: GraphQLNonNull(GraphQLString) },
                member2: { type: GraphQLNonNull(GraphQLString) },
            },
            resolve(parent, args) {
                return Chat.findOne({
                    members: {
                        $all: [args.member1, args.member2],
                        $size: 2,
                    },
                });
            },
        },
        chats: {
            type: new GraphQLList(ChatType),
            args: { member: { type: GraphQLNonNull(GraphQLString) } },

            resolve: async (parent, args) => {
                const key = `chats:${args.member}`;

                return new Promise((resolve, reject) => {
                    redisClient.get(key, (error, cachedChats) => {
                        if (error) {
                            reject(new Error("Failed to retrieve chats."));
                        }

                        if (cachedChats) {
                            // Transform the chats to match the frontend's expectation. "_id" from mongodb to "id"
                            const transformedChats = JSON.parse(cachedChats).map((chat) => {
                                const { _id, ...rest } = chat;
                                return { id: _id, ...rest };
                            });

                            resolve(transformedChats);
                        } else {
                            // Fetching chats from MongoDB
                            Chat.find({ members: { $in: [args.member] } })
                                .then((chats) => {
                                    redisClient
                                        .setex(key, 1, JSON.stringify(chats))
                                        .then(() => {
                                            resolve(chats);
                                        })
                                        .catch((error) => {
                                            reject(new Error("Failed to store chats in Redis."));
                                        });
                                })
                                .catch((error) => {
                                    reject(new Error("Failed to retrieve chats from MongoDB."));
                                });
                        }
                    });
                });
            },
        },
        messages: {
            type: new GraphQLList(MessageType),
            args: { chatId: { type: GraphQLNonNull(GraphQLID) } },
            resolve: async (parent, args) => {
                const redisKey = `messages:${args.chatId}`;

                return new Promise((resolve, reject) => {
                    // Check if the messages are cached in Redis
                    redisClient.get(redisKey, (error, cachedMessages) => {
                        if (error) {
                            reject(new Error("Failed to retrieve messages from Redis."));
                        }

                        if (cachedMessages) {
                            const transformedMessages = JSON.parse(cachedMessages).map((message) => {
                                const { _id, ...rest } = message;
                                return { id: _id, ...rest };
                            });

                            resolve(transformedMessages);
                        } else {
                            // Fetch messages from MongoDB
                            Message.find({ chatId: args.chatId })
                                .then((messages) => {
                                    // Cache the messages in Redis
                                    redisClient
                                        .setex(redisKey, 1, JSON.stringify(messages))
                                        .then(() => {
                                            resolve(messages);
                                        })
                                        .catch((error) => {
                                            reject(new Error("Failed to store messages in Redis."));
                                        });
                                })
                                .catch((error) => {
                                    reject(new Error("Failed to retrieve messages from MongoDB."));
                                });
                        }
                    });
                });
            },
        },
        unreadMessages: {
            type: GraphQLInt,
            args: { chatId: { type: GraphQLNonNull(GraphQLID) }, receiver: { type: GraphQLNonNull(GraphQLString) } },
            resolve(parent, args) {
                // returning chats with a certain member in it
                return UnreadMessage.countDocuments({ chatId: args.chatId, receiver: args.receiver });
                // return unreadMessages.filter((message) => message.chatId === args.chatId);
            },
        },
    },
});

//Mutations
const mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        // Save a chat
        addChat: {
            type: ChatType,
            args: {
                groupName: { type: GraphQLString },
                members: { type: GraphQLNonNull(GraphQLList(GraphQLString)) },
            },
            resolve: async (parent, args) => {
                try {
                    const existingChat = await Chat.findOne({
                        members: {
                            $all: args.members,
                            $size: args.members.length,
                        },
                    });

                    if (existingChat) {
                        return existingChat; // Chat already exists, return it
                    }

                    const newChat = new Chat({
                        groupName: args.groupName,
                        members: args.members,
                    });

                    return newChat.save(); // Create and return the new chat
                } catch (error) {
                    throw new Error("Failed to save chat.");
                }
            },
        }, // Add a member to a chat
        addMember: {
            type: ChatType,
            args: {
                userName: { type: GraphQLNonNull(GraphQLString) },
                chatId: { type: GraphQLNonNull(GraphQLID) },
            },
            resolve: async (parent, args) => {
                try {
                    // Find the chat by chatId
                    const chat = await Chat.findById(args.chatId);

                    if (!chat) {
                        return null;
                    }

                    // Check if the user is already a member of the chat
                    if (chat.members.includes(args.userName)) {
                        throw new Error("User is already a member of the chat.");
                    }

                    // Add the user to the members array
                    chat.members.push(args.userName);

                    // Save the updated chat
                    const updatedChat = await chat.save();

                    return updatedChat;
                } catch (error) {
                    throw new Error("Failed to add member to chat.");
                }
            },
        },
        // Save a message and add unread messages
        addMessage: {
            type: MessageType,
            args: {
                chatId: { type: GraphQLNonNull(GraphQLID) },
                sender: { type: GraphQLNonNull(GraphQLString) },
                message: { type: GraphQLNonNull(GraphQLString) },
            },
            resolve: async (parent, args) => {
                try {
                    const message = new Message({
                        chatId: args.chatId,
                        sender: args.sender,
                        message: args.message,
                    });

                    // Save the message
                    const savedMessage = await message.save();

                    // Find the chat by chatId
                    const chat = await Chat.findById(args.chatId);

                    // Add unread message to all members except the sender
                    const unreadMessages = chat.members
                        .filter((member) => member !== args.sender)
                        .map((member) => ({
                            chatId: args.chatId,
                            sender: args.sender,
                            receiver: member,
                            message: args.message,
                        }));

                    // Save the unread messages
                    await UnreadMessage.insertMany(unreadMessages);

                    return savedMessage;
                } catch (error) {
                    throw new Error("Failed to save message.");
                }
            },
        },
        // Save an array of unread messages
        addUnreadMessages: {
            type: GraphQLList(UnreadMessageType),
            args: {
                messages: { type: GraphQLNonNull(GraphQLList(UnreadMessageInputType)) },
            },
            resolve(parent, args) {
                const unreadMessages = args.messages.map(
                    (message) =>
                        new UnreadMessage({
                            chatId: message.chatId,
                            sender: message.sender,
                            receiver: message.receiver,
                            message: message.message,
                        })
                );

                return UnreadMessage.insertMany(unreadMessages);
            },
        },
        // Delete unreadMessages
        removeUnread: {
            type: GraphQLList(UnreadMessageType),
            args: {
                chatId: { type: GraphQLNonNull(GraphQLID) },
                receiver: { type: GraphQLNonNull(GraphQLString) },
            },
            resolve(parent, args) {
                const { chatId, receiver } = args;

                // Step 1: Find the records to be deleted
                return UnreadMessage.find({ chatId, receiver })
                    .then((unreadMessages) => {
                        // Step 2: Remove the matching records
                        return UnreadMessage.deleteMany({ _id: { $in: unreadMessages.map((message) => message._id) } })
                            .then(() => unreadMessages) // Return the deleted messages
                            .catch((error) => {
                                throw new Error("Failed to remove unread messages.");
                            });
                    })
                    .catch((error) => {
                        throw new Error("Failed to find unread messages.");
                    });
            },
        },
        deleteAndReturnUnreadMessages: {
            type: GraphQLInt,
            args: { chatId: { type: GraphQLNonNull(GraphQLID) }, receiver: { type: GraphQLNonNull(GraphQLString) } },
            async resolve(parent, args) {
                try {
                    // Delete the unread messages before returning the count
                    await UnreadMessage.deleteMany({ chatId: args.chatId, receiver: args.receiver });

                    // Return the count of remaining unread messages
                    const count = await UnreadMessage.countDocuments({ chatId: args.chatId, receiver: args.receiver });
                    return count;
                } catch (error) {
                    throw new Error("Failed to delete or count unread messages.");
                }
            },
        },
    },
});

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation,
});
