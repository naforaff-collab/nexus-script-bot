const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits,
  ChannelType, AttachmentBuilder
} = require('discord.js');
const { getSettings } = require('../utils/guildSettings');
const {
  ICON_URL, BANNER_URL,
  getTicket, createTicketRecord, updateTicket, deleteTicketRecord,
  nextTicketNumber, generateTranscript
} = require('../utils/ticketManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── أوامر Slash ────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`خطأ في الأمر [${interaction.commandName}]:`, err);
        const msg = { content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', flags: 64 };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      }
      return;
    }

    // ── قائمة إنشاء التذكرة ───────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await handleTicketCreate(interaction, client);
      return;
    }

    // ── أزرار ─────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'ticket_close')      await handleTicketClose(interaction, client);
      else if (id === 'ticket_claim') await handleTicketClaim(interaction, client);
      else if (id === 'ticket_adduser')    await handleAddUser(interaction, client);
      else if (id === 'ticket_removeuser') await handleRemoveUser(interaction, client);
      else if (id === 'ticket_delete')  await handleTicketDelete(interaction, client);
      else if (id === 'ticket_reopen')  await handleTicketReopen(interaction, client);
      else if (id.startsWith('rating_')) await handleRating(interaction, client);

      // أزرار لوحة التحكم - الأقسام
      else if (id === 'cp_categories') await require('../commands/control-panel').handleCategoriesPanel(interaction);
      else if (id === 'cp_logs')       await require('../commands/control-panel').handleChannelSelector(interaction, interaction.guildId, 'logs');
      else if (id === 'cp_ratings')    await require('../commands/control-panel').handleChannelSelector(interaction, interaction.guildId, 'ratings');
      else if (id === 'cp_category')   await require('../commands/control-panel').handleCategorySelector(interaction, interaction.guildId);
      else if (id === 'cp_roles')      await require('../commands/control-panel').handleRolesInput(interaction, interaction.guildId);
      else if (id === 'cp_panel')      await require('../commands/control-panel').handleSendPanel(interaction, client, interaction.guildId);
      else if (id === 'cp_back')       await require('../commands/control-panel').handleBack(interaction, client);
      else if (id === 'cp_add_cat')    await require('../commands/control-panel').handleAddCategory(interaction, interaction.guildId);
      else if (id.startsWith('cp_edit_cat_')) await require('../commands/control-panel').handleEditCategory(interaction, interaction.guildId, id.replace('cp_edit_cat_', ''));
      else if (id.startsWith('cp_del_cat_'))  await require('../commands/control-panel').handleDeleteCategory(interaction, interaction.guildId, id.replace('cp_del_cat_', ''));

      // لوحة تحكم التذاكر
      else if (id === 'tcp_refresh')   await require('../commands/control-panel').handleTCPRefresh(interaction, client, interaction.guildId);
      else if (id === 'tcp_stats')     await require('../commands/control-panel').handleTCPStats(interaction, interaction.guildId);
      else if (id === 'tcp_close_all') await require('../commands/control-panel').handleTCPCloseAll(interaction, client, interaction.guildId);

      return;
    }

    // ── النماذج Modal ─────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id.startsWith('modal_adduser_'))    await handleAddUserModal(interaction, client);
      else if (id.startsWith('modal_removeuser_')) await handleRemoveUserModal(interaction, client);
      else if (id.startsWith('modal_rating_'))    await handleRatingModal(interaction, client);

      // نماذج لوحة التحكم
      else if (id === 'cp_modal_add_cat')    await require('../commands/control-panel').handleAddCatModal(interaction, interaction.guildId);
      else if (id.startsWith('cp_modal_edit_cat_')) await require('../commands/control-panel').handleEditCatModal(interaction, interaction.guildId, id.replace('cp_modal_edit_cat_', ''));
      else if (id === 'cp_modal_roles')      await require('../commands/control-panel').handleRolesModal(interaction, interaction.guildId);
    }

    // ── قوائم لوحة التحكم ─────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;
      if (id === 'cp_select_logsroom')    await require('../commands/control-panel').handleLogsRoomSelect(interaction, interaction.guildId);
      else if (id === 'cp_select_ratingsroom') await require('../commands/control-panel').handleRatingsRoomSelect(interaction, interaction.guildId);
      else if (id === 'cp_select_ticketcat')   await require('../commands/control-panel').handleTicketCatSelect(interaction, interaction.guildId);
      else if (id === 'cp_select_editcat')     await require('../commands/control-panel').handleEditCatSelect(interaction, interaction.guildId);
    }
  }
};

// ── دالة مساعدة: هل هو ستاف؟ ─────────────────────────────────
function isStaff(interaction, settings) {
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
}

// ── أزرار التذكرة داخل القناة ─────────────────────────────────
function buildTicketButtons(ticket) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التذكرة').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام التذكرة').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('حذف التذكرة').setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('إضافة عضو').setEmoji('➕').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_removeuser').setLabel('إزالة عضو').setEmoji('➖').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2];
}

// ── فتح تذكرة ─────────────────────────────────────────────────
async function handleTicketCreate(interaction, client) {
  await interaction.deferReply({ flags: 64 });

  const settings = getSettings(interaction.guildId);
  const categoryId = interaction.values[0];
  const category = (settings.categories || []).find(c => c.id === categoryId);

  if (!category) return interaction.editReply({ content: '❌ القسم غير موجود.' });

  const existing = interaction.guild.channels.cache.find(
    ch => ch.topic && ch.topic.includes(`user:${interaction.user.id}:open`)
  );
  if (existing) return interaction.editReply({ content: `❌ لديك تذكرة مفتوحة بالفعل: ${existing}` });

  const ticketNum = nextTicketNumber(interaction.guildId);
  const catSlug = (category.id || 'ticket').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const channelName = `${catSlug}-${String(ticketNum).padStart(4, '0')}`;

  const staffRoles = settings.staffRoleIds || [];
  const categoryRoleId = category.roleId;

  const permOverwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    ...staffRoles.map(rid => ({
      id: rid,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.AttachFiles,
      ],
    })),
  ];

  if (categoryRoleId && !staffRoles.includes(categoryRoleId)) {
    permOverwrites.push({
      id: categoryRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  // إضافة صلاحية للبوت
  permOverwrites.push({
    id: client.user.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.ManageMessages,
    ],
  });

  let ticketChannel;
  try {
    ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: settings.categoryId || null,
      topic: `user:${interaction.user.id}:open`,
      permissionOverwrites: permOverwrites,
    });
  } catch (err) {
    console.error('خطأ في إنشاء قناة التذكرة:', err);
    return interaction.editReply({ content: '❌ فشل إنشاء قناة التذكرة. تأكد من صلاحيات البوت.' });
  }

  const record = {
    channelId: ticketChannel.id,
    guildId: interaction.guildId,
    userId: interaction.user.id,
    categoryId: category.id,
    categoryLabel: category.label,
    categoryRoleId: categoryRoleId || null,
    ticketNumber: ticketNum,
    status: 'open',
    claimedBy: null,
    openedAt: Date.now(),
    rating: null,
    ratingComment: null,
  };
  createTicketRecord(ticketChannel.id, record);

  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji || '🎫'} ${category.label}`)
    .setDescription(
      `مرحباً ${interaction.user} 👋\n\n` +
      `تم فتح تذكرتك بنجاح.\n` +
      `سيتواصل معك أحد أعضاء الفريق في أقرب وقت.\n\n` +
      `**📌 القسم:** ${category.label}\n` +
      `**🎫 رقم التذكرة:** #${String(ticketNum).padStart(4, '0')}`
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const buttons = buildTicketButtons(record);
  const mention = categoryRoleId ? `<@&${categoryRoleId}>` : (staffRoles.length ? `<@&${staffRoles[0]}>` : '');

  await ticketChannel.send({
    content: mention ? `${interaction.user} | ${mention}` : `${interaction.user}`,
    embeds: [embed],
    components: buttons,
  });

  await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${ticketChannel}` });
  await logEvent(client, interaction.guildId, 'open', { channel: ticketChannel, user: interaction.user, ticket: record });
}

// ── إغلاق التذكرة ─────────────────────────────────────────────
async function handleTicketClose(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (ticket.status === 'closed') return interaction.reply({ content: '❌ التذكرة مغلقة بالفعل.', flags: 64 });

  const staff = isStaff(interaction, settings);
  if (!staff && interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.', flags: 64 });
  }

  await interaction.deferUpdate().catch(() => {});

  updateTicket(interaction.channelId, { status: 'closed', closedBy: interaction.user.id, closedAt: Date.now() });
  await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});

  // إنشاء Transcript
  const transcript = await generateTranscript(interaction.channel);
  const transcriptBuffer = Buffer.from(transcript, 'utf8');
  const transcriptFile = new AttachmentBuilder(transcriptBuffer, {
    name: `transcript-${String(ticket.ticketNumber).padStart(4, '0')}.txt`,
  });

  // رسالة الإغلاق داخل التذكرة
  const closeEmbed = new EmbedBuilder()
    .setTitle('🔒 تم إغلاق التذكرة')
    .setDescription(
      `تم إغلاق التذكرة بواسطة ${interaction.user}\n\n` +
      `**📌 القسم:** ${ticket.categoryLabel || 'غير معروف'}\n` +
      `**🎫 رقم التذكرة:** #${String(ticket.ticketNumber).padStart(4, '0')}`
    )
    .setColor(0xed4245)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('إعادة فتح').setEmoji('🔓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('حذف التذكرة').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );

  await interaction.channel.send({ embeds: [closeEmbed], components: [actionRow] });

  // إرسال لوغ الإغلاق مع Transcript
  await logEvent(client, interaction.guildId, 'close', {
    channel: interaction.channel,
    user: interaction.user,
    ticket: getTicket(interaction.channelId),
    transcriptFile,
  });

  // إرسال التقييم بشكل خاص (Ephemeral) لصاحب التذكرة فقط
  const ticketOwner = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
  if (ticketOwner) {
    const ratingEmbed = new EmbedBuilder()
      .setTitle('⭐ تقييم الدعم')
      .setDescription(
        `شكراً لتواصلك معنا!\n` +
        `يرجى تقييم تجربتك مع فريق الدعم.\n\n` +
        `**📌 القسم:** ${ticket.categoryLabel || 'غير معروف'}\n` +
        `**🎫 رقم التذكرة:** #${String(ticket.ticketNumber).padStart(4, '0')}`
      )
      .setColor(0xfee75c)
      .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

    const ratingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rating_1_${interaction.channelId}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_2_${interaction.channelId}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_3_${interaction.channelId}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_4_${interaction.channelId}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_5_${interaction.channelId}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
    );

    // إرسال رسالة خاصة Ephemeral لصاحب التذكرة
    try {
      await interaction.followUp({
        embeds: [ratingEmbed],
        components: [ratingRow],
        flags: 64,
      });
    } catch {
      // إذا لم تنجح followUp جرب DM
      try {
        await ticketOwner.send({ embeds: [ratingEmbed], components: [ratingRow] });
      } catch {}
    }
  }
}

// ── استلام التذكرة ────────────────────────────────────────────
async function handleTicketClaim(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (!isStaff(interaction, settings)) {
    return interaction.reply({ content: '❌ فقط الستاف يمكنهم استلام التذاكر.', flags: 64 });
  }
  if (ticket.claimedBy) {
    return interaction.reply({ content: `❌ التذكرة مستلَمة بالفعل من <@${ticket.claimedBy}>.`, flags: 64 });
  }

  updateTicket(interaction.channelId, { claimedBy: interaction.user.id });

  const embed = new EmbedBuilder()
    .setDescription(`🙋 تم استلام التذكرة بواسطة ${interaction.user}\n\nسيتولى ${interaction.user} معالجة هذه التذكرة.`)
    .setColor(0x57f287)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ── إضافة عضو (زر) ───────────────────────────────────────────
async function handleAddUser(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (!isStaff(interaction, settings) && interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ فقط الستاف أو صاحب التذكرة يمكنهم إضافة أعضاء.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_adduser_${interaction.channelId}`)
    .setTitle('إضافة عضو للتذكرة');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('معرّف العضو (ID)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678')
    )
  );

  await interaction.showModal(modal);
}

async function handleAddUserModal(interaction, client) {
  const userId = interaction.fields.getTextInputValue('user_id').trim();
  const member = await interaction.guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return interaction.reply({ content: '❌ المستخدم غير موجود في السيرفر. تأكد من الـ ID.', flags: 64 });
  }

  await interaction.channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });

  await interaction.reply({ content: `✅ تم إضافة ${member} إلى التذكرة.`, flags: 64 });
}

// ── إزالة عضو (زر) ───────────────────────────────────────────
async function handleRemoveUser(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (!isStaff(interaction, settings)) {
    return interaction.reply({ content: '❌ فقط الستاف يمكنهم إزالة الأعضاء.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_removeuser_${interaction.channelId}`)
    .setTitle('إزالة عضو من التذكرة');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('معرّف العضو (ID)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678')
    )
  );

  await interaction.showModal(modal);
}

async function handleRemoveUserModal(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  const userId = interaction.fields.getTextInputValue('user_id').trim();

  if (ticket && userId === ticket.userId) {
    return interaction.reply({ content: '❌ لا يمكن إزالة صاحب التذكرة.', flags: 64 });
  }

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return interaction.reply({ content: '❌ المستخدم غير موجود في السيرفر.', flags: 64 });
  }

  await interaction.channel.permissionOverwrites.delete(member.id).catch(() => {});
  await interaction.reply({ content: `✅ تم إزالة ${member} من التذكرة.`, flags: 64 });
}

// ── حذف التذكرة ───────────────────────────────────────────────
async function handleTicketDelete(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (!isStaff(interaction, settings)) {
    return interaction.reply({ content: '❌ فقط الستاف يمكنهم حذف التذاكر.', flags: 64 });
  }

  await interaction.reply({ content: '🗑️ سيتم حذف القناة خلال 5 ثوانٍ...', flags: 64 }).catch(() => {});

  await logEvent(client, interaction.guildId, 'delete', {
    channel: interaction.channel,
    user: interaction.user,
    ticket,
  });

  deleteTicketRecord(interaction.channelId);

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 5000);
}

// ── إعادة فتح التذكرة ─────────────────────────────────────────
async function handleTicketReopen(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (!isStaff(interaction, settings) && interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية لإعادة فتح هذه التذكرة.', flags: 64 });
  }

  updateTicket(interaction.channelId, { status: 'open', closedBy: null, closedAt: null });
  await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true }).catch(() => {});
  await interaction.channel.setTopic(`user:${ticket.userId}:open`).catch(() => {});

  const embed = new EmbedBuilder()
    .setDescription(`🔓 تم إعادة فتح التذكرة بواسطة ${interaction.user}`)
    .setColor(0x57f287)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const buttons = buildTicketButtons(ticket);
  await interaction.reply({ embeds: [embed], components: buttons });
}

// ── التقييم ───────────────────────────────────────────────────
async function handleRating(interaction, client) {
  const parts = interaction.customId.split('_');
  const stars = parseInt(parts[1]);
  const channelId = parts[2] || interaction.channelId;

  const ticket = getTicket(channelId);

  const modal = new ModalBuilder()
    .setCustomId(`modal_rating_${stars}_${channelId}`)
    .setTitle(`تقييم ${stars} نجوم`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('comment')
        .setLabel('تعليقك (اختياري)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('اكتب تعليقك هنا...')
    )
  );

  await interaction.showModal(modal);
}

async function handleRatingModal(interaction, client) {
  const parts = interaction.customId.replace('modal_rating_', '').split('_');
  const stars = parseInt(parts[0]);
  const channelId = parts[1] || interaction.channelId;

  const comment = interaction.fields.getTextInputValue('comment') || 'لا يوجد تعليق';
  const ticket = getTicket(channelId);

  if (ticket) {
    updateTicket(channelId, { rating: stars, ratingComment: comment });
  }

  const settings = getSettings(interaction.guildId);

  // إرسال التقييم إلى روم التقييم فقط
  if (settings.ratingsChannelId) {
    const ratingsChannel = interaction.guild.channels.cache.get(settings.ratingsChannelId);
    if (ratingsChannel) {
      const ratingEmbed = new EmbedBuilder()
        .setTitle('⭐ تقييم جديد')
        .addFields(
          { name: '👤 المستخدم', value: `${interaction.user}`, inline: true },
          { name: '⭐ التقييم', value: `${'⭐'.repeat(stars)} (${stars}/5)`, inline: true },
          { name: '📂 القسم', value: ticket?.categoryLabel || 'غير معروف', inline: true },
          { name: '💬 التعليق', value: comment },
          { name: '🙋 المستلِم', value: ticket?.claimedBy ? `<@${ticket.claimedBy}>` : 'لم يُستلم', inline: true },
          { name: '🎫 رقم التذكرة', value: `#${String(ticket?.ticketNumber || '0').padStart(4, '0')}`, inline: true },
        )
        .setColor(0xfee75c)
        .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
        .setTimestamp();

      await ratingsChannel.send({ embeds: [ratingEmbed] }).catch(() => {});
    }
  }

  // الرد بشكل خاص فقط - لا يظهر داخل التذكرة
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`✅ شكراً على تقييمك! منحتنا ${'⭐'.repeat(stars)}`)
        .setColor(0x57f287)
        .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    ],
    flags: 64,
  });
}

// ── اللوغات ───────────────────────────────────────────────────
async function logEvent(client, guildId, type, data) {
  const settings = getSettings(guildId);
  if (!settings.logsChannelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const logsChannel = guild.channels.cache.get(settings.logsChannelId);
  if (!logsChannel) return;

  const colors = { open: 0x57f287, close: 0xed4245, delete: 0x808080 };
  const icons  = { open: '🎫',      close: '🔒',      delete: '🗑️' };
  const labels = { open: 'فتح',     close: 'إغلاق',   delete: 'حذف' };

  const embed = new EmbedBuilder()
    .setTitle(`${icons[type] || '📋'} تذكرة — ${labels[type] || type}`)
    .addFields(
      { name: '📌 القناة',       value: data.channel ? `#${data.channel.name}` : 'غير معروف', inline: true },
      { name: '👤 المستخدم',     value: data.user ? `${data.user}` : 'غير معروف', inline: true },
      { name: '📂 القسم',        value: data.ticket?.categoryLabel || 'غير معروف', inline: true },
      { name: '🎫 رقم التذكرة', value: `#${String(data.ticket?.ticketNumber || '0').padStart(4, '0')}`, inline: true },
      { name: '🙋 المستلِم',    value: data.ticket?.claimedBy ? `<@${data.ticket.claimedBy}>` : 'لم يُستلم', inline: true },
      { name: '🕐 الوقت',       value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setColor(colors[type] || 0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const payload = { embeds: [embed] };
  if (data.transcriptFile) payload.files = [data.transcriptFile];

  await logsChannel.send(payload).catch(() => {});
}
