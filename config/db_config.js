// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.USER,
  process.env.PASSWORD,
  {
    host: process.env.HOST,
    dialect: 'mysql',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false 
  }
);

// Test the connection
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

module.exports = sequelize;