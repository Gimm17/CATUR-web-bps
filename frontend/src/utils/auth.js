const isSensitiveUserField = (key) => /(password|token|secret)/i.test(String(key));

export const sanitizeStoredUser = (user) => {
  if (!user || typeof user !== "object" || Array.isArray(user)) return user;

  return Object.fromEntries(
    Object.entries(user).filter(([key]) => !isSensitiveUserField(key))
  );
};

export const getUser = () => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  const user = sanitizeStoredUser(JSON.parse(storedUser));
  localStorage.setItem("user", JSON.stringify(user));
  return user;
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const isAuthenticated = () => {
  return !!getToken();
};
