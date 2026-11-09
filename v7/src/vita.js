// [commedia] vita.js: dietro ?commedia (vedi commedia/VITA_NPC.md)
(function(){
  const ON = /[?&]commedia\b/.test(location.search);
  window.Vita = { ON };
  if (!ON) return;
})();
