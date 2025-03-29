const { DataTypes } = require('sequelize');
const sequelize = require('../config/db_config'); 
const ThisWeekWinner = sequelize.define('ThisWeekWinner', {
  telegram_id: {
    type: DataTypes.BIGINT,
    primaryKey: true
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
  tableName: 'this_week_winners',
  timestamps: false
});

module.exports = ThisWeekWinner;
