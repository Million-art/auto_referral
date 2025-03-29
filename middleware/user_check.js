const { isUserMemberOfChannel } = require('../helpers/channel');
const { joinChannelMarkup } = require('../helpers/keyboard');
const userService = require('../services/userService');
const referralService = require('../services/referralService');

module.exports = {
  checkChannelMembershipAndHandle: async (ctx) => {
    if (!ctx.from?.id) return;
    
    try {
      const isMember = await isUserMemberOfChannel(ctx, ctx.from.id);
      return isMember
        ? referralService.sendReferralLink(ctx)
        : ctx.reply('Please join our channel:', joinChannelMarkup);
    } catch (error) {
      console.error('Channel check error:', error);
      return ctx.reply('An error occurred. Please try again.');
    }
  },

  handleStartWithReferral: async (ctx) => {
    if (!ctx.payload) return;
    
    const referralNum = ctx.payload;
    const isRegistered = await userService.isUserAlreadyRegistered(ctx.from.id);
    
    if (isRegistered) {
      return ctx.reply("You have already registered.");
    }

    const isValid = await isUserMemberOfChannel(ctx, Number(referralNum));
    return isValid
      ? referralService.regUserWithReferralNumber(ctx, referralNum)
      : ctx.reply("Invalid referral link.");
  }
};