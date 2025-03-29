const { DataTypes } = require('sequelize');
const sequelize = require('../config/db_config'); 

const Referral = sequelize.define('Referral', {
  telegram_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  referred_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true
  },
  referral_status: {
    type: DataTypes.ENUM('new', 'counted', 'end'),
    defaultValue: 'new',
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'referrals',
  indexes: [
    { fields: ['referral_status'] },
    { fields: ['telegram_id', 'referred_id'] }
  ]
});

module.exports = Referral;
