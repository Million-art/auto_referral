const { CHANNEL_ID } = require('../constants');

module.exports = {
  isUserMemberOfChannel: async (ctx, userId) => {
    // Check if the method exists
    if (!ctx.telegram || typeof ctx.telegram.getChatMember !== 'function') {
      console.error('getChatMember method not available');
      return false;
    }

    console.log(`Checking membership for user ${userId} in channel ${CHANNEL_ID}`);

    try {
      const response = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
      console.log(`User ${userId} status: ${response.status}`);
      return ['member', 'administrator', 'creator'].includes(response.status);
    } catch (error) {
      console.error('Member check error:', error);

      // Handle specific Telegram API errors
      if (error.response) {
        switch (error.response.error_code) {
          case 400:
            console.error(`User ${userId} not found in channel`);
            return false;
          case 403:
            console.error('Bot needs admin rights in the channel');
            return false;
          case 404:
            console.error('Channel not found. Check CHANNEL_ID.');
            return false;
          default:
            console.error(`Unknown error: ${error.response.error_code}`);
            return false;
        }
      }
      return false;
    }
  }
};