import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { getUserStocks } from "./user";

export const getNews = async (userId: number) => {
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

export const getStockNews = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        console.log('Stocks data:', stocks);
        if (!stocks) throw new Error("No stocks found");
        const symbols = stocks
            .map((stock: any) => stock.symbol)
            .filter((symbol: any) => typeof symbol === 'string' && symbol.length > 0);

        if (symbols.length === 0) return { articles: [] };

        const responses = await Promise.all(
            symbols.map((symbol: string) => axios.get(endpoints.getStockNews(symbol)))
        );

        const mergedArticles = responses.flatMap((response) => response.data?.articles || []);

        return {
            success: true,
            articles: mergedArticles,
            count: mergedArticles.length,
        };

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

        const symbols = stocks
            .map((stock: any) => stock.symbol)
            .filter((symbol: any) => typeof symbol === 'string' && symbol.length > 0);

        if (symbols.length === 0) {
            return {};
        }

        const responses = await Promise.all(
            symbols.map((symbol: string) => axios.get(endpoints.getStockSentiment(symbol)))
        );

        return responses.reduce((acc: Record<string, any>, response) => {
            return { ...acc, ...(response.data || {}) };
        }, {});
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

        const responses = await Promise.all(
            symbols.map((symbol: string) => axios.get(endpoints.getStockSentiment(symbol)))
        );

        return responses.reduce((acc: Record<string, any>, response) => {
            return { ...acc, ...(response.data || {}) };
        }, {});
    } catch (error) {
        handleError(error);
        return {};
    }
};