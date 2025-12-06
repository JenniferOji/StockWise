import { createContext } from "react";

import type { User } from "./types/user";

export const AuthContextType = createContext<{
    user: User | null;
    setUser: (user: User | null) => void;   
}>({
    user:null,
    setUser: (user: User | null) => {},
});

// keep compatibility with imports expecting `AuthContext`
export const AuthContext = AuthContextType;