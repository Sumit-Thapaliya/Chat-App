import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    const storedUser = localStorage.getItem("user");
                    if (storedUser) {
                        try {
                            setUser(JSON.parse(storedUser));
                        } catch (e) {
                            console.error("Failed to parse stored user", e);
                            localStorage.removeItem("user");
                            localStorage.removeItem("token");
                        }
                    }
                }
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, []);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const login = async (username, password) => {
        const res = await axios.post(`${apiUrl}/api/auth/login`, { username, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    };

    const register = async (username, password) => {
        const res = await axios.post(`${apiUrl}/api/auth/register`, { username, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user)); // Auto login behavior
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {loading ? (
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    Loading...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
