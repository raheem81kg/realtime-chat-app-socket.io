import { useContext, useEffect } from "react";
import { UserContext } from "../App";
import styles from "../scss/Chat.module.scss";
import { useQuery, useMutation } from "@apollo/client";
import { GET_UNREAD_MESSAGES } from "../queries/unreadMessagesQueries";
import { DELETE_AND_RETURN_UNREAD_MESSAGES } from "../mutation/unreadMessageMutations";

const Chat = ({ chat, selectCurrentChat, currentChat, socket }) => {
    const { user } = useContext(UserContext);

    // getting the number of the chat's unread messages in string
    const { loading, error, data, refetch } = useQuery(GET_UNREAD_MESSAGES, {
        variables: { chatId: chat?.id, receiver: user?.name },
    });

    // Delete unread messages mutation
    const [deleteAndReturnUnreadMessages] = useMutation(DELETE_AND_RETURN_UNREAD_MESSAGES, {
        variables: { chatId: chat?.id, receiver: user?.name },
        update(cache, { data }) {
            // Access the returned data from the mutation
            const { deleteAndReturnUnreadMessages: unreadMessages } = data;

            // Manually update the cache for GET_UNREAD_MESSAGES query
            cache.writeQuery({
                query: GET_UNREAD_MESSAGES,
                variables: { chatId: chat?.id, receiver: user?.name },
                data: { unreadMessages }, // Set the unreadMessages count to the value returned by the server
            });
        },
        onError(error) {
            // Handle error if the mutation fails
            console.error("Mutation error:", error);
        },
    });

    const handleClick = async () => {
        if (data?.unreadMessages > 0) {
            await deleteAndReturnUnreadMessages(); // Wait for the mutation to complete
            refetch({ chatId: chat?.id, receiver: user?.name }); // Now refetch the data with the updated value
        }
        selectCurrentChat(chat?.id);
    };

    useEffect(() => {
        const handleReceiveMessage = async (receivedMessage) => {
            const { chatId } = receivedMessage;
            if (chatId === chat?.id && chat?.id === currentChat?.chatDetails?.id) {
                // If the received message is in the current chat, delete unread messages and update the cache
                await deleteAndReturnUnreadMessages();
            } else {
                refetch({ chatId: chat?.id, receiver: user?.name }).catch((error) => {
                    // Handle error if refetch() fails
                });
            }
        };

        socket?.on("receiveMessage", handleReceiveMessage);

        return () => {
            socket?.off("receiveMessage", handleReceiveMessage);
        };
    }, [socket, chat, currentChat, deleteAndReturnUnreadMessages]);

    useEffect(() => {
        if (chat?.id === currentChat?.chatDetails?.id) {
            deleteAndReturnUnreadMessages()
                .then(() => refetch({ chatId: chat?.id, receiver: user?.name }))
                .catch((error) => {
                    // Handle error if deleteAndReturnUnreadMessages() or refetch() fails
                });
        }
    }, [chat, currentChat, data, deleteAndReturnUnreadMessages, refetch]);

    //  return group's name if it is a group, otherwise return name of other chat member
    return (
        <li
            className={`${styles.container} ${chat?.id === currentChat?.chatDetails?.id ? styles.selected : ""}`}
            onClick={handleClick}
        >
            <span className={styles.container__chat_name}>
                {chat?.groupName ? chat?.groupName : chat?.members?.find((member) => member !== user.name)}
            </span>
            {data?.unreadMessages > 0 && (
                <span className={styles.container__unread_messages}>{data?.unreadMessages !== 0 ? data?.unreadMessages : ""}</span>
            )}
        </li>
    );
};

export default Chat;
