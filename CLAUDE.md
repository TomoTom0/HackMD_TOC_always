# HackMD TOC always - プロジェクトルール

## ビルド・デプロイ

```bash
# ビルド
./scripts/build.sh

# デプロイ（.envにDEPLOY_TARGETを設定）
./scripts/deploy.sh
```

## 開発ルール

- **変更後は必ず `./scripts/build.sh && ./scripts/deploy.sh` を1つのコマンドとして実行する。省略禁止。分けて実行しない。**
- dist/ディレクトリはgitignore対象
- .envファイルはgitignore対象（.env.exampleを参考）

## 現在の課題

- 既存TOCに依存しているため、HackMDのDOM変更に弱い
- 将来的には見出しから独自TOC生成を実装予定

## 拡張機能の仕様

- 対象URL: `https://hackmd.io/*`
- 除外URL: `https://hackmd.io/*?nav=*`
- Manifest V3
- jQueryなし（Vanilla JS）

## 機能

- エディットモード・スプリットビューモードでTOCを表示
- TOCの展開/折りたたみ
- 透明度、幅の調整
- 表示/非表示切り替え
- ナビゲーションボタン（トップ、ボトム、設定）
