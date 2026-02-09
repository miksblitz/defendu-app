const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'FIREBASE_DATABASE_RULES.json');
const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

data.rules.userProgress = {
  $uid: {
    '.read': '$uid === auth.uid',
    '.write': '$uid === auth.uid',
  },
};

data.rules.recommendations = {
  $uid: {
    '.read': '$uid === auth.uid',
    '.write': 'auth.uid !== null && root.child("users").child(auth.uid).child("role").val() === "admin"',
  },
};

fs.writeFileSync(rulesPath, JSON.stringify(data));
console.log('Added userProgress and recommendations rules to FIREBASE_DATABASE_RULES.json');
