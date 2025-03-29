const { DataTypes } = require('sequelize');
const sequelize = require('../config/db_config');

const MonthlyWinner = sequelize.define('MonthlyWinner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  month_year: {
    type: DataTypes.STRING, // Format: "June 2023"
    allowNull: false
  },
  telegram_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  referral_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'monthly_winners',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['month_year', 'telegram_id'] },
    { fields: ['month_year'] }
  ]
});

module.exports = MonthlyWinner;