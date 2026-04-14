require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of files) {
  try {
    const command = require(path.join(commandsPath, file));
    if (command.data) commands.push(command.data.toJSON());
  } catch (err) {
    console.error(`خطأ في ${file}:`, err.message);
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`🔄 جاري تسجيل ${commands.length} أمر...`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ تم تسجيل الأوامر بنجاح!');
  } catch (err) {
    console.error('❌ فشل تسجيل الأوامر:', err);
  }
})();
