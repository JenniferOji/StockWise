import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { getUserStocks } from "./user";

export const getNews = async (userId: number) => {
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

export const getStockNews = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        console.log('Stocks data:', stocks);
        if (!stocks) throw new Error("No stocks found");
        // send all the users stock holdings 
        const currentStocks = stocks.map((stock: any) => ({
            name: stock.company_name,
        }));
        console.log('Current stocks to send:', currentStocks);
        
        const response = await axios.post(endpoints.getStockNews, {
            current_stocks: currentStocks,
        });
        return response.data;

    } catch (error) {
        handleError(error);
        return null;
    }
};

export const getStockSentiment = async (userID: number) => {
    try {
        const stocks = await getUserStocks(userID);
        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
            return {};
        }

        const currentStocks = stocks.map((stock: any) => ({
            name: stock.company_name,
        }));

        const response = await axios.post(endpoints.getStockSentiment, {
            current_stocks: currentStocks,
        });
        return response.data;
    } catch (error) {
        handleError(error);
        return {};
    }
};

export const getSingleStockSentiment = async (symbols: string[]) => {
    try {
        if (!symbols || symbols.length == 0) {
            return {};
        }

        const response = await axios.post(endpoints.getStockSentiment, {
            names: symbols, 
        });

        return response.data;
    } catch (error) {
        handleError(error);
        return {};
    }
};