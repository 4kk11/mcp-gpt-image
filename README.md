# mcp-gpt-image

[![npm version](https://badge.fury.io/js/mcp-gpt-image.svg)](https://www.npmjs.com/package/mcp-gpt-image)
[![Docker Image](https://img.shields.io/docker/v/4kk11/mcp-gpt-image?logo=docker)](https://hub.docker.com/r/4kk11/mcp-gpt-image)

OpenAI APIを使用して画像を生成・編集するためのMCPサーバーです。  
生成された画像は指定されたディレクトリに保存され、プレビュー用に縮小された画像と合わせて返却されます。

## 主な機能

### 1. 画像生成 (generate_image)
テキストプロンプトから新しい画像を生成します。

**入力パラメータ:**
- `prompt`: 生成したい画像の説明（必須）
- `size`: 出力画像サイズ（オプション、デフォルト："auto"）
  - "1024x1024"
  - "1536x1024"
  - "1024x1536"
  - "auto"

### 2. 画像編集 (edit_image)
既存の画像をテキストプロンプトに基づいて編集します。

**入力パラメータ:**
- `image`: 編集する画像のファイルパス（必須）
- `prompt`: 編集内容を説明するテキストプロンプト（必須）

## インストール方法

### Dockerを使用する場合

1. Dockerイメージをプル
```bash
docker pull 4kk11/mcp-gpt-image
```

2. 設定例（claude_desktop_config.json）
```json
{
  "mcpServers": {
    "gpt-image": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "YOUR_IMAGES_DIR:/app/temp",
        "-e",
        "OPENAI_API_KEY=YOUR_API_KEY",
        "4kk11/mcp-gpt-image"
      ]
    }
  }
}
```

### npxを使用する場合

設定例（claude_desktop_config.json）:
```json
{
  "mcpServers": {
    "gpt-image": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-gpt-image"
      ],
      "env": {
        "OPENAI_API_KEY": "YOUR_API_KEY",
        "IMAGES_DIR": "YOUR_IMAGES_DIR"
      }
    }
  }
}
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|--------------|
| OPENAI_API_KEY | OpenAI APIキー（必須） | - |
| IMAGES_DIR | 生成・編集した画像を保存するディレクトリのパス | ./temp |

## 開発者向け

### Dockerイメージのビルドと管理

```bash
# Dockerイメージをビルド
make docker-build

# Dockerイメージを削除
make docker-clean
```

```json
{
  "mcpServers": {
    "gpt-image": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "YOUR_IMAGES_DIR:/app/temp",
        "-e",
        "OPENAI_API_KEY",
        "mcp-gpt-image"
      ],
      "env": {
        "OPENAI_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。