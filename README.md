# 楽曲データ管理システム（Issue更新版）

Gmail で受信した未処理楽曲データを自動的に GitHub の既存Issue（#5649）に追記するシステムです。

## 🎯 目的

- Gmail で個別に送られてくる未処理楽曲データの通知を一元管理
- **ptna-office/tasks の Issue #5649** に自動追記し、効率的な進捗管理を実現
- 重複チェックにより効率的な処理を実現

## 📋 主な変更点

### ✅ Issue 追記機能
- **個別Issue作成から既存Issue更新へ変更**
- `ptna-office/tasks` リポジトリの Issue #5649 に新しい楽曲データを自動追加
- GitHub Issue #5649 の形式に合わせたデータフォーマット

### 📊 データフォーマット
既存の Issue と同じ形式で追加：
```
798738　ギロック／インディアンの雨乞いダンス／全音楽譜出版社　※AI検索不備　<!-- 受信: 2025/07/23 20:11, Gmail ID: abc123 -->
```

### 🔍 重複チェック
- 既存の Issue #5649 内で申込番号の重複をチェック
- 重複がある場合は自動的にスキップ

## 🚀 セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/KoidoManami/music-data-management.git
cd music-data-management
npm install
```

### 2. 環境変数の設定
`.env.example` を `.env` にコピーして設定：

```env
# GitHub設定（ptna-office/tasks へのアクセス権限が必要）
GITHUB_TOKEN=your_github_personal_access_token_here

# Gmail API設定
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token_here

# システム設定
CRON_SCHEDULE=0 * * * *  # 毎時間実行
```

### 3. GitHub Personal Access Token の設定
**重要**: `ptna-office/tasks` リポジトリへの書き込み権限が必要です。

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token" をクリック
3. 必要な権限を選択：
   - `repo` (ptna-office/tasks リポジトリへのアクセス)
   - `issues` (Issue の編集権限)

### 4. Gmail API の設定
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Gmail API を有効化
3. OAuth 2.0 認証情報を作成
4. リフレッシュトークンを取得

## 💻 使用方法

### 一回だけ実行
```bash
npm start -- --once
```

### 定期実行モード（毎時間）
```bash
npm start
```

## 📝 システムの動作

### メール監視
- `ptna.sato.miyuki@gmail.com` からのメールを監視
- 件名に「AI曲目絞り込み検索不備」または「曲目メンテ」を含むメールを対象

### データ抽出
メール本文から以下の情報を自動抽出：
- 申込番号（798738など）
- step_entry番号（681229など）
- 曲目情報
- 作曲者情報
- 出版社情報

### Issue更新
抽出したデータを以下の形式で Issue #5649 に追加：
```
[申込番号]　[曲目]／[作曲者]／[出版社]　[特記事項]　<!-- 受信情報 -->
```

### 実行例
```
798738　ギロック／インディアンの雨乞いダンス／全音楽譜出版社　※AI検索不備　<!-- 受信: 2025/07/23 20:11, Gmail ID: xyz789 -->
```

## 🔧 カスタマイズ

### 対象Issue番号の変更
`src/gmail-github-integration.js` の `targetIssueNumber` を変更：
```javascript
const targetIssueNumber = 5649; // 変更したいIssue番号
```

### メール検索条件の変更
`getUnprocessedMusicEmails()` メソッド内の検索クエリを変更：
```javascript
q: 'from:ptna.sato.miyuki@gmail.com subject:"AI曲目絞り込み検索不備" OR subject:"曲目メンテ"'
```

### データフォーマットの調整
`generateMusicDataEntry()` メソッドでフォーマットを調整可能

## 📊 ログとモニタリング

システム実行時のログ出力：
- メール取得件数
- Issue更新成功/スキップ状況
- 重複チェック結果
- エラー情報

## ⚠️ 注意事項

1. **リポジトリアクセス権限**
   - `ptna-office/tasks` リポジトリへの書き込み権限が必要
   - Personal Access Token は適切に管理してください

2. **API レート制限**
   - GitHub API: 5000リクエスト/時間
   - Gmail API: 1億クォータユニット/日

3. **重複処理**
   - 申込番号ベースで重複チェックを実施
   - 既に処理済みのデータは自動的にスキップ

## 🔄 運用フロー

1. **Gmail受信** → 佐藤さんからの未処理楽曲データメール
2. **自動監視** → システムが新しいメールを検出
3. **データ抽出** → メール内容から楽曲情報を抽出
4. **重複チェック** → Issue #5649 内で既存データをチェック
5. **Issue更新** → 新しいデータを Issue #5649 に追記
6. **ログ出力** → 処理結果をコンソールに表示

## 🤝 コントリビューション

プルリクエストやIssueは歓迎します。大きな変更を行う前に、まずIssueで議論していただけると助かります。

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。