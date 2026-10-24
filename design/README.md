# 設計稿

- `mockups/`：16 個畫面的互動設計稿原始碼（.dc.html）。它們需要設計工具的執行環境，**不能直接用瀏覽器打開**，但 AI 可以讀它們來確認版面、尺寸、顏色和互動邏輯。
- `screens/`：放畫面截圖（PNG）。從設計稿畫布右上角 Share › Export 匯出圖片後放進來，AI 看圖會更準。

| 檔案 | 畫面 |
| --- | --- |
| Main.dc.html | 今日（待辦＋蛋糕） |
| Calendar.dc.html | 月曆 |
| Goals.dc.html | 習慣（戳泡泡） |
| Collabs.dc.html | 接案管理 |
| Money.dc.html | 記帳 |
| Settings.dc.html | 設定 |
| AddTask / AddEvent / AddHabit / AddCollab / AddMoney | 各頁的新增畫面 |
| SetCategories / SetCakes / SetBudget / SetExport / SetBackup | 設定的子頁 |

注意：檔名裡的 Goals = 習慣頁、Collabs = 接案頁（設計過程改過名字），程式裡請用 Habits、Gigs。
