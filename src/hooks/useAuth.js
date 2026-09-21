import { useContext } from "react";
import { AuthContext } from "../context/authContextInstance";

function useAuth() {
    return useContext(AuthContext);
}

export default useAuth;
