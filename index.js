const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();

const app = express();
const config = require('./target.json');

// ===== SETTINGS =====
const RATING_MESSAGES = {
  2: [
    'Decent, but some parts felt a bit off 😐',
    'Service was okay but not very engaging 🙁',
    'Could improve speed and communication ⏳',
    'A fair trade, but lacked friendliness 😶',
    'Not the best experience, needs improvement 🔧',
    'Trade was slow and unorganized 🐢',
    'Communication could be better 📵',
    'Some issues with responsiveness 😕',
    'Mediocre service, expected more 😐',
    'Could be more professional 🧐',
    'The trader seemed distracted 🙃',
    'Not very reliable this time 😬',
    'Some delays during the trade 🕒',
    'Overall, just below average 👎'
  ],
  3: [
    'Okay service, nothing special 🙂',
    'Seemed a bit distracted during the trade 🤔',
    'Not bad, but could be more responsive 📞',
    'Average experience, nothing too bad or great ⚖️',
    'Solid trade, but room for improvement 💪',
    'Good effort, just slightly lacking 👍',
    'Decent communication, could be clearer 🗣️',
    'Fairly reliable, but some delays ⏰',
    'Service was acceptable, no complaints 🤷',
    'Transaction went smoothly but routine ✔️',
    'Met expectations but didn’t exceed 🟰',
    'The trade was okay but a bit slow 🐌',
    'Friendly enough but not outstanding 😊',
    'Good but nothing memorable ✨'
  ],
  4: [
    'Nice trade, a little slow but overall good 👍',
    'Friendly and smooth transaction 😊',
    'Helpful and pleasant to deal with 🤝',
    'Good experience, would recommend 🛒',
    'Reliable trader, quick to respond ⚡',
    'Fairly fast and professional 🚀',
    'Polite and efficient communication 💬',
    'Satisfied with the trade 👍',
    'Smooth process, no issues 🔄',
    'Good value and quick replies 💎',
    'Clear communication, easy to work with 🗨️',
    'Trustworthy and courteous 🤗',
    'A solid trade, happy with results 🥳',
    'Prompt and friendly throughout 👍'
  ],
  5: [
    'Really nice, one of the best experiences! 🌟',
    'Perfect service, fast and professional 🚀',
    'Outstanding trader, highly recommended 💯',
    'Amazing experience, flawless from start to finish 🏆',
    'Exceptional communication and speed ⚡',
    'Super reliable and friendly 😊',
    'Top-notch service, would trade again 🔥',
    'Excellent professionalism and kindness 👏',
    'Fast, smooth, and very trustworthy 💎',
    'Incredible trader, highly impressed 😍',
    'Flawless execution and great attitude 🌈',
    'Highly efficient and easy to work with 🤝',
    'Beyond expectations, five stars ⭐⭐⭐⭐⭐',
    'Best trade experience I’ve had so far 🥇'
  ]
};

const RATINGS = [
  { stars: '⭐⭐', value: 2, color: 0xF59E0B },
  { stars: '⭐⭐⭐', value: 3, color: 0xF59E0B },
  { stars: '⭐⭐⭐⭐', value: 4, color: 0x57F287 },
  { stars: '⭐⭐⭐⭐⭐', value: 5, color: 0x57F287 }
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// Express ping for uptime robot
app.get('/', (req, res) => res.send('Bot is alive!'));
const DEFAULT_PORT = process.env.PORT || 3000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`🌐 Web server started on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}
startServer(Number(DEFAULT_PORT));

function isValidDiscordId(id) {
  const maxSnowflake = BigInt('9223372036854775807');
  if (!/^\d+$/.test(id)) return false;
  if (id.length > 18) return false;
  try {
    return BigInt(id) <= maxSnowflake;
  } catch {
    return false;
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  if (!config.servers || config.servers.length === 0) {
    console.warn('⚠️ No servers found in target.json');
    return;
  }

  config.servers.forEach(serverConfig => {
    sendVouchForServer(serverConfig);
  });

  setInterval(() => {
    config.servers.forEach(serverConfig => {
      sendVouchForServer(serverConfig);
    });
  }, 10 * 60 * 1000);
});

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendVouchForServer(serverConfig) {
  try {
    const { serverId, channelId, userIds } = serverConfig;
    if (!userIds || userIds.length === 0) return;

    const validUserIds = userIds.filter(id => isValidDiscordId(id));
    if (validUserIds.length === 0) {
      console.warn(`No valid user IDs in server ${serverId}`);
      return;
    }

    const guild = await client.guilds.fetch(serverId);
    const channel = await client.channels.fetch(channelId);
    const members = await guild.members.fetch();
    const humanMembers = members.filter(m => !m.user.bot);
    const fromMember = getRandomFromArray(humanMembers.map(m => m));

    if (!fromMember) {
      console.warn(`No valid human members found to send vouch in server ${serverId}`);
      return;
    }

    const userId = getRandomFromArray(validUserIds);
    const rating = getRandomFromArray(RATINGS);
    const feedbackList = RATING_MESSAGES[rating.value];
    const feedback = getRandomFromArray(feedbackList);

    const targetUser = await client.users.fetch(userId);

    const embed = new EmbedBuilder()
      .setColor(rating.color)
      .setAuthor({
        name: fromMember.user.username,
        iconURL: fromMember.user.displayAvatarURL()
      })
      .setTitle('New Vouch')
      .setDescription(`**${fromMember.user.username}** left a vouch for **${targetUser.username}**`)
      .addFields(
        { name: 'Rating', value: `${rating.stars} (${rating.value}/5)` },
        { name: 'Users', value: `**From:** <@${fromMember.id}>\n**To:** <@${userId}>` },
        { name: 'Feedback', value: `"${feedback}"` }
      )
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .setFooter({ text: 'Ken softworks©' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log(`✅ Sent vouch from ${fromMember.user.tag} to ${targetUser.tag} in server ${serverId}`);

  } catch (err) {
    console.error('❌ Failed to send vouch:', err);
  }
}

client.login(process.env.TOKEN);