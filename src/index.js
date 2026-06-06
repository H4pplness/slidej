const { generate } = require('./generators/index');
const { parse } = require('./parsers/index');
const fs = require('fs');
const path = require('path');

function getCustomTemplateDir() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, '.slidej', 'templates');
}

function listTemplates() {
  const builtinDir = path.join(__dirname, '..', 'templates');
  const customDir = getCustomTemplateDir();
  const map = new Map();

  for (const dir of [builtinDir, customDir]) {
    if (!fs.existsSync(dir)) continue;
    const source = dir === builtinDir ? 'builtin' : 'custom';
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        data._source = source;
        if (!data.name) data.name = path.basename(f, '.json');
        map.set(data.name, data);
      } catch { /* skip invalid */ }
    }
  }

  return Array.from(map.values());
}

function getTemplate(name) {
  const all = listTemplates();
  return all.find(t => t.name === name) || null;
}

module.exports = { generate, parse, listTemplates, getTemplate };
