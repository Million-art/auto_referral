const { DataTypes } = require('sequelize');
const sequelize = require('../config/db_config'); 

const WeeklyWinner = sequelize.define('WeeklyWinner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  week_number: {
    type: DataTypes.INTEGER,
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
  tableName: 'weekly_winners',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['week_number', 'telegram_id'] },
    { fields: ['week_number'] }
  ]
});

module.exports = WeeklyWinner;
