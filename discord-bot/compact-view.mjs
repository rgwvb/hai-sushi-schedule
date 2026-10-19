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
  if(id==='career')return {mode:'summary',meta,text:['【升遷條件】',text(d.getElementById('promotionRuleText')),text(d.getElementById('officerQualificationPanel')?.style.display!=='none'?d.getElementById('officerQualificationBox'):null),text(d.getElementById('promotionScoreBox')),text(d.getElementById('careerMsg'))].filter(Boolean).join('\n\n'),primary:controls.map((_,i)=>i)};
  if(id==='academy')return {mode:'summary',meta,text:'選擇練習：歷屆特考、混合題庫、主題測驗，或人力配置情境。\n\n知識 '+(s.knowledge||0)+'｜答對 '+(s.quizCorrect||0)+'／'+(s.quizTotal||0)+' 題',primary:controls.map((_,i)=>i)};
  return null;
}
