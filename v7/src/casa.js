// [commedia] casa.js: gli NPC arredano, spostano, ridipingono casa con gli stessi strumenti del giocatore; dietro ?commedia
(function(){
  const ON = /[?&]commedia\b/.test(location.search);
  window.Casa = { ON };
  if (!ON) return;
})();
