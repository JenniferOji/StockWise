import axios from "axios";

import { endpoints } from "../constants/endpoints";
import { User } from "../types/user";
import { handleError } from "../utils/handleError";

type DataRes = {data: User};

export const registerUser = async(
    username: string,
    email: string,
    password: string  
    )=> {
        try {
            const {data}: DataRes = await axios.post(endpoints.register, {
                username,
                email,
                password
            });
            // if there is data present return it
            if (data) return data;
        }catch (error) {
            handleError(error);
    }
}

export const loginUser = async (email: string, password: string) => {
    try {
        // send post request to server login endpoint with email and password 
        const {data}: DataRes = await axios.post(endpoints.login, { 
            email,
            password
        }); 
        if (data) return data;

        return null;
    } catch (error) {
        handleError(error);
    }
}

