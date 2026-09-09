import axios from "../api/axios";

export const getProfil = async () => {
  const res = await axios.get("/user/profil");
  return res.data;
};

export const getAllUsers = async () => {
  const res = await axios.get("/user/all");
  return res.data;
};

export const createUser = async (data) => {
  const res = await axios.post("/user/", data);
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await axios.put(`/user/${id}`, data);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await axios.delete(`/user/${id}`); // SESUAIKAN DENGAN ROUTE
  return res.data;
};