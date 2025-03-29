require("dotenv").config();
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
const { addWinnerToThisWeekTable,archiveCurrentWeek,clearOldWeeklyData, getCurrentWeek} =  require("./services/weeklyFunctions.js");
const { isUserMemberOfChannel } = require("./helper/channel.js");
const { isUserAlreadyRegistered, registerUser, countMyWeeklyReferrals, getCurrentLeaderboard } = require("./services/user.js");
const { regUserWithReferralNumber } = require("./services/referralService.js");
const { ADMIN, REFERRAL_COUNT } = require("./constants.js");
const sequelize = require("./config/db_config.js");
const Referral = require("./models/Referral.js");
const ThisWeekWinner = require("./models/ThisWeekWinner.js");
const setupAssociations = require('./models/index.js');
const MonthlyWinner = require("./models/MonthlyWinner.js");
const { clearMonthEndData, getMonthlyLeadersWithContact } = require("./services/MonthlyFunctions.js");

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Setup associations and sync
    await setupAssociations(sequelize);
    
    // Start your bot 
    bot.launch();

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();

bot.start(async (ctx) => {
  if (ctx.payload) {
    const referralNumber = ctx.payload;
    console.log(referralNumber)
    // check if the referral code owner(user) is in the channel
    const isReferralIdValid = await isUserMemberOfChannel(
      ctx,
      Number(referralNumber)
    );
    const isReferredUserAlreadyRegistered = await isUserAlreadyRegistered(
      Number(ctx.from.id)
    );
    if (isReferralIdValid && !isReferredUserAlreadyRegistered) {
      // if valid to refer
      await regUserWithReferralNumber(ctx, referralNumber);
      console.log(isReferredUserAlreadyRegistered)
      return;
    } else if (isReferredUserAlreadyRegistered) {
      // if referred user is already in the channel
      ctx.reply("You have already registered, you cannot be referred");
      return;
    }
  }
  await registerUser(ctx);
});

bot.on("callback_query", async (ctx) => {
  if (ctx.callbackQuery.data === "get_my_referral") {
    ctx.deleteMessage();
    await registerUser(ctx);
    ctx.answerCbQuery("");
  } else if (ctx.callbackQuery.data === "joined_channel") {
    ctx.deleteMessage();
    await registerUser(ctx);
    ctx.answerCbQuery("");
  } else if (ctx.callbackQuery.data === "referred_users_number") {
    countMyWeeklyReferrals(ctx);
  }
});
 
 // Admin command to prompt users  to share contact
 bot.command('share_contact', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN) {
    return ctx.reply("🚫 Only admin can use this command");
  }

  try {
    const eligibleUsers = await Referral.findAll({
      attributes: [
        'telegram_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'referral_count']
      ],
      where: { referral_status: 'new' },
      group: ['telegram_id'],
      having: sequelize.literal(`COUNT(*) >= ${REFERRAL_COUNT}`) 
    });

    if (eligibleUsers.length === 0) {
      return ctx.reply("No users currently qualify (need ≥2 new referrals)");
    }

    // Send contact request to each eligible user
    for (const user of eligibleUsers) {
      try {
        await ctx.telegram.sendMessage(
          user.telegram_id,
          "Congratulations! You have qualified for rewards with your referrals. Please share your contact information:",
          {
            reply_markup: {
              keyboard: [
                [{
                  text: "📱 Share Contact",
                  request_contact: true
                }]
              ],
              one_time_keyboard: true
            }
          }
        );
      } catch (sendError) {
        console.error(`Failed to message user ${user.telegram_id}:`, sendError);
      }
    }

    ctx.reply(`✅ Contact requests sent to ${eligibleUsers.length} eligible users`);

  } catch (error) {
    console.error('Error in share_contact:', error);
    ctx.reply("❌ Failed to process command. Please try again.");
  }
});

// Handle contact sharing (for all users)
bot.on("contact", async (ctx) => {
  // Verify the contact belongs to the sender
  if (ctx.message.contact.user_id !== ctx.from.id) {
    return ctx.reply("Please share your own contact information.");
  }

  try {
    // Get all referrals for this user
    const referrals = await Referral.findAll({
      where: { 
        telegram_id: ctx.from.id,
        referral_status: 'new'
      }
    });

    let validReferralCount = 0;

    // Check each referred user's channel membership
    for (const referral of referrals) {
      console.log('aaaaaaa',referral.referred_id)
      const isMember = await isUserMemberOfChannel(ctx, referral.referred_id);
      
      if (isMember) {
        validReferralCount++;
      } else {
        // Mark non-members as 'end' status
        await Referral.update(
          { referral_status: 'end' },
          { where: { id: referral.id } }
        );
      }
    }

    if (validReferralCount >= REFERRAL_COUNT) {
      await ctx.reply(
        `Thank you, ${ctx.from.first_name}! Admin will contact you soon about your ${validReferralCount} valid referrals.`,
        { reply_markup: { remove_keyboard: true } }
      );
      
      // Add to winners table
      await addWinnerToThisWeekTable(ctx, validReferralCount);
      
      // Notify admin
      await ctx.telegram.sendMessage(
        ADMIN,
        `📞 New contact from ${ctx.from.first_name} (${ctx.message.contact.phone_number})\n` +
        `They have ${validReferralCount} valid referrals.`
      );
    } else {
      await ctx.reply(
        `You only have ${validReferralCount} valid referrals (need ${REFERRAL_COUNT}). Keep sharing your link!`,
        { reply_markup: { remove_keyboard: true } }
      );
    }
  } catch (error) {
    console.error('Error processing contact:', error);
    await ctx.reply("An error occurred. Please try again later.");
  }
});

// Command: /end_week - Archives current week and prepares for new week
bot.command('end_week', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN) {
    return ctx.reply("🚫 Only admin can end the week");
  }

  // Send processing message
  const processingMsg = await ctx.reply("⏳ Processing week closure... Please wait");
  
  const transaction = await sequelize.transaction();
  
  try {
    // Step 1: Get current winners and archive them
    const winners = await ThisWeekWinner.findAll({ transaction });
    const weekNumber = await archiveCurrentWeek(transaction);

    if (winners.length === 0) {
      await transaction.rollback();
      await ctx.telegram.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        null,
        "ℹ️ No winners found this week - nothing to archive"
      );
      return;
    }

    // Step 2: Generate report file
    const now = new Date();
    let fileContent = `🏆 Week ${weekNumber} Winners (${now.toISOString().split('T')[0]})\n\n`;
    
    winners.forEach((winner, index) => {
      fileContent += `${["🥇","🥈","🥉"][index] || "▫️"} ${winner.first_name}\n` +
                    `Phone: ${winner.phone}\n` +
                    `Referrals: ${winner.referral_count}\n\n`;
    });

    // Step 3: Update referral statuses
    await Referral.update(
      { referral_status: 'counted' },
      {
        where: { referral_status: 'new' },
        transaction
      }
    );

    // Step 4: Clear this week's data
    await ThisWeekWinner.destroy({
      truncate: true,
      transaction
    });

    // Commit everything
    await transaction.commit();

    // Send success message
    await ctx.telegram.deleteMessage(processingMsg.chat.id, processingMsg.message_id);
    
    // Send the report file
    await ctx.replyWithDocument({
      source: Buffer.from(fileContent, 'utf-8'),
      filename: `week_${weekNumber}_winners.txt`
    }, {
      caption: `✅ Week ${weekNumber} successfully closed!\n` +
               `📊 ${winners.length} winners archived`
    });

  } catch (error) {
    await transaction.rollback();
    
    // Update processing message with error
    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      "❌ Failed to process week: " + error.message
    );
    
    console.error("End week error:", error);
  }
});



// Command: /end_month - Calculates monthly winners
bot.command('end_month', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN) {
    return ctx.reply("🚫 Only admin can end the month");
  }

  // Send initial processing message
  const processingMsg = await ctx.reply("⏳ Starting monthly closure process...\n\nPlease wait, this may take a moment...");

  try {
    // Update message to show data collection
    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      "⏳ Collecting monthly winner data...\n\nPlease wait..."
    );

    const leaders = await getMonthlyLeadersWithContact();
    
    if (leaders.length === 0) {
      await ctx.telegram.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        null,
        "ℹ️ No eligible winners this month\n\nNo data to archive."
      );
      return;
    }

    // Update message to show archiving status
    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      "⏳ Archiving monthly winners...\n\nAlmost done..."
    );

    const now = new Date();
    const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // 1. Generate report file
    let fileContent = `🏆 Monthly Referral Report (${monthYear})\n\n`;
    fileContent += `Generated: ${now.toISOString()}\n`;
    fileContent += `Total Winners: ${leaders.length}\n\n`;
    
    leaders.forEach((user, index) => {
      fileContent += `${["🥇","🥈","🥉"][index] || "▫️"} ${user.first_name}\n`;
      fileContent += `Telegram ID: ${user.telegram_id}\n`;
      fileContent += `Phone: ${user.phone}\n`;
      fileContent += `Referrals: ${user.referral_count}\n\n`;
    });

    // 2. Archive to database
    await MonthlyWinner.bulkCreate(
      leaders.map(winner => ({
        month_year: monthYear,
        telegram_id: winner.telegram_id,
        first_name: winner.first_name,
        phone: winner.phone,
        referral_count: winner.referral_count
      }))
    );

    // 3. Clear old data
    await clearMonthEndData();

    // Delete processing message
    await ctx.telegram.deleteMessage(processingMsg.chat.id, processingMsg.message_id);

    // Send final results
    await ctx.replyWithDocument({
      source: Buffer.from(fileContent, 'utf-8'),
      filename: `monthly_winners_${now.getFullYear()}_${now.getMonth()+1}.txt`
    }, {
      caption: `✅ Monthly Report: ${monthYear}\n\n` +
               `🏆 ${leaders.length} winners archived\n` +
               `📅 Month successfully closed!`
    });

    // Send congratulatory messages to top 3 winners
    const medals = ["🥇 Gold", "🥈 Silver", "🥉 Bronze"];
    const top3 = leaders.slice(0, 3);
    
    for (const [index, winner] of top3.entries()) {
      try {
        await ctx.telegram.sendMessage(
          winner.telegram_id,
          `🎉 ${medals[index]} Medal Winner! 🎉\n\n` +
          `Congratulations ${winner.first_name}!\n` +
          `You ranked ${index + 1} this month with ${winner.referral_count} referrals!\n\n` +
          `🏆 Keep up the great work!`
        );
      } catch (error) {
        console.error(`Failed to congratulate ${winner.telegram_id}:`, error);
        await ctx.telegram.sendMessage(
          ADMIN,
          `⚠️ Failed to congratulate ${winner.first_name} (${winner.telegram_id})`
        );
      }
    }

    // Send summary to admin
    await ctx.telegram.sendMessage(
      ADMIN,
      `📊 Monthly Closure Complete\n\n` +
      `📅 ${monthYear}\n` +
      `👑 ${leaders.length} winners\n` +
      `🏅 Top 3 notified\n` +
      `🕒 ${now.toLocaleTimeString()}`,
      { parse_mode: 'HTML' }
    );

  } catch (error) {
    console.error("End month error:", error);
    
    // Update processing message to show error
    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      "❌ Monthly closure failed!\n\n" +
      "Error: " + error.message + "\n\n" +
      "Please check logs and try again."
    );
    
    await ctx.telegram.sendMessage(
      ADMIN,
      `⚠️ Monthly Closure Error\n\n` +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack}`,
      { parse_mode: 'HTML' }
    );
  }
});


// Command: /leaderboard - Shows current monthly leaders
bot.command('leaderboard', async (ctx) => {
  try {
    // Show typing indicator
    await ctx.sendChatAction('typing');
    
    // Get top 3 leaders
    const leaders = await getCurrentLeaderboard(ctx);
    
    if (leaders.length === 0) {
      return ctx.reply("No active referrals yet. Be the first to refer someone!");
    }

    // Build simple leaderboard message
    let message = "🏆 Top 3 Referrers:\n\n";
    const medals = ["🥇", "🥈", "🥉"];
    
    leaders.slice(0, 3).forEach((leader, index) => {
      message += `${medals[index]} ${leader.first_name} - ${leader.referral_count} referrals\n`;
    });

    await ctx.reply(message);

  } catch (error) {
    console.error("Leaderboard error:", error);
    await ctx.reply("Failed to load leaderboard. Please try again later.");
  }
});
