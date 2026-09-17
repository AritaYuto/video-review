# MCP サーバーガイド

MCP（Model Context Protocol）サーバーは、VideoReview のデータを AI アシスタントから使えるツールとして公開します。動画の一覧、コメントの取得、画面内テキストや台詞の検索、リビジョンに紐づくコード変更の追跡ができます。同じサーバーが 2 つの入口を支えています。

- **Claude Code / Claude Desktop / Gemini CLI** から直接接続して、「先週変更があった動画は？」といった質問にターミナルから答えられます。
- **アプリ内のチャット検索**（動画一覧ヘッダーのチャットアイコン）は VideoReview サーバーからこの MCP サーバーを呼びます。検索の振る舞いは一箇所で定義されます。

サーバー自体は VideoReview の REST API の薄いラッパーです。API トークンを持ち、代わりに `/api/v1/...` を呼ぶだけで、データベースや LLM には直接触りません。

---

## 1. 前提

- 動作中の VideoReview（ローカルの `npm run dev` か Docker）。
- API トークン。管理画面から発行します（[Admin Guide](./admin-guide.jp.md)）。
- ローカル（stdio）で使う場合: Node 24 と、`npm install` 済みのリポジトリ。

リポジトリ直下の `.env` に次を設定します（MCP サーバーは起動時にこれを読みます）。

```env
VIDEO_REVIEW_SERVER_URL=http://localhost:3489   # VideoReview のベース URL
VIDEO_REVIEW_API_TOKEN=<API トークン>
```

---

## 2. 起動モード

| モード | コマンド | 用途 |
|---|---|---|
| stdio | `npm run mcp:dev`（または `npm run mcp:build && npm run mcp:run`） | 同じマシンの Claude Code / Claude Desktop。クライアントがプロセスを起動します。 |
| HTTP | `MCP_TRANSPORT=http MCP_PORT=3490 npm run mcp:run` か compose の `mcp` サービス | アプリ内チャット検索と、別マシンのクライアント。エンドポイントは `http://<host>:3490/mcp` |

Docker では `mcp` サービスが `compose.yml`（開発）と `compose.prod.mcp.claude.yml` / `compose.prod.mcp.ollama.yml`（本番オーバーレイ）に定義されています。

```bash
docker compose -f compose.yml up -d --build mcp
# 本番
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .
docker compose -f compose.prod.yml -f compose.prod.mcp.claude.yml up -d mcp
```

compose は web サービスに `VIDEO_REVIEW_MCP_URL=http://mcp:3490/mcp` も設定します。これがアプリ内チャット検索を有効にする鍵で、未設定だとチャットアイコンは無効のままです。

---

## 3. Claude Code から接続する

リポジトリにはプロジェクト用の設定 `.mcp.json` が入っていて、stdio でサーバーを起動します。

```json
{
    "mcpServers": {
        "video-review": {
            "command": "npx",
            "args": ["tsx", "integrations/mcp/index.ts"]
        }
    }
}
```

リポジトリのディレクトリで Claude Code を開き、確認が出たらサーバーを承認します（プロジェクト設定のサーバーは初回に一度承認が要ります）。確認は次の通り。

```bash
claude mcp list
# video-review: npx tsx integrations/mcp/index.ts - ✔ Connected
```

自分で登録する場合は、どのディレクトリからでも次で登録できます。

```bash
# stdio・同じマシン（リポジトリ直下の .env を読む）
claude mcp add video-review -s user -- npx tsx /path/to/video-review/integrations/mcp/index.ts

# HTTP（Docker のサービスや別マシンのサーバー）
claude mcp add --transport http video-review http://localhost:3490/mcp
```

Claude Code のセッションで、たとえば次のように聞けます。

- 「VideoReview で今週アップロードされた動画を一覧して」
- 「描画付きのコメントがある動画は？」
- 「ドラゴンのボス動画の最新リビジョンに入ったコード変更は？」

### Claude Desktop

`claude_desktop_config.json` に追加します。

```json
{
    "mcpServers": {
        "video-review": {
            "command": "npx",
            "args": ["tsx", "/path/to/video-review/integrations/mcp/index.ts"],
            "env": {
                "VIDEO_REVIEW_SERVER_URL": "http://localhost:3489",
                "VIDEO_REVIEW_API_TOKEN": "<API トークン>"
            }
        }
    }
}
```

### Gemini CLI

```bash
gemini mcp add --transport http video-review http://localhost:3490/mcp
```

---

## 4. ツール

| ツール | 答えられること |
|---|---|
| `list_videos` | タイトル/フォルダの文字列、タグ、アップロード日の範囲、コメント条件（コメント有無、コメントしたユーザー、描画付き、課題リンク付き、コメント日の範囲）で絞った動画一覧。並び順と件数指定で「最近のもの」を取れる。 |
| `get_video` | 1 本の動画と全リビジョン（id、番号、アップロード日、タグ、要約）。 |
| `list_comments` | 全動画または 1 本の動画のレビューコメント。本文、ユーザー、日付、描画、課題リンク、リビジョンで絞り込み。 |
| `list_video_events` | 1 本の動画の解析イベント: 画面内テキスト、文字起こし、ショット種別、検出物体。 |
| `search_videos_by_event` | イベントに特定の文字列（台詞や字幕など）を含む動画。 |
| `list_vcs_changes` | リビジョンに紐づく PR と commit。動画の監視パスに対する関連度つき。 |
| `get_vcs_summary` | その変更の AI 要約。 |
| `list_tags` | 使われている全タグ。 |
| `list_folders` | 使われている全フォルダキー。 |

日付は ISO 8601。タグは最新リビジョンのタグ、コメントのユーザーは表示名で照合します。

### 検索ガイド（共有する前知識）

`integrations/mcp/search-guide.md` に、どの質問にどのツールを使うか、日付・タグ・コード変更の扱いのルールを書いてあります。サーバーはこれを 3 つの形で全クライアントに渡すので、アプリ内チャット、Claude Code、bot が同じ振る舞いになります。

- サーバーの `instructions`（接続時にクライアントへ届く。アプリ内チャットはこれをシステムプロンプトにし、実データのタグ一覧・フォルダ一覧を添える）
- `search-videos` プロンプト（Claude Code では `/mcp__video-review__search-videos` として出る）
- `video-review://search-guide` リソース

チーム固有の語彙（タグやフォルダの意味、担当）はリポジトリに入れません。Markdown ファイルに書いて、サーバーに場所を教えます。

```env
VIDEO_REVIEW_MCP_GUIDE_PATH=/srv/videoreview/team-notes.md
```

同梱ガイドの末尾に「Team notes」見出しで連結されます。ガイドかメモを編集してサーバーを再起動すれば、全クライアントに反映されます。

### Claude Code などのエージェント向け Skill

`.claude/skills/video-review-search/SKILL.md` は、動画に関する質問ではこの MCP サーバーを使うこと、その手順を短く書いた汎用の Skill です。Agent Skills の形式なので Claude Code 以外のツールでも読めます。語彙はガイド側に置き、Skill は汎用のままにしてください。

---

## 5. 狙った動画が返るか確かめる

`prisma/eval-data.ts` に、小さく決定的な動画セット（タグ、リビジョン、コメント、画面内テキスト、紐づく PR）を `eval/` フォルダ配下として定義しています。VideoReview が使うデータベースに投入し、MCP サーバーに対してチェックを走らせます。

```bash
npm run prisma:seed:eval   # .env の DATABASE_URL を使う。eval/ フォルダだけ置き換える
npm run mcp:eval           # stdio サーバーを起動して確認。12/12 passed が期待値
MCP_EVAL_URL=http://localhost:3490/mcp npm run mcp:eval   # HTTP サーバーに対して同じ確認
```

各チェックは「Kita がコメントした動画は？」のような質問に対してアシスタントが行うべきツール呼び出しと、返ってくるべきタイトルの集合です。ツールや裏の API を変えたあとに走らせ、自分の質問を足すときの雛形にしてください。seed を再実行すると `eval/` フォルダだけがリセットされ、他のデータには触れません。

---

## 6. トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| 起動時に `Warning: VIDEO_REVIEW_API_TOKEN is not set` | プロセスの作業ディレクトリに `.env` が無いか、キーが未設定。Claude Desktop では設定の `env` で渡す。 |
| ツールが `HTTP 401` を返す | トークンが違うか失効している。管理画面で発行し直す。 |
| ツールが `HTTP 404` / 接続拒否 | `VIDEO_REVIEW_SERVER_URL` の向き先が違う。Docker 内からは `localhost` ではなく `http://web:3489`。 |
| アプリのチャットアイコンが無効 | web サーバーに `VIDEO_REVIEW_MCP_URL` が無いか、到達できない。`GET /api/v1/llm/status` でどちらか分かる。 |
| `list_vcs_changes` が `from` を要求する | 最初のリビジョンには比較対象が無く、キャッシュもまだ無い。その動画の VCS パネルを一度開くか、後のリビジョンについて聞く。 |
