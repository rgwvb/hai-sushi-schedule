const text=n=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
export function compactView(w,root,controls,visible=()=>true){
  const d=w.document,s=w.dcCore.state(),id=root.id;
  const value=id=>text(d.getElementById(id));
  const field=(name,value,inline=false)=>({name,value:value||'—',inline});
  const read=n=>{
    if(n.nodeType===3)return n.textContent;
    if(n.nodeType!==1||!visible(n)||n.matches('script,style,svg,button,input,select,textarea,option,.rank-insignia-wrap,.rank-insignia,.bar,.eyebrow,[class*="disclaimer"],[class$="-note"]'))return '';
    const t=[...n.childNodes].map(read).join('');
    return /^(DIV|SECTION|P|H[1-4]|LI|BR|LABEL|LEGEND|OUTPUT)$/.test(n.tagName)?'\n'+t+'\n':t;
  };
  const block=n=>n?read(n).split('\n').map(x=>x.trim()).filter(Boolean).join('\n'):'';
  const common={meta:null,primary:controls.map((_,i)=>i)};
  const meta=[s.name||'新考生',s.officialRank!=='—'?s.officialRank:'',s.unitName||''].filter(Boolean).join('｜');
  common.meta=meta;
  const actionFields=selector=>[...root.querySelectorAll(selector)].filter(visible).map(n=>field(text(n.querySelector('strong,h3,.knowledge-title')),text(n.querySelector('p'))||text(n.querySelector('.knowledge-copy'))));
  if(id==='life')return {...common,mode:'sections',text:'安排收入、休息與進修。',fields:[
    field('💰 財務',`月薪 ${value('salaryStat')}\n存款 ${value('savingsStat')}`,true),
    field('💚 身心狀態',`體力 ${s.energy} · 壓力 ${value('lifeStress')}\n健康 ${value('healthStat')}`,true),
    field('🗓️ 退休進度',`年齡 ${value('retirementAgeStat')} · 年資 ${value('retirementServiceStat')}\n${value('retirementClassStat')} · 屆齡 ${value('retirementMandatoryStat')}\n${value('voluntaryRetireBtn')}`),
    field('退休條件',value('retirementStatus')),
    field('可安排的活動',actionFields('#lifeActions > .action-card').map(f=>f.name+'｜'+f.value).join('\n'))
  ]};
  if(id==='performance')return {...common,mode:'sections',text:value('appraisalChip')+'｜'+value('appraisalProgress'),fields:[
    field('🎖️ 獎懲',`嘉獎 ${value('commendStat')} · 記功 ${value('meritStat')}\n申誡 ${value('admonitionStat')} · 記過 ${value('demeritStat')}`,true),
    field('📊 平時考核',`優蹟 ${value('goodNoteStat')} · 劣蹟 ${value('badNoteStat')}\n品質 ${value('qualityStat')} · 服務 ${value('serviceStat')}\n紀律 ${value('disciplineStat')}`,true),
    field('考績結算',block(d.getElementById('appraisalBox'))),
    ...[...d.querySelectorAll('#disciplineHistory > *')].map(n=>field(text(n.querySelector('b'))||'獎懲紀錄',text(n.querySelector('span'))||text(n)))
  ]};
  if(id==='records')return {...common,mode:'sections',text:value('appointmentHistoryCount')||'從初任至現職，依年份查看任職經歷。',fields:[field('📍 目前任職',block(d.getElementById('careerCurrentPost'))),...[...d.querySelectorAll('#historyList > *')].map((n,i)=>field('任職經歷 '+(i+1),block(n)))]};
  if(id==='cases')return {...common,mode:'sections',text:'最近勤務紀錄',fields:[...d.querySelectorAll('#caseList > *')].map(n=>field(text(n.querySelector('h3'))||'案件紀錄',block(n)))};
  const indexes=filter=>controls.map((c,i)=>({c,i})).filter(({c})=>filter(c)).map(({i})=>i);
  const groups={duty:['dutyCase','dutyChoices','dutyResult','nextDutyBtn'],command:['commandCase','commandChoices','commandResult','nextCommandBtn'],academy:['quizQuestion','quizChoices','quizResult','newQuizBtn'],topicQuizDialog:['topicQuizQuestion','topicQuizChoices','topicQuizResult','topicQuizNextBtn'],examQuizDialog:['examQuizQuestion','examQuizChoices','examQuizResult','examQuizNextBtn']};
  const group=groups[id];
  if(group){
    const [caseId,choiceId,resultId,nextId]=group,box=d.getElementById(caseId),choices=d.getElementById(choiceId),feedback=text(d.getElementById(resultId));
    const hasQuestion=!!choices?.children.length||feedback;
    if(id!=='academy'||hasQuestion){
      const q=box?.querySelector('b'),story=box?.querySelector('p');
      const question=q?[text(box.querySelector('.tag')),text(q),text(story)].filter(Boolean).join('\n\n'):text(box);
      const answers=indexes(c=>c.path.startsWith('#'+choiceId+' > '));
      const optionText=answers.map(i=>controls[i].label).join('\n\n');
      const main=answers.length?answers:indexes(c=>c.path==='#'+nextId||c.path==='#topicQuizCloseBtn'||c.path==='#examQuizCloseBtn');
      const primary=main.concat(indexes(c=>c.path!=='#'+nextId&&!c.path.startsWith('#'+choiceId+' > ')&&!main.some(i=>controls[i]===c)));
      return {mode:'question',meta,text:[question,optionText,feedback?'【作答解析】\n'+feedback:''].filter(Boolean).join('\n\n'),primary,answerIndexes:answers,nextId};
    }
  }
  if(id==='dashboard')return {...common,mode:'summary',meta,text:value('goalText'),fields:[field('👤 生涯進度',`年齡 ${s.age} 歲\n完成勤務 ${s.dutyCount||0} 件\n經驗 ${s.xp||0} XP`,true),field('📊 當前狀態',`體力 ${s.energy} · 壓力 ${s.stress}\n聲望 ${s.rep}\n資績 ${(s.promotionScore||0).toFixed(1)}`,true),field('📚 能力',`法學 ${s.law} · 英文 ${s.eng}\n體能 ${s.fit} · 溝通 ${s.comm}`)]};
  if(id==='unit'){
    const cards=[...d.querySelectorAll('#unitCards > .choice-card')].map(el=>({action:controls.findIndex(c=>d.querySelector(c.path)===el),title:text(el.querySelector('.vacancy-position'))||text(el.querySelector('h3')),unit:text(el.querySelector('h3')),badge:text(el.querySelector('.vacancy-rank')),sequence:text([...el.querySelectorAll('.tag')].find(n=>/^第\d+序列職務$/.test(text(n)))),description:text(el.querySelector('p')),selected:el.classList.contains('selected')})).filter(c=>c.action>=0);
    return {mode:'vacancies',meta,text:text(d.getElementById('unitBanner')),cards,primary:indexes(c=>c.path==='#confirmUnitBtn'||c.path==='#policeMonitorTrainingBtn'),feedback:text(d.getElementById('unitMsg'))};
  }
  if(id==='career'){
    const parts=text(d.getElementById('promotionScoreBox')).split('｜'),fields=[];
    const stats=parts.filter(x=>/^資績|^最近考績/.test(x));
    if(stats.length)fields.push({name:'📊 資績與考績',value:stats.join('\n'),inline:true});
    if(!['考生','待分發'].includes(s.position))fields.push({name:'🎖️ 獎懲紀錄',value:`嘉獎 ${s.commend||0} · 記功 ${s.merit||0}\n申誡 ${s.admonition||0} · 記過 ${s.demerit||0}\n紀律 ${s.discipline??100}`,inline:true});
    const panel=d.getElementById('officerQualificationPanel'),qualification=d.getElementById('officerQualificationBox');
    if(panel&&panel.style.display!=='none'){
      const lines=[...qualification.querySelectorAll('.qualification-grid > div')].map(el=>{const status=text(el.querySelector('b'));return (/^(符合|已取得|可參加)$/.test(status)?'✅ ':'⏳ ')+text(el.querySelector('span'))+'：'+status;});
      if(lines.length)fields.push({name:'📋 升遷資格',value:lines.join('\n'),inline:false});
      const notes=text(qualification.querySelector('.qualification-notes')).split('｜');
      if(notes[0])fields.push({name:'🎓 考試與訓練',value:notes.join('\n'),inline:false});
    }
    const performance=parts.filter(x=>/^勤務|^考績績效/.test(x));
    if(performance.length)fields.push({name:'📈 績效來源',value:performance.join('\n'),inline:false});
    const result=text(d.getElementById('careerMsg'));
    if(result)fields.unshift({name:'💬 最近操作結果',value:result,inline:false});
    const labels={'#promotionBtn':'參加升遷甄審','#specialUnitBtn':'專業甄選','#transferBtn':'跨機關調任','#thirdGradeUpgradeBtn':'三等特考／訓練','#promotionExamBtn':'警正升官等考試','#promotionTrainingBtn':'晉升警正訓練','#sergeantClass1Btn':'警佐班第1類','#sergeantClass2Btn':'警佐班第2類','#sergeantClass3Btn':'警佐班第3類'};
    labels['#promotionTarget']='申請職務：'+(d.getElementById('promotionTarget')?.value||'選擇職務');
    return {mode:'career',meta,text:text(d.getElementById('promotionRuleText')),fields,primary:controls.map((_,i)=>i),labels};
  }
  if(id==='academy')return {mode:'summary',meta,text:'選擇練習：歷屆特考、混合題庫、主題測驗，或人力配置情境。\n\n知識 '+(s.knowledge||0)+'｜答對 '+(s.quizCorrect||0)+'／'+(s.quizTotal||0)+' 題',primary:controls.map((_,i)=>i)};
  const panels=[...root.querySelectorAll('.panel')].filter(n=>visible(n)&&!n.parentElement.closest('.panel'));
  const fields=panels.map(n=>{
    const copy=n.cloneNode(true);copy.querySelectorAll('h3,.panel-head,.action-card,.choice-card,.form-grid,.toolbar,.directory-toolbar').forEach(n=>n.remove());
    return field(text(n.querySelector('h3'))||'進度與資訊',block(copy));
  }).filter(f=>f.value!=='—');
  fields.push(...actionFields('.choice-card,.action-card').filter(f=>f.value!=='—'));
  const inputs=controls.filter(c=>['input','select','toggle'].includes(c.kind)).map(c=>c.label+'：'+(c.kind==='toggle'?'':c.options?.find(o=>o.value===c.value)?.label||c.value||'尚未設定'));
  if(inputs.length)fields.unshift(field('目前設定',inputs.join('\n')));
  if(!fields.length)fields.push(field('內容',block(root)));
  return {...common,mode:'sections',text:text(root.querySelector('.page-head p'))||'選擇下方按鈕操作。',fields,labels:Object.fromEntries(controls.filter(c=>c.kind==='select').map(c=>[c.path,c.label+'：'+(c.options?.find(o=>o.value===c.value)?.label||'選擇')]))};
}
