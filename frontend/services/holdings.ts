import axios from "axios";
import { endpoints } from "../constants/endpoints";
import { handleError } from "../utils/handleError";

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