const { SlashCommandBuilder } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

// هذا الأمر احتياطي — الاستخدام الأساسي عبر زر "إزالة عضو" داخل التذكرة
module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('إزالة عضو من التذكرة الحالية')
    .addUserOption(opt =>
      opt.setName('user').setDescription('العضو المراد إزالته').setRequired(true)
    ),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r))
      || interaction.member.permissions.has(0x8);

    if (!isStaff) return interaction.reply({ content: '❌ فقط الستاف يمكنهم إزالة الأعضاء.', flags: 64 });

    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ المستخدم غير موجود في السيرفر.', flags: 64 });
    if (member.id === ticket.userId) {
      return interaction.reply({ content: '❌ لا يمكن إزالة صاحب التذكرة.', flags: 64 });
    }

    await interaction.channel.permissionOverwrites.delete(member.id).catch(() => {});
    await interaction.reply({ content: `✅ تم إزالة ${member} من التذكرة.`, flags: 64 });
  }
};
