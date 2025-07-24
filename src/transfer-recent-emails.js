// Gmail データ取得と転記スクリプト（7/23-7/24対象）
const MusicDataIssueManager = require('./gmail-github-integration');

async function transferRecentEmails() {
  console.log('=== 7/23-7/24のメールデータ転記開始 ===');
  
  try {
    // 環境変数チェック
    if (!process.env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN が設定されていません');
      return;
    }
    
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
      console.error('Gmail API の認証情報が設定されていません');
      return;
    }

    // Gmail認証情報を構築
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost'
    );
    
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    // マネージャーインスタンス作成
    const manager = new MusicDataIssueManager(process.env.GITHUB_TOKEN, oauth2Client);
    
    // 7/23-7/24の期間指定でメール検索
    console.log('7/23-7/24の期間のメールを検索中...');
    
    // Gmail APIで期間指定検索
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:ptna.sato.miyuki@gmail.com (subject:"AI曲目絞り込み検索不備" OR subject:"曲目メンテ") after:2025/7/23 before:2025/7/25',
      maxResults: 50
    });

    const messages = response.data.messages || [];
    console.log(`${messages.length} 件のメールが見つかりました`);

    if (messages.length === 0) {
      console.log('該当期間にメールが見つかりませんでした');
      return;
    }

    // 各メールの詳細を取得・処理
    const results = [];
    const targetIssueNumber = 5649;

    for (const message of messages) {
      try {
        // メール詳細を取得
        const emailDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        // メール内容を解析
        const parsedEmail = manager.parseEmailContent(emailDetail.data);
        if (!parsedEmail) {
          console.log(`メール ID ${message.id} の解析に失敗しました`);
          continue;
        }

        const { subject, date, musicData } = parsedEmail;
        console.log(`\n--- メール処理中 ---`);
        console.log(`件名: ${subject}`);
        console.log(`日時: ${date}`);
        console.log(`申込番号: ${musicData.applicationNumber}`);
        console.log(`楽曲: ${musicData.title}`);

        // 重複チェック
        const isDuplicate = await manager.checkDuplicateInIssue(
          musicData.applicationNumber,
          musicData.stepEntryNumber,
          targetIssueNumber
        );

        if (isDuplicate) {
          console.log(`✓ スキップ: 申込番号 ${musicData.applicationNumber} は既に存在します`);
          results.push({
            email: parsedEmail,
            action: 'skipped',
            reason: 'duplicate'
          });
          continue;
        }

        // Issue に追加
        console.log(`→ Issue #${targetIssueNumber} に追加中...`);
        const updatedIssue = await manager.addMusicDataToIssue(parsedEmail, targetIssueNumber);
        
        results.push({
          email: parsedEmail,
          action: 'added_to_issue',
          issue: updatedIssue
        });

        console.log(`✓ 追加完了: ${musicData.title || musicData.applicationNumber}`);

        // API レート制限対策
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`メール ID ${message.id} の処理でエラー:`, error.message);
        continue;
      }
    }

    // 結果サマリー
    console.log('\n=== 転記結果サマリー ===');
    const added = results.filter(r => r.action === 'added_to_issue').length;
    const skipped = results.filter(r => r.action === 'skipped').length;
    
    console.log(`追加: ${added} 件`);
    console.log(`スキップ: ${skipped} 件`);
    console.log(`合計処理: ${results.length} 件`);
    
    if (added > 0) {
      console.log(`\nIssue #${targetIssueNumber} を確認してください:`);
      console.log(`https://github.com/ptna-office/tasks/issues/${targetIssueNumber}`);
    }

  } catch (error) {
    console.error('転記処理エラー:', error);
  }
}

// 環境変数読み込み
require('dotenv').config();

// 実行
transferRecentEmails();