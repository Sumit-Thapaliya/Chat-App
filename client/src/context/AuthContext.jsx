import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                // Here we could verify token with backend, for now decode or assume valid
                // Ideally call /api/auth/me or similar. 
                // For simplicity, we just use the stored user info if available or decode
                // For now, let's just rely on if token exists. 
                // A robust app would verify token validity.
                const storedUser = localStorage.getItem("user");
                if (storedUser) setUser(JSON.parse(storedUser));
            }
            setLoading(false);
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
            {children}
        </AuthContext.Provider>
    );
};
