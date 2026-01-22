import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
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
            <div className="profile-container">
                <h2>Account Settings</h2>
                <div className="profile-info">
                    <p><strong>Username</strong> <span>{user?.username}</span></p>
                    <p><strong>User ID</strong> <span>{user?.id}</span></p>
                </div>
                <div className="profile-actions">
                    <Link to="/" className="back-btn">Back to Chat</Link>
                    <button onClick={logout} className="logout-btn">Log Out</button>
                    <button onClick={handleDelete} className="delete-btn">Delete Account</button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
