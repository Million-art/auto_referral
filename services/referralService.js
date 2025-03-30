const sequelize = require('../config/db_config');
const { BOT_URL, CARD_IMAGE_URL, } = require('../constants');
const User = require('../models/User');
const Referral = require('../models/Referral');
const { joinChannelMarkup } = require('../helper/keyboard');
const CAPTION = `
    Jeetoo Rs 100,000 Har Mahine Vikrant Exchange par!

    Yeh message apne doston ke saath share karo aur har referral par RS 20 bonus pao! Aur jo top 3 users sabse zyada referrals karenge, unhe milega RS 100,000 har mahine Vikrant Exchange par!

    Sabse pehle neeche diye gaye link par click karo: 

    Phir Start par click karo.

    Join Channel par click karo.

    Phir BOT par wapas jao.

    Share ⤴️ symbol ka use karke apne doston aur family ke saath share karo.

    Jitna zyada aap share karenge, utna hi zyada aapke chances badhenge leaderboard par aane ke aur jeetne ke liye RS 100,000 har mahine top 3 referrers ko!

    Abhi share karna shuru karo aur jeetne ke apne chances badhao!
  `
// Function to generate referral link
const getReferralLink = (ctx) => {
  return `${BOT_URL}?start=${ctx.from.id}`;
};

// Function to send referral link
const sendReferralLink = async (ctx) => {
  try {
    const userReferralLink = getReferralLink(ctx);
    const imageCaption = `${CAPTION}\n\n🔗 Your referral link:\n<code>${userReferralLink}</code>`;

    console.log("Sending photo with caption:", imageCaption); 
    
    await ctx.replyWithPhoto(CARD_IMAGE_URL, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: "Check how many users you referred",
            callback_data: "referred_users_number"
          }]
        ]
      },
      caption: imageCaption,
      parse_mode: "HTML" 
    });
  } catch (error) {
    console.error('Error sending referral link:', error);
    throw new Error('Failed to send referral link');
  }
};

// Function to register user with a referral number
const regUserWithReferralNumber = async (ctx, referralNum) => {
  if (Number(referralNum) === ctx.from.id) {
    throw new Error("You cannot refer yourself.");
  }

  const transaction = await sequelize.transaction();
  try {
    // Create user if not exists
    await User.findOrCreate({
      where: { telegram_id: ctx.from.id },
      defaults: {
        first_name: ctx.from.first_name || 'Unknown'
      },
      transaction
    });

    // Create referral record
    await Referral.create({
      telegram_id: referralNum,
      referred_id: ctx.from.id,
      referral_status: 'new'
    }, { transaction });

    await transaction.commit();

    return ctx.reply(
      'Join the channel to complete the process:',
      { ...joinChannelMarkup, parse_mode: "HTML" }
    );
  } catch (error) {
    await transaction.rollback();
    console.error('Referral registration error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("You have already been referred.");
    }
    throw new Error("An error occurred. Please try again.");
  }
};


module.exports = {
  getReferralLink,
  sendReferralLink,
  regUserWithReferralNumber,
};
