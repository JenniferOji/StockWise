import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";

// aggregates multiple stock purchases into total position
export const totalEntries = (s: any) => {
    // combine multiple buys into one total position
    const entries = s.entries || [];
    const totalShares = entries.reduce((sum: number, e: any) => sum + (e.quantity || 0), 0);
    const avgPrice = totalShares > 0
        ? entries.reduce((sum: number, e: any) => sum + (e.quantity || 0) * (e.purchase_price || 0), 0) / totalShares
        : 0;
    return { totalShares, avgPrice };
};

// creates new user account with credentials and risk preference
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
            // return created user when signup works
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

// authenticates user and returns session data
export const loginUser = async (email: string, password: string) => {
    try {
        // send login details to server
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


// retrieves all stocks in user portfolio
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

// retrieves user's saved risk preference
export const getRiskPreference = async(userId: number) => {
    try {        
        // fetch saved risk preference for suggestions
        const response = await axios.get(endpoints.getRiskPreference(userId));
        console.log('getRiskPreference full response:', response.data);
        return response.data.risk;
    } catch (error) {
        console.error('getRiskPreference error:', error);
        handleError(error);
        return null;
    }
};
