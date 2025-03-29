const { CHANNEL_ID } = require('../constants');

module.exports = {
  isUserMemberOfChannel: async (ctx, userId) => {
    // Check if the method exists (unlikely to fail in telegraf, but good practice)
    if (!ctx.telegram || typeof ctx.telegram.getChatMember !== 'function') {
      console.error('getChatMember method not available');
      return false;
    }

    try {
      const response = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
      return ['member', 'administrator', 'creator'].includes(response.status);
    } catch (error) {
      console.error('Member check error:', error.message);

      // Handle specific Telegram API errors
      if (error.response) {
        switch (error.response.error_code) {
          case 400:
            // User not found in channel
            return false;
          case 403:
            // Bot is not an admin in the channel
            console.error('Bot needs admin rights in the channel');
            return false;
          case 404:
            // Chat not found (wrong CHANNEL_ID)
            console.error('Channel not found. Check CHANNEL_ID.');
            return false;
        }
      }
      return false;
    }
  }
};