import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";
import { totalEntries, getRiskPreference, getUserStocks } from "./user";

const normalizeRiskPreference = (risk?: string | null) => {
    const normalized = (risk || "").trim().toLowerCase();

    if (normalized === "very low risk" || normalized === "very low") return "Very Low Risk";
    if (normalized === "low risk" || normalized === "low") return "Low Risk";
    if (normalized === "moderate risk" || normalized === "moderate" || normalized === "medium") return "Moderate Risk";
    if (normalized === "high risk" || normalized === "high") return "High Risk";
    if (normalized === "very high risk" || normalized === "very high") return "Very High Risk";

    return "Moderate Risk";
};

export const getDiversificationSuggestions = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        if (!stocks) throw new Error("No stocks found");

        const rawRisk = await getRiskPreference(userID);
        const risk = normalizeRiskPreference(rawRisk);
        
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

        const rawRisk = await getRiskPreference(userID);
        const risk = normalizeRiskPreference(rawRisk);
        
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