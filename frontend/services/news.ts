import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { getUserStocks } from "./user";

// retrieves stock list for news aggregation
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

// fetches news articles for all user holdings
export const getStockNews = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        console.log('Stocks data:', stocks);
        if (!stocks) throw new Error("No stocks found");

        // collect valid ticker symbols from user holdings
        const symbols = stocks
            .map((stock: any) => stock.symbol)
            .filter((symbol: any) => typeof symbol === 'string' && symbol.length > 0);

        if (symbols.length === 0) return { articles: [] };

        const responses = await Promise.all(
            symbols.map((symbol: string) => axios.get(endpoints.getStockNews(symbol)))
        );

        // combine all stock articles into one list
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

// fetches sentiment analysis for all holdings
export const getStockSentiment = async (userID: number) => {
    try {
        const stocks = await getUserStocks(userID);
        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
            return {};
        }

        // collect valid ticker symbols from user holdings
        const symbols = stocks
            .map((stock: any) => stock.symbol)
            .filter((symbol: any) => typeof symbol === 'string' && symbol.length > 0);

        if (symbols.length === 0) {
            return {};
        }

        const responses = await Promise.all(
            symbols.map((symbol: string) => axios.get(endpoints.getStockSentiment(symbol)))
        );

        // merge each sentiment result into one object
        return responses.reduce((acc: Record<string, any>, response) => {
            return { ...acc, ...(response.data || {}) };
        }, {});
    } catch (error) {
        handleError(error);
        return {};
    }
};

// fetches sentiment for specific stock symbols
export const getSingleStockSentiment = async (symbols: string[]) => {
    try {
        if (!symbols || symbols.length == 0) {
            return {};
        }

        const responses = await Promise.all(
            symbols.map((symbol: string) => axios.get(endpoints.getStockSentiment(symbol)))
        );

        // merge each sentiment result into one object
        return responses.reduce((acc: Record<string, any>, response) => {
            return { ...acc, ...(response.data || {}) };
        }, {});
    } catch (error) {
        handleError(error);
        return {};
    }
};