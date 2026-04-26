import axios from "axios";

import {ErrorRes} from "../types/error";

export const handleError = (error: unknown) => {
    // if theres an axios error and a response exists return the alert and the detail from it
  if (axios.isAxiosError(error)) {
    if (error.response) return alert((error.response.data as ErrorRes).detail); 
    
    return alert(error.message);
  }
};