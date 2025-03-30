// models/associations.js
const User = require('./User');
const Referral = require('./Referral');
const WeeklyWinner = require('./WeeklyWinner');
const ThisWeekWinner = require('./ThisWeekWinner');
const MonthlyWinner = require('./MonthlyWinner');

const setupAssociations = async (sequelize) => {
  try {
    // Define associations
    User.hasMany(Referral, {
      foreignKey: 'telegram_id',
      sourceKey: 'telegram_id'
    });

    Referral.belongsTo(User, {
      foreignKey: 'telegram_id',
      targetKey: 'telegram_id'
    });

    WeeklyWinner.belongsTo(User, {
      foreignKey: 'telegram_id',
      targetKey: 'telegram_id'
    });

    ThisWeekWinner.belongsTo(User, {
      foreignKey: 'telegram_id',
      targetKey: 'telegram_id'
    });

    MonthlyWinner.belongsTo(User, {
        foreignKey: 'telegram_id',
        targetKey: 'telegram_id'
      });
    // Sync all models with database
    await sequelize.sync({ alter: false });
    console.log('Database synchronized with models');
    
    return true;
  } catch (error) {
    console.error('Error setting up associations:', error);
    throw error;
  }
};

module.exports = setupAssociations;