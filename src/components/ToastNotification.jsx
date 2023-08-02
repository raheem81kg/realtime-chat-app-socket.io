import styles from "../scss/ToastNotification.module.scss";
import silhouetteIcon from "/silhouette.png";
import { toast } from "react-hot-toast";

const ToastNotification = ({ t, chatId, sender, message, senderImage, selectCurrentChat }) => {
    const handleClick = () => {
        toast.dismiss(t.id);
        selectCurrentChat(chatId);
    };
    return (
        <div className={styles.container}>
            <div
                className={styles.container__profile_photo}
                style={{
                    backgroundImage: `url(${senderImage ? senderImage : silhouetteIcon})`,
                }}
            ></div>
            <div className={styles.container__middle} onClick={handleClick}>
                <p className={styles.container__middle__name}>{sender}</p>
                <p className={styles.container__middle__text}>{message}</p>
            </div>
            <button type="button" onClick={() => toast.dismiss(t.id)} className={styles.container__icon}>
                <svg
                    className={styles.container__icon__svg}
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M23.954 21.03l-9.184-9.095 9.092-9.174-2.832-2.807-9.09 9.179-9.176-9.088-2.81 2.81 9.186 9.105-9.095 9.184 2.81 2.81 9.112-9.192 9.18 9.1z" />
                </svg>
            </button>
        </div>
    );
};

export default ToastNotification;
