const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, PermissionFlagsBits, ChannelType
} = require('discord.js');
const { getSettings, updateSettings } = require('../utils/guildSettings');
const { ICON_URL } = require('../utils/ticketManager');
const { sendTicketPanel } = require('../utils/autoSetup');
const { readJSON } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('control-panel')
    .setDescription('فتح لوحة تحكم البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await showMainPanel(interaction, client);
  },

  // دوال مُصدَّرة للاستخدام من interactionCreate
  handleCategoriesPanel,
  handleChannelSelector,
  handleCategorySelector,
  handleRolesInput,
  handleSendPanel,
  handleBack,
  handleAddCategory,
  handleEditCategory,
  handleDeleteCategory,
  handleAddCatModal,
  handleEditCatModal,
  handleRolesModal,
  handleLogsRoomSelect,
  handleRatingsRoomSelect,
  handleTicketCatSelect,
  handleEditCatSelect,
  handleTCPRefresh,
  handleTCPStats,
  handleTCPCloseAll,
};

// ══════════════════════════════════════════════════════════════
//  اللوحة الرئيسية
// ══════════════════════════════════════════════════════════════
async function showMainPanel(interaction, client, update = false) {
  const settings = getSettings(interaction.guildId);
  const cats = settings.categories || [];

  const embed = new EmbedBuilder()
    .setTitle('⚙️ لوحة التحكم — 𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭')
    .setDescription('تحكم الكامل في نظام التذاكر من هنا.')
    .addFields(
      { name: '📂 الأقسام', value: cats.length ? cats.map(c => `${c.emoji || '🎫'} ${c.label}`).join('\n') : 'لا يوجد أقسام', inline: false },
      { name: '📋 روم اللوغات', value: settings.logsChannelId ? `<#${settings.logsChannelId}>` : 'غير محدد', inline: true },
      { name: '⭐ روم التقييم', value: settings.ratingsChannelId ? `<#${settings.ratingsChannelId}>` : 'غير محدد', inline: true },
      { name: '📁 كاتاغوري التذاكر', value: settings.categoryId ? `<#${settings.categoryId}>` : 'غير محدد', inline: true },
      { name: '👑 رولات الستاف', value: (settings.staffRoleIds || []).length ? (settings.staffRoleIds || []).map(r => `<@&${r}>`).join(', ') : 'غير محدد', inline: false },
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_categories').setLabel('إدارة الأقسام').setEmoji('📂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cp_logs').setLabel('روم اللوغات').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_ratings').setLabel('روم التقييم').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_category').setLabel('الكاتاغوري').setEmoji('📁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_roles').setLabel('رولات الستاف').setEmoji('👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_panel').setLabel('إرسال واجهة التذاكر').setEmoji('🎫').setStyle(ButtonStyle.Success),
  );

  const payload = { embeds: [embed], components: [row1, row2], flags: 64 };

  if (update && interaction.isButton()) {
    await interaction.update(payload).catch(() => {});
  } else {
    await interaction.reply(payload);
  }
}

// ══════════════════════════════════════════════════════════════
//  إدارة الأقسام
// ══════════════════════════════════════════════════════════════
async function handleCategoriesPanel(interaction) {
  const settings = getSettings(interaction.guildId);
  const cats = settings.categories || [];

  const embed = new EmbedBuilder()
    .setTitle('📂 إدارة الأقسام')
    .setDescription(cats.length ? cats.map((c, i) => `**${i + 1}.** ${c.emoji || '🎫'} ${c.label}`).join('\n') : 'لا يوجد أقسام حالياً.')
    .setColor(0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_add_cat').setLabel('إضافة قسم').setEmoji('➕').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  const rows = [row1];

  if (cats.length > 0) {
    // قائمة تعديل
    const editOptions = cats.map(c => ({ label: c.label, value: c.id, emoji: c.emoji || '🎫' }));
    const editRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cp_select_editcat')
        .setPlaceholder('اختر قسماً للتعديل أو الحذف...')
        .addOptions(editOptions)
    );
    rows.unshift(editRow);
  }

  await interaction.update({ embeds: [embed], components: rows }).catch(async () => {
    await interaction.reply({ embeds: [embed], components: rows, flags: 64 });
  });
}

async function handleAddCategory(interaction, guildId) {
  const modal = new ModalBuilder().setCustomId('cp_modal_add_cat').setTitle('إضافة قسم جديد');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_label').setLabel('اسم القسم').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: طلب سكريبت | Script Request')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_emoji').setLabel('الإيموجي (اختياري)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('🎫')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_desc').setLabel('الوصف (اختياري)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('وصف قصير للقسم')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_role').setLabel('معرّف الرول المخصص (اختياري)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('123456789012345678')
    ),
  );
  await interaction.showModal(modal);
}

async function handleAddCatModal(interaction, guildId) {
  const label = interaction.fields.getTextInputValue('cat_label').trim();
  const emoji = interaction.fields.getTextInputValue('cat_emoji').trim() || '🎫';
  const desc  = interaction.fields.getTextInputValue('cat_desc').trim();
  const role  = interaction.fields.getTextInputValue('cat_role').trim();

  const id = label.replace(/[^a-z0-9\u0600-\u06FF]/gi, '-').toLowerCase().slice(0, 30) + '-' + Date.now().toString(36);

  const settings = getSettings(guildId);
  const cats = settings.categories || [];
  cats.push({ id, label, emoji, description: desc, roleId: role || null });
  updateSettings(guildId, { categories: cats });

  await interaction.reply({ content: `✅ تم إضافة القسم: **${label}**`, flags: 64 });
}

async function handleEditCatSelect(interaction, guildId) {
  const catId = interaction.values[0];
  const settings = getSettings(guildId);
  const cat = (settings.categories || []).find(c => c.id === catId);
  if (!cat) return interaction.reply({ content: '❌ القسم غير موجود.', flags: 64 });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cp_edit_cat_${catId}`).setLabel('تعديل').setEmoji('✏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`cp_del_cat_${catId}`).setLabel('حذف').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle(`📂 ${cat.label}`)
        .addFields(
          { name: '🆔 المعرّف', value: cat.id, inline: true },
          { name: '🎨 الإيموجي', value: cat.emoji || 'لا يوجد', inline: true },
          { name: '📝 الوصف', value: cat.description || 'لا يوجد', inline: false },
          { name: '👑 الرول', value: cat.roleId ? `<@&${cat.roleId}>` : 'غير محدد', inline: true },
        )
        .setColor(0x5865f2)
        .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    ],
    components: [row],
  });
}

async function handleEditCategory(interaction, guildId, catId) {
  const settings = getSettings(guildId);
  const cat = (settings.categories || []).find(c => c.id === catId);
  if (!cat) return interaction.reply({ content: '❌ القسم غير موجود.', flags: 64 });

  const modal = new ModalBuilder().setCustomId(`cp_modal_edit_cat_${catId}`).setTitle('تعديل القسم');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_label').setLabel('اسم القسم').setStyle(TextInputStyle.Short).setRequired(true).setValue(cat.label)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_emoji').setLabel('الإيموجي').setStyle(TextInputStyle.Short).setRequired(false).setValue(cat.emoji || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_desc').setLabel('الوصف').setStyle(TextInputStyle.Short).setRequired(false).setValue(cat.description || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_role').setLabel('معرّف الرول').setStyle(TextInputStyle.Short).setRequired(false).setValue(cat.roleId || '')
    ),
  );
  await interaction.showModal(modal);
}

async function handleEditCatModal(interaction, guildId, catId) {
  const label = interaction.fields.getTextInputValue('cat_label').trim();
  const emoji = interaction.fields.getTextInputValue('cat_emoji').trim() || '🎫';
  const desc  = interaction.fields.getTextInputValue('cat_desc').trim();
  const role  = interaction.fields.getTextInputValue('cat_role').trim();

  const settings = getSettings(guildId);
  const cats = (settings.categories || []).map(c =>
    c.id === catId ? { ...c, label, emoji, description: desc, roleId: role || null } : c
  );
  updateSettings(guildId, { categories: cats });

  await interaction.reply({ content: `✅ تم تعديل القسم: **${label}**`, flags: 64 });
}

async function handleDeleteCategory(interaction, guildId, catId) {
  const settings = getSettings(guildId);
  const cats = (settings.categories || []).filter(c => c.id !== catId);
  updateSettings(guildId, { categories: cats });
  await interaction.update({
    embeds: [new EmbedBuilder().setDescription('✅ تم حذف القسم بنجاح.').setColor(0x57f287)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
      )
    ],
  });
}

// ══════════════════════════════════════════════════════════════
//  اختيار روم اللوغات / التقييم
// ══════════════════════════════════════════════════════════════
async function handleChannelSelector(interaction, guildId, type) {
  const channels = interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText)
    .first(25);

  if (!channels.length) {
    return interaction.update({ embeds: [new EmbedBuilder().setDescription('❌ لا توجد قنوات نصية.').setColor(0xed4245)], components: [] });
  }

  const opts = [...channels.values()].map(c => ({ label: `# ${c.name}`, value: c.id }));
  const customId = type === 'logs' ? 'cp_select_logsroom' : 'cp_select_ratingsroom';
  const title    = type === 'logs' ? '📋 اختر روم اللوغات' : '⭐ اختر روم التقييم';

  const row  = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('اختر قناة...').addOptions(opts)
  );
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [new EmbedBuilder().setTitle(title).setColor(0x5865f2).setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })],
    components: [row, back],
  });
}

async function handleLogsRoomSelect(interaction, guildId) {
  updateSettings(guildId, { logsChannelId: interaction.values[0] });
  await interaction.update({
    embeds: [new EmbedBuilder().setDescription(`✅ تم تحديد روم اللوغات: <#${interaction.values[0]}>`).setColor(0x57f287)],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary))],
  });
}

async function handleRatingsRoomSelect(interaction, guildId) {
  updateSettings(guildId, { ratingsChannelId: interaction.values[0] });
  await interaction.update({
    embeds: [new EmbedBuilder().setDescription(`✅ تم تحديد روم التقييم: <#${interaction.values[0]}>`).setColor(0x57f287)],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary))],
  });
}

// ══════════════════════════════════════════════════════════════
//  اختيار كاتاغوري التذاكر
// ══════════════════════════════════════════════════════════════
async function handleCategorySelector(interaction, guildId) {
  const cats = interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .first(25);

  if (!cats.length) {
    return interaction.update({ embeds: [new EmbedBuilder().setDescription('❌ لا توجد كاتاغوري.').setColor(0xed4245)], components: [] });
  }

  const opts = [...cats.values()].map(c => ({ label: c.name, value: c.id }));
  const row  = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('cp_select_ticketcat').setPlaceholder('اختر الكاتاغوري...').addOptions(opts)
  );
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [new EmbedBuilder().setTitle('📁 اختر كاتاغوري التذاكر').setColor(0x5865f2).setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })],
    components: [row, back],
  });
}

async function handleTicketCatSelect(interaction, guildId) {
  updateSettings(guildId, { categoryId: interaction.values[0] });
  await interaction.update({
    embeds: [new EmbedBuilder().setDescription(`✅ تم تحديد الكاتاغوري: <#${interaction.values[0]}>`).setColor(0x57f287)],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary))],
  });
}

// ══════════════════════════════════════════════════════════════
//  رولات الستاف
// ══════════════════════════════════════════════════════════════
async function handleRolesInput(interaction, guildId) {
  const modal = new ModalBuilder().setCustomId('cp_modal_roles').setTitle('تحديد رولات الستاف');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('role_ids')
        .setLabel('معرّفات الرولات مفصولة بفاصلة')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('123456789, 987654321')
    )
  );
  await interaction.showModal(modal);
}

async function handleRolesModal(interaction, guildId) {
  const roleIds = interaction.fields.getTextInputValue('role_ids')
    .split(',')
    .map(r => r.trim().replace(/[<@&>]/g, ''))
    .filter(Boolean);
  updateSettings(guildId, { staffRoleIds: roleIds });
  await interaction.reply({ content: `✅ تم تحديث رولات الستاف: ${roleIds.map(r => `<@&${r}>`).join(', ')}`, flags: 64 });
}

// ══════════════════════════════════════════════════════════════
//  إرسال واجهة التذاكر
// ══════════════════════════════════════════════════════════════
async function handleSendPanel(interaction, client, guildId) {
  const settings = getSettings(guildId);
  if (!settings.categories || !settings.categories.length) {
    return interaction.reply({ content: '❌ لا يوجد أقسام. أضف أقساماً أولاً من "إدارة الأقسام".', flags: 64 });
  }
  try {
    await sendTicketPanel(interaction.channel, settings, guildId);
    await interaction.reply({ content: '✅ تم إرسال واجهة التذاكر بنجاح!', flags: 64 });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: `❌ خطأ: ${err.message}`, flags: 64 });
  }
}

// ══════════════════════════════════════════════════════════════
//  زر الرجوع
// ══════════════════════════════════════════════════════════════
async function handleBack(interaction, client) {
  await showMainPanel(interaction, client, true);
}

// ══════════════════════════════════════════════════════════════
//  لوحة تحكم التذاكر (Ticket Control Panel)
// ══════════════════════════════════════════════════════════════
async function handleTCPRefresh(interaction, client, guildId) {
  const settings = getSettings(guildId);
  if (!settings.categories || !settings.categories.length) {
    return interaction.reply({ content: '❌ لا يوجد أقسام لإرسال الواجهة.', flags: 64 });
  }

  if (settings.ticketPanelChannelId) {
    const ch = interaction.guild.channels.cache.get(settings.ticketPanelChannelId);
    if (ch) {
      try {
        if (settings.ticketPanelMessageId) {
          const msg = await ch.messages.fetch(settings.ticketPanelMessageId).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
        await sendTicketPanel(ch, settings, guildId);
        return interaction.reply({ content: '✅ تم تحديث واجهة التذاكر بنجاح!', flags: 64 });
      } catch {}
    }
  }

  await interaction.reply({ content: '❌ لم يتم العثور على قناة الواجهة. أرسلها يدوياً من لوحة التحكم.', flags: 64 });
}

async function handleTCPStats(interaction, guildId) {
  const tickets = readJSON('tickets');
  const guildTickets = Object.values(tickets).filter(t => t.guildId === guildId);
  const open   = guildTickets.filter(t => t.status === 'open').length;
  const closed = guildTickets.filter(t => t.status === 'closed').length;
  const rated  = guildTickets.filter(t => t.rating).length;
  const avgRating = rated
    ? (guildTickets.filter(t => t.rating).reduce((a, t) => a + t.rating, 0) / rated).toFixed(1)
    : 'لا يوجد';

  const embed = new EmbedBuilder()
    .setTitle('📊 إحصائيات التذاكر')
    .addFields(
      { name: '🎫 الإجمالي',    value: `**${guildTickets.length}**`, inline: true },
      { name: '🟢 مفتوحة',     value: `**${open}**`,   inline: true },
      { name: '🔒 مغلقة',      value: `**${closed}**`, inline: true },
      { name: '⭐ متوسط التقييم', value: `**${avgRating}**`, inline: true },
      { name: '📝 عدد التقييمات', value: `**${rated}**`, inline: true },
    )
    .setColor(0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleTCPCloseAll(interaction, client, guildId) {
  await interaction.reply({ content: '⚠️ هذا الأمر سيغلق جميع التذاكر المفتوحة. تأكد من أن هذا ما تريده.', flags: 64 });
}
