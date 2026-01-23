# 通知機能の設定ガイド（Slack / Webhook / Email）

VideoReview では、レビューコメントの通知先として以下の方法をサポートしています

* Slack（API Token）
* Webhook（Slack / Microsoft Teams）
* Email（SMTP / Postfix）

用途や運用環境に応じて、必要なものだけ設定してください

## Slack API Token を使った通知
Slack の API Token を利用して、VideoReview から 直接 Slack にメッセージを投稿します

### 必要な設定
.envの以下の環境変数を適切に設定してください
```bash
VIDEO_REVIEW_SLACK_API_TOKEN=""
VIDEO_REVIEW_SLACK_POST_CH=""
VIDEO_REVIEW_SLACK_TEAM=""
```

| 変数名                            | 説明                                                     |
| ------------------------------ | ------------------------------------------------------ |
| `VIDEO_REVIEW_SLACK_API_TOKEN` | Slack App の Bot Token                                  |
| `VIDEO_REVIEW_SLACK_POST_CH`   | 投稿先のチャンネルID                                            |
| `VIDEO_REVIEW_SLACK_TEAM`      | Slack チーム名（設定すると VideoReview → Slack への直接ジャンプが有効になります） |


## Webhook を使った通知（Slack / Microsoft Teams）
Slack や Microsoft Teams の Incoming Webhook を利用した通知です

### 対応プロバイダ
* Slack
* Microsoft Teams

### 必要な設定
.env に以下を設定してください
```bash
VIDEO_REVIEW_WEBHOOK_TARGET="slack"   # or "teams"
VIDEO_REVIEW_WEBHOOK_URL=""
```

| 変数名                           | 説明                            |
| ----------------------------- | ----------------------------- |
| `VIDEO_REVIEW_WEBHOOK_TARGET` | 通知先プロバイダ（`slack` または `teams`） |
| `VIDEO_REVIEW_WEBHOOK_URL`    | 各サービスで発行した Webhook URL        |

Webhook のフォーマットは VideoReview 側で吸収しているため、基本的には URL を設定するだけで動作します

## Email を使った通知（Postfix / SMTP）

Email 通知は、VideoReview → Postfix → 外部 SMTP（Gmail など）という構成でメールを送信します

VideoReview 自体は SMTP サーバを内蔵せず、SMTP リレーを前提とした設計になっています

```bash
VideoReview
   ↓ SMTP
Postfix（コンテナ）
   ↓ SMTP relay
外部メールサーバ（Gmail / ISP SMTP など）
```

### Docker Compose への追加例

```yml
smtp:
  image: boky/postfix
  container_name: videoreview-smtp
  environment:
    HOSTNAME: "videoreview.local"
    ALLOW_EMPTY_SENDER_DOMAINS: "true"
    ALLOWED_NETWORKS: "0.0.0.0/0"
    RELAYHOST: "[smtp.gmail.com]:587"
    RELAYHOST_USERNAME: ""
    RELAYHOST_PASSWORD: ""
  ports:
    - "1025:25"
```

| 変数名                  | 説明                                         |
| -------------------- | ------------------------------------------ |
| `RELAYHOST`          | メール送信先の SMTP サーバ（例：`[smtp.gmail.com]:587`） |
| `RELAYHOST_USERNAME` | SMTP 認証に使用するユーザー名                          |
| `RELAYHOST_PASSWORD` | SMTP 認証に使用するパスワード                          |


⚠️ Gmail を利用する場合は必ず smtp.gmail.com:587 を指定してください

# VideoReview 側の Email 設定

.env に以下を設定してください。
```bash
VIDEO_REVIEW_EMAIL_ENABLE="true"
VIDEO_REVIEW_SMTP_HOST="smtp"
VIDEO_REVIEW_SMTP_PORT="25"
VIDEO_REVIEW_EMAIL_FROM="VideoReview <noreply@videoreview.dev>"
VIDEO_REVIEW_SMTP_TLS_STRICT="false"
```

> VIDEO_REVIEW_SMTP_TLS_STRICT
SMTPサーバーが有効で信頼できる証明書を使用している場合にのみ、trueに設定してください。