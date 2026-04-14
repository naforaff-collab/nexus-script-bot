const { readJSON, writeJSON } = require('./database');

const DEFAULTS = {
  categories: [],
  logsChannelId: null,
  ratingsChannelId: null,
  categoryId: null,
  staffRoleIds: [],
  ticketCounter: 0,
  ticketPanelMessageId: null,
  ticketPanelChannelId: null,
};

function getSettings(guildId) {
  const all = readJSON('settings');
  return all[guildId] ? { ...DEFAULTS, ...all[guildId] } : { ...DEFAULTS };
}

function saveSettings(guildId, settings) {
  const all = readJSON('settings');
  all[guildId] = settings;
  writeJSON('settings', all);
}

function updateSettings(guildId, patch) {
  const current = getSettings(guildId);
  const updated = { ...current, ...patch };
  saveSettings(guildId, updated);
  return updated;
}

module.exports = { getSettings, saveSettings, updateSettings };
