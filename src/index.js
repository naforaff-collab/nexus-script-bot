require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { connectDB } = require('./utils/database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

async function main() {
  await connectDB();
  await loadCommands(client);
  await loadEvents(client);

  client.once('ready', () => {
    console.log(`✅ Nexus Script شغّال — ${client.user.tag}`);

    client.user.setPresence({
      activities: [{
        name: '〆 BY : speeed__.privee',
        type: ActivityType.Watching,
      }],
      status: 'online',
    });

    require('./utils/autoSetup')(client);
  });

  await client.login(process.env.BOT_TOKEN);
}

main().catch(console.error);
