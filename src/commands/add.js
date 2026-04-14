const { SlashCommandBuilder } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

// هذا الأمر احتياطي — الاستخدام الأساسي عبر زر "إضافة عضو" داخل التذكرة
module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('إضافة عضو إلى التذكرة الحالية')
    .addUserOption(opt =>
      opt.setName('user').setDescription('العضو المراد إضافته').setRequired(true)
    ),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r))
      || interaction.member.permissions.has(0x8);

    if (!isStaff && interaction.user.id !== ticket.userId) {
      return interaction.reply({ content: '❌ فقط الستاف أو صاحب التذكرة يمكنهم إضافة أعضاء.', flags: 64 });
    }

    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ المستخدم غير موجود في السيرفر.', flags: 64 });

    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    });

    await interaction.reply({ content: `✅ تم إضافة ${member} إلى التذكرة.`, flags: 64 });
  }
};
