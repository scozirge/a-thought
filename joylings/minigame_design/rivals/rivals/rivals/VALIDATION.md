# 驗證紀錄（2026-09-22）

## 角色、武器與場地視覺更新（2026-09-23）

- 最終 Web 建置成功，`Logs/visual-web-final.log` 包含 `RIVALS_WEB_BUILD_OK`；Web.wasm SHA256：`1E36E8A87993A5C96EE9BB57FDF68DF32F37328524CAE9D5DBC75E6DA2ECDDEB`，本地服務成品與驗證成品一致。
- 瀏覽器確認白灰格線場地、方塊笑臉角色、橘黑步槍、紅色彈殼霰彈槍、綠色狙擊槍、五個武器圖示與綠色生命條。首頁保留兩個加入按鈕，齒輪開關設定正常，Esc 顯示「聲音：關」。
- 第一輪 Web 檢查發現執行期建立 Cylinder 時，Unity 裁掉其自動建立的 CapsuleCollider。新增 `Assets/Rivals/link.xml` 保留此類型，確認原生註冊碼包含它；重新打包、進入練習並切換霰彈槍後，瀏覽器 error 紀錄為空。
- 背景內嵌瀏覽器仍會顯示滑鼠鎖定重試提示；完整持續滑鼠鎖定與跨電腦手感尚待一般瀏覽器前景人工驗收。
- Windows 建置成功，`Logs/visual-windows.log` 包含 `RIVALS_BUILD_OK`；Assembly-CSharp.dll SHA256：`CE8600EB33F908C6411DAF70E5DE2F9878EA8084904054C5833B83DC30C79B46`，與驗證成品相同。
- 連線版本更新為 `rivals-classroom-5`，避免新版場地與舊版客戶端混用。
- 已檢查 `Logs/game-art-review.png` 的五種武器與八組角色外觀，包含模型正向、配色、笑臉、髮型與帽子。
- 五種武器各跑離線練習，全部回報 `RIVALS_SMOKE_OK`。步槍、手槍、霰彈槍、狙擊槍均有命中；短刀測試只檢查切換及執行，未在自動遠距離路線中命中。
- 已檢查 `Logs/visual-weapon-captures` 的實際持槍和場景截圖；霰彈槍固定截圖時間碰到換彈，視覺另外透過模型預覽及瀏覽器切換確認。
- 八個 Windows 程式經 Photon 連線，全部回報 8 人、藍紅各 4 人，並同步至比分 4：0；第 9 人收到 `GameIsFull`。紀錄保留於 `Logs/visual-classroom`。
- 以上是同一台電腦上的多程式驗證，未做八台課堂電腦或跨網路測試。外觀為免費模型與原創造型調整，並非原作全部角色皮膚、武器與動畫的完整還原。

## 設定齒輪（2026-09-23）

- 首頁與 Esc 選單加入右上角小齒輪；設定內容預設收起，對戰時齒輪隱藏。F8 仍可開關設定。
- 齒輪圖示由程式繪製，不依賴中文字型缺少的齒輪符號。
- Web 建置成功，紀錄為 `Logs/settings-gear-web-build.log`。Web.wasm SHA256：`36EF1B065433C3F22B5B1982B3C07AE9EF2123273F681D6672688785815EE0F9`，與驗證建置相同。
- 瀏覽器實測點齒輪展開／收起設定，並用離線練習確認對戰時隱藏、Esc 選單中顯示。

## 繁體中文與 8 人教室版（2026-09-23）

- Unity Windows 建置成功，使用 `Tools/ClassroomSmokeTest.ps1` 執行 8 人真實 Photon 連線測試。
- 測試使用與「開房間」相同的 AutoHostOrClient 流程建立房間，第二名玩家也使用相同按鈕流程加入既有房間，其餘玩家使用 Client 加入。
- 8 個玩家都收到 `players=8 bluePlayers=4 redPlayers=4`，並同步遊戲結束比分 5：0；房主記錄 72 次射擊、30 次命中。
- 第 9 人加入收到 `GameIsFull`，未成功連線；測試結束後所有測試程式都已關閉。
- 8 份執行紀錄未出現 NullReferenceException、InvalidOperationException、MissingReferenceException 或 ArgumentException。
- 測試紀錄：`%TEMP%/RivalsClassroom-417843131e9f44f68434835afb819620`，已複製至 `Logs/classroom-eight-player`。
- Noto Sans CJK TC Regular OTF 共包含 44,810 個字元映射，介面程式碼內的中文字都有對應字形。
- 最新 Web 建置成功：`Logs/classroom-web-build.log` 包含 `RIVALS_WEB_BUILD_OK`。專案成品與驗證成品 Web.wasm SHA256 同為 `74769074FD6BD80E8E55FB3C701A73448FF57E25AE19E836CCB845D76AC26035`。
- 瀏覽器畫面確認首頁只有「開房間／加入房間」，未開房提示、等朋友、回合、體力、五種武器、Esc 選單均為繁體中文且無缺字。Esc 顯示「聲音：關」。
- F8 開啟老師設定，可查看房間代號、區域與素材授權；一般首頁不顯示這些內容。
- 最終 Web 版使用兩個瀏覽器分頁：第一個點「開房間」，第二個直接點「加入房間」，沒有輸入任何代號；兩邊生成本機及遠端角色，進入同一回合，藍、紅隊各 1 人。
- 本地首頁與 WASM 回應 200，WASM MIME type 為 application/wasm、Cache-Control 為 no-store；Web 成品包含 Noto 字型授權。
- Windows 成品同步更新，Assembly-CSharp.dll SHA256：`B5414A252620617566F9B268B88CBA19AA525196B3FB2FF0BAC037161075CB11`。
- 8 人測試為同一台電腦上的 Windows 程式經 Photon 連線，尚未進行 8 台實體電腦的課堂測試。

## Web 與持槍修正（2026-09-23）

- Unity 6000.3.11f1 WebGL / IL2CPP 建置成功，最後紀錄為 `Logs/web-build.log` 的 `RIVALS_WEB_BUILD_OK`。
- 第一人稱槍械縮放與手臂位置調整；獨立 URP Overlay Camera 顯示武器，避免世界瞄準倍率把槍械放得過大。
- 修正文字編碼、拆開五個武器快捷鍵欄位、分離彈藥顯示；暫停時不繪製或接受底下回合結束面板的按鈕輸入。
- 每次啟動 `AudioListener.pause = true`、音量為 0；音效播放也受 AudioEnabled 控制。首頁與選單確認顯示 SOUND: OFF。
- 背景瀏覽器實測：載入、離線練習、回合與比分變化、滑鼠拖曳改變視角和射擊、數字鍵切換武器、Esc 選單、離開對戰回首頁。
- 畫面確認新版手槍手部貼合握把，HUD 快捷鍵及彈藥沒有重疊；暫停面板沒有混入回合提示文字。
- 同一機器兩個 Web 分頁以 Host / Client 加入 Photon asia 的同一測試房，兩邊都生成本機及遠端角色，Client 記錄 players=2，並進入回合。
- 本地 HTTP 首頁和 WASM 都回應 200；WASM 使用 application/wasm，回應 Cache-Control: no-store。
- 最後 Web.wasm SHA256：`80d39e3e2ac887396d2026028be2f09ef9bbb76a33cb1e85e05c4a9399d195a1`，專案成品與驗證建置相同。
- 背景內嵌瀏覽器會拒絕真正的 Pointer Lock；模板現在會處理同步例外及 Promise rejection，顯示重新啟用提示，重測未再出現未處理的錯誤視窗。一般瀏覽器前景的持續滑鼠鎖定、完整手感、跨電腦網路仍須人工驗收。
- WebGL 日誌有 Unity 內建 URP Shader 不支援訊息；本次測試的場景、武器、角色、介面均有繪製。尚未做不同 GPU／瀏覽器的完整相容性測試。

下列 Windows 驗證屬於先前版本；這次交付更新的是 `Builds/Web`。

- Unity 6000.3.11f1 Windows x64 Development Build 成功。
- 使用提供的 Photon Fusion 2.1.2 stable 2279 套件與 App ID，區域 asia。
- 自動測試三個 Windows 執行個體：離線練習、Host、Client，皆正常結束。
- 練習：兩名角色、62 次射擊、8 次命中，比分 2：0。
- Host：兩名角色、42 次射擊、12 次命中，比分 3：0。
- Client：兩名角色、39 次射擊，收到相同比分 3：0。
- 未出現 NullReferenceException、InvalidOperationException、MissingReferenceException 或 ArgumentException。
- 已以正常 Windows 視窗執行並檢查遊戲輸出截圖，確認場景、第一人稱武器、血量、彈藥、比分及回合提示可見。
- 打包成品與驗證成品的 Assembly-CSharp.dll SHA256 相同。

這些是同一台電腦上的多程式測試；尚未實測兩台不同電腦、不同網路、延遲模擬、長時間連線或大量玩家。滑鼠鎖定與按鍵已實作，未進行完整人工手感驗收。

重新驗證方式見 README 與 Tools/SmokeTest.ps1。

## 免費素材整合版本

- 匯入 Quaternius 四種槍械、Kenney 方塊角色與 Legacy 動畫、場景道具、格紋貼圖、準星和腳步／命中聲。
- 匯入 Tabasco 槍聲與 SpringySpringo 換彈聲；依槍聲壓縮檔內 CC BY 3.0 文件署名，Windows 目錄內有 ASSET_CREDITS.txt 和原始 ThirdPartyLicenses。
- 新增霰彈槍、狙擊槍與彈匣同步。
- Unity Windows 最後打包成功；practice、host、client 三執行個體測試全部通過。練習比分 2：0，Host／Client 同步比分 3：0。
- 額外指定武器測試：霰彈槍 14 次射擊／8 次命中／比分 1：0；狙擊槍 10 次射擊／1 次命中／比分 1：0。
- 已檢查 Unity 直接渲染的場景截圖，確認角色貼圖、槍械材質、槍口方向、地板及樓梯顯示正常。
- 最後成品 Assembly-CSharp.dll SHA256：CE6310BF9DA0460CBD56DEF487A9E7D88CB6C483AFD8D63A0216D88E4886E58D，與測試成品一致。
- 尚未人工完整驗收音量混音、所有動畫銜接及跨電腦連線延遲；不代表原作全功能或手感已完整還原。
