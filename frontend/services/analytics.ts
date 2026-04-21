import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { totalEntries, getUserStocks } from "./user";

// fetches portfolio risk metrics from backend
export const getRiskMetrics = async (userId: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        // reshape holdings into api format
        const formattedStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = totalEntries(s);
            return { symbol: s.symbol, shares: totalShares, purchase_price: avgPrice };
        });

        const response = await axios.post(endpoints.getRiskMetrics, { stocks: formattedStocks });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
};


// fetches stocks grouped by risk classification
export const getStockRiskCategories = async (userId: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) throw new Error("No stocks found");

        // reshape holdings into api format
        const formattedStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = totalEntries(s);
            return { symbol: s.symbol, shares: totalShares, purchase_price: avgPrice };
        });

        console.log("Calling endpoint:", endpoints.getStockRiskCategories);
        const response = await axios.post(endpoints.getStockRiskCategories, { stocks: formattedStocks });
        console.log("RAW AXIOS RESPONSE:", response.data);
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
};


// fetches portfolio performance metrics over specified period
export const getPerformanceMetrics = async (userId: number, days: number = 365) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        // reshape holdings into api format
        const formattedStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = totalEntries(s);
            return { symbol: s.symbol, shares: totalShares, purchase_price: avgPrice };        });

        const response = await axios.post(endpoints.getPerformanceMetrics, { stocks: formattedStocks, days });
        return response.data;
    } catch (error) {
        console.error("Performance metrics error:", error);
        handleError(error);
        return null;
    }
};