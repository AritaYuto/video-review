# Notification Setup Guide (Slack / Webhook / Email)

VideoReview supports the following notification methods for review comments:

- Slack (API Token)
- Webhook (Slack / Microsoft Teams)
- Email (SMTP / Postfix)

You can enable only the notification methods that fit your workflow and environment.

---

## Slack Notifications (Using API Token)

This method uses a Slack API Token to post messages directly from VideoReview to Slack.

### Required Configuration

Set the following environment variables in your `.env` file:

```bash
VIDEO_REVIEW_SLACK_API_TOKEN=""
VIDEO_REVIEW_SLACK_POST_CH=""
VIDEO_REVIEW_SLACK_TEAM=""
```

| Variable                       | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `VIDEO_REVIEW_SLACK_API_TOKEN` | Bot Token of your Slack App                                              |
| `VIDEO_REVIEW_SLACK_POST_CH`   | Target Slack channel ID                                                  |
| `VIDEO_REVIEW_SLACK_TEAM`      | Slack team name (enables direct jump from VideoReview to Slack when set) |


## Webhook Notifications (Slack / Microsoft Teams)

This method sends notifications using Incoming Webhooks provided by Slack or Microsoft Teams.

### Supported Providers
* Slack
* Microsoft Teams

### Required Configuration
Set the following environment variables in your .env file:

```bash
VIDEO_REVIEW_WEBHOOK_TARGET="slack"   # or "teams"
VIDEO_REVIEW_WEBHOOK_URL=""
```

| Variable                      | Description                                |
| ----------------------------- | ------------------------------------------ |
| `VIDEO_REVIEW_WEBHOOK_TARGET` | Notification provider (`slack` or `teams`) |
| `VIDEO_REVIEW_WEBHOOK_URL`    | Webhook URL issued by the provider         |

The webhook payload format is handled internally by VideoReview,
so in most cases only the URL needs to be configured.

## Email Notifications (Postfix / SMTP)
Email notifications are delivered using the following relay structure:  
`VideoReview → Postfix → External SMTP server (Gmail, ISP SMTP, etc.)`

VideoReview does not include a built-in SMTP server.  
An SMTP relay is required.

```bash
VideoReview
   ↓ SMTP
Postfix (container)
   ↓ SMTP relay
External mail server (Gmail / ISP SMTP, etc.)
```

## Docker Compose Configuration Example
Add the following service to your compose.prod.yml:

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
| Variable             | Description                                     |
| -------------------- | ----------------------------------------------- |
| `RELAYHOST`          | SMTP relay server (e.g. `[smtp.gmail.com]:587`) |
| `RELAYHOST_USERNAME` | Username for SMTP authentication                |
| `RELAYHOST_PASSWORD` | Password for SMTP authentication                |

⚠️ When using Gmail, be sure to specify smtp.gmail.com:587.

## VideoReview Email Settings
Configure the following environment variables in your .env file:
```bash
VIDEO_REVIEW_EMAIL_ENABLE="true"
VIDEO_REVIEW_SMTP_HOST="smtp"
VIDEO_REVIEW_SMTP_PORT="25"
VIDEO_REVIEW_EMAIL_FROM="VideoReview <noreply@videoreview.dev>"
```