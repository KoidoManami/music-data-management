// Gmail API 認証チェック・修復スクリプト
require('dotenv').config();
const { google } = require('googleapis');

async function checkGmailAuth() {
  console.log('=== Gmail API 認証状況チェック ===\n');

  // 1. 環境変数の存在確認
  const requiredVars = {
    'GMAIL_CLIENT_ID': process.env.GMAIL_CLIENT_ID,
    'GMAIL_CLIENT_SECRET': process.env.GMAIL_CLIENT_SECRET,
    'GMAIL_REFRESH_TOKEN': process.env.GMAIL_REFRESH_TOKEN
  };

  console.log('1. 環境変数チェック:');
  let missingVars = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    const status = value ? '✅ 設定済み' : '❌ 未設定';
    console.log(`   ${key}: ${status}`);
    if (!value) missingVars.push(key);
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ 不足している環境変数: ${missingVars.join(', ')}`);
    console.log('\n📝 解決方法:');
    console.log('1. .env ファイルを確認してください');
    console.log('2. 以下の形式で設定が必要です:');
    console.log('   GMAIL_CLIENT_ID=your_client_id_here');
    console.log('   GMAIL_CLIENT_SECRET=your_client_secret_here');
    console.log('   GMAIL_REFRESH_TOKEN=your_refresh_token_here');
    return;
  }

  // 2. OAuth2認証テスト
  console.log('\n2. OAuth2 認証テスト:');
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    // アクセストークンの取得テスト
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('   ✅ アクセストークン取得成功');
    console.log(`   📅 有効期限: ${new Date(credentials.expiry_date).toLocaleString()}`);

    oauth2Client.setCredentials(credentials);

    // 3. Gmail API接続テスト
    console.log('\n3. Gmail API 接続テスト:');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`   ✅ Gmail API 接続成功`);
    console.log(`   📧 メールアドレス: ${profile.data.emailAddress}`);
    console.log(`   📊 総メッセージ数: ${profile.data.messagesTotal}`);

    // 4. 対象メール検索テスト
    console.log('\n4. 対象メール検索テスト (7/23-7/24):');
    const searchResult = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:ptna.sato.miyuki@gmail.com (subject:"AI曲目絞り込み検索不備" OR subject:"曲目メンテ") after:2025/7/23 before:2025/7/25',
      maxResults: 10
    });

    const messageCount = searchResult.data.messages ? searchResult.data.messages.length : 0;
    console.log(`   📬 該当メール数: ${messageCount} 件`);

    if (messageCount > 0) {
      console.log('\n   📋 検索されたメール:');
      for (let i = 0; i < Math.min(3, messageCount); i++) {
        const message = searchResult.data.messages[i];
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });
        
        const headers = detail.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const date = headers.find(h => h.name === 'Date')?.value || 'No Date';
        
        console.log(`   ${i + 1}. ${subject} (${date})`);
      }
      
      if (messageCount > 3) {
        console.log(`   ... および他 ${messageCount - 3} 件`);
      }
    }

    console.log('\n🎉 Gmail API 認証・接続テスト完了');
    console.log('\n✅ 次のステップ: npm run transfer:recent を実行してください');

  } catch (error) {
    console.log('   ❌ 認証エラー:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n🔧 解決方法 (invalid_grant エラー):');
      console.log('1. リフレッシュトークンが期限切れの可能性があります');
      console.log('2. Google Cloud Console で新しいリフレッシュトークンを取得してください');
      console.log('3. または、OAuth 2.0 Playground を使用してトークンを再生成してください');
    } else if (error.message.includes('invalid_client')) {
      console.log('\n🔧 解決方法 (invalid_client エラー):');
      console.log('1. GMAIL_CLIENT_ID と GMAIL_CLIENT_SECRET が正しく設定されているか確認');
      console.log('2. Google Cloud Console で認証情報を確認してください');
    } else {
      console.log('\n🔧 一般的な解決方法:');
      console.log('1. .env ファイルの認証情報を確認');
      console.log('2. Google Cloud Console で Gmail API が有効になっているか確認');
      console.log('3. OAuth 2.0 認証情報が正しく設定されているか確認');
    }
  }
}

// スクリプト実行
checkGmailAuth().catch(console.error);