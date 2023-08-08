import { useContext, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { UserContext } from "../App";
import { GET_CHATS } from "../queries/chatQueries";
import { GET_MESSAGES } from "../queries/messageQueries";
import styles from "../scss/Home.module.scss";
import LogoutSection from "../components/LogoutSection";
import Chat from "../components/Chat";
import Message from "../components/Message";
import OnlineUser from "../components/OnlineUser";
import { SAVE_MESSAGE } from "../mutation/messageMutations";
import { CREATE_CHAT } from "../mutation/chatMutations";
import { io } from "socket.io-client";
import { useApolloClient } from "@apollo/client";
import PuffLoader from "react-spinners/PuffLoader";
import { motion } from "framer-motion";
import { GiHamburgerMenu } from "react-icons/gi";
import { toast } from "react-hot-toast";
import ToastNotification from "../components/ToastNotification";

const Home = () => {
    const client = useApolloClient();
    const cache = client.cache;
    const { user } = useContext(UserContext);

    const [socket, setSocket] = useState(null);

    const [isSiebarOpen, setIsSidebarOpen] = useState(false);

    const handleSidebarHeader = () => {
        setIsSidebarOpen(!isSiebarOpen);
    };

    useEffect(() => {
        // connect to socket
        setSocket(io(import.meta.env.VITE_SOCKET_URI));

        // Cleanup function to disconnect the socket when the component unmounts
        return () => {
            socket?.disconnect();
        };
    }, []);

    useEffect(() => {
        socket?.emit("addUser", { usersName: user?.name, randomImage: user?.randomImage });
        socket?.on("getUsers", (users) => {
            // update onlline users array
            setOnlineUsers(users);
        });
    }, [socket, user]);

    const joinRoom = (chatId) => {
        socket?.emit("joinRoom", chatId);
    };

    // getting all the client's chats
    const {
        loading,
        error,
        data,
        refetch: refetchChats,
    } = useQuery(GET_CHATS, {
        variables: { member: user.name },
    });

    const [onlineUsers, setOnlineUsers] = useState(null);

    const [currentChat, setCurrentChat] = useState(null);

    const [inputValue, setInputValue] = useState("");

    const [addChat] = useMutation(CREATE_CHAT);

    const [addMessage] = useMutation(SAVE_MESSAGE, {
        // null id since it isn't important. If I pulled an id for the client from the database, it would go here
        variables: { chatId: currentChat?.chatDetails?.id, sender: user?.name, message: inputValue },
        // addMessage represents the variables (chatId, sender, message)
        update(cache, { data: { addMessage } }) {
            // messageData is from the object returned from running GET_MESSAGES query

            // destruct "messages" from the response, the name is important, it can't be random
            const { messages } = cache.readQuery({ query: GET_MESSAGES, variables: { chatId: currentChat?.chatDetails?.id } });

            cache.writeQuery({
                query: GET_MESSAGES,
                variables: { chatId: currentChat?.chatDetails?.id },
                // destruct "messages" from the response, the name is important, it can't be random
                data: { messages: [...messages, addMessage] },
            });
        },
    });

    const {
        loading: messageLoading,
        error: messageError,
        data: messageData,
        refetch: refetchMessages,
    } = useQuery(GET_MESSAGES, {
        variables: { chatId: currentChat?.chatDetails?.id },
        skip: !currentChat, // Skip the query if currentChat is null, prevents error 500 in console at the beginning
        // useEffect does not work on hook like useQuery do this is the only way
    });

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const [sendingMessage, setSendingMessage] = useState(false);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        // handle sending realtime messages
        if (inputValue.trim() !== "") {
            if (socket) {
                setSendingMessage(true);
                // send message and unread message first so it get's to db and user can retrieve it sooner
                await addMessage();

                const messageData = {
                    id: Date.now().toString(), // Generate a unique message ID
                    chatId: currentChat?.chatDetails?.id,
                    sender: user?.name,
                    message: inputValue,
                    createdAt: new Date().toISOString(), // Set the current timestamp as the message creation time
                    randomImage: user?.randomImage, // Add the randomImage property to messageData
                };

                if (currentChat?.chatDetails?.groupName) {
                    messageData.groupName = currentChat?.chatDetails?.groupName; // Include groupName in messageData
                    // Emit the "sendMessageToRoom" event to the server
                    socket.emit("sendMessageToRoom", messageData);
                } else {
                    // Emit the "sendMessage" event to the server
                    const receiver = currentChat?.chatDetails?.members?.find((member) => member !== user.name);
                    messageData.receiver = receiver;
                    socket.emit("sendMessage", messageData);
                }
            }

            setInputValue("");
            setSendingMessage(false);
        }
    };

    function selectCurrentChat(chatId) {
        const chatDetails = data?.chats?.find((chat) => chat.id === chatId);
        if (chatDetails) {
            setCurrentChat({ chatDetails: chatDetails });
        }

        if (isSmallScreenState && isSiebarOpen) setIsSidebarOpen(!isSiebarOpen);
    }

    // for fetching/creating chat of clicked online user
    const [onlineUsersName, setOnlineUsersName] = useState(null);

    // deal with fetching messages when clicking online users
    useEffect(() => {
        if (onlineUsersName) {
            const chatDetails = {
                members: [onlineUsersName, user.name],
                groupName: null,
            };

            addChat({
                variables: {
                    groupName: null,
                    members: chatDetails.members,
                },
                update(cache, { data: { addChat } }) {
                    const { chats } = cache.readQuery({ query: GET_CHATS, variables: { member: user.name } });

                    // Check if the chat already exists in the chats array
                    const existingChat = chats.find((chat) => chat.id === addChat.id);

                    if (!existingChat) {
                        cache.writeQuery({
                            query: GET_CHATS,
                            variables: { member: user.name },
                            data: { chats: [...chats, addChat] },
                        });
                    }

                    setCurrentChat({ chatDetails: addChat });
                },
            });
        }
    }, [onlineUsersName]);

    function selectOnlineUserChat(onlineUsersName) {
        setOnlineUsersName(onlineUsersName);
        if (isSmallScreenState) setIsSidebarOpen(!isSiebarOpen);
    }

    // Fetch messages when currentChat changes
    useEffect(() => {
        if (currentChat) {
            refetchMessages();
        }
    }, [currentChat, refetchMessages]);

    // responsible for scrolling the chat messagees to the bottom
    const containerScrollRef = useRef(null);

    useEffect(() => {
        const container = containerScrollRef?.current;

        if (container && currentChat) {
            container.scrollTop = container?.scrollHeight;
        } else if (container) {
            container.scrollTop = 0; // Scroll to the top when conditions are not met
        }
    }, [messageData, messageLoading]);

    useEffect(() => {
        // Socket event listener for receiving messages
        socket?.on("receiveMessage", (receivedMessage) => {
            const { chatId } = receivedMessage;

            // Check if the received message is for the current chat
            if (chatId === currentChat?.chatDetails?.id) {
                // Update the cache to include the received message
                const query = GET_MESSAGES;
                const variables = { chatId };
                const previousData = cache.readQuery({ query, variables });

                if (previousData) {
                    const { messages } = previousData;
                    const updatedData = {
                        messages: [...messages, receivedMessage],
                    };

                    cache.writeQuery({ query, variables, data: updatedData });
                }
            } else {
                //show notification and update unreadMessages
                // if the received message is not apart of any chat currently, refetch all chats from the db
                !data?.chats.some((chat) => chat.id === chatId) && refetchChats();

                const { sender, message, randomImage } = receivedMessage;
                toast.custom((t) => (
                    <ToastNotification
                        t={t}
                        chatId={chatId}
                        sender={sender}
                        message={message}
                        senderImage={randomImage}
                        data={data}
                        selectCurrentChat={selectCurrentChat}
                    />
                ));
            }
        });

        return () => {
            // Clean up the socket event listener when the component unmounts
            socket?.off("receiveMessage");
        };
    }, [data, socket, cache, selectCurrentChat, currentChat?.chatDetails?.id]);

    const [isSmallScreenState, setIsSmallScreenState] = useState(null);

    // Function to check the screen width and update the isSidebarOpen state
    const checkScreenWidth = () => {
        const screenWidth = window.innerWidth;
        const isSmallScreen = screenWidth <= 768;
        if (isSmallScreen) {
            setIsSmallScreenState(true);
        } else {
            setIsSmallScreenState(false);
        }
        setIsSidebarOpen(!isSmallScreen); // Set isSidebarOpen to true for small screens, false for large screens
    };

    useEffect(() => {
        // Call the checkScreenWidth function initially to set the state based on the initial screen size
        checkScreenWidth();

        // Add a listener to the window object for the resize event
        window.addEventListener("resize", checkScreenWidth);

        // Clean up the listener when the component unmounts
        return () => {
            window.removeEventListener("resize", checkScreenWidth);
        };
    }, []);

    return (
        <div className={styles.chat_container}>
            {/* Header for small devices */}
            <div className={styles.header_container}>
                <button className={styles.menu_button} onClick={handleSidebarHeader}>
                    Menu <GiHamburgerMenu size={24} />
                </button>
            </div>

            <motion.div
                className={styles.chat_container__menu}
                initial={{ x: isSiebarOpen ? 0 : "-100%" }}
                animate={{ x: isSiebarOpen ? 0 : "-100%" }}
                exit={{ x: "100%" }}
                transition={{ ease: "easeOut", duration: 0.5 }}
            >
                <button type="button" onClick={handleSidebarHeader} className={styles.close_sidebar}>
                    <svg
                        className={styles.close_sidebar__svg}
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M23.954 21.03l-9.184-9.095 9.092-9.174-2.832-2.807-9.09 9.179-9.176-9.088-2.81 2.81 9.186 9.105-9.095 9.184 2.81 2.81 9.112-9.192 9.18 9.1z" />
                    </svg>
                </button>

                <div className={styles.chat_container__menu__all_messages}>
                    <h1>All conversations</h1>
                    {/* "role="list" removes bullet points */}
                    <ul role="list">
                        {data?.chats?.map((chat, index) => {
                            if (chat?.groupName !== "All Chat") {
                                return;
                            }
                            // join chat room if chat has groupName
                            if (chat?.groupName) {
                                joinRoom(chat.id);
                            }

                            return (
                                <Chat
                                    key={chat.id}
                                    chat={chat}
                                    selectCurrentChat={selectCurrentChat}
                                    currentChat={currentChat}
                                    socket={socket}
                                />
                            );
                        })}

                        {data?.chats?.map((chat, index) => {
                            if (chat?.groupName === "All Chat") {
                                return;
                            }
                            // join chat room if chat has groupName
                            if (chat?.groupName) {
                                joinRoom(chat.id);
                            }

                            return (
                                <Chat
                                    key={chat.id}
                                    chat={chat}
                                    selectCurrentChat={selectCurrentChat}
                                    currentChat={currentChat}
                                    socket={socket}
                                />
                            );
                        })}
                    </ul>
                    <h1>Online users</h1>
                    {onlineUsers?.length > 1 ? (
                        <ul role="list">
                            {onlineUsers.map((onlineUser, index) => {
                                if (user.name !== onlineUser.usersName) {
                                    return (
                                        <OnlineUser key={index} onlineUser={onlineUser} selectOnlineUserChat={selectOnlineUserChat} />
                                    );
                                }
                                return null; // Return null to avoid rendering the user with the same name as the current user
                            })}
                        </ul>
                    ) : (
                        <h1 className={styles.not_online}>No online users</h1>
                    )}
                </div>
                <div className={styles.chat_container__menu__logout}>
                    <LogoutSection socket={socket} setSocket={setSocket} />
                </div>
            </motion.div>
            <div className={styles.chat_container__chat}>
                {currentChat && (
                    <h1 className={styles.chat_container__chat__title}>
                        {/* finds chat title */}
                        {currentChat?.chatDetails?.groupName
                            ? currentChat?.chatDetails?.groupName
                            : currentChat?.chatDetails?.members?.find((member) => member !== user.name)}
                    </h1>
                )}
                {/* conditionally render messages if there is any */}
                {currentChat ? (
                    <>
                        <div className={styles.chat_container__chat__messages} ref={containerScrollRef}>
                            {!messageLoading ? (
                                messageData?.messages?.length > 0 ? (
                                    messageData.messages.map((message, index) => {
                                        // Check if the current message's sender is the same as the previous one
                                        const samePreviousSender = messageData.messages[index - 1]?.sender === message.sender;

                                        return (
                                            <Message
                                                key={index}
                                                message={message}
                                                own={message.sender === user.name}
                                                samePreviousSender={samePreviousSender}
                                            />
                                        );
                                    })
                                ) : (
                                    <div>
                                        {/* Code to send the first message */}
                                        <div style={{ opacity: 0.8 }}>Send the first message...</div>
                                    </div>
                                )
                            ) : (
                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                                    <PuffLoader color="black" size={80} />
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className={styles.send_message_form}>
                            <input
                                type="text"
                                className={styles.send_message_form__input}
                                placeholder="Type your message..."
                                value={inputValue}
                                onChange={handleInputChange}
                            />
                            <button
                                type="submit"
                                className={`${styles.send_message_form__button} ${sendingMessage ? styles.loading : ""}`}
                                disabled={sendingMessage}
                            >
                                {sendingMessage ? "Sending..." : "Send"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className={styles.not_online}> Open a conversation to start a chat...</div>
                )}
            </div>
        </div>
    );
};

export default Home;
