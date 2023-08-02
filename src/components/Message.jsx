import styles from "../scss/Message.module.scss";
import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../App";

import { format } from "timeago.js";

const Message = ({ message, own, samePreviousSender }) => {
    const { user } = useContext(UserContext);

    const [relativeTime, setRelativeTime] = useState(format(message.createdAt));

    useEffect(() => {
        const timer = setInterval(() => {
            setRelativeTime(format(message.createdAt));
        }, 60000); // Update every minute (adjust the interval as needed)

        return () => {
            clearInterval(timer);
        };
    }, [message.createdAt]);

    return (
        <div className={`${styles.container} ${own ? styles.ownMessage : ""}`}>
            {!samePreviousSender && message?.sender !== user?.name && (
                <div className={styles.container__chat_sender}>{message.sender}</div>
            )}
            <div className={`${styles.container__inner_container} ${own ? styles.ownMessage : ""}`}>
                <p className={styles.container__message_content}>{message.message}</p>
                <p className={`${styles.container__time} ${own ? styles.ownedTime : ""}`}>{relativeTime}</p>
            </div>
        </div>
    );
};

export default Message;
