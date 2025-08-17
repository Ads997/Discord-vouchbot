const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();
const config = require('./target.json');

// ===== SETTINGS =====
const RATING_MESSAGES = {
  2: ['Decent, but some parts felt a bit off 😐', 'Service was okay but not very engaging 🙁', 'Could improve speed and communication ⏳', 'Not the best experience, needs improvement 🔧', 'Mediocre service, expected more 😐'],
  3: ['Okay service, nothing special 🙂', 'Average experience, nothing too bad or great ⚖️', 'Solid trade, but room for improvement 💪', 'Good effort, just slightly lacking 👍', 'Friendly enough but not outstanding 😊'],
  4: ['Nice trade, overall good 👍', 'Friendly and smooth transaction 😊', 'Good experience, would recommend 🛒', 'Reliable trader, quick to respond ⚡', 'Satisfied with the trade 👍'],
  5: ['Really nice, one of the best experiences! 🌟', 'Perfect service, fast and professional 🚀', 'Outstanding trader, highly recommended 💯', 'Amazing experience, flawless from start to finish 🏆', 'Super reliable and friendly 😊']
};

const RATINGS = [
  { stars: '⭐⭐', value: 2, color: 0xF59E0B, weight: 1 },
  { stars: '⭐⭐⭐', value: 3, color: 0xF59E0B, weight: 2 },
  { stars: '⭐⭐⭐⭐', value: 4, color: 0x57F287, weight: 4 },
  { stars: '⭐⭐⭐⭐⭐', value: 5, color: 0x57F287, weight: 6 }
];

function weightedChoice(items) {
  const total = items.reduce((acc, i) => acc + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const rotationQueues = new Map();

// --- Client setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// --- Express ping for uptime ---
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// --- Bot ready ---
client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);

  const serverConfig = config.servers[0];
  sendVouchForServer(serverConfig);

  setInterval(() => sendVouchForServer(serverConfig), 10 * 60 * 1000);
});

// --- Send vouch ---
async function sendVouchForServer(serverConfig) {
  try {
    const { serverId, channelId, userIds } = serverConfig;
    if (!userIds?.length) return;

    const guild = await client.guilds.fetch(serverId);
    const channel = await client.channels.fetch(channelId);

    const members = await guild.members.fetch();
    const humanMembers = members.filter(m => !m.user.bot);
    const fromMember = getRandomFromArray([...humanMembers.values()]);
    if (!fromMember) return;

    let queue = rotationQueues.get(serverId) || shuffle([...userIds]);
    rotationQueues.set(serverId, queue);
    const userId = queue.shift();
    rotationQueues.set(serverId, queue);

    const rating = weightedChoice(RATINGS);
    const feedback = getRandomFromArray(RATING_MESSAGES[rating.value]);
    const targetUser = await client.users.fetch(userId);

    const embed = new EmbedBuilder()
      .setColor(rating.color)
      .setAuthor({ name: fromMember.user.username, iconURL: fromMember.user.displayAvatarURL() })
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
    console.log(`✅ Sent vouch from ${fromMember.user.tag} to ${targetUser.tag} (${rating.stars})`);
  } catch (err) {
    console.error('❌ Failed to send vouch:', err.message);
  }
}

// --- Login with robust error handling ---
if (!process.env.TOKEN) {
  console.error("❌ TOKEN not set in environment variables!")
  process.exit(1);
}

console.log("🟡 Using TOKEN length:", process.env.TOKEN.length);

client.login(process.env.TOKEN)
  .then(() => console.log("✅ Login request sent..."))
  .catch(err => {
    console.error("❌ Failed to login:", err.message);
    process.exit(1);
  });
