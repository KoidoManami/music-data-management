#!/usr/bin/env node

require('dotenv').config();
const cron = require('node-cron');
const MusicDataIssueManager = require('./gmail-github-integration');

// 設定の検証
function validateConfig() {
  const required = [
    'GITHUB_TOKEN',
    'GMAIL_CLIENT_ID', 
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('必要な環境変数が設定されていません:', missing);
    console.error('.env ファイルを確認してください');
    process.exit(1);
  }
}

// Gmail認証情報を構築
function buildGmailCredentials() {
  const { google } = require('googleapis');
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });
  
  return oauth2Client;
}

// メイン処理
async function main() {
  console.log('=== 楽曲データ管理システム開始 ===');
  
  try {
    validateConfig();
    
    const manager = new MusicDataIssueManager(
      process.env.GITHUB_TOKEN,
      buildGmailCredentials()
    );
    
    await manager.processUnprocessedMusicData();
    console.log('処理が完了しました');
    
  } catch (error) {
    console.error('システムエラー:', error.message);
    process.exit(1);
  }
}

// 実行方法の判定
if (require.main === module) {
  // 直接実行された場合
  if (process.argv.includes('--once')) {
    // 一回だけ実行
    main();
  } else {
    // クーロンで定期実行
    const schedule = process.env.CRON_SCHEDULE || '0 * * * *';
    console.log(`定期実行モード開始 (${schedule})`);
    
    cron.schedule(schedule, () => {
      console.log('\n--- 定期実行開始 ---');
      main().catch(console.error);
    });
    
    // 初回実行
    console.log('初回実行中...');
    main().catch(console.error);
  }
}