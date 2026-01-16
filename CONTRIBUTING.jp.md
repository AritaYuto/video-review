# Contributing

このプロジェクトは、開発初期のため気軽に参加してもらえると嬉しいです  
細かいルールで縛らず、最低限の共有だけあればOKにしています

## First Things First

- 小さな修正（誤字、UI微調整、README更新など）は気軽にPRでOKです
- 大きめの変更は、IssueやDiscussionで軽く相談してから進めるとスムーズです

## Branch Names

厳密なルールはありません  
意味が分かる名前なら何でもOKです

例:
- `fix/login-bug`
- `feature/comment-filter`
- `chore/update-readme`

## Commit Messages

形式は自由です  
「何をしたか」が分かればOKです

例:
- `fix: avoid crash when video is missing`
- `update UI copy`

必要ならマージ時にまとめたり整理します

## PR Notes (Minimum)

以下が分かれば十分です:

- 目的（何を解決したいのか）
- 変更点（何をどう変えたか）
- 影響範囲（UI/DB/APIなど）
- 動作確認（できた範囲でOK）

UI変更がある場合は、スクリーンショットや短い説明があると助かります

## Changes That Likely Need a Quick Consult

以下は事前相談を推奨します:

- 仕様が大きく変わる機能追加
- DBスキーマ変更やマイグレーション追加
- APIの互換性が変わる変更

## Code Style

既存の書き方・構成に合わせてもらえると嬉しいです  
コメントは、複雑な処理や意図が伝わりにくい部分に、補足として添えてもらえると助かります
