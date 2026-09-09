const express = require('express');
const cors = require('cors');
const path = require('path');
const ytDlp = require('yt-dlp-exec');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静的ファイル（index.html等）を配信する設定
app.use(express.static(__dirname));

// トップページにアクセスしたら index.html を表示
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 動画情報取得 API
app.get('/api/info', async (req, res) => {
  try {
    const videoURL = req.query.url;
    if (!videoURL) {
      return res.status(400).json({ error: 'URLを指定してください。' });
    }

    const output = await ytDlp(videoURL, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });

    res.json({
      title: output.title,
      thumbnail: output.thumbnail
    });
  } catch (error) {
    console.error('Info Error:', error);
    res.status(500).json({ error: '動画情報の取得に失敗しました。' });
  }
});

// 動画ダウンロード API
app.get('/api/download', (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) {
    return res.status(400).send('URLを指定してください。');
  }

  res.header('Content-Disposition', 'attachment; filename="video.mp4"');
  res.header('Content-Type', 'video/mp4');

  // yt-dlp プロセスを実行し、標準出力を直接レスポンスへ流し込む
  const ytProcess = spawn('yt-dlp', [
    '-f', 'b[ext=mp4]/best[ext=mp4]/best',
    '-o', '-',
    videoURL
  ]);

  ytProcess.stdout.pipe(res);

  ytProcess.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data}`);
  });

  ytProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
    }
  });

  // 通信が途中で切断された場合にプロセスを終了
  req.on('close', () => {
    ytProcess.kill();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
