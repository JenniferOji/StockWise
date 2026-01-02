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
            console.log('Attempting registration to:', endpoints.register);
            const response = await axios.post(endpoints.register, {
                username,
                email,
                password
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

export const addStock = async (userId: number, symbol: string, companyName: string, quantity: number) => {
    try {
        const response = await axios.post(endpoints.addStock, {
            user_id: userId,
            symbol,
            company_name: companyName,
            quantity
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
        console.log('Endpoint:', endpoints.getStocks);
        const response = await axios.get(endpoints.getStocks, {
            params: { user_id: userId }
        });
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('getUserStocks error:', error);
        handleError(error);
        return null;
    }
}
export const updateStock = async (stockId: number, quantity: number) => {
    try {
        const response = await axios.put(endpoints.updateStock, {
            stock_id: stockId,
            quantity
        });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
}

export const deleteStock = async (stockId: number) => {
    try {
        const response = await axios.delete(endpoints.deleteStock, {
            params: { stock_id: stockId }
        });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
}
