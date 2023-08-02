import styles from "../scss/LoginForm.module.scss";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

function LoginForm({ loginName, setLoginName, handleSubmit }) {
    const search = {
        visible: { opacity: 1, x: 0 },
        hidden: { opacity: 0, x: 20 },
        exit: { opacity: 0, transition: { duration: 0.2 } },
    };

    const line = {
        visible: { scale: 1 },
        hidden: { scale: 0 },
        exit: { opacity: 0, transition: { duration: 0.2 } },
    };

    const handleInputChange = (event) => {
        const enterButton = document.getElementById("enterBtn");
        if (!enterButton) return;
        if (event.target.value && event.target.value !== "") {
            enterButton.style.opacity = "1";
        } else {
            enterButton.style.opacity = "0";
        }

        setLoginName(event.target.value.trim());
    };

    return (
        <AnimatePresence>
            <>
                <div className={styles.search}>
                    <div className={styles.container}>
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>
                                Realtime Chat App <span className={styles.smallText}>by Raheem Gordon</span>
                            </h1>
                        </div>
                        <motion.form
                            variants={search}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ ease: "easeOut", duration: 0.4 }}
                            onSubmit={handleSubmit}
                            className={styles.form}
                        >
                            <input
                                onChange={handleInputChange}
                                className={styles.textField}
                                name="searchFor"
                                type="text"
                                placeholder="Enter Your Name"
                                value={loginName}
                                spellCheck="false"
                                autoComplete="off"
                                autoFocus
                            />
                            <button type="submit" id="enterBtn" className={styles.btn}>
                                enter
                            </button>
                        </motion.form>
                        <motion.div
                            variants={line}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ ease: "easeOut", duration: 0.8 }}
                            className={styles.line}
                        />
                    </div>
                </div>
            </>
        </AnimatePresence>
    );
}

export default LoginForm;
