import * as fs from 'fs';
const buffer = fs.readFileSync('public/bob.fbx');
let currentString = '';
const strings: string[] = [];
for (let i = 0; i < buffer.length; i++) {
  const byte = buffer[i];
  if (byte >= 32 && byte <= 126) {
    currentString += String.fromCharCode(byte);
  } else {
    if (currentString.length >= 4) {
      strings.push(currentString);
    }
    currentString = '';
  }
}
const matched = strings.filter(s => /mixamo|head|eye|blink/i.test(s));
console.log(matched.slice(0, 30));
