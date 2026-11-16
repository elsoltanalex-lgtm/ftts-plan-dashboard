const fs = require('fs');

const defXml = fs.readFileSync('server/data/orange_extracted/xl/pivotCache/pivotCacheDefinition1.xml', 'utf8');
const recXml = fs.readFileSync('server/data/orange_extracted/xl/pivotCache/pivotCacheRecords1.xml', 'utf8');

// Parse cacheFields
const fieldRegex = /<cacheField name="([^"]+)"[^>]*>([\s\S]*?)<\/cacheField>/g;
let match;
const fields = [];

while ((match = fieldRegex.exec(defXml)) !== null) {
  const name = match[1];
  const body = match[2];

  // Extract sharedItems
  const items = [];
  const itemRegex = /<s v="([^"]*)"\/>|<n v="([^"]*)"\/>|<m\/>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(body)) !== null) {
    if (itemMatch[0] === '<m/>') {
      items.push('');
    } else {
      let val = itemMatch[1] !== undefined ? itemMatch[1] : itemMatch[2];
      val = val.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      items.push(val);
    }
  }
  fields.push({ name, items });
}

// Parse records
const rRegex = /<r>([\s\S]*?)<\/r>/g;
let rMatch;
const records = [];

while ((rMatch = rRegex.exec(recXml)) !== null) {
  const inner = rMatch[1];
  const tagRegex = /<([sxnmb])(?: v="([^"]*)")?\/>/g;
  let tagMatch;
  let colIdx = 0;
  const record = {};

  while ((tagMatch = tagRegex.exec(inner)) !== null) {
    const tagName = tagMatch[1];
    let val = tagMatch[2];
    const field = fields[colIdx];
    const fieldName = field ? field.name : `Field_${colIdx}`;

    if (tagName === 'x') {
      const idx = parseInt(val, 10);
      record[fieldName] = (field && field.items[idx] !== undefined) ? field.items[idx] : val;
    } else if (tagName === 'm') {
      record[fieldName] = '';
    } else if (val !== undefined) {
      val = val.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      record[fieldName] = val;
    } else {
      record[fieldName] = '';
    }
    colIdx++;
  }
  records.push(record);
}

console.log('Successfully parsed', records.length, 'Orange records.');

// Classification summary
const classificationCounts = {};
const statusCounts = {};

records.forEach(r => {
  const c = r['التصنيف (مدني)'] || 'غير محدد';
  classificationCounts[c] = (classificationCounts[c] || 0) + 1;
});

console.log('Civil Classifications:');
console.log(classificationCounts);

fs.writeFileSync('server/data/Orange.json', JSON.stringify(records, null, 2), 'utf8');
console.log('Saved to server/data/Orange.json');

