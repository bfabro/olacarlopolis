// Lightweight ARIA tabs initializer
(function(){
  function activate(tab, setFocus){
    const root = tab.closest('.tabs-container');
    if(!root) return;
    const tabs = root.querySelectorAll('[role="tab"]');
    const panels = root.querySelectorAll('[role="tabpanel"]');
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(p => {
      p.classList.toggle('is-active', ('#'+p.id) === tab.getAttribute('aria-controls'));
      p.hidden = !p.classList.contains('is-active');
    });
    if(setFocus) tab.focus();
  }

  function onKeydown(e){
    const key = e.key;
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(key)) return;
    const tab = e.target;
    const root = tab.closest('.tabs-container');
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    let idx = tabs.indexOf(tab);
    if(key === 'ArrowLeft') idx = (idx - 1 + tabs.length) % tabs.length;
    if(key === 'ArrowRight') idx = (idx + 1) % tabs.length;
    if(key === 'Home') idx = 0;
    if(key === 'End') idx = tabs.length - 1;
    activate(tabs[idx], true);
    e.preventDefault();
  }

  function init(root){
    const hasCardapio = root.getAttribute('data-has-cardapio');
    if(hasCardapio === 'false') {
      root.querySelector('[data-tab="cardapio"]')?.classList.add('is-hidden');
      const panel = root.querySelector('#panel-cardapio');
      if(panel) panel.remove();
    }
    const first = root.querySelector('[role="tab"]');
    if(first) activate(first, false);
    root.addEventListener('click', function(e){
      const t = e.target.closest('[role="tab"]');
      if(!t) return;
      activate(t, false);
    });
    root.addEventListener('keydown', onKeydown);
  }

  function boot(){
    document.querySelectorAll('.tabs-container').forEach(init);
  }
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();