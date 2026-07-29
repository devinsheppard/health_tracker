const fs = require('fs');
const path = require('path');

const size = 256;
const headerSize = 40;
const xorSize = size * size * 4;
const andStride = Math.ceil(size / 32) * 4;
const andSize = andStride * size;
const dibSize = headerSize + xorSize + andSize;
const icoSize = 6 + 16 + dibSize;
const buf = Buffer.alloc(icoSize);
let offset = 0;

buf.writeUInt16LE(0, offset); offset += 2;
buf.writeUInt16LE(1, offset); offset += 2;
buf.writeUInt16LE(1, offset); offset += 2;
buf.writeUInt8(size === 256 ? 0 : size, offset++);
buf.writeUInt8(size === 256 ? 0 : size, offset++);
buf.writeUInt8(0, offset++);
buf.writeUInt8(0, offset++);
buf.writeUInt16LE(1, offset); offset += 2;
buf.writeUInt16LE(32, offset); offset += 2;
buf.writeUInt32LE(dibSize, offset); offset += 4;
buf.writeUInt32LE(22, offset); offset += 4;

buf.writeUInt32LE(headerSize, offset); offset += 4;
buf.writeInt32LE(size, offset); offset += 4;
buf.writeInt32LE(size * 2, offset); offset += 4;
buf.writeUInt16LE(1, offset); offset += 2;
buf.writeUInt16LE(32, offset); offset += 2;
buf.writeUInt32LE(0, offset); offset += 4;
buf.writeUInt32LE(xorSize + andSize, offset); offset += 4;
buf.writeInt32LE(0, offset); offset += 4;
buf.writeInt32LE(0, offset); offset += 4;
buf.writeUInt32LE(0, offset); offset += 4;
buf.writeUInt32LE(0, offset); offset += 4;

for (let y = size - 1; y >= 0; y--) {
  for (let x = 0; x < size; x++) {
    const dx = x - size / 2;
    const dy = y - size / 2;
    const d = Math.sqrt(dx * dx + dy * dy);
    const inCircle = d < 118;
    const inCross = (Math.abs(x - 127.5) < 22 && y > 58 && y < 198) || (Math.abs(y - 127.5) < 22 && x > 58 && x < 198);
    const pulse = y > 148 && y < 170 && x > 38 && x < 218 && Math.abs(y - (160 - Math.sin((x - 38) / 18) * 24)) < 7;
    const a = inCircle ? 255 : 0;
    const r = inCross || pulse ? 255 : 229;
    const g = inCross || pulse ? 255 : 72;
    const b = inCross || pulse ? 255 : 77;
    buf.writeUInt8(b, offset++);
    buf.writeUInt8(g, offset++);
    buf.writeUInt8(r, offset++);
    buf.writeUInt8(a, offset++);
  }
}

fs.mkdirSync(path.join(__dirname, '..', 'build'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'build', 'icon.ico'), buf);
console.log('Created build/icon.ico');
