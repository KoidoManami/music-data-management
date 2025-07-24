// Gmail to GitHub Issue 自動登録システム（Issue更新版）
// Gmail API と GitHub API を使用して未処理楽曲データを既存Issueに追加

const { Octokit } = require('@octokit/rest');
const { google } = require('googleapis');

class MusicDataIssueManager {
  constructor(githubToken, gmailCredentials) {
    // GitHub API クライアント初期化
    this.octokit = new Octokit({
      auth: githubToken
    });
    
    // Gmail API クライアント初期化
    this.gmail = google.gmail({ version: 'v1', auth: gmailCredentials });
    
    this.owner = 'ptna-office';
    this.repo = 'tasks';
  }

  /**
   * Gmail から未処理楽曲データのメールを取得
   */
  async getUnprocessedMusicEmails() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'from:ptna.sato.miyuki@gmail.com subject:"AI曲目絞り込み検索不備" OR subject:"曲目メンテ"',
        maxResults: 50
      });

      const messages = response.data.messages || [];
      const emailData = [];

      for (const message of messages) {
        const emailDetail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const parsedEmail = this.parseEmailContent(emailDetail.data);
        if (parsedEmail) {
          emailData.push(parsedEmail);
        }
      }

      return emailData;
    } catch (error) {
      console.error('Gmail API Error:', error);
      throw error;
    }
  }

  /**
   * メール内容をパースして楽曲データを抽出
   */
  parseEmailContent(emailData) {
    const headers = emailData.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value;
    const date = headers.find(h => h.name === 'Date')?.value;
    
    // メール本文を取得
    let body = '';
    if (emailData.payload.body.data) {
      body = Buffer.from(emailData.payload.body.data, 'base64').toString();
    } else if (emailData.payload.parts) {
      const textPart = emailData.payload.parts.find(part => 
        part.mimeType === 'text/plain'
      );
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    // 楽曲データを抽出
    const musicData = this.extractMusicInfo(body, subject);
    
    return {
      subject,
      date,
      body,
      musicData,
      emailId: emailData.id
    };
  }

  /**
   * メール本文から楽曲情報を抽出
   */
  extractMusicInfo(body, subject) {
    const musicInfo = {};
    
    // 申込番号を抽出
    const applicationMatch = body.match(/申込番号[：:\s]*(\d+)/);
    if (applicationMatch) {
      musicInfo.applicationNumber = applicationMatch[1];
    }
    
    // step_entry番号を抽出
    const stepEntryMatch = body.match(/step_entry番号[：:\s]*(\d+)/);
    if (stepEntryMatch) {
      musicInfo.stepEntryNumber = stepEntryMatch[1];
    }
    
    // 曲目情報を抽出
    const titleMatch = body.match(/曲目\d*[：:\s]*([^\n\r]+)/);
    if (titleMatch) {
      musicInfo.title = titleMatch[1].trim();
    }
    
    // 作曲者情報を抽出
    const composerMatch = body.match(/作曲[者]*[：:\s]*([^\n\r]+)/);
    if (composerMatch) {
      musicInfo.composer = composerMatch[1].trim();
    }
    
    // 出版社情報を抽出
    const publisherMatch = body.match(/出版社[：:\s]*([^\n\r]+)/);
    if (publisherMatch) {
      musicInfo.publisher = publisherMatch[1].trim();
    }

    return musicInfo;
  }

  /**
   * 既存の Issue に新しい楽曲データを追加
   */
  async addMusicDataToIssue(emailData, issueNumber = 5649) {
    const { musicData, subject, date, body, emailId } = emailData;
    
    try {
      // 既存の Issue を取得
      const existingIssue = await this.octokit.rest.issues.get({
        owner: 'ptna-office',
        repo: 'tasks',
        issue_number: issueNumber
      });

      // 新しい楽曲データエントリを生成
      const newEntry = this.generateMusicDataEntry(musicData, emailData);
      
      // 既存の本文に新しいエントリを追加
      const updatedBody = existingIssue.data.body + '\n' + newEntry;

      // Issue を更新
      const updatedIssue = await this.octokit.rest.issues.update({
        owner: 'ptna-office',
        repo: 'tasks',
        issue_number: issueNumber,
        body: updatedBody
      });

      console.log(`Issue updated: ${updatedIssue.data.html_url}`);
      return updatedIssue.data;
    } catch (error) {
      console.error('GitHub Issue update error:', error);
      throw error;
    }
  }

  /**
   * 新しい楽曲データエントリを生成（Issue追加用）
   */
  generateMusicDataEntry(musicData, emailData) {
    let entry = '- [ ] ';
    
    // 申込番号の行を生成
    if (musicData.applicationNumber) {
      entry += `${musicData.applicationNumber}　`;
    }
    
    // 楽曲情報を生成
    let musicInfo = '';
    if (musicData.title) {
      musicInfo += musicData.title;
    }
    
    // メール本文から詳細な楽曲情報を抽出（「はじめてのギロック」など）
    const detailMatch = emailData.body.match(/曲目\d*[：:\s]*([^\n\r]+)\n([^\n\r\/]+)/);
    if (detailMatch && detailMatch[2]) {
      const detail = detailMatch[2].trim();
      if (detail && !musicInfo.includes(detail)) {
        musicInfo += detail;
      }
    }
    
    // 出版社情報を追加
    if (musicData.publisher) {
      musicInfo += `／${musicData.publisher}`;
    }
    
    entry += musicInfo;
    
    return entry;
  }

  /**
   * Issue のラベルを生成
   */
  generateLabels(subject, musicData) {
    const labels = ['未処理'];
    
    if (subject.includes('AI曲目絞り込み検索不備')) {
      labels.push('AI検索不備');
    }
    if (subject.includes('曲目メンテ')) {
      labels.push('曲目メンテナンス');
    }
    if (musicData.composer) {
      labels.push('作曲者情報あり');
    }
    if (musicData.publisher) {
      labels.push('出版社情報あり');
    }
    
    return labels;
  }

  /**
   * 既存の Issue 内で重複チェック
   */
  async checkDuplicateInIssue(applicationNumber, stepEntryNumber, issueNumber = 5649) {
    try {
      const issue = await this.octokit.rest.issues.get({
        owner: 'ptna-office',
        repo: 'tasks',
        issue_number: issueNumber
      });

      const issueBody = issue.data.body || '';
      
      // 申込番号またはstep_entry番号が既に存在するかチェック
      if (applicationNumber && issueBody.includes(applicationNumber)) {
        return true;
      }
      if (stepEntryNumber && issueBody.includes(stepEntryNumber)) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Issue duplicate check error:', error);
      return false;
    }
  }

  /**
   * メイン処理：Gmail から取得してGitHub Issue を更新
   */
  async processUnprocessedMusicData() {
    console.log('未処理楽曲データの処理を開始します...');
    
    try {
      // Gmail から未処理データを取得
      const emailData = await this.getUnprocessedMusicEmails();
      console.log(`${emailData.length} 件のメールを取得しました`);

      const results = [];
      const targetIssueNumber = 5649; // ptna-office/tasks の Issue #5649

      for (const email of emailData) {
        const { musicData } = email;
        
        // 既存の Issue 内で重複をチェック
        const isDuplicate = await this.checkDuplicateInIssue(
          musicData.applicationNumber, 
          musicData.stepEntryNumber,
          targetIssueNumber
        );

        if (isDuplicate) {
          console.log(`重複データをスキップしました: 申込番号 ${musicData.applicationNumber}`);
          results.push({
            email,
            action: 'skipped',
            reason: 'duplicate'
          });
          continue;
        }

        // 既存の Issue に新しいデータを追加
        const updatedIssue = await this.addMusicDataToIssue(email, targetIssueNumber);
        results.push({
          email,
          action: 'added_to_issue',
          issue: updatedIssue
        });

        console.log(`Issue #${targetIssueNumber} に楽曲データを追加しました: ${musicData.title || musicData.applicationNumber}`);

        // API レート制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('処理完了:', results);
      return results;

    } catch (error) {
      console.error('処理エラー:', error);
      throw error;
    }
  }
}

module.exports = MusicDataIssueManager;