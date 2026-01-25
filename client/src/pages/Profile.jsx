import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles/Profile.css";

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
            try {
                await axios.delete(`${apiUrl}/api/users/delete`, {
                    headers: { "x-auth-token": localStorage.getItem("token") },
                });
                logout();
                navigate("/login");
            } catch (err) {
                alert("Error deleting account");
            }
        }
    };

    return (
        <div className="profile-page">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="profile-container"
            >
                <div className="profile-header">
                    <div className="profile-avatar">
                        {user?.username?.[0].toUpperCase()}
                    </div>
                    <h1>{user?.username}</h1>
                    <p className="user-id">ID: {user?.id}</p>
                </div>

                <div className="profile-card">
                    <div className="info-row">
                        <span className="label">Account Status</span>
                        <span className="value active">Verified</span>
                    </div>
                    <div className="info-row">
                        <span className="label">Joined</span>
                        <span className="value">Jan 2024</span>
                    </div>
                </div>

                <div className="profile-actions">
                    <Link to="/" className="back-btn">Back to Chat</Link>
                    <button onClick={logout} className="logout-btn">Log Out</button>
                    <button onClick={handleDelete} className="delete-btn">Delete Account</button>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
