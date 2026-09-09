const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS許可設定（フロントエンドからのリクエストを受け付ける）
app.use(cors());
app.use(express.json());

// サーバー動作確認用ルート
app.get('/', (req, res) => {
  res.send('YouTube Downloader API is running!');
});

// 動画情報取得エンドポイント
app.get('/api/info', async (req, res) => {
  try {
    const videoURL = req.query.url;
    if (!videoURL || !ytdl.validateURL(videoURL)) {
      return res.status(400).json({ error: '有効なYouTube URLを指定してください。' });
    }

    const info = await ytdl.getInfo(videoURL);
    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnails.slice(-1)[0].url;

    res.json({ title, thumbnail });
  } catch (error) {
    console.error('Info Error:', error);
    res.status(500).json({ error: '動画情報の取得に失敗しました。' });
  }
});

// 動画ダウンロードエンドポイント
app.get('/api/download', async (req, res) => {
  try {
    const videoURL = req.query.url;
    if (!videoURL || !ytdl.validateURL(videoURL)) {
      return res.status(400).send('有効なYouTube URLを指定してください。');
    }

    const info = await ytdl.getInfo(videoURL);
    // ファイル名に使用できない記号を除去
    const rawTitle = info.videoDetails.title.replace(/[^\w\s-]/gi, '');
    const filename = encodeURIComponent(rawTitle || 'video') + '.mp4';

    // ダウンロード用ヘッダーの出力設定
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', 'video/mp4');

    // 動画ストリームをレスポンスに直接パイプ出力
    ytdl(videoURL, {
      quality: 'highestvideo',
      filter: 'audioandvideo'
    }).pipe(res);

  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).send('ダウンロード処理中にエラーが発生しました。');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
