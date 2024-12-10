// Mongoose Models
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const UnreadMessage = require("../models/UnreadMessage");
import Filter from "bad-words";
const Redis = require("ioredis");
import { addMessageLimit } from "../ratelimit";

// I set up SLL in redis so the extra "s" in "rediss" is very important.
const redisClient = new Redis(process.env.REDIS_URL);
// Initialize bad words filter
const filter = new Filter();

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
            try {
               /*
            // Attempt to retrieve chats from Redis
            const cachedChats = await redisClient.get(key);
            if (cachedChats) {
                // Transform the cached chats to match the frontend's expectation
                return JSON.parse(cachedChats).map((chat) => {
                    const { _id, ...rest } = chat;
                    return { id: _id, ...rest };
                });
            }
            */
            } catch (redisError) {
               console.error("Redis error (chats):", redisError.message);
            }

            // Fallback to MongoDB directly
            try {
               const chats = await Chat.find({ members: { $in: [args.member] } });
               /*
            try {
                // Cache the chats in Redis
                await redisClient.setex(key, 3600, JSON.stringify(chats));
            } catch (cacheError) {
                console.error("Failed to cache chats in Redis:", cacheError.message);
            }
            */
               return chats.map((chat) => ({
                  id: chat._id,
                  ...chat._doc,
               }));
            } catch (mongoError) {
               throw new Error("Failed to retrieve chats from MongoDB.");
            }
         },
      },

      messages: {
         type: new GraphQLList(MessageType),
         args: { chatId: { type: GraphQLNonNull(GraphQLID) } },
         resolve: async (parent, args) => {
            const redisKey = `messages:${args.chatId}`;
            try {
               /*
            // Attempt to retrieve messages from Redis
            const cachedMessages = await redisClient.get(redisKey);
            if (cachedMessages) {
                return JSON.parse(cachedMessages).map((message) => {
                    const { _id, ...rest } = message;
                    return { id: _id, ...rest };
                });
            }
            */
            } catch (redisError) {
               console.error("Redis error (messages):", redisError.message);
            }

            // Fallback to MongoDB directly
            try {
               const messages = await Message.find({ chatId: args.chatId });
               /*
            try {
                // Cache the messages in Redis
                await redisClient.setex(redisKey, 3600, JSON.stringify(messages));
            } catch (cacheError) {
                console.error("Failed to cache messages in Redis:", cacheError.message);
            }
            */
               return messages.map((message) => ({
                  id: message._id,
                  ...message._doc,
               }));
            } catch (mongoError) {
               throw new Error("Failed to retrieve messages from MongoDB.");
            }
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
               await addMessageLimit.consume({ sender: args.sender, chatId: args.chatId }, 1);
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
               // Apply rate limiting by sender
               await addMessageLimit.consume(args.sender, 1);

               // Check for offensive language in the message
               if (filter.isProfane(args.message)) {
                  throw new Error("Message contains inappropriate language and cannot be sent.");
               }

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
