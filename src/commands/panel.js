const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../utils/guildSettings');
const { sendTicketPanel } = require('../utils/autoSetup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('إرسال واجهة التذاكر إلى هذه القناة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const settings = getSettings(interaction.guildId);

    if (!settings.categories || settings.categories.length === 0) {
      return interaction.reply({
        content: '❌ لا يوجد أقسام.\nاستخدم `/control-panel` ← **إدارة الأقسام** ← **إضافة قسم** أولاً.',
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      await sendTicketPanel(interaction.channel, settings, interaction.guildId);
      await interaction.editReply({ content: '✅ تم إرسال واجهة التذاكر بنجاح!' });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: `❌ خطأ: ${err.message}` });
    }
  }
};
