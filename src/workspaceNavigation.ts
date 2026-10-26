import './workspaceNavigation.css';

type Destination = 'garden' | 'compare' | 'animations' | 'botany' | 'terrain';
type WorkspaceActions = Record<Exclude<Destination, 'garden'>, () => void | Promise<void>>;

/** Shared entrance for our work-in-progress tools. The garden itself is never unmounted. */
export function mountWorkspaceNavigation(app: HTMLElement, actions: WorkspaceActions): void {
  if (document.querySelector('#workspace-home')) return;
  const header = app.querySelector<HTMLElement>('.hud-actions');
  if (!header) throw new Error('Navigation Komorebi : barre principale introuvable.');

  const openButton = document.createElement('button');
  openButton.id = 'workspace-open';
  openButton.type = 'button';
  openButton.textContent = '☰  Ateliers';
  openButton.title = 'Accueil et ateliers de Komorebi';
  openButton.setAttribute('aria-label', 'Ouvrir les ateliers Komorebi');
  header.prepend(openButton);

  const root = document.createElement('section');
  root.id = 'workspace-home';
  root.setAttribute('aria-label', 'Accueil des ateliers Komorebi');
  root.innerHTML = `
    <div class="ws-shell">
      <header class="ws-header">
        <div class="ws-brand"><span class="ws-leaf">✳</span><span>KOMOREBI <small>ATELIERS</small></span></div>
        <button type="button" data-workspace="garden" class="ws-back">Ouvrir mon jardin ↗</button>
      </header>
      <div class="ws-content">
        <div class="ws-heading"><span class="ws-eyebrow">Bienvenue dans l'atelier</span>
          <h1>Donner vie à notre jardin.</h1>
          <p>Un accès clair aux outils. Choisis ce que tu veux examiner ou construire.</p>
        </div>
        <div class="ws-primary">
          <button type="button" data-workspace="compare" class="ws-card ws-main">
            <span class="ws-tag">PRIORITÉ · PERSONNAGE</span>
            <strong>Comparer les deux jardiniers <span>↗</span></strong>
            <span class="ws-description">Ancien V0.44 et Ranger V0.47 côte à côte. Choisir les références pour chaque partie.</span>
            <span class="ws-foot">Comparaison visuelle · pas encore de modèle hybride</span>
          </button>
          <button type="button" data-workspace="animations" class="ws-card ws-animation">
            <span class="ws-tag">ANIMATION</span>
            <strong>Tester les mouvements <span>↗</span></strong>
            <span class="ws-description">Marcher, courir et creuser avec la V0.47. Examiner la pelle et les articulations.</span>
            <span class="ws-foot">Prototype animé KayKit</span>
          </button>
        </div>
        <div class="ws-secondary">
          <button type="button" data-workspace="garden" class="ws-card"><strong>Composer le jardin <span>↗</span></strong><span>Planter, déplacer et contempler.</span></button>
          <button type="button" data-workspace="botany" class="ws-card"><strong>Bibliothèque végétale <span>↗</span></strong><span>Observer les espèces et leurs variantes.</span></button>
          <button type="button" data-workspace="terrain" class="ws-card"><strong>Travail du terrain <span>↗</span></strong><span>Creuser et façonner le sol · expérimental.</span></button>
        </div>
        <div class="ws-note"><strong>État du projet</strong> — Tes choix pour le futur jardinier hybride sont enregistrés. <strong>Le modèle hybride n'a pas encore été créé.</strong> Le comparateur affiche intentionnellement les deux références V0.44 et V0.47.</div>
      </div>
      <footer class="ws-footer"><span>Komorebi · Prototype de jardin 3D</span><span>Échap pour revenir au jardin</span></footer>
    </div>`;
  app.append(root);

  const show = () => { root.hidden = false; openButton.setAttribute('aria-expanded', 'true'); };
  const hide = () => { root.hidden = true; openButton.setAttribute('aria-expanded', 'false'); };
  openButton.onclick = show;
  root.querySelectorAll<HTMLButtonElement>('[data-workspace]').forEach(button => {
    button.addEventListener('click', () => {
      const destination = button.dataset.workspace as Destination;
      hide();
      if (destination === 'garden') return;
      try { void Promise.resolve(actions[destination]()).catch(error => { console.error('Atelier impossible à ouvrir', error); show(); }); }
      catch (error) { console.error('Atelier impossible à ouvrir', error); show(); }
    });
  });
  // The closers belong to historical workshops; return to the same entry point.
  app.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#earthworks-close, #botany-close')) window.setTimeout(show, 0);
  });
  window.addEventListener('komorebi:workspace-open', show);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !root.hidden) hide();
  });
  const params = new URLSearchParams(window.location.search);
  // Do not hide the garden under an overlay when Playwright captures it.
  if (params.has('review') || params.has('kaykit') || params.has('character') || params.has('earthworks')) hide();
  else show();
}
