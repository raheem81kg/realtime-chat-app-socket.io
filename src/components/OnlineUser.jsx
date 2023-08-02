import React, { useContext, useState } from "react";
import { UserContext } from "../App";
import styles from "../scss/OnlineUser.module.scss";

const OnlineUser = ({ onlineUser, selectOnlineUserChat }) => {
    const { user } = useContext(UserContext);

    // Set the background color of the <li> element based on onlineUser.color

    return (
        <li className={styles.container} onClick={() => selectOnlineUserChat(onlineUser.usersName)}>
            <div
                className={styles.container__profile_photo}
                style={{
                    backgroundImage: `url(${onlineUser?.randomImage ? onlineUser?.randomImage : silhouetteIcon})`,
                }}
            ></div>
            <span className={styles.container__name}>{onlineUser?.usersName}</span>
        </li>
    );
};

export default OnlineUser;
