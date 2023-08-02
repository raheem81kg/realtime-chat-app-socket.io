import { createContext, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";
import { Toaster } from "react-hot-toast";

import Home from "./pages/Home";
import Login from "./pages/Login";
import "./scss/App.scss";

// Create an Apollo client instance

const graphqlUri = import.meta.env.VITE_GRAPHQL_URI;

const apolloClient = new ApolloClient({
    uri: graphqlUri,
    cache: new InMemoryCache(),
});

// Create a User Context to share user state across components
export const UserContext = createContext(null);

function App() {
    // Manage the user state with the useState hook
    const [user, setUser] = useState(null);

    return (
        // Provide the Apollo client to the app
        <ApolloProvider client={apolloClient}>
            {/* Share user state with all components */}
            <UserContext.Provider value={{ user, setUser }}>
                {/* Set up routing using react-router-dom */}
                <Router>
                    {/* Display notifications using react-hot-toast */}
                    <Toaster />

                    {/* Define the routes */}
                    <Routes>
                        {/* If the user is logged in, show the Home component */}
                        {user ? (
                            <Route path="/" element={<Home />} />
                        ) : (
                            // If not logged in, redirect to the Login component
                            <Route path="/" element={<Navigate to="/login" />} />
                        )}
                        {/* Always allow access to the Login component */}
                        <Route path="/login" element={<Login />} />
                    </Routes>
                </Router>
            </UserContext.Provider>
        </ApolloProvider>
    );
}

export default App;
