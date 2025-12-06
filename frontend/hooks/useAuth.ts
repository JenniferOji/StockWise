import { useContext } from "react"; 
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from "../context";
import { User } from "../types/user";

export const useAuth = () => {
    const {user, setUser} = useContext<{ user: User | null; setUser: (user: User | null) => void }>(AuthContext);
    const queryClient = { clear: () => {} };

    const login = (user: User) => {
        let stringUser = JSON.stringify(user);
        setUser(user);
        try {
            const setItem = (SecureStore as any).setItemAsync;
            if (typeof setItem === 'function') {
                setItem("user", stringUser);
            } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
                (globalThis as any).localStorage.setItem('user', stringUser);
            }
        } catch (e) {
        }
    }

    const logout = () => {
        setUser(null);
        try {
            const del = (SecureStore as any).deleteItemAsync;
            if (typeof del === 'function') {
                del("user");
            } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
                (globalThis as any).localStorage.removeItem('user');
            }
        } catch (e) {
        }
        queryClient.clear();
    }
    return { user, login, logout };
}
