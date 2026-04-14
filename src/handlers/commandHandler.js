const fs = require('fs');
const path = require('path');

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const command = require(path.join(commandsPath, file));
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ تم تحميل الأمر: ${command.data.name}`);
      }
    } catch (err) {
      console.error(`❌ خطأ في تحميل الأمر ${file}:`, err.message);
    }
  }
}

module.exports = { loadCommands };
