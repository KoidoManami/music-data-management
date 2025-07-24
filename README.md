# 楽曲データ管理システム

Gmail で受信した未処理楽曲データを自動的に GitHub Issue として登録するシステムです。

## 🎯 目的

- Gmail で個別に送られてくる未処理楽曲データの通知を一元管理
- GitHub Issue として自動登録し、進捗追跡を可能にする
- 重複チェックにより効率的な処理を実現

## 📋 機能

### ✅ 自動化機能
- Gmail API を使用した未処理データメールの自動取得
- メール内容の解析と楽曲情報の抽出
- GitHub Issue への自動登録
- 重複チェック機能
- 定期実行（クーロン）対応

### 📊 データ抽出
- 申込番号
- step_entry番号  
- 曲目名
- 作曲者情報
- 出版社情報

### 🏷️ 自動ラベリング
- `未処理` - すべての新規Issue
- `AI検索不備` - AI曲目絞り込み検索の問題
- `曲目メンテナンス` - 曲目メンテナンス関連
- `作曲者情報あり` - 作曲者情報が含まれる場合
- `出版社情報あり` - 出版社情報が含まれる場合

## 🚀 セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/KoidoManami/music-data-management.git
cd music-data-management
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` を `.env` にコピーして設定：

```bash
cp .env.example .env
```

### 4. GitHub Personal Access Token の取得

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token" をクリック
3. 必要な権限を選択：
   - `repo` (リポジトリへのフルアクセス)
   - `issues` (Issue の作成・管理)

### 5. Gmail API の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Gmail API を有効化
3. OAuth 2.0 認証情報を作成
4. リフレッシュトークンを取得

## 💻 使用方法

### 一回だけ実行

```bash
npm start -- --once
```

### 定期実行モード

```bash
npm start
```

## 📝 Issue フォーマット

作成される GitHub Issue は以下の構造になります：

```markdown
## 楽曲データ未処理情報

### 基本情報
- **申込番号**: 798738
- **step_entry番号**: 681229
- **受信日時**: 2025/07/23 20:11

### 楽曲情報
- **曲目**: ギロック／インディアンの雨乞いダンス
- **作曲者**: ギロック
- **出版社**: 全音楽譜出版社

### 処理チェックリスト
- [ ] 楽曲情報の確認
- [ ] データベースとの照合
- [ ] 重複チェック
- [ ] 修正・登録完了
- [ ] メール返信
```

## 🔧 カスタマイズ

システムの動作は `src/gmail-github-integration.js` を編集することで調整できます。

## ⚠️ 注意事項

1. **API レート制限**
   - GitHub API: 5000リクエスト/時間
   - Gmail API: 1億クォータユニット/日

2. **セキュリティ**
   - `.env` ファイルは git にコミットしないでください
   - Personal Access Token は適切に管理してください

## 🤝 コントリビューション

プルリクエストやIssueは歓迎します。

## 📄 ライセンス

MIT License
