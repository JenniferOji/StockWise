import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { getUserStocks, totalEntries } from "./user";

export const checkStockRisk = async (symbol: string) => {
    try {
        const response = await axios.get(endpoints.getStockRisk(symbol));
        return response.data;
    } catch (error) {
        handleError(error);
        if (axios.isAxiosError(error)) {
            // keep api error detail so ui can show useful feedback
            return error.response?.data || { detail: error.message };
        }
        return { detail: 'Failed to analyse stock' };
    }
};

export const simulateStockImpact = async (userId: number, symbol: string, quantity: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        // send existing holdings so impact can be recalculated
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