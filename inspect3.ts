import * as fs from 'fs';
const data = fs.readFileSync('public/bob.fbx', 'utf-8');
const headMatches = data.match(/.{0,20}Head.{0,20}/gi) || [];
console.log(headMatches.slice(0, 10));
