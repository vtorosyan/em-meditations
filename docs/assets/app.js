(function(){
  var root=document.documentElement;
  var key="em-meditations-theme";
  function apply(t){
    if(t==="dark"){root.setAttribute("data-theme","dark");}
    else{root.removeAttribute("data-theme");}
  }
  var saved=null;
  try{saved=localStorage.getItem(key);}catch(e){}
  if(!saved){
    saved=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  }
  apply(saved);
  var btn=document.getElementById("theme-toggle");
  function setIcon(){if(btn){btn.innerHTML=root.getAttribute("data-theme")==="dark"?"\u2600":"\u263D";}}
  setIcon();
  if(btn){
    btn.addEventListener("click",function(){
      var next=root.getAttribute("data-theme")==="dark"?"light":"dark";
      apply(next);setIcon();
      try{localStorage.setItem(key,next);}catch(e){}
    });
  }

  /* "Surprise me" — jump to a random meditation. */
  var MEDITATIONS=["meditations/001_the_freedom_of_no_opinion.html","meditations/002_control_and_acceptance.html","meditations/003_the_disillusion_of_comfort.html","meditations/004_the_beauty_of_choices.html","meditations/005_managing_the_mess.html","meditations/006_do_the_right_thing.html","meditations/007_the_little_knowledge.html","meditations/008_observation_vs_perception.html","meditations/009_fighting_entropy.html"];
  var base=(document.body&&document.body.getAttribute("data-base"))||"";
  function currentPath(){
    var p=location.pathname.split("/").pop()||"";
    return p;
  }
  function gotoRandom(){
    if(!MEDITATIONS.length)return;
    var here=currentPath();
    var pool=MEDITATIONS.filter(function(m){return m.split("/").pop()!==here;});
    if(!pool.length)pool=MEDITATIONS;
    var pick=pool[Math.floor(Math.random()*pool.length)];
    location.href=base+pick;
  }
  ["random-btn","hero-random"].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener("click",gotoRandom);
  });
})();