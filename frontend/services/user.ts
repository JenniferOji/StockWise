import axios from "axios";

import { endpoints } from "../constants/endpoints";
import { User } from "../types/user";
import { handleError } from "../utils/handleError";

type DataRes = {data: User};

const aggregateEntries = (s: any) => {
    const entries = s.entries || [];
    const totalShares = entries.reduce((sum: number, e: any) => sum + (e.quantity || 0), 0);
    const avgPrice = totalShares > 0
        ? entries.reduce((sum: number, e: any) => sum + (e.quantity || 0) * (e.purchase_price || 0), 0) / totalShares
        : 0;
    return { totalShares, avgPrice };
};

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

export const addStock = async (
    userId: number,
    symbol: string,
    companyName: string,
    entries: { quantity: number; purchase_price: number }[],
    sector: string
) => {
    try {
        const response = await axios.post(endpoints.addStock, {
            user_id: userId,
            symbol,
            company_name: companyName,
            sector,
            entries
        });
        if (response.data) return response.data;
        return null;
    } catch (error) {
        handleError(error);
        return null;
    }
}

export const updateStock = async (stockId: number, entries: { quantity: number; purchase_price: number }[]) => {
    try {
        const response = await axios.put(endpoints.updateStock, {
            stock_id: stockId,
            entries
        });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
}

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

export const getRiskMetrics = async (userId: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        const formattedStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = aggregateEntries(s);
            return { ticker: s.symbol, shares: totalShares, purchase_price: avgPrice };
        });

        const response = await axios.post(endpoints.getRiskMetrics, { stocks: formattedStocks });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
};

export const getStockRiskCategories = async (userId: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) throw new Error("No stocks found");

        const formattedStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = aggregateEntries(s);
            return { ticker: s.symbol, shares: totalShares, purchase_price: avgPrice };
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

export const getRiskPreference = async(userId: number) => {
    try {        
        const response = await axios.get(endpoints.getRiskPreference, {
            params: { user_id: userId }
        });
        console.log('getRiskPreference full response:', response.data);
        return response.data.risk;
    } catch (error) {
        console.error('getRiskPreference error:', error);
        handleError(error);
        return null;
    }
};

export const getDiversificationSuggestions = async (userID: number) => {
    try {        
        const stocks = await getUserStocks(userID);
        if (!stocks) throw new Error("No stocks found");

        const risk = await getRiskPreference(userID);
        
        const currentStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = aggregateEntries(s);
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
            const { totalShares, avgPrice } = aggregateEntries(s);
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

export const getPerformanceMetrics = async (userId: number, days: number = 365) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        const formattedStocks = stocks.map((s: any) => {
            const { totalShares, avgPrice } = aggregateEntries(s);
            return { ticker: s.symbol, shares: totalShares, purchase_price: avgPrice };
        });

        const response = await axios.post(endpoints.getPerformanceMetrics, { stocks: formattedStocks, days });
        return response.data;
    } catch (error) {
        console.error("Performance metrics error:", error);
        handleError(error);
        return null;
    }
};

export const checkStockRisk = async (symbol: string) => {
    try {
        const response = await axios.post(endpoints.getStockRisk, {
            symbol,
        });
        return response.data;
    } catch (error) {
        handleError(error);
        if (axios.isAxiosError(error)) {
            return error.response?.data || { detail: error.message };
        }
        return { detail: 'Failed to analyse stock' };
    }
};

export const simulateStockImpact = async (userId: number, symbol: string, quantity: number) => {
    try {
        const stocks = await getUserStocks(userId);
        if (!stocks) throw new Error("No stocks found");

        const currentStocks = stocks.map((s: any) => {
            const { totalShares } = aggregateEntries(s);
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