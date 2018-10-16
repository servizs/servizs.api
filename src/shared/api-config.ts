import { config } from "../enviornment/enviornment";

export const headers = {
    "Access-Control-Allow-Origin": "*", // Required for CORS support to work,
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Headers": "application/json"
  };

  export const DbTable = {
      Address: `Address_${config.enviornment}`,
      UserProfile: `User_Profle_${config.enviornment}`,
      UserAdditionalInfo: `User_Profle_Additional_Info_${config.enviornment}`,
      Reviews: `Reviews_${config.enviornment}`
  }