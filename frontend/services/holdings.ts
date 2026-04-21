import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";

// adds new stock to user portfolio
export const addStock = async (
    userId: number,
    symbol: string,
    companyName: string,
    entries: { quantity: number; purchase_price: number }[],
    sector: string
) => {
    try {
        const response = await axios.post(endpoints.addStock(userId), {
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

// updates existing stock holdings and prices
export const updateStock = async (userId: number, stockId: number, entries: { quantity: number; purchase_price: number }[]) => {
    try {
        const response = await axios.patch(endpoints.updateStock(userId, stockId), {
            entries
        });
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
}

// removes stock from user portfolio
export const deleteStock = async (userId: number, stockId: number) => {
    try {
        const response = await axios.delete(endpoints.deleteStock(userId, stockId));
        return response.data;
    } catch (error) {
        handleError(error);
        return null;
    }
}