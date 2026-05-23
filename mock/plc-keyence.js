'use strict';
// キーエンス KV シリーズ 上位リンク通信 モックサーバー
// プロトコル: ASCII テキスト TCP、CRLF 終端
// 接続先設定: host=127.0.0.1  port=8501 (PORT_KEYENCE 環境変数で変更可)
const net = require('net');

const PORT = parseInt(process.env.PORT_KEYENCE || '8501', 10);

// デバイスメモリ: DM / CM / TM の 0〜2000 番地
const memory = { DM: new Int16Array(2001), CM: new Int16Array(1000), TM: new Int16Array(512) };
for (let i = 0; i <= 2000; i++) memory.DM[i] = i % 1000;
for (let i = 0; i < 1000; i++) memory.CM[i] = i;
for (let i = 0; i < 512; i++) memory.TM[i] = i * 10;

// DM1000 を毎秒 ±1 変動させる（ポーリング動態テスト用）
setInterval(() => {
  memory.DM[1000] = memory.DM[1000] + (Math.random() < 0.5 ? 1 : -1);
}, 1000);

// デバイス名 → メモリ配列を返す。未対応なら null
function getStore(device) {
  return memory[device.toUpperCase()] || null;
}

// 1 コマンド行を処理して応答文字列を返す
function handleCommand(line) {
  // コマンド形式: RDS DM1000.U 10  /  WRS DM1000.U 1 500
  const m = line.match(/^(RDS|WRS)\s+([A-Z]+)(\d+)\.([USB])\s+(\d+)(.*)/i);
  if (!m) return '!1'; // コマンドエラー

  const [, cmd, dev, numStr, , countStr, rest] = m;
  const device = dev.toUpperCase();
  const start = parseInt(numStr, 10);
  const count = parseInt(countStr, 10);
  const store = getStore(device);

  if (!store) return '!0'; // デバイスコードエラー

  if (cmd.toUpperCase() === 'RDS') {
    const values = [];
    for (let i = 0; i < count; i++) {
      const addr = start + i;
      values.push(addr < store.length ? store[addr] : 0);
    }
    return values.join(' ');
  }

  if (cmd.toUpperCase() === 'WRS') {
    // WRS DM1000.U 1 500  -> rest = " 500"
    const writeTokens = rest.trim().split(/\s+/);
    for (let i = 0; i < count; i++) {
      const addr = start + i;
      const val = parseInt(writeTokens[i] || '0', 10);
      if (addr < store.length) store[addr] = val;
    }
    return 'OK';
  }

  return '!1';
}

const server = net.createServer((socket) => {
  const peer = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[Keyence Mock] 接続: ${peer}`);
  let buf = '';

  socket.on('data', (chunk) => {
    buf += chunk.toString();
    let idx;
    while ((idx = buf.indexOf('\r\n')) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (!line) continue;
      console.log(`[Keyence Mock] < ${line}`);
      const reply = handleCommand(line);
      console.log(`[Keyence Mock] > ${reply}`);
      socket.write(reply + '\r\n');
    }
  });

  socket.on('end', () => console.log(`[Keyence Mock] 切断: ${peer}`));
  socket.on('error', (e) => console.error(`[Keyence Mock] エラー: ${e.message}`));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Keyence Mock] 起動中 — port ${PORT}`);
  console.log('  接続設定: host=127.0.0.1  port=' + PORT);
  console.log('  対応デバイス: DM0〜DM2000 / CM0〜CM999 / TM0〜TM511');
  console.log('  DM1000 は毎秒 ±1 変動（ポーリングテスト用）');
});
