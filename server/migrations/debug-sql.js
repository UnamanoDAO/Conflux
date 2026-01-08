const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '007_add_credit_system.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('SQL文件大小:', sql.length, '字节');
console.log('前200个字符:', sql.substring(0, 200));

const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log('\n分割后语句数:', statements.length);
console.log('\n前3条语句:');
statements.slice(0, 3).forEach((s, i) => {
  console.log(`\n${i + 1}. ${s.substring(0, 150)}...`);
});
