const sequelize = require('../config/db_config');
const { BOT_URL, CARD_IMAGE_URL } = require('../constants');
const caption = require('../assets/caption');
const User = require('../models/User');
const Referral = require('../models/Referral');
const { joinChannelMarkup } = require('../helper/keyboard');

// Function to generate referral link
const getReferralLink = (ctx) => {
  return `${BOT_URL}?start=${ctx.from.id}`;
};

// Function to send referral link
const sendReferralLink = async (ctx) => {
  try {
    const userReferralLink = getReferralLink(ctx);
    const imageCaption = `${caption.message}${userReferralLink}`;

    await ctx.replyWithPhoto(CARD_IMAGE_URL, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: "Check how many users you referred",
            callback_data: "referred_users_number"
          }]
        ]
      },
      caption: imageCaption
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
