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
    <a href="./documents/jp/README.md">
      <img alt="Documentation" src="https://img.shields.io/badge/Documentation-Open-3369b4?style=for-the-badge" />
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

<!-- One-liner + bullets -->
<h3>What it is</h3>

<p>
  VideoReviewは、動画レビューを「見るだけ」で終わらせないための
  <b>セルフホスト型の動画レビュー Web サービス</b>です。<br/>
  動画をアップロードし、タイムライン上にコメントを残したり、
  フレームに直接描き込みながらSNSのようにフィードバックを共有できます。
</p>

<p>
  現在は <b>Slack</b> や <b>Jira</b> と連携し、
  レビューで出た課題を次のワークフローへ自然につなげることができます。<br/>
  また、特定のツールやエンジンに依存しない設計となっており、
  既存の制作ワークフローに合わせて拡張していくことを前提としています。
</p>

<p>
  ゲーム開発や映像制作など制作現場における
  <b>チーム内レビュー</b>を想定して設計されています。
</p>

<!-- Screenshot -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/532f55eb-0f47-45aa-b17c-2e7a8bb5e191" alt="VideoReview screenshot" width="1280" />
</p>

# Need help setting it up?

オンプレミス構成や既存ツールとの連携など、導入時の相談や検証のサポートも可能です  
必要であれば、こちらまでご連絡ください

videoreview.contact.info@gmail.com

## 🤝 Contributing

参加方法は [CONTRIBUTING.jp.md](./CONTRIBUTING.jp.md) を参照してください。

# ✨ Key Features

## 💻 Flexible Deployment: On-premise or Cloud
VideoReviewはオンプレミス環境での運用を前提に設計しています  
社内ネットワーク内で動画を完結させることで、機密性の高い映像素材を外部に出さずにレビューを行えます  

一方で、運用やチーム構成に応じて
- AWS S3
- NextCloud 

ストレージとして選択することも可能です  
オンプレ・クラウドを用途に応じて使い分けることで、セキュリティ・導入コスト・運用負荷のバランスを柔軟に取れます  

---

## 💬 Actionable Comment Panel

コメント一覧は、SNSライクで直感的なUIを採用しています

- 描画付きコメント
- チケット連携されたコメント
- 重要な指摘

これらはバッジや色分けによって強調され、  
読む前に「対応が必要かどうか」が一目で分かります


## 🔔 Never Miss Feedback with Slack & JIRA
レビューは、見るだけでは終わりません。

このツールは、Slack や JIRA と連携することで、
レビューの発生や指摘を既存のワークフローに自然に組み込みます
重要なコメントやチケット化された指摘は、
チーム全体に可視化され、見逃されにくくなります

さらに、カスタムプロトコル を通じて、
外部ツールやアプリケーションと直接連携することも可能です

- 動画の該当シーンからエンジンやエディタを起動する
- 独自の制作パイプラインに接続する

動画レビューを次のアクションに直結する起点として扱えます

### 🔗 Workflow Integrations

| Slack and JIRA Integration | Unity Auto-Open via Custom Protocol |
| ---- | ---- |
| <img src="https://github.com/user-attachments/assets/e075f4fb-33cd-4b6c-9977-a9d24872f797" width="340"></video> | <img src="https://github.com/user-attachments/assets/e49670b2-5cfb-4f50-9863-f3bbe7e074fa" width="640"></video> |


# ✨ Advanced Features

## 🔍 Powerful Search for Review Workflow

動画とコメントをそれぞれ独立して検索できます

- コメントがある動画だけを探す
- 特定の人・期間のレビューを抽出する
- 描画やチケット付きの指摘を絞り込む

日々のレビューから、後日の振り返りまで必要な情報にすぐたどり着けます

<img src="https://github.com/user-attachments/assets/2ff99052-bf6f-409a-aab9-e6628444e61a" width="420"></img>

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

VideoReview は、制作現場で使われ続けることを前提に、  
少しずつ改善・拡張していく予定です

今後も、以下の考え方を軸に開発を進めます

- オンプレミスを前提とした構成と運用
- 既存のワークフローに自然に組み込める連携
- レビューを「次のアクション」につなげる設計
- 制作パイプラインへの組み込みや自動化への配慮

具体的な機能や優先度は、  
実際の利用状況やフィードバックを元に調整されます

---

## 🚀 Getting Started

### 🐳 Docker

### 前提
* Docker、Docker Composeを事前にインストールしておいてください

### 必要な設定

以下の変数について [compose.prod.yml](./compose.prod.yml) 設定してからDockerの起動をしてください

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

```bash
cp .example.env .env
```

.env ファイルを編集し必要な値を設定してください

```bash
LOCAL_ROOTDIR="/path/.../..."
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

### 注意事項

本番環境では、LOCAL_ROOTDIR を明示的に設定することを強く推奨します

LOCAL_ROOTDIR が設定されていないか無効な場合、アプリケーションは ./uploads にフォールバックします。  
長期保存には適さない可能性があります

## 🐳 Docker (Development)

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

このプロジェクトは **MIT License** のもとで公開されています。  
詳しくは [LICENSE](./LICENSE) をご確認ください。
