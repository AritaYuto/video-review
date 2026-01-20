<!-- HERO -->
<div align="center">

  <h1>VideoReview</h1>

  <p>
    A self-hosted video review hub for small-to-mid teams.
    <br/>
    Comment on timelines, draw on frames, and connect feedback to action.
  </p>

  <!-- Buttons -->
  <p>
    <a href="https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/" target="_blank" rel="noopener noreferrer">
      <img alt="Start Demo" src="https://img.shields.io/badge/Start%20Demo-Open-blue?style=for-the-badge" />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/KirisameMarisa/video-review/stargazers">
      <img src="https://img.shields.io/github/stars/KirisameMarisa/video-review?style=social" alt="GitHub stars" />
    </a>
    &nbsp;&nbsp;
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
  </p>
</div>
<hr/>

<h3>🔎 Online Demo</h3>
<p>
  すぐに試せるオンラインデモ環境はこちら →
  <a href="https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/"
     target="_blank" rel="noopener noreferrer"
     style="font-weight: 600;">
    View Online Demo!
  </a>
</p>

<hr/>
<!-- One-liner + bullets -->
<h3>What it is</h3>

<p>
  VideoReviewは、動画レビューを「見るだけ」で終わらせないための
  <b>セルフホスト型の動画レビュー Web サービス</b>です。<br/>
  動画をアップロードし、タイムライン上にコメントを残したり
  フレームに直接描き込みながらSNSのようにフィードバックを共有できます
</p>

<p>
  <b>Slack</b> や <b>Jira</b> と連携し
  レビューで出た課題を次のワークフローへ自然につなげることができます。<br/>
  また、特定のツールやエンジンに依存しない設計となっており
  既存の制作ワークフローに合わせて拡張していくことを前提としています
</p>

<p>
  ゲーム開発や映像制作など制作現場における
  <b>チーム内レビュー</b>を想定して設計されています
</p>

<!-- Screenshot -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/532f55eb-0f47-45aa-b17c-2e7a8bb5e191" alt="VideoReview screenshot" width="1280" />
</p>

# Need help setting it up?

オンプレミス構成や既存ツールとの連携など、導入時の相談や検証のサポートも可能です  
必要であればこちらまでご連絡ください

videoreview.contact.info@gmail.com

## 🤝 Contributing

参加方法は [CONTRIBUTING.jp.md](./CONTRIBUTING.jp.md) を参照してください

# ✨ Key Features

## 💻 Flexible Deployment: On-premise or Cloud
VideoReviewはオンプレミス環境での運用を前提に設計しています  
社内ネットワーク内で動画を完結させることで、機密性の高い映像素材を外部に出さずにレビューすることができます 

一方で運用やチーム構成に応じて以下のサービスをストレージとして選択することも可能です
- AWS S3
- NextCloud 

オンプレ・クラウドを用途に応じて使い分けることで、セキュリティ・導入コスト・運用負荷のバランスを柔軟に取れます  

---

## 💬 Actionable Comment Panel

コメント一覧は、SNSライクで直感的なUIを採用しています

- 描画付きコメント
- チケット連携されたコメント
- 新着コメント

これらはバッジや色分けによって強調され、読む前に一目で分かります


## 🔔 Never Miss Feedback with Slack & JIRA

VideoReview は、Slack や Jira と連携することで
レビュー中に生まれたフィードバックをそのまま普段のワークフローにつなげます  
コメントは自然に議論や作業に引き継がれ
「あとで対応しよう」が埋もれてしまうことを防ぎます

---

#### Slack & Jira Integration

<img src="https://github.com/user-attachments/assets/d5a23dba-b83b-4927-b202-a0079e339755" width="700" />

レビュータイムライン上のコメントを、
Slack へ共有したり、Jira のチケットとして起票することができます  
ツールを行き来せずに、
フィードバックをそのままタスクに変換できます

---

#### カスタムプロトコルによる Unity 連携

<img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="700" />

動画レビューに紐づいたファイルやシーンを直接開けるため、
レビュー後の修正作業までスムーズにつながります

# ✨ Advanced Features

## 🔍 Powerful Search for Review Workflow

動画とコメントをそれぞれ独立して検索できます

- コメントがある動画だけを探す
- 特定の人・期間のレビューを抽出する
- 描画やチケット付きの指摘を絞り込む

日々のレビューから、後日の振り返りまで必要な情報にすぐたどり着けます

<img src="https://github.com/user-attachments/assets/2ff99052-bf6f-409a-aab9-e6628444e61a" width="700"></img>

## 🔧 Built for Production Pipelines

実際の制作パイプラインに組み込めることを前提に設計されています

管理者向けの [メンテナンス CLI](./maintenance/README.jp.md) を提供しており、  
ユーザー管理やデータ操作をスクリプトから実行できます  
また、API 経由で動画をアップロードできるため、  
DCC ツールや自動テスト、CI などから直接連携することが可能です

以下は、動画をアップロードするコマンド例になります
```bash
go run . upload-video \
  --title "title" \
  --folder_key "folder_key" \
  --scene_path "scene_path" \
  --video_path "/path/to/video.mp4"
```

## 🧭 Roadmap

VideoReview は、制作現場で使われ続けることを前提に  
少しずつ改善・拡張していく予定です

今後も以下の考え方を軸に開発を進めます

- オンプレミスを前提とした構成と運用
- 既存のワークフローに自然に組み込める連携
- レビューを「次のアクション」につなげる設計
- 制作パイプラインへの組み込みや自動化への配慮

---

## 🚀 Getting Started

### 🐳 Docker

### 前提
* Docker、Docker Composeを事前にインストールしておいてください

---

### 設定ファイルのコピー

```bash
cp .example.env .env
cp compose.prod.example.yml compose.prod.yml
```

### ストレージパスの設定

動画などを保存するストレージパスを設定してください [compose.prod.yml](./compose.prod.yml)

```yaml
volumes:
  - /mnt/data/videoreview:/storage
```

### Build & Run
```bash
# 1. イメージの作成
docker build -t videoreview:latest -f docker/web/Dockerfile.prod .

# 2. DBを起動
docker compose -f compose.prod.yml up -d db

# 3. DB構築 (初回起動、またはschemaが更新されたとき)
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 4. サービス起動
docker compose -f compose.prod.yml up -d videoreview
```

## 💻 Local / On‑premise Setup
VideoReviewをサーバーやローカルマシンで直接実行する際はこちら

### Prerequisites
* node v24
* postgreSQL

### 環境変数の設定

.env ファイルをコピー後、編集し必要な値を設定してください

```bash
cp .example.env .env
```

```bash
LOCAL_ROOTDIR="/path/.../..."
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

### 注意事項

本番環境では、動画保存用のストレージを **必ず明示的に設定してください**。

`LOCAL_ROOTDIR` が未設定、または無効な場合、  
アプリケーションは `process.cwd()/uploads` にフォールバックして
動画ファイルを保存します。

このフォールバック挙動は以下の理由から、長期保存や本番運用には適していません。

- アプリケーションの再配置や更新でファイルが失われる可能性がある
- Docker 環境では、コンテナ内部の一時的なファイルシステムに保存される
- volume マウントされていない場合、コンテナ再作成で動画が消失する
- 保存場所が不明確になり、バックアップや容量管理が困難

## 🐳 Docker (Development)

### Prerequisites
* node v24
* postgreSQL

### 環境変数の設定
.env ファイルをコピー後、編集し必要な値を設定してください

```bash
cp .example.env .env
```
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

### Run docker compose
```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```

### Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/api/docs

---

## 📄 License

このプロジェクトは **MIT License** のもとで公開されています  
詳しくは [LICENSE](./LICENSE) をご確認ください
