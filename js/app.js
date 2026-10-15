/* app.js — logique de Chasseur : recherche, liens, employeurs, suivi des candidatures.
   Chargé en defer après anim.js : le DOM est prêt et window.Anim est disponible. */
(function () {
  'use strict';
  try {
    /* ---------- OUTILS ---------- */
    function $(id) { return document.getElementById(id); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function enc(s) { return encodeURIComponent(s); }
    function fold(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    function slug(s) { return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    function pick(v, mode) { return (v && typeof v === 'object') ? v[mode] : v; }
    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }
    function btn(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }
    function svg(path, cls) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true');
      if (cls) s.setAttribute('class', cls);
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', path); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2');
      s.appendChild(p);
      return s;
    }
    var ICON_CHECK = 'M3 8.5l3.2 3.2L13 4.8', ICON_CROSS = 'M4 4l8 8M12 4l-8 8';
    function pad(n) { return ('0' + n).slice(-2); }
    function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function today() { return isoOf(new Date()); }
    function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function daysSince(s) {
      if (!s) return 0;
      var t = new Date(); t.setHours(0, 0, 0, 0);
      return Math.round((t - parseIso(s)) / 86400000);
    }
    function fmtShort(s) { return s ? parseIso(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''; }
    function fmtLong(s) { return s ? parseIso(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''; }
    function ago(s) {
      var n = daysSince(s);
      return n <= 0 ? 'aujourd\'hui' : n === 1 ? 'hier' : 'il y a ' + n + ' jours';
    }
    function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }
    var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var finePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
    function animate(root) { if (window.Anim && root) window.Anim.init(root); }

    /* ---------- LES DEUX MODES ---------- */
    var MODES = {
      alt: {
        title: 'd\'alternance',
        lede: 'Événementiel, palaces et 5 étoiles. Choisis tes mots-clés, une ville et tes plateformes : l\'outil fabrique les recherches à ta place (après il faut quand même l\'adapter).',
        doc: 'Chasseur d\'alternance — événementiel & hôtellerie de luxe',
        tags: [['Événementiel', 1], ['Alternance', 1], ['Apprentissage', 0], ['Hôtel 5 étoiles', 0], ['Palace', 0],
               ['Luxe', 0], ['Hôtellerie', 0], ['Apprenti', 0]],
        presets: [
          { label: 'Événementiel', tags: ['Événementiel', 'Alternance'] },
          { label: 'Palaces', tags: ['Palace', 'Alternance'] },
          { label: 'Hôtellerie de luxe', tags: ['Hôtellerie', 'Luxe', 'Alternance'] },
          { label: 'Apprentissage 5 étoiles', tags: ['Hôtel 5 étoiles', 'Apprentissage'] }
        ]
      },
      job: {
        title: 'de job',
        lede: 'Événementiel, agences, lieux, palaces et 5 étoiles. CDI, CDD ou missions : choisis un métier, une ville et tes plateformes. L\'outil fabrique les recherches à ta place (après il faut quand même l\'adapter).',
        doc: 'Chasseur de job — événementiel & hôtellerie de luxe',
        tags: [['Événementiel', 1], ['Chef de projet événementiel', 0], ['Event manager', 0], ['Coordinateur', 0],
               ['MICE', 0], ['Séminaires', 0], ['Banquets', 0], ['Wedding planner', 0], ['Agence', 0],
               ['Luxe', 0], ['Hôtel 5 étoiles', 0], ['Palace', 0], ['CDI', 0], ['CDD', 0]],
        presets: [
          { label: 'Chef de projet événementiel', tags: ['Chef de projet événementiel'] },
          { label: 'Event manager', tags: ['Event manager'] },
          { label: 'Séminaires et banquets', tags: ['Séminaires', 'Banquets'] },
          { label: 'Événementiel de luxe', tags: ['Événementiel', 'Luxe'] },
          { label: 'Agences', tags: ['Événementiel', 'Agence'] },
          { label: 'MICE', tags: ['MICE'] }
        ]
      }
    };

    var CITIES = ['Paris', 'Rennes', 'Nice', 'Antibes', 'Cannes', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Strasbourg',
      'Toulouse', 'Courchevel', 'Monaco', 'Megève', 'Val d\'Isère', 'Méribel', 'Chamonix', 'Tignes', 'Annecy', 'Évian-les-Bains',
      'Saint-Tropez', 'Ramatuelle', 'Èze', 'Saint-Jean-Cap-Ferrat', 'Beaulieu-sur-Mer', 'Menton', 'Saint-Paul-de-Vence', 'Vence',
      'Aix-en-Provence', 'Avignon', 'Gordes', 'Saint-Rémy-de-Provence', 'Biarritz', 'Saint-Jean-de-Luz', 'Arcachon',
      'La Baule', 'Dinard', 'Saint-Malo', 'Deauville', 'Honfleur', 'Cabourg', 'Le Touquet', 'Versailles', 'Chantilly',
      'Fontainebleau', 'Reims', 'Épernay', 'Beaune', 'Dijon', 'Colmar', 'Nantes', 'Montpellier', 'Grenoble', 'Toulon', 'Ajaccio',
      'Porto-Vecchio', 'Calvi', 'Bonifacio', 'Mougins', 'Grasse', 'Saint-Émilion', 'Boulogne-Billancourt', 'Neuilly-sur-Seine',
      'Levallois-Perret', 'Sophia Antipolis'];

    // régions « de proximité » pour faire remonter les employeurs du coin
    var AREAS = {
      'Côte d\'Azur': ['Nice', 'Antibes', 'Cannes', 'Monaco', 'Èze', 'Saint-Jean-Cap-Ferrat', 'Beaulieu-sur-Mer', 'Menton',
        'Saint-Paul-de-Vence', 'Vence', 'Mougins', 'Grasse', 'Sophia Antipolis', 'Saint-Tropez', 'Ramatuelle'],
      'Île-de-France': ['Paris', 'Versailles', 'Chantilly', 'Fontainebleau', 'Boulogne-Billancourt', 'Neuilly-sur-Seine', 'Levallois-Perret'],
      'Alpes': ['Courchevel', 'Megève', 'Val d\'Isère', 'Méribel', 'Chamonix', 'Tignes', 'Annecy', 'Évian-les-Bains', 'Grenoble', 'Lyon'],
      'Provence': ['Aix-en-Provence', 'Avignon', 'Gordes', 'Saint-Rémy-de-Provence', 'Marseille', 'Toulon']
    };
    var AREA_OF = {};
    Object.keys(AREAS).forEach(function (a) { AREAS[a].forEach(function (c) { AREA_OF[fold(c)] = a; }); });

    var LBA_CITIES = { 'paris': 1, 'lyon': 1, 'marseille': 1, 'bordeaux': 1, 'toulouse': 1, 'strasbourg': 1, 'nantes': 1,
      'rennes': 1, 'montpellier': 1, 'grenoble': 1, 'nice': 1, 'lille': 1, 'dijon': 1, 'reims': 1, 'toulon': 1, 'annecy': 1, 'avignon': 1 };
    var LBA = 'https://labonnealternance.apprentissage.beta.gouv.fr';
    function google(q, recent) { return 'https://www.google.com/search?q=' + enc(q) + (recent ? '&tbs=qdr:w' : ''); }

    /* kind : pre = mots-clés + ville dans le lien · part = mots-clés seulement · filter = tout se règle sur place
       recent : le site accepte le filtre « 7 derniers jours » par lien · def:false = décochée par défaut */
    var PLATFORMS = [
      { id: 'lba', modes: ['alt'], name: 'La Bonne Alternance', kind: 'filter',
        desc: 'Service public. Offres et entreprises qui recrutent des alternants sans annonce publiée.',
        note: 'Tape ton métier dans le champ « Métier ou formation ».',
        url: function (s) {
          var c = s.city && slug(s.city);
          return (c && LBA_CITIES[c]) ? LBA + '/alternance/ville/' + c : LBA + '/recherche';
        } },
      { id: 'indeed', modes: ['alt', 'job'], name: 'Indeed', kind: 'pre', recent: true,
        desc: { alt: 'Le plus gros volume d\'offres en alternance et apprentissage.',
                job: 'Le plus gros volume d\'offres. Ajoute « CDI » ou « CDD » aux mots-clés pour cibler le contrat.' },
        url: function (s) { return 'https://fr.indeed.com/jobs?q=' + enc(s.q) + '&l=' + enc(s.city || 'France') + (s.recent ? '&fromage=7&sort=date' : ''); } },
      { id: 'hellowork', modes: ['alt', 'job'], name: 'HelloWork', kind: 'pre',
        desc: { alt: 'Très fourni sur l\'alternance en France. Alimente aussi La Bonne Alternance.',
                job: 'Très fourni en CDI et CDD partout en France. Le filtre contrat se règle sur la page.' },
        url: function (s) {
          var u = 'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=' + enc(s.q);
          if (s.city) u += '&l=' + enc(s.city);   // sans ville : paramètre omis, pas vidé
          return u + '&d=all';
        } },
      { id: 'linkedin', modes: ['alt', 'job'], name: 'LinkedIn', kind: 'pre', recent: true,
        desc: { alt: 'Là où les groupes hôteliers publient et où on contacte les RH.',
                job: 'Groupes hôteliers, agences et lieux publient ici. Et c\'est là qu\'on écrit aux RH.' },
        url: function (s) {
          var loc = !s.city ? 'France' : (s.city === 'Monaco' ? 'Monaco' : s.city + ', France');
          return 'https://www.linkedin.com/jobs/search/?keywords=' + enc(s.q) + '&location=' + enc(loc) + (s.recent ? '&f_TPR=r604800&sortBy=DD' : '');
        } },
      { id: 'francetravail', modes: ['job'], name: 'France Travail', kind: 'part',
        desc: 'Service public de l\'emploi, avec en plus les offres des sites partenaires.',
        note: 'Mots-clés déjà saisis. Ajoute la ville dans « Lieu de travail ».',
        url: function (s) { return 'https://candidat.francetravail.fr/offres/recherche?motsCles=' + enc(s.q) + '&offresPartenaires=true&tri=0'; } },
      { id: 'apec', modes: ['job'], name: 'Apec', kind: 'part',
        desc: 'Les postes cadres : chef de projet, responsable événementiel, event manager.',
        note: 'Règle le lieu sur place. Si les mots-clés ne sont pas repris, colle-les.',
        url: function (s) { return 'https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=' + enc(s.q); } },
      { id: 'wttj', modes: ['alt', 'job'], name: 'Welcome to the Jungle', kind: 'filter',
        desc: { alt: 'Filtre contrat « Alternance ». Beaucoup d\'événementiel et d\'agences.',
                job: 'Agences événementielles, lieux et marques. Filtre contrat CDI, CDD ou freelance.' },
        note: { alt: 'Colle les mots-clés dans « Quel job recherchez-vous ? », puis filtre Contrat, Alternance.',
                job: 'Colle les mots-clés dans « Quel job recherchez-vous ? », puis filtre Contrat, CDI ou CDD.' },
        url: function () { return 'https://www.welcometothejungle.com/fr/jobs'; } },
      { id: 'jdp', modes: ['alt', 'job'], name: 'Journal des Palaces', kind: 'filter',
        desc: { alt: 'La référence du luxe hôtelier. Filtre contrat « Alternance / Apprentissage ».',
                job: 'La référence du luxe hôtelier. Events, séminaires et banquets des palaces.' },
        note: { alt: 'Un seul métier accepté (par exemple « Événementiel »), puis Contrat : Alternance, Formation : Bac+5.',
                job: 'Un seul métier accepté (par exemple « Événementiel »), puis Contrat : CDI ou CDD.' },
        url: function () { return 'https://www.journaldespalaces.com/carriere/rechercher-des-offres-hotels.html'; } },
      { id: 'wizbii', modes: ['job'], name: 'Wizbii', kind: 'filter',
        desc: 'Jeunes diplômés. Rubrique événementiel avec CDI, CDD et freelance.',
        note: 'La rubrique événementiel s\'ouvre directement : parcours la liste.',
        url: function () { return 'https://www.wizbii.com/emploi/evenementiel'; } },
      { id: 'lhr', modes: ['job'], name: 'L\'Hôtellerie Restauration', kind: 'filter', def: false,
        desc: 'Le journal du métier. Rubrique séminaires et banquets des hôtels et traiteurs.',
        note: 'Peu d\'offres mais très ciblées. Filtre par région sur la page.',
        url: function () { return 'https://www.lhotellerie-restauration.fr/emplois/seminaire-banquet'; } },
      { id: '1j1s', modes: ['alt'], name: '1jeune1solution', kind: 'filter',
        desc: 'Portail gouvernemental. Agrège France Travail et ses partenaires, filtre apprentissage actif.',
        note: 'Ajoute ton métier et ta ville dans les filtres de la page.',
        url: function () { return 'https://www.1jeune1solution.gouv.fr/emplois?naturesContrats=E2'; } },
      { id: 'letudiant', modes: ['alt'], name: 'L\'Étudiant, jobboard', kind: 'filter',
        desc: 'Plus de 11 000 offres en apprentissage et contrat pro, du BTS au Bac+5.',
        note: 'Filtre par ville et niveau d\'études sur la page.',
        url: function () { return 'https://jobs-stages.letudiant.fr/offres/contrat-alternance'; } },
      { id: 'googleor', modes: ['alt', 'job'], name: 'Google, luxe et palaces', kind: 'pre', recent: true,
        desc: 'Ajoute « luxe OR palace OR haut de gamme OR premium » à ta recherche. Attrape les sites carrière des hôtels.',
        url: function (s) { return google(s.q + ' ' + (s.city || 'France') + ' (luxe OR palace OR "haut de gamme" OR premium)', s.recent); } },
      { id: 'googlecareers', modes: ['alt', 'job'], name: 'Google, pages carrière', kind: 'pre', recent: true,
        desc: 'Remonte les pages « Nous rejoindre » des hôtels, agences et lieux, souvent absentes des job boards.',
        url: function (s) { return google(s.q + ' ' + (s.city || 'France') + ' ("nous rejoindre" OR carrières OR recrutement OR careers)', s.recent); } }
    ];
    var KIND_TEXT = { pre: 'Recherche préremplie', part: 'Mots-clés préremplis', filter: 'Filtres à régler sur place' };
    function platformsFor(mode) { return PLATFORMS.filter(function (p) { return p.modes.indexOf(mode) !== -1; }); }

    /* ---------- EMPLOYEURS À VISER ---------- */
    var JDP = 'https://www.journaldespalaces.com/carriere/offres-groupe-';
    var WTTJ = 'https://www.welcometothejungle.com/fr/companies/';
    var SRC = { jdp: 'Offres publiées sur le Journal des Palaces.', wttj: 'Offres publiées sur Welcome to the Jungle.', site: 'Offres sur son site carrière.' };
    var TYPES = { hotel: 'Palaces et hôtels', agency: 'Agences et salons', venue: 'Lieux et traiteurs' };
    var TARGETS = [
      { name: 'Oetker Collection', type: 'hotel', desc: 'Le Bristol, Hôtel du Cap-Eden-Roc, Château Saint-Martin, L\'Apogée Courchevel.',
        where: ['Paris', 'Antibes', 'Vence', 'Courchevel'], url: JDP + '439-Oetker-Collection.html', src: 'jdp' },
      { name: 'Dorchester Collection', type: 'hotel', desc: 'Plaza Athénée et Le Meurice.',
        where: ['Paris'], url: JDP + '415-Dorchester-Collection.html', src: 'jdp' },
      { name: 'Four Seasons', type: 'hotel', desc: 'George V, Grand-Hôtel du Cap-Ferrat, Megève.',
        where: ['Paris', 'Saint-Jean-Cap-Ferrat', 'Megève'], url: JDP + '26-Four-Seasons-Hotels-Resorts.html', src: 'jdp' },
      { name: 'Cheval Blanc', type: 'hotel', desc: 'Les maisons LVMH de Paris, Courchevel et Saint-Tropez.',
        where: ['Paris', 'Courchevel', 'Saint-Tropez'], url: JDP + '887-Cheval-Blanc.html', src: 'jdp' },
      { name: 'Airelles Collection', type: 'hotel', desc: 'Courchevel, Val d\'Isère, Saint-Tropez, Gordes, Le Grand Contrôle à Versailles.',
        where: ['Courchevel', 'Val d\'Isère', 'Saint-Tropez', 'Gordes', 'Versailles'], url: JDP + '1110-Airelles-Collection.html', src: 'jdp' },
      { name: 'Monte-Carlo Société des Bains de Mer', type: 'hotel', desc: 'Hôtel de Paris, Hermitage, Sporting : l\'hôtellerie et les soirées de Monaco.',
        where: ['Monaco'], url: JDP + '128-Monte-Carlo-Societe-des-Bains-de-Mer.html', src: 'jdp' },
      { name: 'Mandarin Oriental', type: 'hotel', desc: 'Mandarin Oriental Paris, rue Saint-Honoré.',
        where: ['Paris'], url: JDP + '46-Mandarin-Oriental-Hotel-Group.html', src: 'jdp' },
      { name: 'The Peninsula', type: 'hotel', desc: 'The Peninsula Paris, avenue Kléber.',
        where: ['Paris'], url: JDP + '55-The-Peninsula-Group.html', src: 'jdp' },
      { name: 'Rosewood', type: 'hotel', desc: 'Hôtel de Crillon, place de la Concorde.',
        where: ['Paris'], url: JDP + '63-Rosewood-Hotels-and-Resorts.html', src: 'jdp' },
      { name: 'Maisons Pariente', type: 'hotel', desc: 'Le Grand Mazarin, Lou Pinet, Le Coucou, Crillon le Brave.',
        where: ['Paris', 'Saint-Tropez', 'Méribel'], url: JDP + '1152-Maisons-Pariente.html', src: 'jdp' },
      { name: 'Evok Collection', type: 'hotel', desc: 'Brach, Nolinski, Sinner, Cour des Vosges.',
        where: ['Paris'], url: JDP + '956-Evok-Collection.html', src: 'jdp' },
      { name: 'Accor', type: 'hotel', desc: 'Raffles, Sofitel, Fairmont… dont Le Royal Monceau et le Fairmont Monte Carlo.',
        where: ['Paris', 'Monaco'], national: true, url: JDP + '108-Accor.html', src: 'jdp' },
      { name: 'Relais & Châteaux', type: 'hotel', desc: 'Hôtels et tables d\'exception, partout en France.',
        where: [], national: true, url: JDP + '58-Relais-et-Chateaux.html', src: 'jdp' },
      { name: 'Hopscotch', type: 'agency', desc: 'Groupe d\'événementiel et de communication, avec un pôle Hopscotch Luxe.',
        where: ['Paris'], url: WTTJ + 'hopscotch/jobs', src: 'wttj' },
      { name: 'Auditoire', type: 'agency', desc: 'Agence d\'événements et d\'expériences de marque.',
        where: ['Paris'], url: WTTJ + 'auditoire/jobs', src: 'wttj' },
      { name: 'Comexposium', type: 'agency', desc: 'Organisateur de salons : SIAL, Foire de Paris…',
        where: ['Paris'], url: WTTJ + 'comexposium/jobs', src: 'wttj' },
      { name: 'GL events', type: 'agency', desc: 'Organisation d\'événements, prestations techniques et gestion de lieux.',
        where: ['Lyon', 'Paris'], national: true, url: 'https://www.gl-events.com/en/careers', src: 'site' },
      { name: 'Potel et Chabot', type: 'venue', desc: 'Traiteur événementiel de prestige, avec SaintClair et Dalloyau.',
        where: ['Paris'], url: 'https://groupepoteletchabot.com/rejoindre-le-groupe-potel-et-chabot', src: 'site' },
      { name: 'Palais des Festivals', type: 'venue', desc: 'Congrès, festivals et salons de Cannes.',
        where: ['Cannes'], url: 'https://www.palaisdesfestivals.com/espace-carriere/offre-emploi/', src: 'site' },
      { name: 'Grimaldi Forum', type: 'venue', desc: 'Centre de congrès et d\'expositions de Monaco. Stages et candidatures spontanées acceptés.',
        where: ['Monaco'], url: 'https://www.grimaldiforum.com/fr/recrutement', src: 'site' }
    ];

    /* ---------- ÉTAT DE LA RECHERCHE (mémorisé dans le navigateur) ---------- */
    var KEY = 'chasseur.v2';
    function defaultTags(mode) { return MODES[mode].tags.map(function (t) { return { label: t[0], on: !!t[1], custom: false }; }); }
    function defaultChecked(mode) {
      var c = {};
      platformsFor(mode).forEach(function (p) { c[p.id] = p.def !== false; });
      return c;
    }
    function freshMode(mode) { return { tags: defaultTags(mode), checked: defaultChecked(mode), generated: false }; }
    var S = { mode: 'alt', city: null, chosen: false, recent: false, tfilter: 'all',
              m: { alt: freshMode('alt'), job: freshMode('job') }, seen: {} };

    (function restore() {
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
      if (!raw || typeof raw !== 'object') return;
      if (raw.mode === 'alt' || raw.mode === 'job') S.mode = raw.mode;
      S.chosen = !!raw.chosen;
      S.city = (S.chosen && typeof raw.city === 'string' && raw.city.trim()) ? raw.city.trim().slice(0, 60) : null;
      S.recent = !!raw.recent;
      if (raw.tfilter === 'all' || TYPES[raw.tfilter]) S.tfilter = raw.tfilter;
      ['alt', 'job'].forEach(function (m) {
        var r = raw.m && raw.m[m];
        if (!r || typeof r !== 'object') return;
        if (Array.isArray(r.tags)) {
          var t = r.tags.filter(function (x) { return x && typeof x.label === 'string' && x.label.trim(); })
                        .map(function (x) { return { label: x.label.trim().slice(0, 80), on: !!x.on, custom: !!x.custom }; });
          if (t.length) S.m[m].tags = t;
        }
        if (r.checked && typeof r.checked === 'object') {
          Object.keys(S.m[m].checked).forEach(function (id) {
            if (typeof r.checked[id] === 'boolean') S.m[m].checked[id] = r.checked[id];
          });
        }
        S.m[m].generated = !!r.generated;
      });
      var d = today();
      if (raw.seen && typeof raw.seen === 'object') {
        Object.keys(raw.seen).forEach(function (h) { if (raw.seen[h] === d) S.seen[h] = d; });  // on oublie les jours passés
      }
    })();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    function cur() { return S.m[S.mode]; }
    function canonicalCity(v) {
      var hit = CITIES.filter(function (c) { return fold(c) === fold(v); })[0];
      return hit || v;
    }

    function modeFromHash() {
      var h = (location.hash || '').replace('#', '').toLowerCase();
      if (h === 'job' || h === 'emploi') return 'job';
      if (h === 'alternance') return 'alt';
      return null;
    }
    var hashMode = modeFromHash();
    if (hashMode) S.mode = hashMode;

    // lien de recherche partagé : ?k=mot|mot&v=Ville&r=1 (#job pour le mode job)
    var sharedLoaded = false;
    (function applyShared() {
      var qs;
      try { qs = new URLSearchParams(location.search); } catch (e) { return; }
      var k = qs.get('k');
      if (!k) return;
      var labels = k.split('|').map(function (x) { return x.trim().slice(0, 80); }).filter(Boolean).slice(0, 8);
      if (!labels.length) return;
      var m = cur();
      m.tags.forEach(function (t) { t.on = false; });
      labels.forEach(function (l) {
        var f = m.tags.filter(function (t) { return fold(t.label) === fold(l); })[0];
        if (f) f.on = true; else m.tags.push({ label: l, on: true, custom: true });
      });
      var v = qs.get('v');
      if (v !== null) {
        v = v.trim().slice(0, 60);
        S.chosen = true;
        S.city = (!v || fold(v) === 'france') ? null : canonicalCity(v);
      }
      S.recent = qs.get('r') === '1';
      m.generated = true;
      save();
      sharedLoaded = true;
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    })();

    /* ---------- ÉTAT DU SUIVI (stocké à part, jamais touché par « Réinitialiser ») ---------- */
    var TKEY = 'chasseur.suivi.v1';
    var STATUSES = [
      { id: 'todo', label: 'À postuler', one: 'à postuler', many: 'à postuler' },
      { id: 'sent', label: 'Envoyée', one: 'envoyée', many: 'envoyées' },
      { id: 'followup', label: 'Relancée', one: 'relancée', many: 'relancées' },
      { id: 'interview', label: 'Entretien', one: 'entretien', many: 'entretiens' },
      { id: 'offer', label: 'Proposition', one: 'proposition', many: 'propositions' },
      { id: 'refused', label: 'Refus', one: 'refus', many: 'refus' }
    ];
    var STATUS = {};
    STATUSES.forEach(function (s) { STATUS[s.id] = s; });
    var TFILTERS = { all: 'Toutes', due: 'À relancer', open: 'En cours', refused: 'Refus' };
    function str(v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; }
    function isoOk(v) { return (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : ''; }
    function safeUrl(u) {
      u = str(u, 500);
      if (!u) return '';
      if (/^https?:\/\/[^\s]+$/i.test(u)) return u;
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) return 'https://' + u;
      return '';   // tout le reste (javascript:, data:…) est ignoré
    }
    function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function cleanApp(x) {
      if (!x || typeof x !== 'object') return null;
      var company = str(x.company, 80);
      if (!company) return null;
      return {
        id: str(x.id, 40) || newId(), company: company, role: str(x.role, 80), city: str(x.city, 60),
        url: safeUrl(x.url), status: STATUS[x.status] ? x.status : 'todo',
        date: isoOk(x.date), updated: isoOk(x.updated) || today(), created: isoOk(x.created) || today(),
        note: str(x.note, 500), mode: x.mode === 'job' ? 'job' : 'alt'
      };
    }
    var T = { apps: [], filter: 'all' };
    var storageOk = true;
    try { localStorage.setItem('chasseur.test', '1'); localStorage.removeItem('chasseur.test'); } catch (e) { storageOk = false; }
    (function restoreT() {
      try {
        var raw = JSON.parse(localStorage.getItem(TKEY) || 'null');
        if (raw && Array.isArray(raw.apps)) T.apps = raw.apps.map(cleanApp).filter(Boolean);
        if (raw && TFILTERS[raw.filter]) T.filter = raw.filter;
      } catch (e) {}
    })();
    function saveT() { try { localStorage.setItem(TKEY, JSON.stringify(T)); } catch (e) {} }

    /* ---------- MESSAGES ÉPHÉMÈRES ---------- */
    var toastEl = $('toast'), toastTimer = null;
    function hideToast() { toastEl.classList.remove('is-on'); }
    function toast(msg, actionLabel, action) {
      toastEl.innerHTML = '';
      toastEl.appendChild(el('span', null, msg));
      if (actionLabel) {
        var b = btn(null, actionLabel);
        b.addEventListener('click', function () { action(); hideToast(); });
        toastEl.appendChild(b);
      }
      toastEl.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(hideToast, actionLabel ? 8000 : 4000);
    }

    /* ---------- COPIE ---------- */
    function copyText(txt) {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(txt);
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy'));
      });
    }
    function makeCopy(label, value) {
      var b = btn('btn-copy', label);
      b.addEventListener('click', function () {
        var txt = typeof value === 'function' ? value() : value;
        copyText(txt).then(function () {
          b.classList.add('is-done'); b.textContent = 'Copié';
          setTimeout(function () { b.classList.remove('is-done'); b.textContent = label; }, 1500);
        }).catch(function () {
          b.textContent = 'Copie impossible';
          setTimeout(function () { b.textContent = label; }, 1800);
        });
      });
      return b;
    }

    /* ---------- MESSAGES PRÊTS À COPIER ---------- */
    // « au poste d'assistant », « au poste de chef de projet »
    function posteDe(role) { return 'poste ' + (/^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(role) ? 'd\'' : 'de ') + role; }
    function msgCandidature(company, role, mode) {
      var objet = role ? 'ma candidature au ' + posteDe(role) : 'ma candidature spontanée';
      var intro = mode === 'alt'
        ? 'En Master 2, je recherche une alternance dans l\'événementiel et je me permets de vous adresser ' + objet + '.'
        : 'Je recherche un poste dans l\'événementiel et je me permets de vous adresser ' + objet + '.';
      return 'Bonjour,\n\n' + intro + ' ' + (company || 'Votre maison') + ' incarne l\'exigence et le sens du détail que je souhaite mettre au service de vos événements.\n\n'
        + 'Je reste à votre disposition pour vous présenter mon parcours lors d\'un échange. Vous trouverez mon CV en pièce jointe.\n\nBien cordialement,';
    }
    function msgRelance(a) {
      var when = a.date ? ' le ' + fmtLong(a.date) : '';
      var alt = a.mode === 'alt' ? ' en alternance' : '';
      var objet = a.role ? 'ma candidature' + alt + ' au ' + posteDe(a.role) + ', envoyée' + when
                         : 'la candidature spontanée' + alt + ' que je vous ai adressée' + when;
      var envie = a.role ? 'Ce poste m\'intéresse toujours vivement' : 'Rejoindre ' + a.company + ' me tient toujours à cœur';
      return 'Bonjour,\n\nJe me permets de revenir vers vous au sujet de ' + objet + '. ' + envie
        + ' et je reste disponible pour un échange à votre convenance.\n\nJe vous remercie par avance pour votre retour.\n\nBien cordialement,';
    }
    function msgMerci(a) {
      return 'Bonjour,\n\nJe vous remercie pour notre échange' + (a.role ? ' au sujet du ' + posteDe(a.role) : '')
        + '. Il a renforcé mon envie de rejoindre ' + a.company + ', et je reste à votre disposition pour toute information complémentaire.\n\nBien cordialement,';
    }

    /* ---------- HERO ---------- */
    var modeBtns = $$('.mode');
    function setHeroTitle(text, delay) {
      var old = $('h1b');
      if (!old || old.getAttribute('data-word') === text) return;
      var span = el('span', 'h-line', text);
      span.id = 'h1b';
      span.setAttribute('data-word', text);
      span.setAttribute('data-split', 'chars');
      span.setAttribute('data-split-step', '32');
      if (delay) span.setAttribute('data-delay', String(delay));
      old.parentNode.replaceChild(span, old);
      animate(span.parentNode);
    }

    /* ---------- MOTS-CLÉS ---------- */
    var tagsEl = $('tags'), warn = $('warn'), presetsEl = $('presets');
    function activeTags() { return cur().tags.filter(function (t) { return t.on; }); }
    function checkWarn() {
      var n = activeTags().length;
      if (n >= 4) {
        warn.textContent = n + ' mots-clés actifs. Les sites cherchent tous les mots à la fois : au-delà de trois, tu risques de n\'avoir aucun résultat.';
        warn.hidden = false;
      } else { warn.hidden = true; }
    }
    function syncPresets() {
      var on = activeTags().map(function (t) { return fold(t.label); }).sort().join('|');
      $$('.preset', presetsEl).forEach(function (b, i) {
        var p = MODES[S.mode].presets[i];
        b.setAttribute('aria-pressed', on === p.tags.map(fold).sort().join('|') ? 'true' : 'false');
      });
    }
    function renderPresets() {
      presetsEl.innerHTML = '';
      presetsEl.appendChild(el('span', 'presets-label', 'Raccourcis :'));
      MODES[S.mode].presets.forEach(function (p) {
        var b = btn('preset link-sweep', p.label);
        b.addEventListener('click', function () { applyPreset(p); });
        presetsEl.appendChild(b);
      });
      syncPresets();
    }
    function applyPreset(p) {
      var want = p.tags.map(fold);
      cur().tags.forEach(function (t) { t.on = want.indexOf(fold(t.label)) !== -1; });
      p.tags.forEach(function (lbl) {
        if (!cur().tags.some(function (t) { return fold(t.label) === fold(lbl); })) cur().tags.push({ label: lbl, on: true, custom: true });
      });
      renderTags(); changed(true);
    }
    function renderTags() {
      tagsEl.innerHTML = '';
      cur().tags.forEach(function (t, i) {
        var b = btn('chip', t.label);
        b.setAttribute('aria-pressed', t.on ? 'true' : 'false');
        var group = null;
        b.addEventListener('click', function () {
          t.on = !t.on;
          b.setAttribute('aria-pressed', t.on ? 'true' : 'false');
          if (group) group.classList.toggle('on', t.on);
          changed(true);
        });
        if (t.custom) {
          group = el('span', 'chip-x' + (t.on ? ' on' : ''));
          var k = btn('chip-x-kill');
          k.setAttribute('aria-label', 'Supprimer le mot-clé « ' + t.label + ' »');
          k.appendChild(svg(ICON_CROSS));
          k.addEventListener('click', function () {
            cur().tags.splice(i, 1);
            renderTags(); changed(true);
            $('newTag').focus();
          });
          group.appendChild(b); group.appendChild(k);
          tagsEl.appendChild(group);
        } else {
          tagsEl.appendChild(b);
        }
      });
    }
    $('addForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('newTag');
      // plusieurs mots-clés d'un coup, séparés par des virgules
      input.value.split(',').forEach(function (raw) {
        var v = raw.trim().slice(0, 80);
        if (!v) return;
        var found = cur().tags.filter(function (t) { return fold(t.label) === fold(v); })[0];
        if (found) found.on = true;
        else cur().tags.push({ label: v, on: true, custom: true });
      });
      input.value = '';
      renderTags(); changed(true);
    });

    /* ---------- VILLE ---------- */
    var ddBtn = $('ddBtn'), ddPanel = $('ddPanel'), ddList = $('ddList'), ddFilter = $('ddFilter'), ddLabel = $('ddLabel');
    function updateCityLabel() {
      ddLabel.textContent = S.chosen ? (S.city || 'Toute la France') : 'Choisir une ville';
      if (S.chosen) ddBtn.setAttribute('data-chosen', ''); else ddBtn.removeAttribute('data-chosen');
    }
    function setCity(c) {
      S.city = c; S.chosen = true;
      updateCityLabel(); closeDD(true); changed(true);
      renderTargets();
    }
    function cityOpt(label, selected, onPick, extraCls) {
      var o = btn('dd-opt' + (extraCls ? ' ' + extraCls : ''), label);
      o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', selected ? 'true' : 'false');
      o.addEventListener('click', onPick);
      ddList.appendChild(o);
      return o;
    }
    function renderCities(q) {
      var raw = (q || '').trim(), fq = fold(raw);
      ddList.innerHTML = '';
      cityOpt('Toute la France', S.chosen && S.city === null, function () { setCity(null); }, 'dd-all');
      // filtre sans accents : « eze » trouve « Èze », « evian » trouve « Évian-les-Bains »
      var hits = CITIES.filter(function (c) { return fold(c).indexOf(fq) !== -1; });
      if (fq) hits.sort(function (a, b) { return (fold(a).indexOf(fq) === 0 ? 0 : 1) - (fold(b).indexOf(fq) === 0 ? 0 : 1); });
      hits.forEach(function (c) { cityOpt(c, S.city === c, function () { setCity(c); }); });
      var exact = hits.some(function (c) { return fold(c) === fq; });
      if (raw && !exact) {
        var v = raw.slice(0, 60);
        cityOpt('Chercher à « ' + v + ' »', S.city === v, function () { setCity(v); }, 'dd-custom');
      }
    }
    function openDD() {
      ddPanel.classList.add('open'); ddBtn.setAttribute('aria-expanded', 'true');
      ddFilter.value = ''; renderCities('');
      if (finePointer) ddFilter.focus();   // sur téléphone : pas de clavier qui cache la liste
    }
    function closeDD(focusBtn) {
      if (!ddPanel.classList.contains('open')) return;
      ddPanel.classList.remove('open'); ddBtn.setAttribute('aria-expanded', 'false');
      if (focusBtn) ddBtn.focus({ preventScroll: true });
    }
    ddBtn.addEventListener('click', function (e) { e.stopPropagation(); ddPanel.classList.contains('open') ? closeDD(false) : openDD(); });
    ddPanel.addEventListener('click', function (e) { e.stopPropagation(); });
    ddFilter.addEventListener('input', function () { renderCities(ddFilter.value); });
    ddFilter.addEventListener('keydown', function (e) {
      var opts = ddList.querySelectorAll('.dd-opt');
      var hasQuery = !!ddFilter.value.trim();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (opts.length) opts[hasQuery && opts.length > 1 ? 1 : 0].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hasQuery && opts.length > 1) opts[1].click();   // premier résultat (ou la ville tapée)
      }
    });
    ddList.addEventListener('keydown', function (e) {
      var opts = $$('.dd-opt', ddList);
      var i = opts.indexOf(document.activeElement);
      if (i === -1) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[i]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (i === 0) ddFilter.focus(); else opts[i - 1].focus(); }
    });
    document.addEventListener('click', function () { closeDD(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDD(true); });

    /* ---------- PLATEFORMES ---------- */
    var grid = $('platforms');
    function renderPlatforms() {
      grid.innerHTML = '';
      platformsFor(S.mode).forEach(function (p) {
        var c = btn('pf');
        c.setAttribute('aria-pressed', cur().checked[p.id] ? 'true' : 'false');
        var box = el('span', 'pf-box'); box.appendChild(svg(ICON_CHECK));
        var body = el('span');
        body.appendChild(el('span', 'pf-name', p.name));
        var kind = el('span', 'pf-kind ' + p.kind, KIND_TEXT[p.kind]);
        if (S.recent && p.recent) kind.appendChild(el('span', 'fresh', ', 7 derniers jours'));
        body.appendChild(kind);
        body.appendChild(el('span', 'pf-desc', pick(p.desc, S.mode)));
        c.appendChild(box); c.appendChild(body);
        c.addEventListener('click', function () {
          cur().checked[p.id] = !cur().checked[p.id];
          c.setAttribute('aria-pressed', cur().checked[p.id] ? 'true' : 'false');
          changed(false);
        });
        grid.appendChild(c);
      });
    }
    function setAll(v) {
      platformsFor(S.mode).forEach(function (p) { cur().checked[p.id] = v; });
      renderPlatforms(); changed(false);
    }
    $('allOn').addEventListener('click', function () { setAll(true); });
    $('allOff').addEventListener('click', function () { setAll(false); });

    var recentBtn = $('recent');
    function updateRecent() { recentBtn.setAttribute('aria-checked', S.recent ? 'true' : 'false'); }
    recentBtn.addEventListener('click', function () {
      S.recent = !S.recent; updateRecent(); renderPlatforms(); changed(false);
    });

    /* ---------- LE BILLET RÉCAPITULATIF ---------- */
    var pass = $('pass'), passKw = $('passKw'), passCity = $('passCity'), passMeta = $('passMeta'), genBtn = $('generate'), err = $('err');
    var genLabel = el('span', 'gen-label');
    genBtn.textContent = ''; genBtn.appendChild(genLabel);
    function checkedCount() { return platformsFor(S.mode).filter(function (p) { return cur().checked[p.id]; }).length; }
    function updatePass(bump) {
      var kw = activeTags().map(function (t) { return t.label; });
      passKw.textContent = kw.length ? kw.join(', ') : 'Aucun mot-clé actif';
      passKw.classList.toggle('is-empty', !kw.length);
      passCity.textContent = S.chosen ? (S.city || 'Toute la France') : 'Aucune ville choisie';
      passCity.classList.toggle('is-empty', !S.chosen);
      var n = checkedCount();
      passMeta.textContent = plural(n, 'plateforme', 'plateformes') + (S.recent ? ', offres des 7 derniers jours' : '');
      genLabel.textContent = n ? 'Générer ' + plural(n, 'lien', 'liens') : 'Générer les liens';
      if (bump && !RM.matches) { pass.classList.remove('is-bump'); void pass.offsetWidth; pass.classList.add('is-bump'); }
    }

    /* ---------- GÉNÉRATION : un billet par plateforme ---------- */
    var section = $('liens'), results = $('results'), counterEl = null, staleEl = null, current = [];
    function fail(msg) { err.textContent = msg; err.hidden = false; }
    function clearResults() { results.innerHTML = ''; counterEl = null; staleEl = null; current = []; section.hidden = true; }

    // à chaque réglage modifié : on mémorise, on met le billet à jour et on signale que les liens affichés sont périmés
    function changed(bump) {
      checkWarn(); syncPresets(); save(); updatePass(bump);
      err.hidden = true;
      if (staleEl) staleEl.hidden = false;
    }

    function isSeen(href) { return S.seen[href] === today(); }
    function remember(href) { if (!isSeen(href)) { S.seen[href] = today(); save(); } }
    function updateCounter() {
      if (!counterEl) return;
      var n = current.filter(function (x) { return isSeen(x.href); }).length;
      counterEl.innerHTML = '';
      counterEl.appendChild(el('b', null, String(n)));
      counterEl.appendChild(document.createTextNode(' ouvert' + (n > 1 ? 's' : '') + ' sur ' + current.length + ' aujourd\'hui'));
    }
    function onOpen(node, fn) {
      // clic, molette, tap, ou ouverture clavier : tout marque comme ouvert
      node.addEventListener('click', fn);
      node.addEventListener('auxclick', function (e) { if (e.button === 1) fn(); });
      node.addEventListener('contextmenu', fn);
    }
    function hostOf(href) { try { return new URL(href).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
    function shareUrl(s) {
      var u = location.origin + location.pathname + '?k=' + enc(s.kw.join('|')) + '&v=' + enc(s.city || 'France') + (s.recent ? '&r=1' : '');
      return u + (s.mode === 'job' ? '#job' : '');
    }
    function setPunched(art, on) {
      art.classList.toggle('is-punched', on);
      art.querySelector('.stub-state').textContent = on ? 'Ouvert' : 'À ouvrir';
      art.querySelector('.seen-sr').textContent = on ? ', déjà ouvert aujourd\'hui' : '';
    }
    function buildTicket(p, href, s) {
      var art = el('article', 'ticket');
      var main = el('div', 'ticket-main');
      var a = el('a', 'ticket-link');
      a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.appendChild(el('span', 'ticket-name', p.name));
      a.appendChild(el('span', 'ticket-kind', KIND_TEXT[p.kind]));
      var note = pick(p.note, S.mode);
      if (s.recent && p.recent) note = (note ? note + ' ' : '') + 'Offres des 7 derniers jours.';
      if (note) a.appendChild(el('span', 'ticket-note', note));
      a.appendChild(el('span', 'ticket-host', hostOf(href)));
      a.appendChild(el('span', 'sr-only', ', s\'ouvre dans un nouvel onglet'));
      a.appendChild(el('span', 'sr-only seen-sr', ''));
      main.appendChild(a);
      if (p.kind !== 'pre') {
        var cb = el('div', 'ticket-copy');
        cb.appendChild(makeCopy('Copier les mots-clés', s.q));
        if (s.city) cb.appendChild(makeCopy('Copier la ville', s.city));
        main.appendChild(cb);
      }
      // talon : grande zone cliquable pour la souris, ignorée par le clavier et les lecteurs d'écran
      var stub = el('a', 'ticket-stub');
      stub.href = href; stub.target = '_blank'; stub.rel = 'noopener noreferrer';
      stub.tabIndex = -1; stub.setAttribute('aria-hidden', 'true');
      stub.appendChild(el('span', 'punch'));
      stub.appendChild(el('span', 'stub-state', 'À ouvrir'));
      art.appendChild(main); art.appendChild(stub);
      setPunched(art, isSeen(href));
      var mark = function () { remember(href); setPunched(art, true); updateCounter(); };
      onOpen(a, mark); onOpen(stub, mark);
      return art;
    }

    function generate(silent) {
      err.hidden = true;
      var kw = activeTags().map(function (t) { return t.label; });
      var picked = platformsFor(S.mode).filter(function (p) { return cur().checked[p.id]; });
      var msg = !kw.length ? 'Active au moins un mot-clé pour définir la recherche.'
              : !S.chosen ? 'Choisis une ville, ou « Toute la France ».'
              : !picked.length ? 'Coche au moins une plateforme.' : '';
      if (msg) {
        if (silent) { clearResults(); return; }
        return fail(msg);
      }

      var s = { kw: kw, q: kw.join(' '), city: S.city, recent: S.recent, mode: S.mode };
      cur().generated = true; save();
      clearResults();
      section.hidden = false;
      current = picked.map(function (p) { return { p: p, href: p.url(s) }; });

      var head = el('div', 'res-head');
      var left = el('div');
      var h2 = el('h2', null, 'Tes liens'); h2.id = 'liensTitle';
      left.appendChild(h2);
      var recap = el('p', 'res-recap');
      recap.appendChild(document.createTextNode(plural(current.length, 'recherche', 'recherches') + ' avec '));
      recap.appendChild(el('strong', null, s.q));
      recap.appendChild(document.createTextNode(', ' + (s.city ? 'à ' : 'dans ')));
      recap.appendChild(el('strong', null, s.city || 'toute la France'));
      recap.appendChild(document.createTextNode(s.recent ? ', sur les 7 derniers jours.' : '.'));
      left.appendChild(recap);
      head.appendChild(left);

      var tools = el('div', 'res-tools');
      counterEl = el('span', 'counter');
      tools.appendChild(counterEl);
      tools.appendChild(makeCopy('Copier tous les liens', function () {
        return current.map(function (x) { return x.p.name + ' : ' + x.href; }).join('\n');
      }));
      tools.appendChild(makeCopy('Partager cette recherche', function () { return shareUrl(s); }));
      var unsee = btn('btn-text link-sweep', 'Tout repasser en « à ouvrir »');
      unsee.addEventListener('click', function () {
        current.forEach(function (x) { delete S.seen[x.href]; });
        save();
        $$('.ticket', results).forEach(function (t) { setPunched(t, false); });
        updateCounter();
      });
      tools.appendChild(unsee);
      head.appendChild(tools);
      results.appendChild(head);

      staleEl = el('div', 'stale');
      staleEl.appendChild(el('span', null, 'Tu as changé tes réglages depuis la dernière génération.'));
      var upd = btn('btn-text link-sweep', 'Mettre les liens à jour');
      upd.addEventListener('click', function () { generate(false); });
      staleEl.appendChild(upd);
      staleEl.hidden = true;
      results.appendChild(staleEl);

      var list = el('div', 'tickets');
      list.setAttribute('data-stagger', '70');
      current.forEach(function (x) { list.appendChild(buildTicket(x.p, x.href, s)); });
      results.appendChild(list);
      animate(results);
      updateCounter();
      if (!silent) section.scrollIntoView({ block: 'start' });
    }
    genBtn.addEventListener('click', function () { generate(false); });

    $$('.reset-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        S.m[S.mode] = freshMode(S.mode);
        S.city = null; S.chosen = false; S.recent = false; S.seen = {};
        save();
        err.hidden = true; clearResults();
        updateCityLabel(); updateRecent(); renderCities('');
        renderPresets(); renderTags(); renderPlatforms(); checkWarn(); updatePass(true); renderTargets();
        toast('Recherche réinitialisée. Ton suivi de candidatures n\'a pas bougé.');
      });
    });

    /* ---------- EMPLOYEURS À VISER ---------- */
    var targetsEl = $('targets'), tFiltersEl = $('tFilters'), tMore = $('tMore'), targetsOpen = false;
    function isTracked(name) { return T.apps.some(function (a) { return fold(a.company) === fold(name); }); }
    function proximity(t) {
      if (!S.chosen || !S.city) return { rank: 2 };   // pas de ville : ordre éditorial
      var fc = fold(S.city);
      if (t.where.some(function (w) { return fold(w) === fc; })) return { rank: 0, badge: 'À ' + S.city };
      var area = AREA_OF[fc];
      if (area && t.where.some(function (w) { return AREA_OF[fold(w)] === area; })) return { rank: 1, badge: area };
      if (t.national) return { rank: 1, badge: 'Partout en France' };
      return { rank: 3 };
    }
    function renderTargetFilters() {
      tFiltersEl.innerHTML = '';
      [['all', 'Tous']].concat(Object.keys(TYPES).map(function (k) { return [k, TYPES[k]]; })).forEach(function (f) {
        var n = f[0] === 'all' ? TARGETS.length : TARGETS.filter(function (t) { return t.type === f[0]; }).length;
        var b = btn('chip', f[1]);
        b.appendChild(el('span', 'n', String(n)));
        b.setAttribute('aria-pressed', S.tfilter === f[0] ? 'true' : 'false');
        b.addEventListener('click', function () { S.tfilter = f[0]; save(); renderTargetFilters(); renderTargets(); });
        tFiltersEl.appendChild(b);
      });
    }
    function cityForTarget(t) {
      if (S.city && t.where.some(function (w) { return fold(w) === fold(S.city); })) return S.city;
      return t.where.length === 1 ? t.where[0] : '';
    }
    function renderTargets() {
      targetsEl.innerHTML = '';
      var list = TARGETS.map(function (t, i) { return { t: t, i: i, p: proximity(t) }; })
        .filter(function (x) { return S.tfilter === 'all' || x.t.type === S.tfilter; })
        .sort(function (a, b) { return (a.p.rank - b.p.rank) || (a.i - b.i); });
      // liste repliée : les plus proches d'abord, le reste sur demande
      var limit = window.innerWidth < 600 ? 4 : 9;
      var hiddenCount = targetsOpen ? 0 : Math.max(0, list.length - limit);
      if (hiddenCount) list = list.slice(0, limit);
      tMore.hidden = !hiddenCount;
      tMore.textContent = 'Voir les ' + hiddenCount + ' autres';
      list.forEach(function (x) {
        var t = x.t;
        var art = el('article', 'house' + (isSeen(t.url) ? ' is-seen' : ''));
        var top = el('div', 'house-top');
        top.appendChild(el('h3', null, t.name));
        if (x.p.badge) top.appendChild(el('span', 'near', x.p.badge));
        art.appendChild(top);
        art.appendChild(el('p', 'house-desc', t.desc));
        art.appendChild(el('p', 'house-meta', (t.where.length ? t.where.join(', ') + '. ' : '') + SRC[t.src]));

        var act = el('div', 'house-actions');
        var a = el('a', 'house-open', 'Voir les offres');
        a.href = t.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.appendChild(el('span', 'sr-only', ' de ' + t.name + ', nouvel onglet'));
        onOpen(a, function () { remember(t.url); art.classList.add('is-seen'); });
        art.appendChild(a);
        var tracked = isTracked(t.name);
        var follow = btn('btn-copy' + (tracked ? ' is-done' : ''), tracked ? 'Dans ton suivi' : 'Suivre');
        follow.addEventListener('click', function () {
          if (!isTracked(t.name)) {
            T.apps.push(cleanApp({ company: t.name, city: cityForTarget(t), url: t.url, status: 'todo', mode: S.mode }));
            saveT(); renderTracker();
            toast('« ' + t.name + ' » ajouté à ton suivi, en « à postuler ».');
          }
          follow.className = 'btn-copy is-done'; follow.textContent = 'Dans ton suivi';
        });
        act.appendChild(follow);
        act.appendChild(makeCopy('Copier une candidature', function () { return msgCandidature(t.name, '', S.mode); }));
        art.appendChild(act);
        targetsEl.appendChild(art);
      });
    }
    tMore.addEventListener('click', function () {
      var first = targetsEl.children.length;
      targetsOpen = true; renderTargets();
      var next = targetsEl.children[first];
      if (next) { var l = next.querySelector('a'); if (l) l.focus({ preventScroll: true }); }
    });

    /* ---------- SUIVI DES CANDIDATURES ---------- */
    var listEl = $('trkList'), dialog = $('appDialog'), form = $('trkForm'), addBtn = $('trkAdd');
    var fCompany = $('fCompany'), fRole = $('fRole'), fCity = $('fCity'), fStatus = $('fStatus'),
        fDate = $('fDate'), fUrl = $('fUrl'), fNote = $('fNote'), fErr = $('fErr');
    STATUSES.forEach(function (s) { var o = el('option', null, s.label); o.value = s.id; fStatus.appendChild(o); });
    var editing = null, lastDeleted = null, pipeAnimated = false;

    function dueInfo(a) {
      if (a.status === 'sent' && daysSince(a.date || a.updated) >= 7) return 'À relancer';
      if (a.status === 'followup' && daysSince(a.updated) >= 10) return 'Toujours sans réponse';
      return '';
    }
    function isOpen(a) { return a.status !== 'refused'; }
    function counts() {
      var c = { all: T.apps.length, due: 0, open: 0, refused: 0, by: {} };
      STATUSES.forEach(function (s) { c.by[s.id] = 0; });
      T.apps.forEach(function (a) {
        if (dueInfo(a)) c.due++;
        if (isOpen(a)) c.open++; else c.refused++;
        c.by[a.status]++;
      });
      return c;
    }
    function dot(s) { return /\.$/.test(s) ? s : s + '.'; }   // « 6 oct. » ne prend pas de second point
    function metaText(a) {
      if (a.status === 'todo') return dot('Ajoutée le ' + fmtShort(a.created));
      var sent = a.date ? 'Envoyée le ' + fmtShort(a.date) + ', ' + ago(a.date) : 'Envoyée';
      if (a.status === 'sent') return dot(sent);
      if (a.status === 'followup') return dot(sent + ', relancée le ' + fmtShort(a.updated));
      return dot(sent + ', statut mis à jour le ' + fmtShort(a.updated));
    }
    function messageFor(a) {
      if (a.status === 'todo') return { label: 'Copier la candidature', text: function () { return msgCandidature(a.company, a.role, a.mode); } };
      if (a.status === 'sent' || a.status === 'followup') return { label: 'Copier la relance', text: function () { return msgRelance(a); } };
      if (a.status === 'interview') return { label: 'Copier le remerciement', text: function () { return msgMerci(a); } };
      return null;
    }
    function setStatus(a, ns) {
      if (ns === a.status) return;
      if (ns !== 'todo' && !a.date) a.date = today();
      a.status = ns; a.updated = today();
      saveT(); renderTracker();
    }
    function removeApp(a) {
      var i = T.apps.indexOf(a);
      if (i < 0) return;
      T.apps.splice(i, 1);
      lastDeleted = { a: a, i: i };
      saveT(); renderTracker(); renderTargets();
      toast('« ' + a.company + ' » supprimée.', 'Annuler', function () {
        if (!lastDeleted) return;
        T.apps.splice(Math.min(lastDeleted.i, T.apps.length), 0, lastDeleted.a);
        lastDeleted = null;
        saveT(); renderTracker(); renderTargets();
      });
    }
    function renderPipeline(c) {
      var pipe = $('pipeline');
      pipe.innerHTML = '';
      if (!c.all) { pipe.hidden = true; return; }
      pipe.hidden = false;
      var bar = el('div', 'pipe-bar');
      bar.setAttribute('aria-hidden', 'true');
      var legend = el('ul', 'pipe-legend');
      STATUSES.forEach(function (s) {
        var n = c.by[s.id];
        if (!n) return;
        var seg = el('span');
        seg.style.setProperty('--c', 'var(--st-' + s.id + ')');
        seg.style.flexGrow = n;
        bar.appendChild(seg);
        var li = el('li');
        li.style.setProperty('--c', 'var(--st-' + s.id + ')');
        var b = el('b', null, String(n));
        if (!pipeAnimated) { b.setAttribute('data-count', String(n)); b.setAttribute('data-duration', '900'); }
        li.appendChild(b);
        li.appendChild(document.createTextNode(' ' + (n > 1 ? s.many : s.one)));
        legend.appendChild(li);
      });
      pipe.appendChild(bar); pipe.appendChild(legend);
      if (!pipeAnimated) { bar.setAttribute('data-reveal', 'clip-x'); animate(pipe); pipeAnimated = true; }
    }
    function renderTrackerFilters(c) {
      var fEl = $('trkFilters');
      fEl.innerHTML = '';
      Object.keys(TFILTERS).forEach(function (k) {
        var b = btn('chip', TFILTERS[k]);
        b.appendChild(el('span', 'n', String(c[k])));
        b.setAttribute('aria-pressed', T.filter === k ? 'true' : 'false');
        b.addEventListener('click', function () { T.filter = k; saveT(); renderTracker(); });
        fEl.appendChild(b);
      });
      fEl.hidden = !T.apps.length;
    }
    function renderTracker() {
      var c = counts();
      renderPipeline(c);
      renderTrackerFilters(c);
      $$('[data-due]').forEach(function (d) {
        d.textContent = c.due; d.hidden = !c.due;
        d.setAttribute('aria-label', c.due + ' à relancer');
      });

      listEl.innerHTML = '';
      if (!T.apps.length) {
        listEl.appendChild(el('p', 'empty', 'Aucune candidature pour l\'instant. Ajoute la première, ou clique sur « Suivre » chez un employeur plus haut.'));
        return;
      }
      var rows = T.apps.filter(function (a) {
        return T.filter === 'all' || (T.filter === 'due' && dueInfo(a)) || (T.filter === 'open' && isOpen(a)) || (T.filter === 'refused' && !isOpen(a));
      }).sort(function (a, b) {
        var ra = dueInfo(a) ? 0 : isOpen(a) ? 1 : 2, rb = dueInfo(b) ? 0 : isOpen(b) ? 1 : 2;
        return (ra - rb) || (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0);
      });
      if (!rows.length) {
        listEl.appendChild(el('p', 'empty', 'Rien dans ce filtre pour l\'instant.'));
        return;
      }
      rows.forEach(function (a) {
        var due = dueInfo(a);
        var card = el('article', 'app' + (due ? ' is-due' : '') + (isOpen(a) ? '' : ' is-closed'));
        card.style.setProperty('--c', due ? 'var(--rope)' : 'var(--st-' + a.status + ')');
        var head = el('div', 'app-head');
        var title = el('div', 'app-title');
        title.appendChild(el('h3', 'app-name', a.company));
        if (a.role) title.appendChild(el('span', 'app-role', a.role));
        var where = (a.mode === 'job' ? 'Job' : 'Alternance') + (a.city ? ', ' + a.city : '') + '. ';
        title.appendChild(el('p', 'app-meta', where + metaText(a)));
        if (due) title.appendChild(el('span', 'due-flag', due));
        head.appendChild(title);

        var sel = el('select', 'field status-select');
        sel.setAttribute('aria-label', 'Statut de la candidature chez ' + a.company);
        STATUSES.forEach(function (s) { var o = el('option', null, s.label); o.value = s.id; sel.appendChild(o); });
        sel.value = a.status;
        sel.addEventListener('change', function () { setStatus(a, sel.value); });
        head.appendChild(sel);
        card.appendChild(head);

        if (a.note) card.appendChild(el('p', 'app-note', a.note));

        var act = el('div', 'app-actions');
        var m = messageFor(a);
        if (m) act.appendChild(makeCopy(m.label, m.text));
        if (a.url) {
          var lk = el('a', 'app-link', 'Ouvrir le lien');
          lk.href = a.url; lk.target = '_blank'; lk.rel = 'noopener noreferrer';
          lk.appendChild(el('span', 'sr-only', ' de ' + a.company + ', nouvel onglet'));
          act.appendChild(lk);
        }
        var ed = btn('btn-text link-sweep', 'Modifier');
        ed.setAttribute('aria-label', 'Modifier la candidature chez ' + a.company);
        ed.addEventListener('click', function () { openForm(a); });
        act.appendChild(ed);
        var del = btn('btn-text link-sweep danger', 'Supprimer');
        del.setAttribute('aria-label', 'Supprimer la candidature chez ' + a.company);
        del.addEventListener('click', function () { removeApp(a); });
        act.appendChild(del);
        card.appendChild(act);
        listEl.appendChild(card);
      });
    }

    /* fenêtre de saisie */
    function openForm(a) {
      editing = a || null;
      fErr.hidden = true;
      $('dlgTitle').textContent = a ? 'Modifier la candidature' : 'Nouvelle candidature';
      fCompany.value = a ? a.company : '';
      fRole.value = a ? a.role : '';
      fCity.value = a ? a.city : (S.city || '');
      fStatus.value = a ? a.status : 'sent';
      fDate.value = a ? a.date : today();
      fUrl.value = a ? a.url : '';
      fNote.value = a ? a.note : '';
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      fCompany.focus();
    }
    function closeForm() {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
    dialog.addEventListener('close', function () { editing = null; addBtn.focus({ preventScroll: true }); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeForm(); });   // clic sur le fond
    addBtn.addEventListener('click', function () { openForm(null); });
    $('trkCancel').addEventListener('click', closeForm);
    $('trkCancelX').addEventListener('click', closeForm);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!fCompany.value.trim()) {
        fErr.textContent = 'Indique au moins le nom de l\'entreprise.'; fErr.hidden = false; fCompany.focus(); return;
      }
      if (fUrl.value.trim() && !safeUrl(fUrl.value)) {
        fErr.textContent = 'Le lien doit être une adresse web, par exemple https://…'; fErr.hidden = false; fUrl.focus(); return;
      }
      var data = cleanApp({
        id: editing ? editing.id : newId(), company: fCompany.value, role: fRole.value, city: fCity.value,
        url: fUrl.value, status: fStatus.value, date: fDate.value, note: fNote.value,
        created: editing ? editing.created : today(),
        updated: (editing && editing.status === fStatus.value) ? editing.updated : today(),
        mode: editing ? editing.mode : S.mode
      });
      if (data.status !== 'todo' && !data.date) data.date = today();
      var wasEditing = !!editing;
      if (editing) {
        var i = T.apps.indexOf(editing);
        if (i >= 0) T.apps[i] = data; else T.apps.push(data);
      } else {
        T.apps.push(data);
      }
      saveT(); closeForm(); renderTracker(); renderTargets();
      toast(wasEditing ? 'Candidature mise à jour.' : '« ' + data.company + ' » ajoutée à ton suivi.');
    });

    /* export, sauvegarde, restauration */
    function download(name, blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }
    function csvCell(v) {
      v = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(v)) v = '\'' + v;          // pas de formule exécutée par Excel
      if (/[";\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }
    $('trkCsv').addEventListener('click', function () {
      if (!T.apps.length) { toast('Rien à exporter pour l\'instant.'); return; }
      var head = ['Entreprise', 'Poste', 'Ville', 'Statut', 'Type', 'Date d\'envoi', 'Mise à jour', 'Lien', 'Note'];
      var rows = T.apps.map(function (a) {
        return [a.company, a.role, a.city, STATUS[a.status].label, a.mode === 'job' ? 'Job' : 'Alternance',
                a.date, a.updated, a.url, a.note].map(csvCell).join(';');
      });
      download('candidatures-' + today() + '.csv',
        new Blob(['﻿' + [head.join(';')].concat(rows).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    });
    $('trkSave').addEventListener('click', function () {
      if (!T.apps.length) { toast('Rien à sauvegarder pour l\'instant.'); return; }
      var data = { app: 'chasseur-alternance', version: 1, exported: new Date().toISOString(), apps: T.apps };
      download('chasseur-suivi-' + today() + '.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    });
    $('trkLoad').addEventListener('click', function () { $('trkFile').click(); });
    $('trkFile').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > 2000000) { toast('Fichier trop lourd pour une sauvegarde du suivi.'); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var raw;
        try { raw = JSON.parse(reader.result); } catch (e) { toast('Ce fichier n\'est pas une sauvegarde lisible.'); return; }
        var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.apps) ? raw.apps : null);
        if (!list) { toast('Ce fichier n\'est pas une sauvegarde du suivi.'); return; }
        var added = 0, updated = 0;
        list.map(cleanApp).filter(Boolean).forEach(function (x) {
          var ex = T.apps.filter(function (a) { return a.id === x.id; })[0];
          if (!ex) { T.apps.push(x); added++; }
          else if (x.updated > ex.updated) { T.apps[T.apps.indexOf(ex)] = x; updated++; }
        });
        saveT(); renderTracker(); renderTargets();
        toast(plural(added, 'candidature ajoutée', 'candidatures ajoutées') + (updated ? ', ' + plural(updated, 'mise à jour', 'mises à jour') : '') + '.');
      };
      reader.readAsText(file);
    });
    if (!storageOk) {
      $('trkStore').textContent = 'Ce navigateur ne garde rien (navigation privée ?) : sauvegarde ton suivi dans un fichier avant de fermer la page.';
    }

    /* ---------- EN-TÊTE, ANCRES, THÈME ---------- */
    var header = document.querySelector('.site-header'), lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (document.documentElement.style.overflow !== 'hidden') header.classList.toggle('is-hidden', y > lastY && y > 120);
      lastY = y;
    }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });

    $$('a[data-scroll]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();   // garde l'URL propre (#job reste #job)
        requestAnimationFrame(function () {
          target.scrollIntoView({ block: 'start' });
          if (target.id !== 'top') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
        });
      });
    });

    var THEMES = ['auto', 'light', 'dark'], THEME_LABEL = { auto: 'auto', light: 'clair', dark: 'sombre' };
    var themeBtns = $$('.theme-btn');
    function currentTheme() { var t = document.documentElement.getAttribute('data-theme'); return t === 'light' || t === 'dark' ? t : 'auto'; }
    function applyTheme(t) {
      if (t === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
      themeBtns.forEach(function (b) { b.textContent = 'Thème : ' + THEME_LABEL[t]; });
      try { if (t === 'auto') localStorage.removeItem('chasseur.theme'); else localStorage.setItem('chasseur.theme', t); } catch (e) {}
    }
    themeBtns.forEach(function (b) {
      b.addEventListener('click', function () { applyTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]); });
    });
    applyTheme(currentTheme());

    // retour sur l'onglet (ou le lendemain) : on remet les états « ouvert » à jour
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      $$('.ticket', results).forEach(function (t) {
        var a = t.querySelector('.ticket-link');
        if (a) setPunched(t, isSeen(a.getAttribute('href')));
      });
      updateCounter();
      renderTargets();
      renderTracker();
    });

    /* ---------- BASCULE ALTERNANCE / JOB ---------- */
    function applyMode(initial) {
      var M = MODES[S.mode];
      setHeroTitle(M.title, initial ? 200 : 0);
      $('lede').textContent = M.lede;
      document.title = M.doc;
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === S.mode ? 'true' : 'false'); });
      err.hidden = true;
      renderPresets(); renderTags(); renderPlatforms(); checkWarn(); updatePass(!initial);
      clearResults();
      if (cur().generated) generate(true);
    }
    function setMode(m) {
      if (m === S.mode || !MODES[m]) return;
      S.mode = m; save();
      try { history.replaceState(null, '', m === 'job' ? '#job' : location.pathname + location.search); } catch (e) {}
      applyMode(false);
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
    window.addEventListener('hashchange', function () { var m = modeFromHash(); if (m) setMode(m); });

    /* ---------- DÉMARRAGE ---------- */
    $('h1b').setAttribute('data-word', 'd\'alternance');
    updateCityLabel(); updateRecent(); renderCities('');
    renderTargetFilters(); renderTargets(); renderTracker();
    applyMode(true);
    if (sharedLoaded && current.length) section.scrollIntoView({ block: 'start' });

  } catch (e) {
    var box = document.createElement('p');
    box.style.cssText = 'margin:20px;padding:14px;border:2px solid #B3223A;border-radius:10px;font-weight:600';
    box.textContent = 'L\'outil n\'a pas pu démarrer : ' + e.message;
    document.body.insertBefore(box, document.body.firstChild);
  }
})();

fetch('https://fancy-waterfall-6c38.adamfast-as.workers.dev/ping', { method: 'POST' }).catch(function () {});
