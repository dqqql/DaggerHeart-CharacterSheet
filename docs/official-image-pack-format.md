# 官方卡图包格式

当前 SRD 版本不会默认附带官方卡图。若要恢复图片体验，需要在首页导入单独提供的卡图包 zip。

## 目录结构

```text
official-image-pack.zip
├─ manifest.json
└─ images/
   ├─ card-id-1.webp
   ├─ card-id-2.webp
   └─ ...
```

## `manifest.json` 最小结构

```json
{
  "type": "official-image-pack",
  "packId": "builtin-official-images",
  "version": "V20251114",
  "target": "builtin-base",
  "matchBy": "cardId",
  "imagePattern": "images/{cardId}.webp"
}
```

## 导入规则

- `type` 必须为 `official-image-pack`
- `matchBy` 必须为 `cardId`
- 图片文件应放在 `images/` 目录下
- 图片文件名去掉扩展名后，需要能匹配当前内置卡牌的 `id`
- `target` 或 `version` 不匹配时会警告，但不会阻止导入
- 重复导入会覆盖本地已有的官方卡图缓存

## 本地存储

- 图片内容会写入 IndexedDB
- 首页会持久化记录当前导入的卡图包元信息
- 清除卡图后会回退到 SRD 纯文字模式
