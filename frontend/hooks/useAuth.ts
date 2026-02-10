import { useContext } from "react"; 
import { AuthContext } from "../context";
import { User } from "../types/user";
import { storage } from "../utils/storage";

export const useAuth = () => {
    const {user, setUser} = useContext<{ user: User | null; setUser: (user: User | null) => void }>(AuthContext);
    const queryClient = { clear: () => {} };

    const login = (user: User) => {
        let stringUser = JSON.stringify(user);
        setUser(user);
        storage.setItem("user", stringUser);
    }

    const logout = () => {
        setUser(null);
        storage.removeItem("user");
        queryClient.clear();
    }
    return { user, login, logout };
}
