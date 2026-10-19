window.dcArchive={
  snapshot:()=>({manifest,opened:!$('examArchiveBody').hidden,round,listPage,filters:Object.fromEntries(['examYearFilter','examTrackFilter','examGradeFilter','examCategoryFilter','examSubjectFilter'].map(id=>[id,$(id).value]))}),
  async restore(x){
    if(!x)return;manifest=x.manifest;
    if(x.opened&&manifest){
      $('examArchiveBody').hidden=false;
      const years=manifest.years.filter(y=>y.paperCount>0);
      fillSelect($('examYearFilter'),years.map(y=>({value:String(y.year),label:'民國 '+y.year+' 年（'+(y.year+1911)+'）'})),'全部年份混合');
      $('examYearFilter').value=x.filters.examYearFilter;
      await updateYear();
      for(const [id,value] of Object.entries(x.filters))$(id).value=value;
      listPage=x.listPage||0;renderList(false);
    }
    round=x.round;if(round&&!round.complete)showQuestion();
  },
  click(el){if(el.hasAttribute('data-exam-answer')){answer(Number(el.dataset.examAnswer));return true;}return false;}
};
