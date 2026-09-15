const fs = require('fs');
const content = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
const startIndex = content.indexOf('function BookingModal(');
const endIndex = content.indexOf('\nfunction FinishModal(');
console.log(content.slice(startIndex, endIndex));
