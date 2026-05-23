#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/certs"
mkdir -p "$CERTS_DIR"
cd "$CERTS_DIR"

echo "=== [1/4] CA 証明書を生成中 ==="
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.crt \
  -subj "/CN=Mock-Local-CA"

echo "=== [2/4] サーバー証明書を生成中 (CN=localhost) ==="
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=localhost"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256

echo "=== [3/4] クライアント証明書を生成中 ==="
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr \
  -subj "/CN=Industrial-Dashboard-Client"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days 365 -sha256

echo "=== [4/4] クライアント .p12 を生成中 (パスワード: mock-password-123) ==="
# OpenSSL 3.x: デフォルト (AES-256) で生成 → curl / native-tls 共に読み込み可能
# OpenSSL 1.x (Git Bash on Windows): 同じコマンドで動作する (-legacy 不要)
openssl pkcs12 -export -out client.p12 \
  -inkey client.key -in client.crt -certfile ca.crt \
  -password pass:mock-password-123

echo ""
echo "=== 証明書生成完了 ==="
echo "  CA  : $CERTS_DIR/ca.crt"
echo "  サーバー: $CERTS_DIR/server.crt / server.key"
echo "  クライアント .p12 : $CERTS_DIR/client.p12"
echo "  パスワード: mock-password-123"
