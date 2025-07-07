const fs = require('fs');
fs.writeFileSync('prospects.csv', 'name,email,website\nJohn Doe,john@example.com,https://example.com', { encoding: 'utf8' });
console.log('prospects.csv written as UTF-8.'); 