const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();

const app = express();
const config = require('./target.json');

// ===== SETTINGS =====
const RATING_MESSAGES = {
  2: [
    'It was okay, could be a bit smoother 😐',
    'Some parts felt off, but overall not bad 🙁',
    'Might need to improve the process next time ⏳',
    'Minor issues, but nothing major 👍',
    'Work was acceptable, just a bit rough around edges 😬',
    'Could be faster or more detailed 🛠️',
    'Not perfect, but got the job done 👌',
    'Some hiccups, but handled it 😌',
    'Could use a bit more attention to detail 🔍',
    'Work was okay, improvements needed 📈',
    'Mediocre experience, room to grow 🤔',
    'Slightly disappointing, but manageable 😶',
    'A few mistakes, but overall fine 😐',
    'Not quite what I expected, but acceptable 🤷‍♂️',
    'Some areas could use polish ✨',
    'Could be clearer on instructions 📝',
    'Was okay, just a few bumps on the way 🛤️',
    'Acceptable work, just needs a bit more effort 💪',
    'Good effort, some things could be smoother ⚡',
    'Fair work, not outstanding yet 💡'
  ],
  3: [
    'Pretty good, I liked it 👍',
    'Nice work, keep it up!',
    'Good experience overall 😃',
    'Met expectations, solid work 👌',
    'Decent job, just minor tweaks needed 🔧',
    'Work was fine, nothing to complain about 🙂',
    'Satisfactory effort, could improve slightly 💪',
    'Not bad, would work with again 😎',
    'Good execution, minor details missing 📝',
    'Solid job, keep improving ⚡',
    'Met expectations, no major issues 👍',
    'Nice effort, room for minor improvements 🛠️',
    'Good enough, a bit more polish would help ✨',
    'Satisfied, but could be smoother ⚡',
    'Competent work, decent outcome 😊',
    'Fairly good, minor adjustments needed 🧰',
    'Work was okay, nothing extraordinary 🤔',
    'Good enough for the task at hand 👌',
    'Met basic expectations, minor issues 😌',
    'Decent work, keep refining 💡'
  ],
  4: [
    'Really solid, exceeded my expectations 🤩',
    'Great job, I’ll recommend this!',
    'High quality and professional 🔥',
    'Impressive work, nicely done 😎',
    'Very good, everything handled well 👍',
    'Strong effort, excellent outcome 💪',
    'Well executed, highly recommend ✅',
    'Fantastic work, very satisfied 😃',
    'Good attention to detail, well done ✨',
    'Great execution, would work with again 👌',
    'Quality work, minor tweaks possible 🛠️',
    'Above average, very competent ⚡',
    'Professional and reliable performance 🏆',
    'Excellent effort, smooth process 🚀',
    'Nice handling of tasks, very good outcome 👏',
    'Very pleased with results 😍',
    'Good communication and execution 👍',
    'Strong performance, almost perfect 💯',
    'Great job, definitely recommend 😎',
    'Handled well, very professional 🌟'
  ],
  5: [
    'Perfect service!! 🌟🌟🌟🌟🌟',
    'Amazing, couldn’t ask for better ❤️',
    'Outstanding performance, 10/10 🚀',
    'Absolutely perfect, highly recommend 👍',
    'Flawless execution, super impressed 😍',
    'Top notch, couldn’t be happier 🏆',
    'Incredible work, everything spot on 🔥',
    'Exceptional service, very satisfied 🌟',
    'Brilliant job, would work with again 💯',
    'Perfect attention to detail, amazing 😎',
    'Superb work, highly recommend 👏',
    'Outstanding quality, very happy 😃',
    'Excellent, exceeded all expectations 🚀',
    'Amazing results, flawless execution ✨',
    'Top tier performance, highly reliable 🏅',
    'Perfect handling, extremely satisfied 😍',
    'Five stars, couldn’t be better ⭐️⭐️⭐️⭐️⭐️',
    'Exceptional effort, brilliant outcome 💡',
    'Superb communication and work ethic 👍',
    'Absolutely recommend, perfect job 🌟'
  ]
};

const RATINGS = [
  { value: 2, weight: 2, stars: '⭐️⭐️', color: 0xFFA500 }, // Orange
  { value: 3, weight: 5, stars: '⭐️⭐️⭐️', color: 0x00BFFF }, // Blue
  { value: 4, weight: 6, stars: '⭐️⭐️⭐️⭐️', color: 0x32CD32 }, // Green
  { value: 5, weight: 7, stars: '⭐️⭐️⭐️⭐️⭐️', color: 0xFFD700 }  // Gold
];

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

    const members = await guild.members.list({ limit: 100 });
    const humanMembers = members.filter(m => !m.user.bot);
    const fromMember = getRandomFromArray([...humanMembers.values()]);
    if (!fromMember) return;

    let queue = rotationQueues.get(serverId) || shuffle([...userIds]);
    rotationQueues.set(serverId, queue);

    let targetUser = null;
    let userId = null;

    while (queue.length > 0 && !targetUser) {
      userId = queue.shift();
      try {
        targetUser = await client.users.fetch(userId);
      } catch {
        console.warn(`⚠️ Skipped invalid or missing user ID: ${userId}`);
      }
    }

    rotationQueues.set(serverId, queue);

    if (!targetUser) {
      console.warn("⚠️ No valid target user found, skipping this cycle.");
      return;
    }

    const rating = weightedChoice(RATINGS);
    const feedback = getRandomFromArray(RATING_MESSAGES[rating.value]);

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

  setInterval(() => {
    config.servers.forEach(server => sendVouchForServer(server));
  }, 10 * 60 * 1000); // 10 minutes
});

client.login(process.env.TOKEN);

// --- Express Keep-Alive ---
app.get('/', (req, res) => res.send('Bot is alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Express running on port ${PORT}`));
