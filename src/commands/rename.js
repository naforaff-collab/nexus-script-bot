const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('تغيير اسم قناة التذكرة الحالية')
    .addStringOption(opt =>
      opt.setName('name').setDescription('الاسم الجديد').setRequired(true)
    ),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r))
      || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) return interaction.reply({ content: '❌ فقط الستاف يمكنهم تغيير اسم التذكرة.', flags: 64 });

    const newName = interaction.options.getString('name')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-\u0600-\u06FF]/g, '')
      .slice(0, 50);

    await interaction.channel.setName(newName).catch(() => {});
    await interaction.reply({ content: `✅ تم تغيير اسم التذكرة إلى **${newName}**`, flags: 64 });
  }
};
