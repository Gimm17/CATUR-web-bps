import axios from '../api/axios';

const API_URL = '/daerah';

export const getDaerah = async () => {
  try {
    console.log("Fetching data from:", API_URL);
    const response = await axios.get(API_URL);
    console.log("Response dari API:", response);
    console.log("Data dari API:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in getDaerah service:", error);
    console.error("Error response:", error.response);
    console.error("Error message:", error.message);
    throw error;
  }
};

export const getDaerahById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in getDaerahById:", error);
    throw error;
  }
};

export const createDaerah = async (data) => {
  try {
    const response = await axios.post(API_URL, data);
    return response.data;
  } catch (error) {
    console.error("Error in createDaerah:", error);
    throw error;
  }
};

export const updateDaerah = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error in updateDaerah:", error);
    throw error;
  }
};

export const deleteDaerah = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in deleteDaerah:", error);
    throw error;
  }
};
