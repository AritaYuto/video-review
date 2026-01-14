# VideoReview Maintenance CLI

VideoReview のメンテナンス用 CLI ツールです  
本体とは別の **管理者向け内部ツール** になります

## ビルド方法

### Windows
> GOOS=windows GOARCH=amd64 go build -o video-review-cli

### Mac
> GOOS=darwin GOARCH=arm64 go build -o video-review-cli

### Linux
> GOOS=linux GOARCH=amd64 go build -o video-review-cli

## 必須環境変数

VideoReviewを動作させているサーバーURL
> VIDEO_REVIEW_SERVER_URL

メンテナンス用トークン  
.env と同じものを設定してください
> ADMIN_MAINTENANCE_TOKEN


### コマンド一覧

##### 管理者を作成します
> go run . create-admin --email hoge@gmail.com --pass 123abc

##### 動画のリストを取得します（JSON）
> go run . get-videos 
> go run . get-videos --include_revisions true

##### 動画のリビジョン情報を取得します（JSON）
> go run . get-videos-rev --video_id {uuid}

##### 動画を論理削除します
> go run . delete-video --video_id {uuid}

##### 動画の該当リビジョンを削除します
* ファイル削除＋論理削除を行います
* 実行後に元に戻すことはできません
> go run .  purge-revision --video_id {uuid} --revision 1
