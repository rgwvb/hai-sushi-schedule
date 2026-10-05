// Advanced police-system modules: unit-specific duties, learning, discipline/appraisal, and supervisor gameplay.
(function(){
  function migrate(){
    const d={
      goodNotes:0,badNotes:0,commend:0,merit:0,greatMerit:0,admonition:0,demerit:0,greatDemerit:0,
      quality:50,service:50,discipline:100,disciplineLog:[],appraisals:[],
      knowledge:0,quizCorrect:0,quizTotal:0,positionLevel:null,commandScore:50,morale:70,
      publicSatisfaction:65,staff:8,paperwork:3,commandHistory:[],lastAppraisalYear:null,dutyMode:"patrol",promotionReviews:[],promotionScore:0
    };
    Object.keys(d).forEach(k=>{ if(s[k]===undefined||s[k]===null) s[k]=d[k]; });
    if(s.positionLevel===null) s.positionLevel=Math.max(0,Number(s.promo||0));
  }

  const sequenceInfo={
    11:{range:"警佐三階至一階或警正四階",examples:["警員","隊員"]},
    10:{range:"警佐二階至警正四階",examples:["巡佐","小隊長","警務佐","教育班長","偵查佐"]},
    9:{range:"警佐一階至警正三階",examples:["巡官","分隊長","偵查員"]},
    8:{range:"警佐一階至警正三階",examples:["警務員","偵查員","組員","調查員","課員"]},
    7:{range:"警正四階至二階",examples:["警務正","偵查正","督察員","偵查隊副隊長等"]},
    6:{range:"警正三階至二階為主",examples:["分局組長","偵查隊長","主任","股長","部分副分局長等"]},
    5:{range:"警正二階至一階為主",examples:["縣市警局科長／隊長","部分分局長","直轄市警局專員等"]},
    4:{range:"警正一階至警監四階",examples:["直轄市警局分局長／大隊長","縣市警局副局長等"]}
  };
  const metroCities=["臺北市"];
  function currentSequenceNo(){
    if(Number(s.careerSequenceNo))return Number(s.careerSequenceNo);
    const seq=Number(String(s.sequence||"").match(/\d+/)?.[0]);
    if(seq)return seq;
    return (s.route==="cpu"||s.route==="g3")?9:11;
  }
  function sequenceLabel(n){return "第"+["零","一","二","三","四","五","六","七","八","九","十","十一"][n]+"序列"}
  function positionName(){return s.position||s.rank||"警員"}
  function isSupervisor(){return currentSequenceNo()<=10}
  function isSeniorSupervisor(){return currentSequenceNo()<=7}
  function targetPositions(nextSeq){
    const metro=metroCities.includes(s.county);
    const byUnit={
      station:{
        10:["巡佐","警務佐"],9:["巡官","分隊長"],8:["警務員"],7:["警務正","督察員"],
        6:metro?["分局行政組長","分局督察組長","分局交通組長"]:["分局副分局長","分局組長"],
        5:metro?["市警局專員","直屬大隊副大隊長"]:["分局長","警察局科長","警察局隊長"],
        4:metro?["分局長","大隊長"]:["副局長"]
      },
      detective:{
        10:["小隊長","偵查佐"],9:["偵查員","巡官"],8:["偵查員","警務員"],7:["偵查正","偵查隊副隊長"],
        6:["偵查隊長","刑事組長","股長"],5:["刑事警察大隊副大隊長","刑事警察大隊長"],4:["分局長","高階刑事主管"]
      },
      traffic:{
        10:["小隊長","巡佐"],9:["分隊長","巡官"],8:["警務員"],7:["督察員","交通業務主管"],
        6:["交通組長","交通隊副隊長"],5:["交通隊長","警察局科長"],4:["分局長","大隊長"]
      }
    };
    const generic={
      10:["巡佐","小隊長","警務佐","偵查佐"],9:["巡官","分隊長","偵查員"],8:["警務員","偵查員","組員"],
      7:["警務正","偵查正","督察員"],6:["組長","主任","隊長"],5:["科長","隊長","專員"],4:["分局長","大隊長"]
    };
    const arr=(byUnit[s.unit]&&byUnit[s.unit][nextSeq])||generic[nextSeq]||["較高序列職務"];
    return [...new Set(arr)];
  }
  const rankOrder={"警佐三階":1,"警佐二階":2,"警佐一階":3,"警正四階":4,"警正三階":5,"警正二階":6,"警正一階":7,"警監四階":8,"警監三階":9,"警監二階":10,"警監一階":11};
  const minRankForSeq={11:"警佐三階",10:"警佐二階",9:"警佐一階",8:"警佐一階",7:"警正四階",6:"警正三階",5:"警正二階",4:"警正一階"};
  function ensureOfficialRankForSequence(seq){
    const min=minRankForSeq[seq]; if(!min)return;
    const cur=rankOrder[s.officialRank]||0;
    if(cur<(rankOrder[min]||0)){s.officialRank=min;rec("官階銓敘","配合較高序列職務任用，模擬銓敘至 "+min)}
  }

  const systemTopics=[
    ["警察任務","警察依法維持公共秩序、保護社會安全、防止危害並促進人民福利。遊戲中會反映為治安、交通、為民服務與危害防止。"],
    ["共同勤務","共同勤務常見方式包含巡邏、臨檢、守望、值班、備勤等；不同勤務會改變事件類型與體力消耗。"],
    ["警察體系","中央由內政部警政署辦理全國警察行政；地方警察局下設科、室、中心、直屬隊、分局、分駐（派出）所與警勤區。"],
    ["官等與職務","警察官等分警監、警正、警佐；實際領導層級以職務配階與職位為核心，職務與官等不是完全相同概念。"],
    ["勤務指揮中心","勤務指揮中心處理重大治安、交通、災害、聚眾活動與110報案之接報、指揮、派遣、管制與通報。"],
    ["刑事警察","刑事警察核心包含犯罪預防、偵查、情資分析、鑑識支援及重大刑案、組織犯罪、科技犯罪等偵防工作。"],
    ["督察與考核","督察體系涉及勤務督導、風紀、考核與特種勤務；主管職也須承擔部屬考核監督責任。"],
    ["臺北市警察組織","本遊戲目前只模擬臺北市政府警察局，初任與輪調以大同、大安、中山、萬華、中正第一、中正第二、南港、士林、北投、松山、信義、內湖、文山第一、文山第二等14個分局為核心。"],["警官初任與歷練","警大／三等警官線分發到臺北市分局後，不固定只去警備隊。分局本部常見六組、三室、一中心及偵查隊、警備隊等單位；遊戲會從實際存在的單位型態中產生初任巡官缺額，再依歷練與缺額輪調。"]
  ];
  const crimeTopics=[
    ["日常活動理論","犯罪風險可從「有動機者、合適標的、缺乏有效監控」同時出現理解。遊戲中加強照明、巡邏與守望可降低部分事件機率。"],
    ["差別接觸理論","偏差與犯罪行為可經由與他人互動、學習態度與技巧而形成；少年與團體犯罪事件會出現相關選項。"],
    ["緊張理論","個人面對目標與合法手段落差、壓力與挫折時，可能增加偏差風險；處置上需注意社會背景而非只看表面行為。"],
    ["社會解組理論","社區凝聚、非正式控制與環境穩定度會影響犯罪；不同縣市、區域與社區設定可呈現不同案件結構。"],
    ["嚇阻理論","法律制裁的確定性、迅速性與適度性會影響行為選擇。遊戲不以『越重越好』，而重視合法、可預期與一致執法。"],
    ["破窗理論","環境失序與輕微違序可能影響居民安全感與公共秩序，但政策運用仍須兼顧比例、人權與避免過度執法。"]
  ];
  const quizzes=[
    ["下列何者最接近警察共同勤務中的「守望」？",["在固定衝要地點警戒、受理報告並協助交通","只在辦公室批公文","專門進行刑事鑑識"],0],
    ["日常活動理論強調犯罪事件較可能在何種條件聚合時出現？",["有動機者、合適標的、缺乏有效監控","只有高失業率","只有刑罰過輕"],0],
    ["警察官等主要區分為？",["警監、警正、警佐","甲、乙、丙","署、局、分局"],0],
    ["勤務指揮中心的核心功能之一是？",["110報案接報、派遣與管制","審理刑事判決","核發大學學位"],0],
    ["主管面對部屬疑似違紀，較適當的管理方向是？",["保全事證、依程序查處並避免包庇或預斷","先公開羞辱部屬","完全不留下紀錄"],0],
    ["社會解組理論較關注哪一層面的犯罪條件？",["社區結構、凝聚與非正式社會控制","單一基因因素","純粹刑罰長度"],0],
    ["刑事警察工作較接近下列何者？",["犯罪偵查、情資、鑑識與重大刑案偵防","只負責道路標線","只負責戶籍登記"],0],
    ["警察職務配階的主要目的之一是？",["形成層級領導並利於指揮監督","取消所有主管職","讓所有職務工作完全相同"],0]
  ];
  let currentQuiz=null;

  const dutyModes=[
    ["patrol","🚓 巡邏","機動巡視、處理臨時事故與110派案"],
    ["inspection","🔎 臨檢","依法對場所、交通工具或人員實施查察；合法性與比例原則影響考核"],
    ["watch","👁️ 守望","在治安要點、交通衝要或特定處所警戒與受理報告"],
    ["desk","☎️ 值班","派出所值班台受理報案、民眾求助、通報與案件初處"],
    ["standby","🧭 備勤","保持機動警力，支援重大事故、聚眾、災害與臨時勤務"]
  ];
  const modeDuties={
    patrol:[
      ["巡邏發現可疑機車","深夜巡邏發現無牌機車反覆繞行住宅區。",[["保持觀察並依具體事實依法攔查",16,4,-7],["沒有任何理由直接搜索車廂",3,-7,-6],["完全忽略民眾報案",2,-5,-1]]],
      ["巡邏遇民眾路倒","路旁有人倒地，無法立即確認是否酒醉或身體不適。",[["先確認安全與生命徵象並通知救護",18,5,-8],["直接認定酒醉後離開",3,-6,-2],["拍照後上網嘲諷",1,-10,-1]]]
    ],
    inspection:[
      ["夜間場所臨檢","治安熱點場所依勤務計畫實施臨檢。",[["說明勤務、依法查察並記錄異常情形",17,4,-8],["無差別翻查所有私人隨身物品",3,-8,-9],["未到場卻填寫已完成",1,-10,-1]]],
      ["車輛攔查","客觀跡象顯示前車可能有危險駕駛情形。",[["選安全地點攔停並依程序查證",17,4,-7],["在高速車流中突然逼停",3,-8,-12],["沒有任何紀錄就放棄",5,-3,-2]]]
    ],
    watch:[
      ["金融機構守望","詐騙高風險時段於金融機構周邊執行守望。",[["主動注意異常提領與民眾求助並保持通報",15,4,-5],["離開守望點處理私人事情",2,-8,-1],["看到疑似被害人也不詢問",4,-4,-2]]],
      ["校園周邊守望","放學時段學生與家長人車混雜。",[["兼顧交通安全與可疑狀況，必要時協助疏導",15,5,-5],["只站在遠處滑手機",3,-6,-1],["任意盤查所有學生",4,-5,-4]]]
    ],
    desk:[
      ["值班受理詐騙報案","民眾到所稱網路購物遭騙並攜帶轉帳紀錄。",[["完整受理、保全資料並提供必要防詐協助",17,6,-5],["嫌金額太小拒絕受理",2,-9,-1],["要求民眾自己找賣家",3,-7,-1]]],
      ["值班台民眾求助","失智長者被熱心民眾帶至派出所，但身上無證件。",[["先安置照護並透過系統與家屬協尋",16,6,-4],["要求長者自己離開",1,-10,-1],["放在門口不處理",2,-9,-1]]]
    ],
    standby:[
      ["重大事故支援","轄區發生大型事故，勤務中心要求備勤警力立即支援。",[["依指揮快速整備並到場執行分工",18,5,-10],["不回應無線電",1,-10,-1],["未經協調自行改變任務",5,-5,-5]]],
      ["聚眾事件備勤","大型活動現場人數快速增加，需要機動警力待命。",[["整備裝備、保持通聯並依現場指揮機動支援",17,5,-8],["擅自脫隊",2,-9,-2],["散布未證實消息造成恐慌",2,-8,-2]]]
    ]
  };

  const unitDuties={
    station:[
      ["110糾紛派遣","勤務中心通報轄內住宅有人爭吵並有摔物聲，現場情況尚未明確。",[["先確認安全、分隔當事人並依現場事實處置",18,5,-8],["未查明就直接認定一方違法",4,-6,-5],["以私人糾紛為由拒不到場",1,-10,-1]]],
      ["銀行疑似詐騙","銀行行員通報長者準備提領大額現金，說詞疑似受到投資話術影響。",[["到場查證、了解資金用途並進行防詐關懷",18,6,-6],["嫌麻煩請行員自行處理",3,-8,-1],["未經同意公開當事人資料",2,-8,-2]]],
      ["失蹤人口協尋","家屬到所報案，成年失智家人外出後失去聯繫。",[["完整受理、確認特徵與可能動線並啟動協尋",19,6,-7],["請家屬隔天再來",2,-9,-1],["只口頭記下姓名不建資料",3,-7,-1]]],
      ["交通事故初處","轄內巷口發生碰撞，有一方主訴頭暈且車流受阻。",[["先確認傷勢、通知救護並保全現場與疏導",18,5,-8],["先爭論肇責才決定是否救護",4,-6,-5],["要求雙方自行離開",3,-7,-2]]],
      ["通緝犯查獲","巡邏盤查時系統顯示對方疑似為通緝人口。",[["保持安全、再次確認身分並依法處理與通報",19,6,-9],["未確認身分就放人",4,-7,-2],["在無必要情況公開拍攝嘲諷",2,-8,-2]]],

      ["噪音陳情","深夜住宅區多次陳情樓上持續喧鬧，雙方鄰居已互相叫罵。",[["先分開雙方、確認事實並依法勸止與紀錄",15,4,-6],["要求報案人自己忍耐",3,-5,-2],["未確認事實就對其中一方開罰",5,-4,-4]]],
      ["超商竊盜","店員發現商品遭竊，監視器拍到可疑男子離店。",[["保全影像、確認時間線、詢問店員與通報特徵",17,5,-7],["直接上網公開嫌疑人照片",4,-6,-3],["請店家自行處理",2,-7,-1]]],
      ["精神危機協助","民眾在路旁情緒極度不穩，家屬表示近期狀況反覆。",[["先確保現場安全、降低刺激並聯繫必要醫療或支援",18,6,-9],["嘲諷對方要他冷靜",2,-8,-2],["只要求家屬帶走，不做安全評估",5,-5,-3]]],
      ["可疑車輛","住宅巷內有陌生車輛長時間停留，居民擔心遭勘查住宅。",[["先查明合理事實、觀察情況並依法處理",14,3,-5],["無理由直接搜索車內",3,-7,-6],["完全不理會報案",2,-5,-1]]]
    ],
    traffic:[
      ["A2交通事故","兩車路口碰撞無人當場送醫，但雙方對號誌說法不同。",[["保全現場資料、疏導交通並依程序紀錄",17,5,-8],["替熟識駕駛直接判定肇責",2,-9,-4],["只交換電話就離開",4,-6,-2]]],
      ["大型活動交管","演唱會散場造成大量人車潮，公車與行人動線衝突。",[["依交維計畫分流並保留救護通道",18,5,-10],["臨時封路但不通報任何單位",5,-5,-7],["放任車流自行消化",4,-4,-3]]],
      ["疑似危險駕駛","快速道路有車輛多次急切車道，引發多名用路人報案。",[["通報位置、保持安全距離並協調前方警力",16,4,-9],["為追上目標不顧安全高速穿梭",4,-6,-12],["不紀錄直接結案",2,-6,-1]]],
      ["施工路段壅塞","道路施工造成尖峰回堵並影響救護車通行。",[["立即調整交通疏導並與施工單位協調動線",16,4,-8],["只開單不處理壅塞",6,-2,-5],["自行離開責任區",2,-7,-2]]]
    ],
    detective:[
      ["連續住宅竊盜","轄區近期發生多起手法相似住宅竊案。",[["建立案件關聯、比對時空與影像並依法調查",19,6,-9],["只看單一案件不做串聯",7,-2,-5],["先向媒體公布未確認嫌疑人姓名",2,-8,-3]]],
      ["詐欺機房線索","多起被害案件指向同一批通訊與金流線索。",[["整合被害資料、金流與數位線索，依法聲請必要程序",20,6,-10],["未核實就衝往私人處所搜索",3,-9,-9],["只處理其中一名被害人",7,-2,-4]]],
      ["重大傷害案","深夜鬥毆造成重傷，現場證人說法不一且監視器很多。",[["先保全證據、分流訪談證人並建立時間線",19,5,-10],["讓所有證人一起討論後再做筆錄",4,-6,-5],["只採信第一個人的說法",5,-5,-4]]],
      ["網路交易詐欺","被害人提供對話、匯款與平台帳號資料。",[["完整保存數位資料並串聯相關帳號與被害案件",18,5,-7],["要求被害人刪除所有聊天紀錄",1,-9,-1],["直接認定平台一定有責任",5,-4,-2]]]
    ],
    security:[
      ["大型陳情活動","群眾於政府機關前集結，現場情緒升高但尚未發生暴力。",[["區隔安全空間、保持溝通並依比例原則處置",18,6,-10],["因口號刺耳立即強制驅離所有人",3,-8,-12],["完全取消警力配置",4,-5,-2]]],
      ["重要設施警戒","重要設施收到可疑威脅訊息，真偽未明。",[["提升警戒、協調專業單位並維持必要通報",18,5,-9],["公開未核實細節造成恐慌",3,-7,-4],["完全忽略威脅",2,-8,-1]]],
      ["大型賽事維安","球賽散場雙方球迷互嗆，有零星推擠。",[["分隔人流、調整出口並派機動警力注意衝突點",17,5,-9],["把全部球迷視為嫌疑人盤查",4,-6,-10],["撤離所有警力",2,-7,-1]]]
    ],
    cyber:[
      ["釣魚網站通報","多名民眾反映收到偽冒銀行簡訊並輸入帳密。",[["彙整網址、時間、受害資料並啟動跨單位通報",19,6,-7],["要求民眾不要報案",2,-8,-1],["直接刪除民眾手機所有資料",2,-8,-2]]],
      ["帳號遭接管","被害人社群帳號遭接管後向親友借款。",[["保全登入與對話證據、確認金流並協助防止擴大",18,5,-7],["只叫被害人換手機",4,-4,-2],["公開被害人帳密協助查案",1,-10,-2]]],
      ["企業勒索軟體報案","公司多台電腦無法使用並收到勒索訊息。",[["先隔離受影響系統、保全數位跡證並協調專業處理",20,6,-8],["立即刪除所有紀錄",2,-9,-2],["要求直接付款就好",1,-10,-1]]]
    ],
    admin:[
      ["民眾陳情逾期","分局有數件人民陳情即將超過回覆期限。",[["盤點案件、分派承辦並追蹤時效與品質",16,4,-4],["把日期改掉避免逾期",1,-10,-1],["不管時效",3,-6,-1]]],
      ["勤務統計異常","本月勤務統計與各所回報數字不一致。",[["比對原始資料、確認差異原因再修正",15,3,-3],["直接挑最好看的數字上報",1,-10,-1],["刪除異常資料不說明",2,-8,-1]]],
      ["教育訓練規劃","新制上路，需要安排第一線同仁教育訓練。",[["整理重點、安排梯次並蒐集實務問題回饋",16,4,-4],["只寄一封信就當完成訓練",5,-3,-1],["完全不通知外勤",2,-7,-1]]]
    ],
    highway:[
      ["國道連環事故","尖峰時段多車追撞，部分車道受阻。",[["先建立安全緩衝、救援、交管並持續回報",20,6,-12],["直接走進車流中不做警示",2,-9,-15],["只處理最前方一車",5,-5,-7]]],
      ["掉落物通報","國道路段有大型掉落物，後方車流快速接近。",[["先警示與減速車流，再協調安全排除",18,5,-9],["徒手立即衝入車道搬運",2,-8,-15],["等待自然被撞走",1,-10,-2]]]
    ],
    rail:[
      ["月台糾紛","旅客因排隊爭執推擠，列車即將進站。",[["先將衝突人員帶離月台邊緣並分隔處理",18,5,-7],["讓雙方繼續在月台邊爭論",3,-7,-4],["要求整個月台所有人離站",5,-4,-6]]],
      ["列車遺失物","旅客稱重要物品遺留列車，列車已駛往下一站。",[["確認車次、座位與特徵並協調站點查找",14,4,-4],["直接說找不到",2,-5,-1],["要求旅客自行上軌道找",1,-10,-1]]]
    ],
    airport:[
      ["航廈可疑行李","航廈公共區域出現長時間無人認領行李。",[["建立安全範圍並通知專業安檢單位處理",19,6,-8],["自行打開翻找",2,-9,-8],["完全不理會",1,-10,-1]]],
      ["旅客證件爭議","旅客因證件問題與航空公司人員激烈爭執。",[["先隔離衝突、確認身分與權責並協調相關單位",16,4,-6],["未查明就拘捕",3,-7,-7],["只叫航空公司自行處理",5,-4,-2]]]
    ]
  };

  const supervisorEvents=[
    ["勤務缺員","今晚臨時有2名同仁請假，但轄區仍有大型活動與一般巡邏勤務。",[
      ["重新評估風險、調整勤務優先順序並協調支援",8,5,4,1],
      ["要求所有人無條件超時工作且不說明",2,-7,-4,-1],
      ["取消所有巡邏只保留辦公室人力",3,-5,-5,-1]
    ]],
    ["民眾申訴員警態度","民眾具名申訴同仁執法過程態度不佳，並提供部分錄影。",[
      ["保全資料、聽取雙方說法並依程序查處與回覆",9,4,5,1],
      ["為保護同仁直接把申訴丟掉",1,-10,-8,-2],
      ["未調查就先公開處分同仁",3,-6,-4,-1]
    ]],
    ["重大案件指揮","轄區同時發生重大事故與群眾聚集，需要跨單位協調。",[
      ["開設指揮機制、分工警力、保持通報與資源調度",10,6,5,2],
      ["所有決策都自己做且禁止回報",3,-7,-3,-1],
      ["離開現場不指定代理人",1,-10,-7,-2]
    ]],
    ["部屬疑似違紀","督察單位通知有同仁疑似違反勤務紀律，需要主管配合釐清。",[
      ["依程序保全資料、迴避偏袒並配合調查",9,2,6,1],
      ["先通知部屬刪除相關資料",0,-12,-12,-3],
      ["完全不做任何紀錄",2,-8,-8,-2]
    ]],
    ["勤務績效壓力","上級要求改善治安績效，但同仁反映現有勤務已接近負荷上限。",[
      ["分析案件與勤務成效，調整重點而非只追求數字",8,5,4,1],
      ["要求同仁灌水數字",0,-12,-10,-3],
      ["完全拒絕檢討任何績效",3,-5,-4,-1]
    ]],
    ["新人帶教","單位分發一批新人，實務經驗不足。",[
      ["安排資深同仁帶教、案例檢討與漸進式任務",8,7,3,1],
      ["直接讓新人獨自處理高風險案件",2,-8,-5,-1],
      ["只要求新人自己看舊資料",4,-3,-2,0]
    ]],
    ["媒體關切案件","重大案件引發媒體關注，但偵查仍在進行且資訊尚未完整。",[
      ["統一窗口、確認可公開資訊並避免影響偵查與隱私",9,3,6,1],
      ["為搶版面公開未證實細節",1,-9,-8,-2],
      ["讓不同同仁各自對外說法",3,-5,-6,-1]
    ]]
  ];
  let commandActive=null;

  function addGood(n,reason){
    s.goodNotes+=n;s.quality=cl(s.quality+n*2);s.disciplineLog.unshift({type:"優蹟",reason,date:rocDateTime()});
    while(s.goodNotes>=6){s.goodNotes-=6;s.commend++;s.disciplineLog.unshift({type:"嘉獎",reason:"優蹟累積達遊戲獎勵門檻",date:rocDateTime()});rec("獎勵","嘉獎一次")}
  }
  function addBad(n,reason){
    s.badNotes+=n;s.quality=cl(s.quality-n*2);s.discipline=cl(s.discipline-n*4);s.disciplineLog.unshift({type:"劣蹟",reason,date:rocDateTime()});
    while(s.badNotes>=6){s.badNotes-=6;s.admonition++;s.disciplineLog.unshift({type:"申誡",reason:"劣蹟累積達遊戲懲處門檻",date:rocDateTime()});rec("懲處","申誡一次")}
  }
  function exceptionalMerit(reason){
    s.merit++;s.disciplineLog.unshift({type:"記功",reason,date:rocDateTime()});rec("獎勵","記功一次｜"+reason);
  }

  function renderAcademy(){
    if(!$("systemKnowledge"))return;
    $("knowledgeChip").textContent="知識 "+s.knowledge;
    $("quizChip").textContent="測驗 "+s.quizCorrect+"/"+s.quizTotal;
    $("systemKnowledge").innerHTML=systemTopics.map((x,i)=>'<div class="choice-card knowledge-card" data-know="'+i+'"><h3>'+x[0]+'</h3><p>'+x[1]+'</p><div class="meta"><span class="tag">閱讀 +1 知識</span></div></div>').join("");
    document.querySelectorAll("[data-know]").forEach(e=>e.onclick=()=>{s.knowledge++;e.querySelector(".tag").textContent="✓ 已閱讀";save();renderEnhancements()});
    $("criminologyCards").innerHTML=crimeTopics.map(x=>'<div class="choice-card"><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div>').join("");
  }
  function newQuiz(){
    currentQuiz=quizzes[Math.floor(Math.random()*quizzes.length)];
    $("quizQuestion").innerHTML="<b>"+currentQuiz[0]+"</b>";
    $("quizChoices").innerHTML=currentQuiz[1].map((x,i)=>'<div class="action-card" data-q="'+i+'"><strong>'+String.fromCharCode(65+i)+". "+x+'</strong></div>').join("");
    $("quizResult").textContent="";$("quizResult").className="feedback";
    document.querySelectorAll("[data-q]").forEach(e=>e.onclick=()=>answerQuiz(Number(e.dataset.q)));
  }
  function answerQuiz(i){
    if(!currentQuiz)return;
    s.quizTotal++;
    if(i===currentQuiz[2]){s.quizCorrect++;s.knowledge+=3;fb("quizResult","答對了，知識 +3。",1)}
    else fb("quizResult","答錯了，建議回上方資料複習。",0);
    $("quizChoices").innerHTML="";save();renderEnhancements();
  }

  function appraisalScore(){
    let reward=s.commend*1.5+s.merit*4+s.greatMerit*10;
    let penalty=s.admonition*3+s.demerit*7+s.greatDemerit*18;
    return cl(Math.round(s.quality*.28+s.service*.22+s.discipline*.28+s.rep*.15+s.commandScore*.07+reward-penalty));
  }
  function appraisalGrade(sc){
    if(sc>=80&&s.greatDemerit===0)return"甲等";
    if(sc>=65)return"乙等";
    return"丙等";
  }
  function renderPerformance(){
    if(!$("commendStat"))return;
    let score=appraisalScore(),grade=appraisalGrade(score);
    $("commendStat").textContent=s.commend;$("meritStat").textContent=s.merit;$("admonitionStat").textContent=s.admonition;$("demeritStat").textContent=s.demerit;
    $("goodNoteStat").textContent=s.goodNotes;$("badNoteStat").textContent=s.badNotes;$("qualityStat").textContent=s.quality;$("serviceStat").textContent=s.service;$("disciplineStat").textContent=s.discipline;
    $("appraisalChip").textContent="本年預估："+grade+"（"+score+"）";$("disciplineChip").textContent="紀律分數："+s.discipline;
    $("appraisalBox").innerHTML=s.unit?("依目前資料預估 <b>"+grade+"</b>，綜合分數 "+score+"。<br><span class='muted'>遊戲模型綜合勤務品質、服務、紀律、聲望、主管表現與獎懲，不等同官方考績公式。</span>"):"尚未任職。";
    $("disciplineHistory").innerHTML=s.disciplineLog.length?s.disciplineLog.slice(0,20).map(x=>'<div class="timeline-item"><b>'+x.type+'</b><span>'+x.reason+"｜"+x.date+'</span></div>').join(""):'<div class="empty-state">目前沒有獎懲紀錄。</div>';
  }
  function closeYear(){
    if(!s.unit)return fb("appraisalBox","尚未任職，無法辦理年終考績。",0);
    let d=simNow(),yr=d.getFullYear();
    if(d.getMonth()<11)return fb("appraisalBox","尚未到年終。遊戲時間需進入12月後才能辦理年度考績。",0);
    if(s.lastAppraisalYear===yr)return fb("appraisalBox","本年度考績已辦理。",0);
    let score=appraisalScore(),grade=appraisalGrade(score);
    s.appraisals.unshift({year:yr-1911,grade,score});
    s.lastAppraisalYear=yr;
    if(grade==="甲等"){s.savings+=s.salary;addGood(2,"年終考績甲等");}
    else if(grade==="乙等"){s.savings+=Math.round(s.salary*.5);}
    else {s.reputation=cl(s.reputation-5);}
    rec("年終考績",(yr-1911)+"年 "+grade+"｜"+score+"分");
    fb("appraisalBox",(yr-1911)+"年度考績："+grade+"（"+score+"分）。",grade!=="丙等");
    save();render();
  }

  function getDutyPool(){
    const pool=(unitDuties[s.unit]||[]).slice();
    // Supervisors receive fewer direct calls and more command decisions.
    if((s.positionLevel||0)>=3) return pool.slice(0,Math.max(1,Math.ceil(pool.length/2)));
    return pool.length?pool:D;
  }
  function renderDutyModes(){
    if(!$("dutyModeCards"))return;
    $("dutyModeCards").innerHTML=dutyModes.map(m=>'<div class="choice-card '+(s.dutyMode===m[0]?"selected":"")+'" data-dmode="'+m[0]+'"><h3>'+m[1]+'</h3><p>'+m[2]+'</p></div>').join("");
    document.querySelectorAll("[data-dmode]").forEach(e=>e.onclick=()=>{s.dutyMode=e.dataset.dmode;save();render()});
  }
  const officeDuties={
    administration:[
      ["勤務規劃調整","分局下月巡邏線需要重新規劃，近期陳情與治安熱點有所變化。",[["比對案件、陳情與警力資料後調整勤務",17,4,-5],["沿用舊表不檢查",5,-3,-2],["只看單一陳情就大幅改動所有勤務",6,-3,-4]]],
      ["議會與陳情資料","分局收到議員索資與市民陳情，需要在期限內彙整回覆。",[["查核承辦單位、時程與法規後完整彙整",16,4,-5],["未查證直接回覆",4,-5,-2],["放到逾期再處理",3,-6,-1]]]
    ],
    prevention:[
      ["失蹤人口協尋管制","轄區新增高風險失蹤人口案件，需要跨所追蹤查尋。",[["彙整資料、確認通報並協調派出所持續查尋",18,5,-6],["只登記不追蹤",4,-5,-2],["把未查證個資公開上網",2,-8,-2]]],
      ["婦幼安全案件","家暴高風險個案需要檢視訪查與保護措施執行情形。",[["依風險資料協調相關單位並追蹤處置",18,6,-7],["認為只是家務事不處理",2,-9,-1],["未確認就任意揭露當事人資料",2,-8,-2]]]
    ],
    security_affairs:[
      ["重要安全維護任務","轄內重要活動前需完成安全防護與情資彙整。",[["依權責查核風險、彙整情資並完成通報",17,5,-6],["自行散布未證實情資",2,-8,-2],["完全不做前置查核",4,-5,-2]]],
      ["社會治安調查","近期公共安全事件引發多項情資，需要研判與分類。",[["區分已查證事實與待查情資並依法處理",17,5,-5],["把傳聞當成事實上報",3,-7,-2],["私下保存無關個資作私人用途",1,-10,-2]]]
    ],
    civil_defense:[
      ["城鎮韌性演習整備","分局需要整合民防、義警與防空避難相關演練。",[["核對人力、通聯、避難設施與應變分工",17,5,-6],["只做紙上簽到",4,-5,-2],["未通知協力單位就臨時更改計畫",5,-4,-3]]],
      ["災害防救協調","豪雨可能造成轄內積淹水，需要預先盤點警民力與封路點。",[["整合災情資訊、警民力與交通替代路線",18,5,-7],["等災情發生才開始找資料",5,-4,-3],["忽略勤務中心通報",2,-7,-1]]]
    ],
    traffic_office:[
      ["大型活動交維計畫","轄內大型活動將造成大量人車潮，需要規劃交維。",[["依道路容量、人流與救護需求規劃分流",18,5,-7],["只增加取締不做動線規劃",6,-3,-4],["未協調就任意封路",4,-6,-5]]],
      ["交通申訴案件","民眾對交通違規舉發提出申訴，需要調閱資料審核。",[["調閱影像、告發資料與法規後審核",16,4,-4],["因申訴人態度差就直接駁回",2,-8,-2],["不看資料直接撤單",3,-7,-2]]]
    ]
  };

  function newAdvancedDuty(){
    if(!s.unit)return toast("請先完成單位分發");
    const unitPool=((officeDuties[s.assignmentType])||(unitDuties[s.unit])||D).slice();
    const modePool=(modeDuties[s.dutyMode]||modeDuties.patrol).slice();
    const pool=Math.random()<0.55?modePool.concat(unitPool.slice(0,2)):unitPool.concat(modePool.slice(0,1));
    active=pool[Math.floor(Math.random()*pool.length)];
    $("dutyCase").innerHTML="<b>"+active[0]+"</b><br>"+active[1]+"<br><span class='muted'>"+(s.stationName?("勤務單位："+s.stationName+"｜"):"")+"本月主要勤務："+(dutyModes.find(x=>x[0]===s.dutyMode)?.[1]||"巡邏")+"</span>";
    $("dutyChoices").innerHTML=active[2].map((c,i)=>'<div class="action-card" data-advd="'+i+'"><strong>'+String.fromCharCode(65+i)+". "+c[0]+'</strong><p>依安全、合法性、程序與完整性判定。</p></div>').join("");
    $("dutyResult").textContent="";$("dutyResult").className="feedback";
    document.querySelectorAll("[data-advd]").forEach(e=>e.onclick=()=>advancedResolve(Number(e.dataset.advd)));
  }
  function advancedResolve(i){
    if(!active)return;
    const c=active[2][i],xp=c[1],rep=c[2],en=c[3];
    s.xp+=xp;s.rep=cl(s.rep+rep);s.energy=cl(s.energy+en);s.stress=cl(s.stress+Math.max(1,Math.round(-en*.3)));s.dutyCount++;advanceDays(30);
    if(typeof isOfficerTrack==="function"&&isOfficerTrack()&&["officer_initial","officer_rotation"].includes(s.careerStage)){
      s.rotationMonths=(s.rotationMonths||0)+1;
      s.rotationCycleMonths=(s.rotationCycleMonths||0)+1;
      const need=s.careerStage==="officer_initial"?12:18;
      if(s.rotationCycleMonths>=need&&!s.rotationEligible){
        s.rotationEligible=true;
        s.rotationOffers=typeof officerRotationOffers==="function"?officerRotationOffers():[];
        rec(s.careerStage==="officer_initial"?"初任歷練完成":"輪調資格開放","完成約"+need+"個月職務歷練，開放下一輪模擬職缺選填");
        toast("已開放新一輪職務缺額，可到「職務輪調」查看");
      }
    }
    if(xp>=18){addGood(2,active[0]+"處置優良");s.service=cl(s.service+2)}
    else if(xp>=14){addGood(1,active[0]+"處置良好");s.service=cl(s.service+1)}
    else if(xp<=4){addBad(2,active[0]+"處置有重大缺失");s.service=cl(s.service-3)}
    else if(xp<=7){addBad(1,active[0]+"處置不完整");s.service=cl(s.service-1)}
    if(xp>=20&&rep>=6&&active[0].includes("重大")) exceptionalMerit(active[0]);
    const cid=String(Date.now()).slice(-7);
    s.cases.unshift({id:cid,type:active[0],action:c[0],result:xp>=18?"優良":xp>=14?"良好":xp<=4?"重大缺失":"尚可",xp,date:rocDateTime()});
    rec("完成勤務",active[0]+"｜+"+xp+" XP｜"+positionName());
    fb("dutyResult","勤務完成：+"+xp+" XP，聲望 "+(rep>=0?"+":"")+rep+"；獎懲考核已同步更新。遊戲時間前進約 30 天。",xp>=14);
    $("dutyChoices").innerHTML="";active=null;
    save();render();
  }

  function managerRoleText(){
    const L=s.positionLevel||0;
    if(L===0)return"基層警員以直接執行勤務、受理案件與現場處置為主。";
    if(L===1)return"巡佐／小隊長開始負責帶班、現場協調、新進同仁指導與勤務品質。";
    if(L===2)return"基層主管須兼顧人力調度、案件覆核、部屬考核與突發事件協調。";
    if(L===3)return"所長／隊主管要管理整個單位的勤務、風紀、民眾陳情、資源與績效。";
    if(L===4)return"分局業務主管著重跨所隊協調、政策執行、督導、數據與重大專案。";
    if(L===5)return"副分局長協助分局長統籌多個業務單位，處理重大治安、交通、風紀與行政決策。";
    return"分局長以整體轄區治安、警力配置、重大事件指揮、跨機關協調、民意與組織管理為核心。";
  }
  function renderCommand(){
    if(!$("commandLocked"))return;
    const sup=isSupervisor();
    $("commandLocked").style.display=sup?"none":"block";
    $("commandContent").style.display=sup?"block":"none";
    $("positionChip").textContent="職位："+positionName();$("commandScoreChip").textContent="主管評價："+s.commandScore;
    if(!sup)return;
    $("staffStat").textContent=s.staff;$("paperworkStat").textContent=s.paperwork;$("moraleStat").textContent=s.morale;$("publicStat").textContent=s.publicSatisfaction;
    $("positionDescription").innerHTML="<b>"+positionName()+"</b><br>"+managerRoleText();
    const acts=[
      ["roster","排定勤務表","警力配置、士氣與疲勞管理"],
      ["review","覆核案件紀錄","降低程序缺失並提升品質"],
      ["coach","帶教部屬","提升士氣與單位品質"],
      ["inspection","裝備／勤務抽查","提升紀律但可能增加壓力"],
      ["meeting","召開勤前教育","提升溝通與重大事件應變"]
    ];
    $("managerActions").innerHTML=acts.map(a=>'<div class="action-card" data-ma="'+a[0]+'"><strong>'+a[1]+'</strong><p>'+a[2]+'</p></div>').join("");
    document.querySelectorAll("[data-ma]").forEach(e=>e.onclick=()=>managerAction(e.dataset.ma));
  }
  function managerAction(a){
    if(a==="roster"){s.morale=cl(s.morale+2);s.paperwork=Math.max(0,s.paperwork-1);s.commandScore=cl(s.commandScore+1)}
    if(a==="review"){s.quality=cl(s.quality+2);s.paperwork=Math.max(0,s.paperwork-1);s.commandScore=cl(s.commandScore+1)}
    if(a==="coach"){s.morale=cl(s.morale+4);s.service=cl(s.service+1);s.commandScore=cl(s.commandScore+2)}
    if(a==="inspection"){s.discipline=cl(s.discipline+2);s.morale=cl(s.morale-1);s.commandScore=cl(s.commandScore+1)}
    if(a==="meeting"){s.comm=cl(s.comm+1);s.morale=cl(s.morale+2);s.commandScore=cl(s.commandScore+1)}
    s.paperwork=Math.min(20,s.paperwork+1);advanceHours(2);rec("主管勤務",positionName()+"｜"+a);save();render();
  }
  function newCommand(){
    if(!isSupervisor())return toast("尚未取得主管職");
    commandActive=supervisorEvents[Math.floor(Math.random()*supervisorEvents.length)];
    $("commandCase").innerHTML="<b>"+commandActive[0]+"</b><br>"+commandActive[1];
    $("commandChoices").innerHTML=commandActive[2].map((c,i)=>'<div class="action-card" data-cmd="'+i+'"><strong>'+String.fromCharCode(65+i)+". "+c[0]+'</strong></div>').join("");
    $("commandResult").textContent="";$("commandResult").className="feedback";
    document.querySelectorAll("[data-cmd]").forEach(e=>e.onclick=()=>resolveCommand(Number(e.dataset.cmd)));
  }
  function resolveCommand(i){
    const c=commandActive[2][i];
    s.commandScore=cl(s.commandScore+c[1]);s.morale=cl(s.morale+c[2]);s.publicSatisfaction=cl(s.publicSatisfaction+c[3]);
    if(c[4]>0)addGood(c[4],commandActive[0]); else if(c[4]<0)addBad(-c[4],commandActive[0]);
    s.paperwork=Math.min(20,s.paperwork+1);advanceHours(3);
    if(commandActive[0]==="重大案件指揮"&&c[1]>=10) exceptionalMerit("重大案件指揮得當");
    rec("主管決策",commandActive[0]+"｜"+c[0]);fb("commandResult","決策完成。主管評價 "+(c[1]>=0?"+":"")+c[1]+"，士氣 "+(c[2]>=0?"+":"")+c[2]+"。",c[1]>=5);
    $("commandChoices").innerHTML="";commandActive=null;save();render();
  }

  function latestAppraisalPoints(){
    const a=(s.appraisals||[]).slice(0,3);
    if(!a.length)return 4;
    return a.reduce((sum,x)=>sum+(x.grade==="甲等"?3:x.grade==="乙等"?2:0),0);
  }
  function promotionScore(){
    const edu={"高中畢業":8,"大學在學":10,"大學畢業":14,"研究所畢業":16}[s.education]||8;
    const exam=String(s.officialRank||"").startsWith("警正")?20:String(s.officialRank||"").startsWith("警佐")?14:0;
    const seniority=Math.min(20,Math.max(0,s.year||0)*2);
    const appraisal=Math.min(12,latestAppraisalPoints()*2);
    const reward=(s.commend||0)*0.1+(s.merit||0)*0.3+(s.greatMerit||0);
    const penalty=(s.admonition||0)*0.1+(s.demerit||0)*0.3+(s.greatDemerit||0);
    const conduct=Math.max(0,Math.min(10,(s.discipline||100)/10));
    return Math.max(0,Math.round((edu+exam+seniority+appraisal+reward-penalty+conduct)*10)/10);
  }
  function renderCareerUpgrade(){
    if(!$("careerMsg"))return;
    const seq=currentSequenceNo();
    s.careerSequenceNo=seq;s.sequence=sequenceLabel(seq);s.promotionScore=promotionScore();
    if($("careerQualification"))$("careerQualification").textContent=s.qualification||"—";
    if($("careerOfficialRank"))$("careerOfficialRank").textContent=s.officialRank||"—";
    if($("careerPosition"))$("careerPosition").textContent=positionName();
    if($("careerSequence"))$("careerSequence").textContent=sequenceLabel(seq);
    if($("promotionScoreBox"))$("promotionScoreBox").textContent="資績模擬分："+s.promotionScore+"｜最近考績："+((s.appraisals&&s.appraisals[0]?.grade)||"尚無")+"｜獎懲："+(s.commend||0)+"嘉獎／"+(s.merit||0)+"記功／"+(s.admonition||0)+"申誡／"+(s.demerit||0)+"記過";
    const nextSeq=seq>4?seq-1:null;
    if($("promotionRuleText"))$("promotionRuleText").textContent=nextSeq?("目前 "+sequenceLabel(seq)+"；可依缺額與資格參加 "+sequenceLabel(nextSeq)+" 職務甄審。不是固定『巡官→警務員→所長→組長』一本道。"):"目前已到本版高階序列。";
    if($("careerPath")){
      const seqs=[11,10,9,8,7,6,5,4];
      $("careerPath").className="sequence-grid";
      $("careerPath").innerHTML=seqs.map(n=>{
        const info=sequenceInfo[n],state=n===seq?" current":n>seq?" passed":"";
        return '<div class="sequence-card'+state+'"><div class="seq-head"><strong>'+sequenceLabel(n)+'</strong><span>'+info.range+'</span></div><p>'+info.examples.join("、")+'</p>'+(n===seq?'<em>目前所在序列</em>':'')+'</div>';
      }).join("");
    }
    if($("promotionTarget")){
      const opts=nextSeq?targetPositions(nextSeq):[];
      $("promotionTarget").innerHTML=opts.length?opts.map(x=>'<option>'+x+'</option>').join(""):'<option>目前無更高序列</option>';
      $("promotionTarget").disabled=!nextSeq;
    }
  }
  function enhancedPromotion(){
    if(!s.unit)return fb("careerMsg","尚未正式任職。",0);
    const seq=currentSequenceNo(),nextSeq=seq>4?seq-1:null;
    if(!nextSeq)return fb("careerMsg","已達目前版本最高序列。",1);
    const score=promotionScore();
    const threshold={11:38,10:44,9:50,8:56,7:64,6:72,5:80}[seq]||50;
    const grade=s.appraisals?.[0]?.grade||appraisalGrade(appraisalScore());
    if(grade==="丙等"||s.greatDemerit>0)return fb("careerMsg","本次不具甄審條件：考績或重大懲處不符。",0);
    if(score<threshold)return fb("careerMsg","資績分數不足：目前 "+score+"，本次模擬甄審參考門檻 "+threshold+"。",0);
    const target=$("promotionTarget")?.value||targetPositions(nextSeq)[0];
    const vacancyChance=Math.min(.88,.32+score/160);
    if(Math.random()>vacancyChance){
      s.promotionReviews.unshift({date:rocDateTime(),result:"未獲陞任",score,target,sequence:sequenceLabel(nextSeq)});
      rec("陞遷甄審","申請 "+sequenceLabel(nextSeq)+" "+target+"｜資績 "+score+"｜本次因缺額／排序未獲陞任");
      fb("careerMsg","符合基本資格，但本次因缺額或排序未獲陞任。",0);save();render();return;
    }
    s.careerSequenceNo=nextSeq;s.sequence=sequenceLabel(nextSeq);s.position=target;s.rank=target;
    ensureOfficialRankForSequence(nextSeq);
    s.salary+=4500+Math.max(0,(11-nextSeq))*900;s.commandScore=cl(s.commandScore+3);
    s.promotionReviews.unshift({date:rocDateTime(),result:"陞任",score,target,sequence:sequenceLabel(nextSeq)});
    rec("職務陞遷","經甄審陞任 "+sequenceLabel(nextSeq)+" "+target+"｜資績 "+score);
    fb("careerMsg","甄審通過：陞任 "+sequenceLabel(nextSeq)+"「"+target+"」。這是職務陞遷；官階另依任官與銓敘條件處理。",1);save();render();
  }

  function renderEnhancements(){
    migrate();
    renderAcademy();renderPerformance();renderCommand();renderCareerUpgrade();renderDutyModes();
    if($("dutySubtitle")&&s.unit)$("dutySubtitle").textContent=[s.name,"臺北市",s.precinct||"",s.unitName,positionName(),s.officialRank||"—"].filter(Boolean).join("｜");
    if($("miniStatus"))$("miniStatus").textContent=positionName();
    if($("rankChip"))$("rankChip").textContent="職位："+positionName();
    if($("dashRank"))$("dashRank").textContent=positionName();if($("dashQualification"))$("dashQualification").textContent=s.qualification||"尚未取得";if($("dashOfficialRank"))$("dashOfficialRank").textContent=s.officialRank||"—";if($("dashSequence"))$("dashSequence").textContent=sequenceLabel(currentSequenceNo());
  }

  migrate();
  if($("newQuizBtn"))$("newQuizBtn").onclick=newQuiz;
  if($("closeYearBtn"))$("closeYearBtn").onclick=closeYear;
  if($("nextCommandBtn"))$("nextCommandBtn").onclick=newCommand;
  if($("nextDutyBtn"))$("nextDutyBtn").onclick=newAdvancedDuty;
  if($("promotionBtn"))$("promotionBtn").onclick=enhancedPromotion;

  // Wrap the base render so all advanced systems remain synchronized.
  const baseRender=render;
  render=function(){baseRender();renderEnhancements();};
  renderEnhancements();
})();
