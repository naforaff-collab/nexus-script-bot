const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, PermissionFlagsBits
} = require('discord.js');
const { getSettings } = require('../utils/guildSettings');
const { ICON_URL } = require('../utils/ticketManager');
const { readJSON } = require('../utils/database');
const { handleTCPRefresh, handleTCPStats } = require('./control-panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('فتح لوحة تحكم التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const settings = getSettings(interaction.guildId);
    const tickets = readJSON('tickets');
    const guildTickets = Object.values(tickets).filter(t => t.guildId === interaction.guildId);
    const open   = guildTickets.filter(t => t.status === 'open').length;
    const closed = guildTickets.filter(t => t.status === 'closed').length;

    const embed = new EmbedBuilder()
      .setTitle('🎫 لوحة تحكم التذاكر — 𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭')
      .setDescription('إدارة ومراقبة نظام التذاكر بالكامل من هنا.')
      .addFields(
        { name: '🟢 تذاكر مفتوحة', value: `**${open}**`, inline: true },
        { name: '🔒 تذاكر مغلقة', value: `**${closed}**`, inline: true },
        { name: '🎫 إجمالي التذاكر', value: `**${guildTickets.length}**`, inline: true },
        { name: '📋 روم اللوغات', value: settings.logsChannelId ? `<#${settings.logsChannelId}>` : 'غير محدد', inline: true },
        { name: '⭐ روم التقييم', value: settings.ratingsChannelId ? `<#${settings.ratingsChannelId}>` : 'غير محدد', inline: true },
        { name: '📂 عدد الأقسام', value: `**${(settings.categories || []).length}**`, inline: true },
      )
      .setColor(0x2b2d31)
      .setThumbnail(ICON_URL)
      .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tcp_refresh').setLabel('تحديث الواجهة').setEmoji('🔄').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tcp_stats').setLabel('الإحصائيات').setEmoji('📊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tcp_close_all').setLabel('إغلاق الكل').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  }
};
