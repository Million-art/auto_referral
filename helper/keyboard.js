const { CHANNEL_URL } = require('../constants');

module.exports = {
  joinChannelMarkup: {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Join Channel", url: CHANNEL_URL }],
        [{ text: "Continue ➡", callback_data: "get_my_referral" }]
      ]
    }
  }
};