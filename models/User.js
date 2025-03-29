const { DataTypes } = require('sequelize');
const sequelize = require('../config/db_config');

const User = sequelize.define('User', {
  telegram_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'users',
  underscored: true
});

 

module.exports = User;