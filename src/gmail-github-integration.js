// Gmail to GitHub Issue 自動登録システム
// Gmail API と GitHub API を使用して未処理楽曲データをIssueとして登録

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
    
    this.owner = 'KoidoManami';
    this.repo = 'music-data-management';
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
   * GitHub Issue として登録
   */
  async createIssueFromMusicData(emailData) {
    const { musicData, subject, date, body, emailId } = emailData;
    
    // Issue のタイトルを生成
    let issueTitle = `[未処理] ${musicData.title || '楽曲情報'}`;
    if (musicData.applicationNumber) {
      issueTitle += ` (申込番号: ${musicData.applicationNumber})`;
    }

    // Issue の本文を生成
    const issueBody = this.generateIssueBody(musicData, emailData);
    
    // ラベルを設定
    const labels = this.generateLabels(subject, musicData);

    try {
      const issue = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: issueTitle,
        body: issueBody,
        labels: labels
      });

      console.log(`Issue created: ${issue.data.html_url}`);
      return issue.data;
    } catch (error) {
      console.error('GitHub Issue creation error:', error);
      throw error;
    }
  }

  /**
   * Issue 本文を生成
   */
  generateIssueBody(musicData, emailData) {
    let issueBody = `## 楽曲データ未処理情報\n\n`;
    
    // 基本情報
    issueBody += `### 基本情報\n`;
    if (musicData.applicationNumber) {
      issueBody += `- **申込番号**: ${musicData.applicationNumber}\n`;
    }
    if (musicData.stepEntryNumber) {
      issueBody += `- **step_entry番号**: ${musicData.stepEntryNumber}\n`;
    }
    issueBody += `- **受信日時**: ${emailData.date}\n`;
    issueBody += `- **Gmail ID**: ${emailData.emailId}\n\n`;

    // 楽曲情報
    if (Object.keys(musicData).length > 2) {
      issueBody += `### 楽曲情報\n`;
      if (musicData.title) {
        issueBody += `- **曲目**: ${musicData.title}\n`;
      }
      if (musicData.composer) {
        issueBody += `- **作曲者**: ${musicData.composer}\n`;
      }
      if (musicData.publisher) {
        issueBody += `- **出版社**: ${musicData.publisher}\n`;
      }
      issueBody += `\n`;
    }

    // 元のメール内容
    issueBody += `### 元のメール内容\n`;
    issueBody += `**件名**: ${emailData.subject}\n\n`;
    issueBody += '```\n';
    issueBody += emailData.body;
    issueBody += '\n```\n\n';

    // 処理チェックリスト
    issueBody += `### 処理チェックリスト\n`;
    issueBody += `- [ ] 楽曲情報の確認\n`;
    issueBody += `- [ ] データベースとの照合\n`;
    issueBody += `- [ ] 重複チェック\n`;
    issueBody += `- [ ] 修正・登録完了\n`;
    issueBody += `- [ ] メール返信\n\n`;

    // 処理メモ
    issueBody += `### 処理メモ\n`;
    issueBody += `<!-- 処理時のメモや特記事項をここに記載 -->\n`;

    return issueBody;
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
   * 既存の Issue を検索（重複チェック）
   */
  async findExistingIssue(applicationNumber, stepEntryNumber) {
    try {
      let searchQuery = `repo:${this.owner}/${this.repo} state:open`;
      
      if (applicationNumber) {
        searchQuery += ` "${applicationNumber}"`;
      }
      if (stepEntryNumber) {
        searchQuery += ` "${stepEntryNumber}"`;
      }

      const searchResult = await this.octokit.rest.search.issues({
        q: searchQuery
      });

      return searchResult.data.items.find(issue => 
        issue.title.includes(applicationNumber) || 
        issue.body.includes(stepEntryNumber)
      );
    } catch (error) {
      console.error('Issue search error:', error);
      return null;
    }
  }

  /**
   * メイン処理：Gmail から取得してGitHub Issue を作成
   */
  async processUnprocessedMusicData() {
    console.log('未処理楽曲データの処理を開始します...');
    
    try {
      // Gmail から未処理データを取得
      const emailData = await this.getUnprocessedMusicEmails();
      console.log(`${emailData.length} 件のメールを取得しました`);

      const results = [];

      for (const email of emailData) {
        const { musicData } = email;
        
        // 既存の Issue をチェック
        const existingIssue = await this.findExistingIssue(
          musicData.applicationNumber, 
          musicData.stepEntryNumber
        );

        if (existingIssue) {
          console.log(`既存のIssueが見つかりました: ${existingIssue.html_url}`);
          results.push({
            email,
            action: 'skipped',
            issue: existingIssue
          });
          continue;
        }

        // 新しい Issue を作成
        const newIssue = await this.createIssueFromMusicData(email);
        results.push({
          email,
          action: 'created',
          issue: newIssue
        });

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