const { test } = require('node:test');
const assert = require('node:assert/strict');

const PLURAL = /\.(one|few|many)$/;
const placeholders = (text) => new Set(String(text).match(/\{\w+(?::[SPU])?\}/g) || []);
const load = async (locale) => (await import(`../lib/locales/${locale}.js`)).default;

test('every language has exactly the English keys and placeholders', async () => {
  const { LOCALES } = await import('../lib/i18n.js');
  const en = await load('en');
  for (const locale of LOCALES) {
    const own = await load(locale);
    // Plural categories come from the language, e.g. Russian "few"/"many" (Intl.PluralRules).
    const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
    for (const key of Object.keys(en)) {
      if (PLURAL.test(key)) continue;
      assert.ok(key in own, `${locale}: missing "${key}"`);
      assert.deepEqual(placeholders(own[key]), placeholders(en[key]), `${locale}: placeholders of "${key}"`);
    }
    for (const key of Object.keys(en).filter((name) => name.endsWith('.one'))) {
      const base = key.slice(0, -4);
      for (const category of categories.filter((name) => name !== 'other'))
        assert.ok(`${base}.${category}` in own, `${locale}: missing plural "${base}.${category}"`);
    }
    for (const [key, text] of Object.entries(own)) {
      const match = key.match(PLURAL);
      const base = match ? key.slice(0, -match[0].length) : key;
      assert.ok(base in en, `${locale}: unknown key "${key}"`);
      if (!match) continue;
      assert.ok(categories.includes(match[1]), `${locale}: "${key}" is not a plural form of this language`);
      for (const name of placeholders(text)) assert.ok(placeholders(en[base]).has(name), `${locale}: "${key}" uses ${name}`);
      // "one" also covers 21, 31, … in these languages, so it must print the number.
      if (match[1] === 'one' && new Intl.PluralRules(locale).select(21) === 'one' && placeholders(en[base]).has('{count}'))
        assert.ok(placeholders(text).has('{count}'), `${locale}: "${key}" must print {count}`);
    }
  }
});

test('plural forms follow the language', async () => {
  const { formatMessage } = await import('../lib/i18n.js');
  const messages = { item: '{count} other', 'item.one': 'one {count}', 'item.few': 'few {count}', 'item.many': 'many {count}' };
  assert.equal(formatMessage(messages, 'en', 'item', { count: 1 }), 'one 1');
  assert.equal(formatMessage(messages, 'en', 'item', { count: 21 }), '21 other');
  assert.deepEqual([1, 3, 5, 21, 22, 25].map((count) => formatMessage(messages, 'ru', 'item', { count })),
    ['one 1', 'few 3', 'many 5', 'one 21', 'few 22', 'many 25']);
  assert.equal(formatMessage(messages, 'ru', 'missing', { count: 2 }), 'missing');
});
