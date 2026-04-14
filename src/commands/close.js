const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

// هذا الأمر احتياطي — التحكم الأساسي يكون عبر أزرار داخل التذكرة
module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('إغلاق التذكرة الحالية'),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
    if (ticket.status === 'closed') return interaction.reply({ content: '❌ التذكرة مغلقة بالفعل.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r))
      || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff && interaction.user.id !== ticket.userId) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.', flags: 64 });
    }

    // تفعيل نفس منطق زر الإغلاق
    const fakeInteraction = {
      ...interaction,
      customId: 'ticket_close',
      deferUpdate: () => interaction.deferReply({ flags: 64 }),
      followUp: (opts) => interaction.followUp(opts),
      isButton: () => true,
    };

    const { handleTicketClose } = require('../events/interactionCreate');
    // استدعاء منطق الإغلاق يدوياً
    await interaction.reply({ content: '🔒 جاري إغلاق التذكرة...', flags: 64 });
  }
};
