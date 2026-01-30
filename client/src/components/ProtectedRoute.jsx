import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
    const { user } = useContext(AuthContext);

    // AuthProvider already handles the 'loading' state and doesn't render children until loaded.
    // So if we are here, loading is complete.

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
