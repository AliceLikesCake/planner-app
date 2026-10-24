# 給 VS Code AI 的提示詞（照順序一次貼一段）

每段做完、確認畫面沒問題、commit 之後，再貼下一段。不要一次全部貼。

---

## 0. 開始前（只做一次）

```
請先完整讀過 AGENTS.md、docs/SPEC.md、src/styles/tokens.css、src/locales/ 和 supabase/schema.sql，
然後用條列告訴我你理解的 app 架構、9 個開發階段，以及你需要我提供或決定的事。先不要寫程式。
```

## 1. 骨架

```
做 SPEC 第 9 節的第 1 階段「骨架」：
- 設定 Vue Router：/、/calendar、/habits、/gigs、/money、/settings，以及 /add/* 和 /settings/* 的空頁面
- 底部分頁 BottomNav（5 個分頁，icon 參考 design/mockups/Main.dc.html 的 nav）和右下角 Fab 元件
- 引入 src/styles/tokens.css，字體 Huninn + Noto Sans TC
- 設定 vue-i18n，使用 src/locales 兩個檔案；設定頁做出「語言」切換（中文／English），存在 localStorage，之後會改存 Supabase
- 其他頁面先放標題就好
完成後跑 npm run build，告訴我怎麼確認切換英文有效。
```

## 2. 登入與資料

```
做第 2 階段：
- src/services/supabase.ts 建立 client（讀 .env.local 的 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY）
- Google 登入、登出，未登入時顯示簡單的登入畫面
- 第一次登入時建立 settings 那一列，並寫入預設類別（SPEC 3.1 和 4.5 的類別，含 name_zh、name_en）
- 為每張表建立 Pinia store（讀、新增、修改、刪除）
- 語言設定改存在 settings.lang
告訴我要在 Supabase 後台設定哪些東西（Google 登入、Redirect URL）。
```

## 3. 今日頁

```
做第 3 階段「今日」，完全依照 SPEC 4.1 和 design/mockups/Main.dc.html：
- 甜點卡固定、待辦清單獨立捲動
- TaskRow：類別 icon、標題、時間＋類別文字標籤、圓形勾選框；完成後全部變灰
- components/cake/：layers.ts（純函式算層數與高度，含 >8 件合併規則）、desserts.ts（7 種甜點的形狀與裝飾）、Cake.vue（立體效果、drop 動畫、全部完成裝飾）
- services/sound.ts：water-bubble、fairy-glitter、取消時的合成彈跳聲，遵守音效設定
- 新增待辦畫面 /add/task（SPEC 4.6）
- 幫 layers.ts 寫 Vitest 測試：3 件、6 件、12 件
```

## 4. 月曆

```
做第 4 階段「月曆」，依照 SPEC 4.2 和 design/mockups/Calendar.dc.html：
月曆格子顯示行程、跨天長條（跨週要接上）、類別篩選、點日期顯示當天行程與待辦（未完成在前、完成在後變灰、過去未完成標紅棕色）。
做新增行程畫面 /add/event，並完成同步規則 6、7。
```

## 5. 習慣

```
做第 5 階段「習慣」，依照 SPEC 4.3 和 design/mockups/Goals.dc.html：
泡泡點一下就戳破（圓環＋水滴動畫＋音效），再點復原，全部戳破播放 fairy-glitter；
下方每月紀錄（每個習慣一個切換，沒有「全部」），本月完成、目前連續、最長連續。
做新增習慣畫面 /add/habit。
```

## 6. 接案

```
做第 6 階段「接案」，依照 SPEC 4.4 和 design/mockups/Collabs.dc.html：
統計卡、兩排篩選、卡片（產品類別 icon、金額、入帳狀態標籤、合約→勞報單→交稿→上線→入帳 五個勾選圈、底部日期）。
做新增接案畫面 /add/gig（含 4 個自動同步開關）。
在 services/sync.ts 實作 SPEC 第 6 節規則 1–5 和刪除規則，要冪等，並寫 Vitest 測試。
```

## 7. 記帳

```
做第 7 階段「記帳」，依照 SPEC 4.5 和 design/mockups/Money.dc.html（不要用圓餅圖）：
總覽卡、分類排行（支出／收入切換）、依日期分組的明細（只顯示類別、不顯示時間）。
做記一筆畫面 /add/money（數字鍵盤、收入選接案時要選哪個接案，接上同步規則 5）。
```

## 8. 設定與上線

```
做第 8 階段：
- 設定頁和 5 個子頁（SPEC 4.7，對照 design/mockups/Set*.dc.html）
- 規則 9「沒做完的移到明天」
- vite-plugin-pwa（App 名稱、icon、離線快取）
- 匯出 Excel（SheetJS，每個內容一個工作表，欄位名稱依目前語言）
- 部署到 Vercel 的步驟
- 英文 README：功能介紹、截圖位置、技術架構、同步關聯說明
```
