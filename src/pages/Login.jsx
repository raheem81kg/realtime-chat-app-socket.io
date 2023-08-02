import React, { useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import PuffLoader from "react-spinners/PuffLoader";

import { UserContext } from "../App";
import { ADD_MEMBER_TO_CHAT } from "../mutation/chatMutations";
import LoginForm from "../components/LoginForm";
import images from "../data/images";

const Login = () => {
    const { user, setUser } = useContext(UserContext);
    const [loginName, setLoginName] = useState("");
    const [loading, setLoading] = useState(false);
    const [addMemberToChat] = useMutation(ADD_MEMBER_TO_CHAT);

    const getRandomImage = () => {
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex].imageUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loginName.trim() !== "") {
            setLoading(true);
            try {
                await addMemberToChat({
                    variables: { userName: loginName.trim(), chatId: "64a9972a6861cd1a093f3c15" },
                });
            } catch (error) {
                // Handle error if the mutation fails
                // console.error("Mutation error:", error);
            }

            setTimeout(() => {
                setLoading(false);
                const randomImage = getRandomImage();
                setUser({ name: loginName.trim(), randomImage: randomImage });
            }, 200);
        }
    };

    const handleNameChange = (e) => {
        setLoginName(e.target.value);
    };

    return !user ? (
        <div>
            {!loading ? (
                <LoginForm loginName={loginName} setLoginName={setLoginName} handleSubmit={handleSubmit} />
            ) : (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                    <PuffLoader color="black" size={80} />
                </div>
            )}
        </div>
    ) : (
        // If user is logged in, redirect to the Home page
        <Navigate to="/" />
    );
};

export default Login;
