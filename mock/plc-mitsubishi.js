'use strict';
// 三菱 MELSEC MC プロトコル 3E フレーム（バイナリモード）モックサーバー
// 対応コマンド: 一括読出し (0x0401)、ワードサブコマンド (0x0000)
// 接続先設定: host=127.0.0.1  port=8502 (PORT_MITSUBISHI 環境変数で変更可)
const net = require('net');

const PORT = parseInt(process.env.PORT_MITSUBISHI || '8502', 10);

// デバイスコード定義（mitsubishi.rs の DeviceCode と一致）
const DEVICE = { 0xA8: 'D', 0x90: 'M', 0xB4: 'W', 0x9C: 'X', 0x9D: 'Y', 0xA0: 'B' };

// デバイスメモリ（符号付き 16 bit）
const memory = {
  D: new Int16Array(8001),
  M: new Int16Array(8192),
  W: new Int16Array(2048),
  X: new Int16Array(2048),
  Y: new Int16Array(2048),
  B: new Int16Array(2048),
};
for (let i = 0; i < 8001; i++) memory.D[i] = i % 1000;
for (let i = 0; i < 8192; i++) memory.M[i] = i % 2;

// D1000 を 500ms ごとに ±5 変動させる（ポーリング動態テスト用）
setInterval(() => {
  memory.D[1000] = memory.D[1000] + (Math.random() < 0.5 ? 5 : -5);
}, 500);

// 3E フレームリクエストを解析して応答バッファを返す。
// エラー時は null を返す。
function buildResponse(req) {
  // 最小フレーム長チェック（ヘッダ 9 バイト + リクエストデータ 12 バイト = 21 バイト）
  if (req.length < 21) return null;

  // サブヘッダ: 0x50 0x00
  if (req[0] !== 0x50 || req[1] !== 0x00) {
    console.error('[Mitsub. Mock] 不正なサブヘッダ');
    return null;
  }

  const command = req.readUInt16LE(11);
  const subCommand = req.readUInt16LE(13);
  const headDevice = req[15] | (req[16] << 8) | (req[17] << 16);
  const deviceCode = req[18];
  const devName = DEVICE[deviceCode];

  if (!devName) {
    console.error(`[Mitsub. Mock] 未対応デバイスコード: 0x${deviceCode.toString(16)}`);
    return null;
  }

  const store = memory[devName];

  // 一括読出し (0x0401)
  if (command === 0x0401 && subCommand === 0x0000) {
    const numPoints = req.readUInt16LE(19);
    console.log(`[Mitsub. Mock] 読出要求: ${devName}${headDevice}  点数=${numPoints}`);

    const dataLen = 2 + numPoints * 2;
    const total = 9 + dataLen;
    const res = Buffer.alloc(total, 0);

    res.writeUInt16LE(0x0080, 0);
    res.writeUInt8(0x00, 2);
    res.writeUInt8(0xFF, 3);
    res.writeUInt16LE(0x03FF, 4);
    res.writeUInt8(0x00, 6);
    res.writeUInt16LE(dataLen, 7);
    res.writeUInt16LE(0x0000, 9); // 終了コード: 正常

    for (let i = 0; i < numPoints; i++) {
      const addr = headDevice + i;
      const val = addr < store.length ? store[addr] : 0;
      res.writeInt16LE(val, 11 + i * 2);
    }
    return res;
  }

  // 一括書込み (0x1401)
  if (command === 0x1401 && subCommand === 0x0000) {
    const numPoints = req.readUInt16LE(19);
    console.log(`[Mitsub. Mock] 書込要求: ${devName}${headDevice}  点数=${numPoints}`);

    for (let i = 0; i < numPoints; i++) {
      const addr = headDevice + i;
      const val = req.readInt16LE(21 + i * 2);
      if (addr < store.length) {
        store[addr] = val;
        console.log(`  [Write] ${devName}${addr} = ${val}`);
      }
    }

    // 書込みレスポンス: ヘッダ(9) + 終了コード(2)
    const res = Buffer.alloc(11, 0);
    res.writeUInt16LE(0x0080, 0);
    res.writeUInt8(0x00, 2);
    res.writeUInt8(0xFF, 3);
    res.writeUInt16LE(0x03FF, 4);
    res.writeUInt8(0x00, 6);
    res.writeUInt16LE(0x0002, 7); // データ長: 2 (終了コードのみ)
    res.writeUInt16LE(0x0000, 9); // 終了コード: 正常
    return res;
  }

  console.error(`[Mitsub. Mock] 未対応コマンド: 0x${command.toString(16)} / 0x${subCommand.toString(16)}`);
  return null;
}

const server = net.createServer((socket) => {
  const peer = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[Mitsub. Mock] 接続: ${peer}`);
  let rxBuf = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    rxBuf = Buffer.concat([rxBuf, chunk]);

    // ヘッダ 9 バイト揃ったら dataLen を読み、フレーム全体を処理する
    while (rxBuf.length >= 9) {
      const dataLen = rxBuf.readUInt16LE(7);
      const frameLen = 9 + dataLen;
      if (rxBuf.length < frameLen) break;
      const req = rxBuf.slice(0, frameLen);
      rxBuf = rxBuf.slice(frameLen);
      const res = buildResponse(req);
      if (res) {
        socket.write(res);
      }
    }
  });

  socket.on('end', () => console.log(`[Mitsub. Mock] 切断: ${peer}`));
  socket.on('error', (e) => console.error(`[Mitsub. Mock] エラー: ${e.message}`));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Mitsub. Mock] 起動中 — port ${PORT}`);
  console.log('  接続設定: host=127.0.0.1  port=' + PORT);
  console.log('  対応デバイス: D(0xA8) M(0x90) W(0xB4) X(0x9C) Y(0x9D) B(0xA0)');
  console.log('  D1000 は 500ms ごとに ±5 変動（ポーリングテスト用）');
});
