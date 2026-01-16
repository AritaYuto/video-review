# VideoReview

> 🚀 デモサイトを用意しています！試してみてください！  
> https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/

VideoReview は、動画レビューを「見るだけ」で終わらせないための Web サービスです  
動画をアップロードし、コメントやお絵かきを添えながら、SNSのような感覚でフィードバックを共有できます  
Slack や JIRA など、既存のワークフローとも連携できるため次のアクションへ自然につながります

映像制作やゲーム開発など、制作現場でのチーム内レビューを想定して設計されています

<img src="./documents/resources/welcome.png" controls="true" width="1280"></video>

# Need help setting it up?

オンプレミス構成や既存ツールとの連携など、導入時の相談や検証のサポートも可能です  
必要であれば、こちらまでご連絡ください

videoreview.contact.info@gmail.com

## 🤝 Contributing

参加方法は `CONTRIBUTING.jp.md` を参照してください。

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
| <img src="./documents/resources/comment.gif" width="340"></video> | <img src="./documents/resources/custom-protocol.gif" width="640"></video> |


# ✨ Advanced Features

## 🔍 Powerful Search for Review Workflow

動画とコメントをそれぞれ独立して検索できます

- コメントがある動画だけを探す
- 特定の人・期間のレビューを抽出する
- 描画やチケット付きの指摘を絞り込む

日々のレビューから、後日の振り返りまで、  
必要な情報にすぐたどり着けます

<img src="./documents/resources/movie_search.gif" width="420"></video>

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

## 🚀 開発環境のセットアップ
Dockerとローカルの２つのセットアップをサポートしています

## 🐳 環境構築：Docker
前提：Docker、Docker Composeを事前にインストールしておいてください

```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```

## 💻 環境構築：ローカルに構築（オンプレ）

#### 必要なツール
* node v24
* postgreSQL

```bash
# Install dependencies
npm install

cp .example.env .env

# Required .env Values
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
JWT_SECRET="xxxxxxx"

# Generate Prisma Client
npm run prisma:deploy
npm run prisma:generate

# Start the development server
npm run dev
```

### 開発サーバーへアクセス

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/api/docs

---

## 🛠 ビルド & デプロイ

```
# Install dependencies
npm install

cp .example.env .env

# Run build
npm run build

# Start server
npm run start
```

## 📄 ライセンス

このプロジェクトは **MIT License** のもとで公開されています。  
詳しくは [LICENSE](./LICENSE) をご確認ください。
