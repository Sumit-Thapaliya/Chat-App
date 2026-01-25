import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles/Auth.css";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await login(username, password);
            navigate("/");
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.msg || "Server error. Is MongoDB running?";
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="mesh-bg"></div>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="auth-container"
            >
                <div className="auth-logo">
                    💬
                </div>
                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Great to see you again!</p>

                {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-error">{error}</motion.div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Type your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Authenticating..." : "Sign In"}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>New here?</span>
                    <Link to="/register">Create an account</Link>
                </div>
            </motion.div>
        </div>
    );
};


export default Login;
