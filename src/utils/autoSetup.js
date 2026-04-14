const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getSettings, updateSettings } = require('./guildSettings');
const { ICON_URL, BANNER_URL } = require('./ticketManager');

const MAIN_GUILD_ID = '1265834107783483404';
const MAIN_CATEGORY_ID = '1492635837718986942';
const LOGS_CHANNEL_ID = '1492996007762596061';
const RATINGS_CHANNEL_ID = '1492996586647584808';
const STAFF_ROLE_ID = '1492994348239949996';

const DEFAULT_CATEGORIES = [
  {
    id: 'script-request',
    label: 'طلب سكريبت | Script Request',
    emoji: { id: '1492814794603106375', name: 'script' },
    roleId: '1493224773424123944',
    description: 'طلب سكريبت أو خدمة برمجية',
  },
  {
    id: 'purchase-rank',
    label: 'شراء رتبة | Purchase Rank',
    emoji: { id: '1492814850211057835', name: 'rank' },
    roleId: '1493224903468519504',
    description: 'شراء رتبة في السيرفر',
  },
  {
    id: 'technical-support',
    label: 'الدعم الفني | Technical Support',
    emoji: { id: '1492816722728849519', name: 'support' },
    roleId: '1493225104933650532',
    description: 'مساعدة ودعم تقني',
  },
  {
    id: 'advertisement',
    label: 'إعلان / تعاون | Advertisement',
    emoji: { id: '1492814757592301586', name: 'ad' },
    roleId: '1493225257752858764',
    description: 'إعلان أو طلب تعاون',
  },
  {
    id: 'purchase-bot',
    label: 'شراء بوت | Purchase Bot',
    emoji: { id: '1492814925490557028', name: 'bot' },
    roleId: '1493225361021075566',
    description: 'شراء بوت ديسكورد',
  },
  {
    id: 'purchase-design',
    label: 'شراء تصميم | Purchase Design',
    emoji: { id: '1492814850211057835', name: 'design' },
    roleId: '1493225468374159380',
    description: 'شراء تصميم احترافي',
  },
  {
    id: 'apply',
    label: 'التقديم للإدارة | Apply',
    emoji: { id: '1492945718393049089', name: 'apply' },
    roleId: '1493225659953315840',
    description: 'التقديم لفريق الإدارة',
  },
];

module.exports = async function autoSetup(client) {
  const guild = client.guilds.cache.get(MAIN_GUILD_ID);
  if (!guild) return console.warn('⚠️ السيرفر الرئيسي غير موجود');

  const settings = updateSettings(MAIN_GUILD_ID, {
    categories: DEFAULT_CATEGORIES,
    logsChannelId: LOGS_CHANNEL_ID,
    ratingsChannelId: RATINGS_CHANNEL_ID,
    categoryId: MAIN_CATEGORY_ID,
    staffRoleIds: [STAFF_ROLE_ID],
  });

  try {
    const ticketsChannel =
      guild.channels.cache.find(c => c.parentId === MAIN_CATEGORY_ID && c.name.toLowerCase().includes('ticket')) ||
      guild.channels.cache.find(c => c.parentId === MAIN_CATEGORY_ID);

    if (!ticketsChannel) {
      return console.warn('⚠️ لا توجد قناة في كاتاغوري التذاكر — استخدم /panel يدوياً');
    }

    await sendTicketPanel(ticketsChannel, settings, MAIN_GUILD_ID);
    console.log('✅ تم إرسال واجهة التذاكر للسيرفر الرئيسي');
  } catch (err) {
    console.error('❌ خطأ في الإعداد التلقائي:', err.message);
  }
};

async function sendTicketPanel(channel, settings, guildId) {
  const categories = (settings.categories && settings.categories.length)
    ? settings.categories
    : DEFAULT_CATEGORIES;

  const embed = new EmbedBuilder()
    .setTitle('𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭 — نظام التذاكر')
    .setDescription(
      'مرحباً بك في نظام الدعم 👋\n' +
      'من خلال هذا النظام يمكنك التواصل مع الفريق لحل مشكلتك أو طلب خدمة.\n\n' +
      'اختر القسم المناسب من القائمة أدناه.\n\n' +
      '⚠️ **تنبيهات مهمة:**\n' +
      '• اختر القسم المناسب لطلبك\n' +
      '• كن واضحاً في شرح مشكلتك\n' +
      '• لا تفتح تذكرة بدون سبب حقيقي\n' +
      '• لا تنتاج الإدارة داخل التذكرة'
    )
    .setColor(0x2b2d31)
    .setThumbnail(ICON_URL)
    .setImage(BANNER_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const options = categories.map(cat => ({
    label: cat.label,
    value: cat.id,
    emoji: cat.emoji || '🎫',
    description: cat.description || '',
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_create')
    .setPlaceholder('اختر قسماً لفتح تذكرة...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);
  const msg = await channel.send({ embeds: [embed], components: [row] });

  updateSettings(guildId, {
    ticketPanelMessageId: msg.id,
    ticketPanelChannelId: channel.id,
  });

  return msg;
}

module.exports.sendTicketPanel = sendTicketPanel;
module.exports.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
