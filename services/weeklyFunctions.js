const { sequelize } = require("../config/db_config");
const { ADMIN, CHANNEL_ID } = require("../constants");
const WeeklyWinner = require("../models/WeeklyWinner");
const ThisWeekWinner = require("../models/ThisWeekWinner");
const Referral = require("../models/Referral");
const {REFERRAL_COUNT} = require("../constants");

async function archiveCurrentWeek(transaction) {
  const weekNumber = getCurrentWeek();
  
  const winners = await ThisWeekWinner.findAll({ transaction });

  if (winners.length > REFERRAL_COUNT) {
    await WeeklyWinner.bulkCreate(
      winners.map(winner => ({
        week_number: weekNumber,
        telegram_id: winner.telegram_id,
        first_name: winner.first_name,
        phone: winner.phone,
        referral_count: winner.referral_count
      })),
      { transaction }
    );
  }

  return weekNumber;
}

async function clearOldWeeklyData() {
  await ThisWeekWinner.destroy({ truncate: true });
}

function getCurrentWeek() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const weekNumber = Math.ceil(daysPassed / (daysInMonth / 4));
  
  return weekNumber; 
}


async function addWinnerToThisWeekTable(ctx, validReferralCount) {
  const userId = ctx.from.id;
  const userFirstName = ctx.from.first_name;
  const phoneNumber = ctx.message?.contact?.phone_number;

  if (!phoneNumber) {
    ctx.reply("Phone number is required.");
    return;
  }

  try {
    // Check if user already exists in this week's winners
    const [winner, created] = await ThisWeekWinner.findOrCreate({
      where: { telegram_id: userId },
      defaults: {
        first_name: userFirstName,
        phone: phoneNumber,
        referral_count: validReferralCount  
      }
    });

    if (!created) {
      // If user already existed, update their count
      await winner.update({ referral_count: validReferralCount }); 
      console.log(`Updated referral_count to ${validReferralCount} for user ${userId}`);
    }

    if (validReferralCount > 0) {
      ctx.reply(`Congratulations! You've been ${created ? 'added to' : 'updated in'} this week's winners with ${validReferralCount} valid referrals.`);
    } else {
      ctx.reply("You currently have no valid referrals this week.");
    }

  } catch (error) {
    console.error("Error in addWinnerToThisWeekTable:", error);
    ctx.reply("There was an issue processing your request. Please try again later.");
    ctx.telegram.sendMessage(ADMIN, `Error: ${error.message}`);
  }
}

 

module.exports = {
  archiveCurrentWeek,
  clearOldWeeklyData,
  addWinnerToThisWeekTable,
  getCurrentWeek,
};