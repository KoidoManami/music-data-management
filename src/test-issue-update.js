// テスト用スクリプト - 実際のIssue更新をテスト（チェックボックス形式）
const MusicDataIssueManager = require('./gmail-github-integration');

// サンプルの楽曲データ（Image 2の内容をベース）
const sampleEmailData = {
  subject: '[Webメンテ] AI曲目絞り込み検索不備',
  date: '2025/07/23 20:11 (19 時間前)',
  body: `AI絞り込みが上手くいきませんでしたので、レコードを確認の上、issueに追記をお願いします。

申込番号：798738
step_entry番号：681229

♪登録曲目

曲目1：ギロック／インディアンの雨乞いダンス
はじめてのギロック／全音楽譜出版社`,
  musicData: {
    applicationNumber: '798738',
    stepEntryNumber: '681229',
    title: 'ギロック／インディアンの雨乞いダンス',
    composer: 'ギロック',
    publisher: '全音楽譜出版社'
  },
  emailId: 'test_email_id_123'
};

async function testIssueUpdate() {
  console.log('=== チェックボックス形式 Issue更新テスト開始 ===');
  
  try {
    // 環境変数チェック
    if (!process.env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN が設定されていません');
      return;
    }

    // マネージャーインスタンス作成（Gmail認証は不要なのでnullで代用）
    const manager = new MusicDataIssueManager(process.env.GITHUB_TOKEN, null);
    
    // データエントリ生成をテスト
    console.log('チェックボックス形式のデータエントリ生成中...');
    const entry = manager.generateMusicDataEntry(
      sampleEmailData.musicData, 
      sampleEmailData
    );
    
    console.log('生成されたエントリ:');
    console.log(entry);
    console.log('\n期待する形式:');
    console.log('- [ ] 798738　ギロック／インディアンの雨乞いダンスはじめてのギロック／全音楽譜出版社');
    
    // 重複チェックをテスト
    console.log('\n重複チェック中...');
    const isDuplicate = await manager.checkDuplicateInIssue(
      sampleEmailData.musicData.applicationNumber,
      sampleEmailData.musicData.stepEntryNumber
    );
    
    console.log(`重複チェック結果: ${isDuplicate ? '重複あり' : '重複なし'}`);
    
    if (isDuplicate) {
      console.log('既にデータが存在するため、テストをスキップします');
      return;
    }
    
    // 実際のIssue更新をテスト（注意: 実際のIssueが更新されます）
    const confirmUpdate = process.argv.includes('--update');
    if (confirmUpdate) {
      console.log('\n実際のIssue更新を実行中...');
      const result = await manager.addMusicDataToIssue(sampleEmailData);
      console.log('Issue更新完了:', result.html_url);
      console.log('追加されたエントリをGitHubで確認してください');
    } else {
      console.log('\n実際の更新をスキップ（--update フラグを付けると実行されます）');
      console.log('コマンド例: npm run test:issue:update');
    }
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

// 環境変数読み込み
require('dotenv').config();

// テスト実行
testIssueUpdate();