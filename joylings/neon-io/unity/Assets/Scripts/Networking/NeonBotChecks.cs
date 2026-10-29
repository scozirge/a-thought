#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text;
using LitJson;
using Starbro.NeonIO;
using UnityEditor;
using UnityEngine;

namespace Neon.Networking
{
    public static class NeonBotChecks
    {
        static void Require(bool condition, string message) { if (!condition) throw new Exception("Bot tactics: " + message); }
        static Skill[] Skills(string feature) => AssetDatabase.LoadAssetAtPath<GameObject>(
            "Assets/Resources/Gameobjects/Battle/Skill/Skill-" + feature + ".prefab").GetComponentsInChildren<Skill>(true);
        public static void Run()
        {
            float t = BotTacticalMath.InterceptTime(new Vector2(600, 0), new Vector2(0, 200), 800, 2);
            Require(Mathf.Abs(new Vector2(600, 200 * t).magnitude - 800 * t) < .01f, "lateral intercept misses its physical solution");
            Require(BotTacticalMath.InterceptTime(Vector2.right * 1000, Vector2.right * 1200, 100, .9f) <= .9f, "unreachable target lead was unbounded");
            var ice = Skills("QuadrupleIcicle")[0].BotTactics;
            Require(ice.FixedLane && ice.Pattern == DirectionPatetern.Default && ice.StartAngle == -45 && ice.Shots == 4,
                "fixed-world icicles must not become facing shots");
            Vector2 lane = BotTacticalMath.Lane(ice, new Vector2(400, 450));
            Require(Vector2.Angle(lane, Vector2.one) < .01f, "diagonal firing lane was not selected");
            var carrot = Skills("Carrot")[0].BotTactics;
            Require(carrot.FixedLane && carrot.Pattern == DirectionPatetern.LeftRight && carrot.Shots == 4, "carrot arc classification");
            var fire = Skills("FireBall")[0].BotTactics;
            Require(fire.Ranged && fire.Pattern == DirectionPatetern.FaceDirection && !fire.Homing && fire.Range == 1200, "fireball range/aim");
            var balloon = Skills("TraceBalloon")[0].BotTactics;
            Require(balloon.Homing && balloon.Range <= 600, "homing balloon must respect flight lifetime, not just detection radius");
            Require(Skills("TripleArrow")[0].BotTactics.Range > 500, "accelerating arrows misclassified as stationary");
            Require(Skills("FireTrail")[0].BotTactics.Trail && Skills("ReactionForce")[0].BotTactics.Area &&
                !Skills("ReactionForce")[0].BotTactics.Trail, "ground trail and target-area attack were conflated");
            Require(!Skills("ReflectAmmoShell")[0].BotTactics.TargetArea && Skills("ReactionForce")[0].BotTactics.TargetArea,
                "self reflection shield was mistaken for a target-position explosion");
            Require(Skills("Heal")[0].BotTactics.QuietRecovery && Skills("Berserker")[0].BotTactics.Contact &&
                Skills("Ghost")[0].BotTactics.Defensive, "recovery, melee sustain and escape classification");
            Require(!Skills("DieGhost")[0].BotTactics.Defensive && !Skills("Vampire")[0].BotTactics.Recovery &&
                Skills("Vampire")[0].BotTactics.Sustain, "death effects and hit-healing must not be mistaken for passive recovery");
            foreach (int rating in new[] { 500, 1200, 1800 })
            {
                var tuning = NeonBotDifficulty.For(rating);
                Require(!BotTacticalMath.ShouldRetreat(.6f, tuning.Retreat, 1, true), "spent defense alone interrupted a healthy duel");
                Require(!BotTacticalMath.ShouldRetreat(.8f, tuning.Retreat, 3, false), "healthy bot abandoned a crowded fight");
                Require(!BotTacticalMath.ShouldRetreat(.8f, tuning.Retreat, 2, false), "healthy endgame skirmish forced a retreat");
                Require(BotTacticalMath.ShouldRetreat(.15f, tuning.Retreat, 1, false), "critical health no longer permits retreat");
            }
            Require(BotTacticalMath.ShouldRetreat(.45f, .3f, 3, false), "injured bot ignored a dangerous crowd");
            Require(BotTacticalMath.ShouldRetreat(.35f, .3f, 1, true), "low health with spent protection ignored risk");
            Require(BotTacticalMath.SafeRadius(100, 220) == 85 && BotTacticalMath.SafeRadius(0, 220) == 0,
                "large safety margin collapses the endgame to a single point too early");
            float headOn = BotTacticalMath.ProjectileRisk(Vector2.zero, Vector2.zero, new Vector2(300, 0), new Vector2(-600, 0), .65f, 80);
            float sidestep = BotTacticalMath.ProjectileRisk(Vector2.zero, new Vector2(0, 300), new Vector2(300, 0), new Vector2(-600, 0), .65f, 80);
            Require(headOn > .99f && sidestep < .01f, "visible projectile evasion scores an unsafe path as safe");
            CheckBrainScenarios();
            NeonBotComboChecks.Run();
            ExportSkillAnalysis();
            Debug.Log("NEON_BOT_CHECKS_OK 95 accessories; brain scenarios: ranged spacing, firing gate, loadout switch, healthy crowd contest, injured retreat, shorter reset, recovery, hidden target, observed lead; math and protocol checks");
        }
        static T Fixture<T>(string name, Vector2 position) where T : Role
        {
            var go = new GameObject(name); go.transform.position = position;
            var role = go.AddComponent<T>();
            role.MaxHealth = 1500; role.Health = 1500; role.ColliderRadius = 50; role.BaseMoveSpeed = 400;
            typeof(Role).GetField("IsInit", BindingFlags.Instance | BindingFlags.NonPublic).SetValue(role, true);
            typeof(Role).GetProperty("IsAlive").GetSetMethod(true).Invoke(role, new object[] { true });
            typeof(Role).GetProperty("Movetorward").GetSetMethod(true).Invoke(role, new object[] { Vector3.up });
            CombatRegistry.Add(role);
            return role;
        }
        static void CheckBrainScenarios()
        {
            // Editor-only decision harness: no battle scene, network connection or profile writes.
            var rng = UnityEngine.Random.state;
            var objects = new List<GameObject>();
            try
            {
                UnityEngine.Random.InitState(3152);
                var bot = Fixture<NeutralRole>("Bot tactics fixture", Vector2.zero); objects.Add(bot.gameObject);
                var enemy = Fixture<NeutralRole>("Visible enemy", new Vector2(600, 0)); objects.Add(enemy.gameObject);
                var high = NeonBotDifficulty.For(1800);
                bot.SkillDic[FeaturePart.Head] = Skills("FireBall")[0];
                var brain = new ArenaBotBrain(bot); brain.Sense(1, high);
                Require(brain.Target == enemy && brain.Intent == ArenaBotIntent.Poke && brain.Movement.x < 0,
                    "ranged loadout charged a target already inside preferred range");
                Require(!brain.CanFire((Attack)bot.SkillDic[FeaturePart.Head]), "high bot fired a narrow facing shot before turning");
                var lowBrain = new ArenaBotBrain(bot); lowBrain.Sense(1, NeonBotDifficulty.For(500));
                Require(lowBrain.CanFire((Attack)bot.SkillDic[FeaturePart.Head]), "low tier accidentally gained high-tier firing discipline");
                bot.SkillDic[FeaturePart.Head] = Skills("QuadrupleIcicle")[0];
                brain.Sense(2, high);
                Require(Mathf.Abs(brain.Movement.y) > .3f, "loadout swap did not reposition onto a fixed diagonal lane");
                var flank = Fixture<NeutralRole>("Second enemy", new Vector2(0, 250)); objects.Add(flank.gameObject);
                var third = Fixture<NeutralRole>("Third enemy", new Vector2(250, 0)); objects.Add(third.gameObject);
                enemy.transform.position = new Vector2(300, -100);
                brain.Sense(3, high);
                Require(brain.Intent == ArenaBotIntent.Poke, "healthy high bot abandoned all pressure in a three-enemy fight");
                bot.Health = 600; brain.Sense(3.3f, high);
                Require(brain.Intent == ArenaBotIntent.Disengage, "injured bot ignored three nearby threats");
                UnityEngine.Object.DestroyImmediate(flank.gameObject); UnityEngine.Object.DestroyImmediate(third.gameObject);
                bot.Health = 900; brain.Sense(3.6f, high);
                Require(brain.Intent == ArenaBotIntent.Disengage, "retreat direction flickered immediately after danger cleared");
                brain.Sense(4.6f, high);
                Require(brain.Intent == ArenaBotIntent.Poke, "bot kept fleeing after its shorter retreat window ended");
                bot.SkillDic[FeaturePart.Back] = Skills("Heal")[0]; bot.Health = 450;
                brain.Sense(5, high);
                Require(brain.Intent == ArenaBotIntent.Recover, "low-health recovery loadout failed to disengage");
                var buffers = (Dictionary<RoleBuffer, BufferData>)typeof(Role).GetField("Buffers", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(enemy);
                buffers[RoleBuffer.Invisible] = new BufferData(RoleBuffer.Invisible, 3, 0, 0);
                brain.Sense(6, high);
                Require(brain.Target == null, "hidden enemy remained a tracked target");
                buffers.Clear(); bot.Health = 1500;
                bot.SkillDic[FeaturePart.Head] = Skills("FireBall")[0];
                enemy.transform.position = new Vector2(600, 0);
                var leadBrain = new ArenaBotBrain(bot); leadBrain.Sense(7, high);
                enemy.transform.position = new Vector2(600, 50); leadBrain.Sense(7.25f, high);
                Vector3 aim = leadBrain.AimPoint(bot.SkillDic[FeaturePart.Head]);
                Require(aim.y > 70, "observed lateral movement was not led by the high-tier brain");
            }
            finally
            {
                foreach (var go in objects) if (go) UnityEngine.Object.DestroyImmediate(go);
                UnityEngine.Random.state = rng;
            }
        }
        static string H(string value) => WebUtility.HtmlEncode(value);
        public static void ExportSkillAnalysis()
        {
            var features = JsonMapper.ToObject(File.ReadAllText("Assets/Resources/Json/Feature.json"))["Feature"];
            var strings = JsonMapper.ToObject(File.ReadAllText("Assets/Resources/Json/String_Feature.json"))["String_Feature"];
            var names = new Dictionary<int, string>();
            foreach (JsonData entry in strings) names[int.Parse(entry["ID"].ToString())] = entry["Chinese"].ToString().Split('/')[0];
            var rows = new StringBuilder(); int count = 0;
            foreach (JsonData feature in features)
            {
                int id = int.Parse(feature["ID"].ToString());
                string type = feature["FeatureType"].ToString().Trim();
                var details = new List<string>();
                foreach (var skill in Skills(type))
                {
                    var p = skill.BotTactics.WithAccessory(id);
                    Require(!float.IsNaN(p.Range) && p.Range >= 0 && p.Range <= 10000, "invalid range: " + type);
                    string trigger = skill is PassiveSkill passive ? "自動被動：" + TriggerName(passive.TriggerType) : "目標入範圍、冷卻完成後施放";
                    var uses = new List<string>();
                    if (p.Reactive && p.Offensive) uses.Add("事件觸發的後續輸出：不當成能主動開戰的遠程武器，不為觸發反擊而故意受傷");
                    if (p.Ranged)
                    {
                        uses.Add(p.Homing ? "追蹤彈：放出後拉開、保留存活空間" : p.Returning ? "回旋彈：中距離側移，利用回程" :
                            p.FixedLane ? "固定彈道：移動對齊射線，不假裝轉身能改射向" : "遠程：依觀測速度預判，保持射程內距離");
                        uses.Add("射向 " + PatternName(p.Pattern) + "；起始角 " + p.StartAngle + "°；" + p.Shots + " 發、角差 " + p.AngleStep + "°");
                    }
                    if (p.Trail) uses.Add("地面殘留／陷阱：撤退時沿路留下，不原地等人撞");
                    if (p.TargetArea) uses.Add("目標位置範圍攻擊：保持距離，依施法延遲做短預判");
                    if (p.Contact) uses.Add("近戰／貼身：有血量或防禦優勢才進場；生命至少 55% 時可參與兩名敵人的小混戰");
                    if (p.SetupControl) uses.Add("配合接招的控制：緩速或至少 0.75 秒暈眩；與其他重擊搭配，觀察到命中後接招");
                    else if (p.Control) uses.Add("短暈／虛弱／擊退：保留原效果，不當成需要等待的長控制起手");
                    if (p.Defensive || id == 117) uses.Add("保命：尊重原本自動觸發；失去保護／冷卻時降低換血意願");
                    if (p.Recovery) uses.Add("回復：低血時安全撤離或撿星回血；小傷繼續交戰，不故意降到低血量來觸發");
                    if (p.Sustain) uses.Add("命中續航：必須命中才回血；不當成脫戰自動回血，依另一配件決定遠程換血或近戰進場");
                    if (p.QuietBenefit) uses.Add("脫戰增益：受傷且不足半血才優先拉開，爭取未受傷時間；是否回血依本技能原效果");
                    if (p.LootRecovery) uses.Add("吃星回血：必須實際取得星星，不當成站著就能恢復");
                    if (p.StationaryRecovery) uses.Add("靜止增益：確認安全且需要恢復才停留");
                    if (p.Harvest || id == 11 || id == 122) uses.Add("吸星／吃星收益：優先低風險星星，不為星星追進霧裡");
                    if (uses.Count == 0) uses.Add("輔助／事件觸發：維持原觸發條件，走位依另外兩個配件判斷");
                    if (p.Offensive) uses.Add("估計有效距離 " + Mathf.RoundToInt(p.Range) + " 世界單位（依碰撞範圍、偵測與彈道估計；非保證命中距離）");
                    details.Add(trigger + "\n" + string.Join("\n", uses));
                }
                rows.Append("<tr><td>").Append(id).Append("</td><td>").Append(H(names[id])).Append("</td><td>")
                    .Append(feature["FeaturePart"].ToString() == "Head" ? "頭部" : feature["FeaturePart"].ToString() == "Body" ? "身體" : "背部")
                    .Append("</td><td>").Append(H(string.Join("\n\n", details))).Append("</td></tr>");
                count++;
            }
            Require(count == 95, "catalog no longer covers all 95 accessories");
            string page = "<!doctype html><html lang='zh-Hant'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<title>星際遊俠｜Bot 技能策略</title><style>body{background:#10192b;color:#eee;font:16px/1.65 system-ui;margin:24px auto;padding:0 20px;max-width:1200px}h1,h2,th{color:#d8bd77}a{color:#a8d9df}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #45516b;padding:14px;text-align:left;vertical-align:top}td:last-child{white-space:pre-line}input{background:#1b2840;color:white;border:1px solid #b49e66;padding:12px;width:min(90%,500px)}.scroll{overflow:auto}</style>" +
                "<h1>三階 Bot：技能組合與生存策略</h1><p>積分計算維持不變。本頁依目前 95 個配件的實際 prefab 參數產生；同時分析頭、身、背的組合。技能原本說明、傷害、冷卻不因 AI 等級而改變。</p>" +
                "<div class='scroll'><table><tr><th>等級</th><th>積分</th><th>行為差異</th></tr><tr><td>低</td><td>0–999</td><td>基本配裝距離、低血撤離與進圈；預判較弱，較少等射線，也不主動閃子彈。</td></tr>" +
                "<tr><td>中</td><td>1000–1599</td><td>整套配裝的共同射程、短暫等待控制、近戰短進短出、基本預判與可見子彈閃避。</td></tr>" +
                "<tr><td>高</td><td>1600 以上</td><td>控制接重擊、多射向協調、保護期短進場與短暫重整；高血時參與混戰，低血才優先恢復。</td></tr></table></div>" +
                "<p>2026-10-25：降低過度避戰。低／中／高階基本撤退血量為 20%／25%／30%；最後四名不提高門檻。中／高階附近至少 3 人且不足半血才因混戰撤離；恢復配裝也要受傷且不足半血，才優先爭取脫戰增益。撤退保留約 0.6／0.8／1 秒，危險持續才延長。</p>" +
                "<p>三階偵敵視野同為 1200 世界單位。高階仍保留 0.13 秒觀測間隔、0.22 秒決策節奏、±3° 瞄準誤差，不能讀取未來輸入或追蹤隱形對手。被動技能依原觸發條件運作，AI 不會手動囤放原本不能手控的技能。</p>" +
                "<p>驗證：95 個配件、31,680 套組合的分類檢查，以及代表性編輯器決策案例；不是跑了 31,680 場對戰。依本次要求沒有實機／Photon 試玩，實際勝率、體感與效能待你測試。<a href='../ARENA_RATING_RULES.txt'>積分規則</a> · <a href='../BOT_COMBINATIONS.txt'>完整技能組合規則</a></p>" +
                ComboGuideHtml() +
                "<h2>95 個配件逐項分析</h2><input id='q' placeholder='搜尋名稱、預判、保命、固定彈道…'><div class='scroll'><table><thead><tr><th>ID</th><th>配件</th><th>部位</th><th>策略依據</th></tr></thead><tbody id='rows'>" + rows +
                "</tbody></table></div><script>document.getElementById('q').oninput=e=>document.querySelectorAll('#rows tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(e.target.value.toLowerCase()))</script></html>";
            Directory.CreateDirectory("../docs/bot-strategy");
            File.WriteAllText("../docs/bot-strategy/index.html", page, new UTF8Encoding(false));
        }
        static string ComboGuideHtml() =>
            "<h2>同一套配裝可以同時有多種打法</h2><p>先回到安全區，再找整套技能的有效距離；高血量持續施壓，低血才優先撤退。用命中、冷卻、血量和保護狀態切換策略。受擊／肉搏／吃星才觸發的技能不當成隨時可用的開戰武器。</p>" +
            "<div class='scroll'><table id='combos'><thead><tr><th>組合方向</th><th>頭＋身＋背範例</th><th>實際決策</th></tr></thead><tbody>" +
            "<tr><td>控制＋重擊</td><td>酷寒水晶＋大顆火球＋雪花爆冰</td><td>維持共同射程，控制命中後接重擊；高階最多等 0.55 秒，落空也會繼續攻擊。</td></tr>" +
            "<tr><td>遠程吸血</td><td>吸血將軍＋惹洨光線＋動感陀螺</td><td>遠程命中換血；不把吸血當脫戰回血，危險時照樣撤。</td></tr>" +
            "<tr><td>近戰續航</td><td>熱血進擊＋痛痛拳＋冷空氣</td><td>有換血優勢就短進場，生命至少 55% 時也可參與兩名敵人的小混戰；窗口結束短暫重整。</td></tr>" +
            "<tr><td>反射＋近戰</td><td>蠻牛大爆衝＋超威能反射盾＋冷空氣</td><td>防禦支援近戰；保護消失、附近達 3 人，或兩名敵人且不足 55% 生命，就退出近戰窗口。</td></tr>" +
            "<tr><td>陷阱拉扯</td><td>哪來的鴨蛋＋繞跑小丑＋秒速暴衝</td><td>追兵接近時斜向撤離，沿路留下原本的自動陷阱。</td></tr>" +
            "<tr><td>脫戰恢復</td><td>超速奔騰＋大顆火球＋展翅高飛</td><td>受傷且不足半血才優先爭取未受傷時間；小傷維持進攻。</td></tr>" +
            "<tr><td>隱形收割</td><td>隱形邊緣人＋痛痛拳＋血腥剃刀</td><td>高血隱形且有側背機會才接近；低血隱形用來撤退。</td></tr>" +
            "<tr><td>採集回血</td><td>大明星＋魅力四射＋展翅高飛</td><td>需要恢復時優先安全星星；檢查路線，避免穿過敵人搶星。</td></tr>" +
            "<tr><td>交叉火力</td><td>三叉箭射＋大顆火球＋冷冽冰錐</td><td>移動兼顧固定射線，面向仍瞄準火球，依冷卻取捨。</td></tr>" +
            "<tr><td>遠近混合</td><td>熱血進擊＋大顆火球＋雪花爆冰</td><td>遠程消耗，安全近距離機會才肉搏；打完回遠程。</td></tr>" +
            "</tbody></table></div><p>這些是例子，不是限定配方；系統會讀全部配件的實際參數組合。中／高階近戰窗口最多 0.85／1.25 秒，之後至少拉開 0.45／0.65 秒再評估；安全風險可提早中斷。換裝會立即清除舊策略。</p>";
        static string PatternName(DirectionPatetern p)
        { switch (p) { case DirectionPatetern.Default: return "世界固定角度"; case DirectionPatetern.FaceDirection: return "角色面向";
          case DirectionPatetern.TowardTarget: return "朝目標"; case DirectionPatetern.LeftRight: return "水平翻轉扇面"; default: return "垂直翻轉扇面"; } }
        static string TriggerName(PSkillTriggerCondition p)
        {
            string[] names = { "受擊", "死亡", "靜止", "低血量", "攻擊命中", "技能命中", "肉搏命中", "受到肉搏", "未受傷一段時間", "吃星", "週期", "取得配件", "結束靜止", "受擊且低血量", "結束未受傷", "受到技能攻擊" };
            int i = (int)p; return i >= 0 && i < names.Length ? names[i] : p.ToString();
        }
    }
}
#endif
