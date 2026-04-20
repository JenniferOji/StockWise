import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";

export const totalEntries = (s: any) => {
    const entries = s.entries || [];
    const totalShares = entries.reduce((sum: number, e: any) => sum + (e.quantity || 0), 0);
    const avgPrice = totalShares > 0
        ? entries.reduce((sum: number, e: any) => sum + (e.quantity || 0) * (e.purchase_price || 0), 0) / totalShares
        : 0;
    return { totalShares, avgPrice };
};

export const registerUser = async(
    username: string,
    email: string,
    password: string,
    risk: string
    )=> {
        try {
            console.log('Attempting registration to:', endpoints.register);
            const response = await axios.post(endpoints.register, {
                username,
                email,
                password,
                risk
            });
            console.log('Registration response:', response);
            // if there is data present return it
            if (response.data) return response.data;
            return null;
        }catch (error) {
            console.error('Registration error details:', error);
            if (axios.isAxiosError(error)) {
                console.error('Network error:', error.message);
                console.error('Response status:', error.response?.status);
                console.error('Response data:', error.response?.data);
            }
            handleError(error);
            return null;
    }
}

export const loginUser = async (email: string, password: string) => {
    try {
        // send post request to server login endpoint with email and password 
        const response = await axios.post(endpoints.login, { 
            email,
            password
        }); 
        if (response.data) return response.data;

        return null;
    } catch (error) {
        handleError(error);
        return null;
    }
}


export const getUserStocks = async (userId: number) => {
    try {
        console.log('Getting stocks for user ID:', userId);
        console.log('Endpoint:', endpoints.getStocks(userId));
        const response = await axios.get(endpoints.getStocks(userId));
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('getUserStocks error:', error);
        handleError(error);
        return null;
    }
}

export const getRiskPreference = async(userId: number) => {
    try {        
        const response = await axios.get(endpoints.getRiskPreference(userId));
        console.log('getRiskPreference full response:', response.data);
        return response.data.risk;
    } catch (error) {
        console.error('getRiskPreference error:', error);
        handleError(error);
        return null;
    }
};
