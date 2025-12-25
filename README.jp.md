# VideoReview

> 🚀 デモサイトを用意しています！試してみてください！  
> https://demo-video-review.d16slh4aq95cwn.amplifyapp.com/

VideoReview は、動画をアップロードしてコメント、お絵描きしたりしながら、SNSのようにレビューできる Web サービスです。  
チーム内レビューや映像制作、ゲーム開発などでのフィードバックに役立ちます。

<img src="./documents/resources/drawing.gif" controls="true" width="800"></video>

## ✨ 主な特徴

## 「探す・把握する・確認する」をひとつの流れに

### 探したい動画に、すぐ辿り着ける高速検索
レビュー対象の動画が増えても、キーワード検索で瞬時に絞り込みができます  
ボス名・チャプター名・用途など、あいまいな記憶でも目的の動画にすぐアクセスでき、「探す時間」をほぼゼロにできます

### レビュー対象をツリー構造で一元管理
動画はチャプターや用途ごとにツリー構造で整理され、全体の構成を俯瞰しながらレビュー対象を選べます  
どの動画がどの文脈に属しているのかが直感的に分かり、レビューの抜け漏れを防ぎます

### 新着コメントが一目で分かる、迷わないレビュー導線
新しいコメントが付いた動画には「New」アイコンが表示され、次に確認すべき動画がひと目で分かります  
コメント → 動画確認 → 次の動画、という流れが自然につながり、レビュー作業を止めずに進められます

<img src="./documents/resources/search_movie.gif" controls="true" width="300"></video>

## 「探す・把握する・確認する」をひとつの流れに

### コメントをSlackへ同時共有し、レビューの拾い忘れ防止
動画へのコメントを、そのままSlackへ同時に共有できます  
コメント内容に加えて、該当時刻・スクリーンショット・動画への共有URLを送信することで、Slack上でもレビューを始められます

<img src="./documents/resources/slack.gif" controls="true" width="300"></video>

### コメントからタスクチケットを作成し、確実にトラッキング
コメントを起点にAtlassian社のJiraチケットを作成でき、指摘事項や修正タスクをそのままワークフローに乗せられます  
チケットには動画へのリンクが含まれるため、「どのシーンの話か」を迷わず確認でき、レビューとタスク管理が自然につながります

<img src="./documents/resources/create_issue.gif" controls="true" width="300"></video>

## 動画に直接描き込み、伝えたいポイントを明確に
動画のフレーム上に直接描き込むことで、言葉だけでは伝えにくい位置・形・動きのニュアンスを、そのまま共有できます  
コメントに視覚的な情報を加えることで、レビューの意図がより正確に、素早く相手に伝わります

<img src="./documents/resources/drawing.gif" controls="true" width="800"></video>

## 自動化フローに組み込みやすい動画アップロードAPI
VideoReviewでは、動画アップロードをREST APIとして公開しています  
CI・バッチ処理・ツール連携などから直接動画を登録でき、レビュー工程を既存の制作フローに容易に組み込むことが可能になっています


## オンプレを前提に、必要に応じてクラウドを選べる構成
VideoReviewはオンプレミス環境での運用を前提に設計しています  
社内ネットワーク内で動画を完結させることで、機密性の高い映像素材を外部に出さずにレビューを行えます  

一方で、運用やチーム構成に応じて、AWS S3 をストレージとして選択することも可能です  
オンプレ・クラウドを用途に応じて使い分けることで、セキュリティ・導入コスト・運用負荷のバランスを柔軟に取れます  

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
  http://localhost:3489/docs

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
