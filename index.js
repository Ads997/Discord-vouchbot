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
    'Could improve speed and quality next time.'
  ],
  3: [
    'Pretty good, I liked it 👍',
    'Nice work, keep it up!',
    'Good experience overall 😃'
  ],
  4: [
    'Really solid, exceeded my expectations 🤩',
    'Great job, I’ll recommend this!',
    'High quality and professional 🔥'
  ],
  5: [
    'Perfect service!! 🌟🌟🌟🌟🌟',
    'Amazing, couldn’t ask for better ❤️',
    'Outstanding performance, 10/10 🚀'
  ]
};

const RATINGS = [
  { value: 2, weight: 2, stars: '⭐️⭐️', color: 0xFFA500 }, // Orange
  { value: 3, weight: 5, stars: '⭐️⭐️⭐️', color: 0x00BFFF }, // Blue
  { value: 4, weight: 6, stars: '⭐️⭐️⭐️⭐️', color: 0x32CD32 }, // Green
  { value: 5, weight: 7, stars: '⭐️⭐️⭐️⭐️⭐️', color: 0xFFD700 }  // Gold
];
// ====================

// Helpers
function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedChoice(options) {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const opt of options) {
    if (rand < opt.weight) return opt;
    rand -= opt.weight;
  }
  return options[options.length - 1];
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const rotationQueues = new Map();

// --- Send vouch ---
async function sendVouchForServer(serverConfig) {
  try {
    const { serverId, channelId, userIds } = serverConfig;
    if (!userIds?.length) return;

    const guild = await client.guilds.fetch(serverId);
    const channel = await client.channels.fetch(channelId);

    // Fetch up to 100 members to avoid timeout
    const members = await guild.members.list({ limit: 100 });
    const humanMembers = members.filter(m => !m.user.bot);
    const fromMember = getRandomFromArray([...humanMembers.values()]);
    if (!fromMember) return;

    // Rotation queue for targets
    let queue = rotationQueues.get(serverId) || shuffle([...userIds]);
    rotationQueues.set(serverId, queue);

    let targetUser = null;
    let userId = null;

    // Try until we find a valid user
    while (queue.length > 0 && !targetUser) {
      userId = queue.shift();
      try {
        targetUser = await client.users.fetch(userId);
      } catch {
        console.warn(`⚠️ Skipped invalid or missing user ID: ${userId}`);
      }
    }

    // Save updated queue
    rotationQueues.set(serverId, queue);

    if (!targetUser) {
      console.warn("⚠️ No valid target user found, skipping this cycle.");
      return;
    }

    // Weighted rating + feedback
    const rating = weightedChoice(RATINGS);
    const feedback = getRandomFromArray(RATING_MESSAGES[rating.value]);

    // Embed
    const embed = new EmbedBuilder()
      .setColor(rating.color)
      .setAuthor({ name: fromMember.user.username, iconURL: fromMember.user.displayAvatarURL() })
      .setTitle('New Vouch')
      .setDescription(`**${fromMember.user.username}** left a vouch for **${targetUser.username}**`)
      .addFields(
        { name: 'Rating', value: `${rating.stars} (${rating.value}/5)` },
        { name: 'Users', value: `**From:** <@${fromMember.id}>\n**To:** <@${targetUser.id}>` },
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

// --- Startup ---
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Run every 10 minutes
  setInterval(() => {
    config.servers.forEach(server => sendVouchForServer(server));
  }, 10 * 60 * 1000);
});

client.login(process.env.TOKEN);

// --- Express Keep-Alive ---
app.get('/', (req, res) => res.send('Bot is alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Express running on port ${PORT}`));
