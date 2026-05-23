'use strict';
// mTLS 対応 HTTPS モックサーバー（REST API スタブ）
// 事前準備: bash mock/gen-certs.sh を実行して mock/certs/ を生成すること
// 接続設定: https://localhost:8443  (PORT_HTTPS 環境変数で変更可)
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT_HTTPS || '8443', 10);
const CERTS = path.join(__dirname, 'certs');

// 証明書ファイルの存在チェック
const required = ['server.key', 'server.crt', 'ca.crt'];
const missing = required.filter((f) => !fs.existsSync(path.join(CERTS, f)));
if (missing.length > 0) {
  console.error('[HTTPS Mock] 証明書ファイルが見つかりません: ' + missing.join(', '));
  console.error('[HTTPS Mock] 先に  bash mock/gen-certs.sh  を実行してください。');
  process.exit(1);
}

const tlsOptions = {
  key: fs.readFileSync(path.join(CERTS, 'server.key')),
  cert: fs.readFileSync(path.join(CERTS, 'server.crt')),
  ca: fs.readFileSync(path.join(CERTS, 'ca.crt')),
  requestCert: true,        // クライアント証明書の要求
  rejectUnauthorized: true, // CA で署名されていない証明書は拒否
};

// ルーティングテーブル
const routes = {
  'GET /health': (_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  },

  'GET /api/v1/dashboard/history': (_req, res) => {
    const body = {
      exportedAt: new Date().toISOString(),
      slots: [
        { slotId: 1, plcId: 'plc-keyence-01', deviceAddress: 'DM1000', description: 'ラインA温度' },
        { slotId: 2, plcId: 'plc-keyence-01', deviceAddress: 'DM1001', description: 'ラインA圧力' },
        { slotId: 3, plcId: 'plc-mitsubishi-01', deviceAddress: 'D100', description: '搬送速度' },
        { slotId: 4, plcId: 'plc-mitsubishi-01', deviceAddress: 'D101', description: '累積カウント' },
      ],
    };
    res.writeHead(200);
    res.end(JSON.stringify(body));
  },

  'POST /api/v1/dashboard/import': (req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(raw); } catch { payload = null; }
      if (!payload) {
        res.writeHead(400);
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
        return;
      }
      console.log('[HTTPS Mock] インポートデータ受信:', JSON.stringify(payload).slice(0, 200));
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'success', imported: payload }));
    });
  },
};

const server = https.createServer(tlsOptions, (req, res) => {
  const cert = req.socket.getPeerCertificate();
  const cn = cert && cert.subject ? cert.subject.CN : '(証明書なし)';
  console.log(`[HTTPS Mock] ${req.method} ${req.url}  客CN=${cn}`);

  res.setHeader('Content-Type', 'application/json');

  const handler = routes[`${req.method} ${req.url}`];
  if (handler) {
    handler(req, res);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[HTTPS Mock] 起動中 — https://localhost:${PORT}`);
  console.log('  クライアント .p12 : mock/certs/client.p12');
  console.log('  パスワード         : mock-password-123');
  console.log('  Tauri 側オプション : accept_invalid_certs=true');
  console.log('');
  console.log('  エンドポイント:');
  console.log('    GET  /health');
  console.log('    GET  /api/v1/dashboard/history');
  console.log('    POST /api/v1/dashboard/import');
});
