// [commedia] iniziative.js: dietro ?commedia (vedi commedia/VITA_NPC.md)
(function(){
  const ON = /[?&]commedia\b/.test(location.search);
  window.Iniziative = { ON };
  if (!ON) return;
})();
