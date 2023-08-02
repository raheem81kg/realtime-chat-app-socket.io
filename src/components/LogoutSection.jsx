import React, { useContext } from "react";
import { UserContext } from "../App";
import styles from "../scss/LogoutSection.module.scss";
import { MdLogout } from "react-icons/md";
import silhouetteIcon from "/silhouette.png";

const LogoutSection = ({ socket, setSocket }) => {
    const { user, setUser } = useContext(UserContext);

    const handleClick = () => {
        setUser(null);
        socket.disconnect();
        setSocket(null);
    };
    return (
        <div className={styles.logout_container}>
            <div
                className={styles.logout_container__profile_photo}
                style={{
                    backgroundImage: `url(${user?.randomImage ? user?.randomImage : silhouetteIcon})`,
                }}
            ></div>
            <div className={styles.logout_container__name}>{user?.name}</div>
            <MdLogout className={styles.logout_container__icon} size="1.45rem" onClick={handleClick} />
        </div>
    );
};

export default LogoutSection;
