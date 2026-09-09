const User = require('../models/user.model');

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const createUser = async (data) => {
  return await User.create(data);
};

module.exports = { findByEmail, createUser };
