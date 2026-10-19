// Adapter hooks only. All scoring, eligibility and appointments stay in the web engine.
window.dcSystems={
  snapshot:()=>({active:active?{row:active,analysis:active.analysis,roleCaseId:active.roleCaseId}:null,currentQuiz,quizAnswered,dutyQuizQuestion,dutyQuizAnswered,commandQuizQuestion,commandQuizAnswered,commandActive:commandActive?{row:commandActive,analysis:commandActive.analysis}:null,topicQuizRun,roleQueueKey,dutyCaseKey,commandCaseKey,bags:[...roleCaseBags]}),
  restore(x){
    if(!x)return;
    active=x.active?Object.assign(x.active.row,{analysis:x.active.analysis,roleCaseId:x.active.roleCaseId}):null;
    currentQuiz=x.currentQuiz;quizAnswered=x.quizAnswered;
    dutyQuizQuestion=x.dutyQuizQuestion;dutyQuizAnswered=x.dutyQuizAnswered;
    commandQuizQuestion=x.commandQuizQuestion;commandQuizAnswered=x.commandQuizAnswered;
    commandActive=x.commandActive?Object.assign(x.commandActive.row,{analysis:x.commandActive.analysis}):null;
    topicQuizRun=x.topicQuizRun;roleQueueKey=x.roleQueueKey;dutyCaseKey=x.dutyCaseKey;commandCaseKey=x.commandCaseKey;
    roleCaseBags.clear();for(const [k,v] of x.bags||[])roleCaseBags.set(k,v);
  },
  click(el){
    const handlers={'data-advd':advancedResolve,'data-dutyquiz':resolveDutyQuiz,'data-cmd':resolveCommand,'data-cmdquiz':resolveCommandQuiz,'data-q':answerQuiz,'data-topic-answer':answerTopicQuiz};
    for(const [attr,handler] of Object.entries(handlers))if(el.hasAttribute(attr)){handler(Number(el.getAttribute(attr)));return true;}
    return false;
  },
  stats:()=>({performance:Math.round((performanceContribution().total+appraisalPerformance()+outcomePerformancePoints())*10)/10,sequence:currentSequenceNo(),badge:rankInsigniaSpec(currentSequenceNo())?.label,supervisor:isSupervisor()})
};
