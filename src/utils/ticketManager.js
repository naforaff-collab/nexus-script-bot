const { readJSON, writeJSON } = require('./database');
const { getSettings, updateSettings } = require('./guildSettings');

const ICON_URL = 'https://cdn.discordapp.com/attachments/1241152019486478427/1492826656442679316/file_0000000091487246bc37e16aae09f1c7.png';
const BANNER_URL = 'https://media.discordapp.net/attachments/1241152019486478427/1492991748128112640/file_00000000136c724393bc96e73ad6a198.png';

function getTickets() { return readJSON('tickets'); }
function saveTickets(data) { writeJSON('tickets', data); }

function getTicket(channelId) {
  return getTickets()[channelId] || null;
}

function createTicketRecord(channelId, data) {
  const tickets = getTickets();
  tickets[channelId] = data;
  saveTickets(tickets);
}

function updateTicket(channelId, patch) {
  const tickets = getTickets();
  if (!tickets[channelId]) return null;
  tickets[channelId] = { ...tickets[channelId], ...patch };
  saveTickets(tickets);
  return tickets[channelId];
}

function deleteTicketRecord(channelId) {
  const tickets = getTickets();
  delete tickets[channelId];
  saveTickets(tickets);
}

function nextTicketNumber(guildId) {
  const settings = getSettings(guildId);
  const num = (settings.ticketCounter || 0) + 1;
  updateSettings(guildId, { ticketCounter: num });
  return num;
}

async function generateTranscript(channel) {
  try {
    const messages = [];
    let lastId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const fetched = await channel.messages.fetch(options);
      if (fetched.size === 0) break;

      messages.push(...fetched.values());
      lastId = fetched.last().id;
      if (fetched.size < 100) break;
    }

    messages.reverse();

    const lines = messages.map(m => {
      const time = new Date(m.createdTimestamp).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
      const author = `${m.author.tag}`;
      const content = m.content || (m.embeds.length ? '[Embed]' : (m.attachments.size ? '[مرفق]' : ''));
      return `[${time}] ${author}: ${content}`;
    });

    return lines.join('\n');
  } catch {
    return 'تعذّر إنشاء السجل.';
  }
}

module.exports = {
  ICON_URL,
  BANNER_URL,
  getTicket,
  createTicketRecord,
  updateTicket,
  deleteTicketRecord,
  nextTicketNumber,
  generateTranscript,
};
