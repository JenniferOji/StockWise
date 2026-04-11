import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { totalEntries, getRiskPreference, getUserStocks } from "./user";

export const getDiversificationSuggestions = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        if (!stocks) throw new Error("No stocks found");

        const risk = await getRiskPreference(userID);
        
        const currentStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = totalEntries(s);
            return { symbol: s.symbol, sector: s.sector, quantity: totalShares, purchase_price: avgPrice };
        });
        
        const response = await axios.post(endpoints.getDiversificationSuggestions, {
            current_stocks: currentStocks,
            user_risk_preference: risk
        });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
};

export const getRandomSuggestions = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        if (!stocks) throw new Error("No stocks found");

        const risk = await getRiskPreference(userID);
        
        const currentStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = totalEntries(s);
            return { symbol: s.symbol, sector: s.sector, quantity: totalShares, purchase_price: avgPrice };
        });
        
        const response = await axios.post(endpoints.getRandomSuggestions, {
            current_stocks: currentStocks,
            user_risk_preference: risk
        });

        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
};