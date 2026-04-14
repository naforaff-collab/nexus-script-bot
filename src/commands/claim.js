const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTicket, updateTicket, ICON_URL } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

// هذا الأمر احتياطي — الاستخدام الأساسي عبر زر "استلام التذكرة" داخل التذكرة
module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('استلام التذكرة الحالية'),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r))
      || interaction.member.permissions.has(0x8);

    if (!isStaff) return interaction.reply({ content: '❌ فقط الستاف يمكنهم استلام التذاكر.', flags: 64 });

    if (ticket.claimedBy) {
      return interaction.reply({ content: `❌ التذكرة مستلَمة بالفعل من <@${ticket.claimedBy}>.`, flags: 64 });
    }

    updateTicket(interaction.channelId, { claimedBy: interaction.user.id });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`🙋 تم استلام التذكرة بواسطة ${interaction.user}`)
          .setColor(0x57f287)
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ],
      flags: 64,
    });
  }
};
