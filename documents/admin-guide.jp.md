# VideoReview Admin Guide

VideoReview に **Web の管理画面はありません**
管理操作は Web UI とメンテナンス CLI に分かれています

| 操作 | 場所 |
| --- | --- |
| 管理者を登録する | Web UI の初期セットアップ画面 |
| API トークンを発行する | Web UI の Settings → Edit Profile |
| ユーザー作成・動画削除・コメント取得などの運用操作 | [メンテナンス CLI](../maintenance/README.jp.md) |

---

## 初期セットアップ

デプロイ直後はユーザーが 1 人も存在しないため、Web UI から管理者を登録します

---

### Step 1: Web UI を開く

ブラウザでルート URL を開きます  

`http://localhost:3489` (Docker 起動している場合)

※ サーバー上で作業していない場合は、サーバーのホスト名と`compose.prod.yml` で公開しているポートに読み替えてください  
※ 初回起動では数秒間「Database is preparing...」と表示されます（自動でリトライします）

- 未初期化の場合 → セットアップ画面（`/bootstrap`）にリダイレクトされます
- 初期化済みの場合 → ログイン画面にリダイレクトされます

---

### Step 2: 管理者を登録する

**「Please register an administrator」** 画面で  
メールアドレスとパスワード（6 文字以上）を入力し、**Initialize** をクリックします

<img src="https://github.com/user-attachments/assets/fb096964-9dba-4941-a5ea-af8cf4087392" width="400" />

ここで作成されるユーザーは必ず **admin** ロールになります  
登録が完了すると、そのアカウントで自動的にログインされます

続けて、下記の [API Token](#api-token-を生成する) を生成し、 [メンテナンス CLI](../maintenance/README.jp.md) を利用できるようにしてください

---

### 注意事項

- セットアップ画面は **未初期化のときだけ** 利用できます  
  管理者が作成された後は、セットアップ API が `410 Already initialized` を返し、ルート URL からはログイン画面に遷移します
- その後 CLI（`create-user`）で作成したユーザーは常に **viewer** ロールになります  
  既存ユーザーを admin に昇格させる場合は、admin トークンで `PATCH /api/v1/admin/role-update` API を呼び出します
- Web UI にパスワードリセット画面はないため、管理者の認証情報は安全に保管してください

---

## API Token を生成する

API トークンは、**管理者（admin）ユーザーのみ**が Web UI から発行できます

---

### Step 1: Settings を開く

1. 画面左下の **⚙（Settings）アイコン** をクリックします
2. **Edit Profile** を選択します

![Settings](https://github.com/user-attachments/assets/b4b9f1a1-5167-4680-ab61-f8bd40319c4e)

---

### Step 2: API Token を生成する

プロフィール画面で **「API Token Generate」** ボタンをクリックします

![API Token Generate](https://github.com/user-attachments/assets/72a62a9d-c11f-4e08-81f8-7710cdf65b1d)

---

### Step 3: トークンを保存する

表示された API トークンをコピーして安全な場所に保存してください

---

### 注意事項

- API トークンは **一度しか表示されません**
- 画面を閉じると再表示できません
- 再度必要な場合は **再発行（Rotate）** してください
- 操作できるのは **admin ユーザーのみ**です
