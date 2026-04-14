const path = require('path');
const fs = require('fs');

async function connectDB() {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ قاعدة البيانات JSON جاهزة');
}

function getDataPath(name) {
  return path.join(__dirname, '../../data', `${name}.json`);
}

function readJSON(name) {
  const p = getDataPath(name);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function writeJSON(name, data) {
  fs.writeFileSync(getDataPath(name), JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { connectDB, readJSON, writeJSON };
