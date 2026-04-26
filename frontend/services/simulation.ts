import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { getUserStocks, totalEntries } from "./user";

// checks risk category for a given stock symbol
export const checkStockRisk = async (symbol: string) => {
    try {
        const response = await axios.get(endpoints.getStockRisk(symbol));
        return response.data;
    } catch (error) {
        handleError(error);
        if (axios.isAxiosError(error)) {
            return error.response?.data || { detail: error.message };
        }
        return { detail: 'Failed to analyse stock' };
    }
};

// simulates the impact of adding a stock to the user's portfolio
export const simulateStockImpact = async (userId: number, symbol: string, quantity: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        // send the existing holdings so the impact can be recalculated
        const currentStocks = stocks.map((s: any) => {
            const { totalShares } = totalEntries(s);
            return {
                symbol: s.symbol,
                quantity: totalShares
            };
        });

        const response = await axios.post(endpoints.simulateStock, {
            current_stocks: currentStocks,
            new_stock: {
                symbol,
                quantity
            }
        });

        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
};