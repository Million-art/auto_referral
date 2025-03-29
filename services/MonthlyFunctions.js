const sequelize = require("../config/db_config");
const Referral = require("../models/Referral");
const WeeklyWinner = require("../models/WeeklyWinner");

// Helper function to clear data
async function clearMonthEndData() {
  const transaction = await sequelize.transaction();
  try {
    // Clear weekly winners table
    await WeeklyWinner.destroy({ 
      truncate: true, 
      transaction 
    });
    
    await Referral.update(
      { referral_status: 'end' },
      { 
        where: {
          referral_status: ['new', 'counted'] 
        },
        transaction 
      }
    );
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error in clearMonthEndData:', error);
    throw error; // Re-throw to handle in the calling function
  }
}
// Helper function to get leaders with contact info
async function getMonthlyLeadersWithContact() {
  return await WeeklyWinner.findAll({
    attributes: ['telegram_id', 'first_name', 'phone', 'referral_count'],
    order: [['referral_count', 'DESC']],
    limit: 3
  });
}

  module.exports = {
    clearMonthEndData,
    getMonthlyLeadersWithContact
  }