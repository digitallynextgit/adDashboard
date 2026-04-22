// Run once: node scripts/hash-password.js "your-password-here"
// Copy the output and add it to .env.local as AUTH_PASSWORD_HASH=<output>

const { scryptSync, randomBytes } = require("crypto");

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.js \"your-password\"");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

// console.log(`\nYour password hash (add this to .env.local):\n`);
// console.log(`AUTH_PASSWORD_HASH=${salt}:${hash}`);
// console.log(`\nDone. Keep your password safe — you won't be able to recover it from the hash.\n`);
