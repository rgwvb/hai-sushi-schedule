const text=n=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
export function compactView(w,root,controls){
  const d=w.document,s=w.dcCore.state(),id=root.id;
  const meta=[s.name||'新考生',s.officialRank!=='—'?s.officialRank:'',s.unitName||''].filter(Boolean).join('｜');
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
      const primary=answers.length?answers:indexes(c=>c.path==='#'+nextId||c.path==='#topicQuizCloseBtn'||c.path==='#examQuizCloseBtn');
      return {mode:'question',meta,text:[question,optionText,feedback?'【作答解析】\n'+feedback:''].filter(Boolean).join('\n\n'),primary,answerIndexes:answers,nextId};
    }
  }
  if(id==='dashboard')return {mode:'summary',meta,text:[`職務：${s.position}｜官階：${s.officialRank}`,s.unitName||'尚未分發',`年齡 ${s.age} 歲｜完成勤務 ${s.dutyCount||0} 件`,`經驗 ${s.xp||0} XP｜體力 ${s.energy}｜資績 ${(s.promotionScore||0).toFixed(1)}`,text(d.getElementById('goalText'))].join('\n\n'),primary:indexes(c=>c.path==='#continueBtn')};
  if(id==='unit'){
    const cards=[...d.querySelectorAll('#unitCards > .choice-card')].map(el=>({action:controls.findIndex(c=>d.querySelector(c.path)===el),title:text(el.querySelector('.vacancy-position'))||text(el.querySelector('h3')),unit:text(el.querySelector('h3')),badge:text(el.querySelector('.vacancy-rank')),selected:el.classList.contains('selected')})).filter(c=>c.action>=0);
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
    if(result)fields.push({name:'💬 最近操作結果',value:result,inline:false});
    const labels={'#promotionBtn':'參加升遷甄審','#specialUnitBtn':'專業甄選','#transferBtn':'跨機關調任','#thirdGradeUpgradeBtn':'三等特考／訓練','#promotionExamBtn':'警正升官等考試','#promotionTrainingBtn':'晉升警正訓練','#sergeantClass1Btn':'警佐班第1類','#sergeantClass2Btn':'警佐班第2類','#sergeantClass3Btn':'警佐班第3類'};
    labels['#promotionTarget']='申請職務：'+(d.getElementById('promotionTarget')?.value||'選擇職務');
    return {mode:'career',meta,text:text(d.getElementById('promotionRuleText')),fields,primary:controls.map((_,i)=>i),labels};
  }
  if(id==='academy')return {mode:'summary',meta,text:'選擇練習：歷屆特考、混合題庫、主題測驗，或人力配置情境。\n\n知識 '+(s.knowledge||0)+'｜答對 '+(s.quizCorrect||0)+'／'+(s.quizTotal||0)+' 題',primary:controls.map((_,i)=>i)};
  return null;
}
