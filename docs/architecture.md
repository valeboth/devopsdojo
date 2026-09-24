# devopsdojo — Arhitectură v2.0

> **Document istoric.** Aceasta este arhitectura v2.0 a userului, blocată
> 2026-09-23, păstrată ca atare pentru context. **Nu e sursa adevărului.**
>
> Pentru deciziile în vigoare vezi [`PROMPT-v2.1.md`](PROMPT-v2.1.md) (§2, deciziile
> D1-D20) și ADR-urile din [`adr/`](adr/). Unde cele două documente diferă,
> PROMPT-v2.1 câștigă.
>
> **Delta cunoscut față de acest document:**
>
> | Aici (v2.0) | În vigoare (v2.1) | De ce |
> |---|---|---|
> | §9: Hono pentru API (tabelul de stack, linia „API framework") | Doar SvelteKit, `src/routes/api/**/+server.ts` | [ADR 001](adr/001-sveltekit-only-no-hono.md) |
> | Cloudflare Pages, cu preview `pr-<n>.devopsdojo.pages.dev` per PR | Un singur Worker (`adapter-cloudflare`) care servește SSR + asset-uri; fără preview per PR | D2 |
> | `users.password_hash` + `oauth_provider` pe același rând | OAuth-only prin Better Auth (`user`/`account`/`session`), fără parolă | [ADR 002](adr/002-oauth-only-no-password.md) |
> | KV pentru sesiuni și cache | Sesiuni în D1; fără KV, fără R2 în v1 | D5 — KV free: 1.000 scrieri/zi, eventual consistency |
> | §12: SuperMemo 2 cu `ease_factor` / `interval_days`, quality 0-5 | FSRS (`ts-fsrs`) cu stability/difficulty + `review_log` append-only, 3 grade | [ADR 003](adr/003-fsrs-over-sm2.md) |
> | `cards.level` stocat + `idx_cards_level`; §11.5 filtrează pe el | Doar `cards.difficulty` 1-5; `level` e derivat în cod, niciodată stocat | D7 — două axe pentru același lucru confundă autorul |
> | Tabel `sessions` pentru sesiunile de studiu | `study_sessions` | D16 — Better Auth deține numele `session` |
> | ADR-uri în `docs/decisions/` | `docs/adr/` | Convenție |
> | Sandbox doar din faza 8, direct pe k3s în homelab | Sandbox simulat din v1 (snapshot-uri JSON) în spatele `SandboxProvider`; `K3sProvider` e stub pentru faza 8 | [ADR 005](adr/005-simulated-sandbox-v1.md) |
> | RO în coloana principală + coloane `*_en` opționale (`prompt`/`prompt_en`) | Tabele `*_i18n` pe `(id, lang)`, **EN canonic**, RO opțional cu fallback | [ADR 004](adr/004-i18n-tables-en-canonical.md) |
> | Întrebări de interviu de pe Glassdoor | Fără Glassdoor și fără scraping de curs plătit; doar Reddit prin API oficial, docs publice, syllabi | D11 — ToS |
> | Sentry din start | Fără Sentry până la faza 7; Workers Logs + `console.error` structurat | D20 |

---

## Document original (v2.0)

---

## TL;DR

Aplicație web publică, **mobile-first, fără limitări**, optimizată să te ducă
**de la 0 la senior DevOps** prin învățare reală, repetiție spațiată și
interleaving între subiecte. Trei moduri clare pe dashboard:

- **Test nivel** — placement diagnostic care îți setează nivelul per topic
- **Interviuri** — mod cronometrat cu prompturi reale de pe Reddit/Glassdoor
- **Cursuri** — buclă Duolingo: concept explicat + exerciții practice

Curriculum cu **10 module ordonate**: DevOps Fundamentals → Linux → Git →
App Packages → Docker → K8s (cu YAML + Helm) → Jenkins → Ansible →
Terraform + AWS → expert tier. Fiecare subiect acoperă **nivel de
certificare reală** (CKAD, LPI 1+2, DCA, Jenkins Engineer, Terraform Associate,
AWS DevOps Pro, etc.).

**Gamification: zero fricțiune.** Doar streak counter. Fără inimi, fără XP
vizibil, fără ligi, fără gating. 5 ore? Fă 5 ore.

**Open-source pe GitHub** cu auto-deploy pe Cloudflare Pages la merge pe `main`.

**Cost lunar: $0** — toate componentele pe free tier (Cloudflare Pages, Workers,
D1, R2, KV, Tunnel, Zero Trust; Better Auth self-hosted; Sentry free tier).

---

## 1. Viziune

**Ce construim:** platformă de învățare DevOps care te ia de la nivel
junior (intern, „știu puține comenzi") la nivel senior (poți să faci design
de systems, debug la scară, conduci on-call, predai altora).

**Diferențiatori față de Duolingo / alte platforme existente:**

| Aspect | Duolingo | Coursera / Udemy | **devopsdojo** |
|--------|----------|------------------|---------------|
| Limită zilnică | Da (energy/hearts) | Nu | **Nu — niciodată** |
| Mobile UX | Excelent | Slab | **Excelent (mobile-first)** |
| Conținut | Lingvistică, surface-level | Cursuri lungi, video | **Micro-lessons, dense** |
| Repetare | SRS simplu | Niciuna | **SRS + interleaving** |
| Pregătire interviu | Implicit | Parțial | **Mod dedicat cronometrat** |
| Adâncime tehnică | N/A | Variabilă | **Ancorată la certificări reale** |
| Open source | Nu | Nu | **Da, GitHub public** |
| Cost | Freemium | $50-300/curs | **$0** |

**Obiective:**
1. Învățare reală — comenzi reale, log-uri reale, scenarii de debug reale.
2. Curriculum complet — 10 module + expert tier, acoperire certificată.
3. Pregătire de interviu — mod cronometrat cu surse reale.
4. Zero fricțiune — fără gating, fără daily cap, fără energy system.

---

## 2. Nume și domeniu

- **Nume aplicație:** `devopsdojo`
- **Subdomain:** `<nume>.valegboth.win` — de confirmat (ex: `devopsdojo.valegboth.win`)
- **Repo GitHub:** `github.com/<user>/devopsdojo`
- **Production URL:** custom domain pe Cloudflare Pages
- **Preview URL per PR:** `pr-<n>.devopsdojo.pages.dev`

---

## 3. Personas

**Persona primară — „Internul":**
- DevOps intern, 0-2 ani.
- Învață pe telefon în pauze.
- Vrea conținut serios, nu jocuri.
- Vrea să fie pregătit pentru interviuri reale.

**Persona secundară — „Mid-ul în tranziție":**
- 1-3 ani experiență, simte că stagnă.
- Vrea să treacă la senior, dar nu are timp de cursuri lungi.
- Folosește telefonul între sarcini.

**Persona terțiară — „Seniorul pe val":**
- 3-6 ani, vrea să rămână sharp.
- Folosește modulul interviuri pentru pregătire.
- Folosește expert tier pentru arii adiacente.

Nu optimizăm pentru „casual learner" — Duolingo are deja acea nișă.

---

## 4. Cele trei moduri (entry points pe dashboard)

Dashboard-ul principal are trei butoane mari, fiecare ducând la un mod distinct:

### 4.1 Test nivel (placement diagnostic)
- 40-50 întrebări, ~5-10 min.
- Mixate: difficulty 1-5, acoperire echilibrată pe toate modulele.
- **Output:** scor per modul (junior / mid / senior / expert).
- **Override:** user poate ajusta rezultatul cu confirm dialog.
- **Declanșare:** la primul login, sau oricând din profil („retest nivel").
- **Scop:** setează `user_topic_levels` care ghidează selecția de carduri.

### 4.2 Interviuri
- Mod cronometrat, separat de bucla principală de învățare.
- Întrebări de pe Reddit, Glassdoor, leetcode-style DevOps.
- Durată: 10 / 20 / 30 min.
- La final: scor pe topic, recomandări de studiu.
- Nu afectează SRS (e separat).
- Sursă: `cards` cu tag `interview`.

### 4.3 Cursuri (bucla principală)
- Format Duolingo: **concept explicat + exerciții**.
- Fiecare topic dintr-un modul are:
  1. **Explicație** (markdown scurt, 1-2 paragrafe, opțional diagramă)
  2. **3-7 exerciții** (mix de tipuri: choice, fill, match, order, log-tap)
  3. **Recap** la final (1-2 swipe cards)
- După ce termini un topic, deblochezi următorul.
- Poți oricând să intri în **review SRS** (orice card din orice modul).

---

## 5. Curriculum — cele 10 module

### 5.1 Harta completă

| # | Modul | Cards estimate | Certificare țintă | Nivel |
|---|-------|----------------|-------------------|-------|
| 0 | **DevOps Fundamentals** | 100-150 | (intro, fără cert) | obligatoriu la start |
| 1 | **Linux** | 400-600 | LPI Linux Essentials + LPIC-1 + LPIC-2 | obligatoriu |
| 2 | **Git** | 250-400 | GitHub Actions cert + GitLab cert | obligatoriu |
| 3 | **Application Packages** | 150-250 | (ecosystem knowledge) | obligatoriu |
| 4 | **Docker** | 350-500 | DCA (Docker Certified Associate) | obligatoriu |
| 5 | **Kubernetes** + YAML + Helm | 600-900 | CKAD + CKA | obligatoriu |
| 6 | **Jenkins** | 250-400 | Jenkins Engineer cert | obligatoriu |
| 7 | **Ansible** | 250-400 | Red Hat Ansible Automation Platform | obligatoriu |
| 8 | **Terraform + AWS** | 400-600 | HashiCorp Terraform Associate + AWS DevOps Engineer Professional | obligatoriu |
| 9+ | **Expert tier** (optional) | 500-800 | diverse | la alegere |

**Total v1:** ~3300-5000 carduri pe calea principală + ~500-800 pe expert tier.

### 5.2 Conținutul per modul (rezumat)

**Modul 0 — DevOps Fundamentals**
- Ce e DevOps, de unde vine, ce rezolvă.
- Cultura DevOps vs tradițională.
- Ciclul de viață: plan → code → build → test → release → deploy → operate → monitor.
- Unde se potrivește fiecare tool (Git, Jenkins, Docker, K8s, Ansible, Terraform).
- DevOps vs SRE vs Platform Engineering.
- Concepte: CI/CD, IaC, observability, GitOps (preview, nu deep dive).

**Modul 1 — Linux**
- Filesystem (FHS), comenzi esențiale, navigare.
- Permisiuni (chmod/chown/umask/suid/sgid/sticky).
- Procese (ps/top/htop/systemctl/journalctl).
- Networking (ip/ss/netstat, DNS, /etc/hosts).
- Shell scripting (bash: variabile, condiții, bucle, funcții, exit codes).
- Users & groups, sudo.
- Package management (apt/yum/dnf).
- Disk & filesystem (mount, fstab, df, du, LVM basics).
- Logs (/var/log, journald).
- SSH, key-based auth, scp, rsync.
- Performance basics (iostat, vmstat, strace).
- LPIC-2: LDAP, NFS, Samba basics.

**Modul 2 — Git**
- Init, clone, add, commit, push, pull, fetch.
- Branching (local + remote), merge vs rebase.
- Stash, log, reflog, blame.
- Conflict resolution.
- Git internals (objects, refs, HEAD).
- Submodules, subtrees.
- Worktrees.
- Hooks (pre-commit, post-commit).
- GitHub Actions basics (workflows, runners, jobs, steps).
- GitLab CI basics (.gitlab-ci.yml, runners, pipelines).
- Strategii de branching (GitFlow, trunk-based, GitHub flow).

**Modul 3 — Application Packages**
- Java: Maven vs Gradle, lifecycle, dependencies, repositories.
- npm: package.json, lockfile, semver, scripts, npx.
- Python: pip, venv, poetry, uv, requirements.txt.
- Go modules.
- Gotchas comune: version hell, lockfile drift, supply chain.
- SBOM (Software Bill of Materials), sigstore.
- Reproducible builds.

**Modul 4 — Docker**
- Arhitectura Docker (daemon, CLI, registry, image vs container).
- Comenzi de bază: build, run, exec, ps, logs, stop, rm.
- Dockerfile: FROM, RUN, COPY, ADD, ENV, WORKDIR, EXPOSE, USER.
- Multi-stage builds.
- Networking (bridge, host, none, user-defined).
- Volumes (bind, named, tmpfs).
- Compose (docker-compose.yml: services, networks, volumes).
- Image optimization (layer caching, multi-stage, distroless).
- Security (non-root user, scanning cu Trivy, secrets).
- Troubleshooting (container exits, OOM, network issues).
- Docker Content Trust, image signing.

**Modul 5 — Kubernetes + YAML + Helm**
- Arhitectura (control plane: API server, etcd, scheduler, controller manager; worker: kubelet, kube-proxy, container runtime).
- Obiecte: Pod, ReplicaSet, Deployment, StatefulSet, DaemonSet, Job, CronJob.
- Services: ClusterIP, NodePort, LoadBalancer, Headless, ExternalName.
- Ingress + Ingress Controllers (nginx, traefik).
- ConfigMaps, Secrets, ServiceAccounts.
- PersistentVolumes, PersistentVolumeClaims, StorageClasses.
- Networking: CNI, Services deep dive, DNS intern.
- RBAC (Role, ClusterRole, RoleBinding, ClusterRoleBinding).
- Probes: liveness, readiness, startup.
- Resource requests/limits, QoS classes.
- Scheduling: nodeSelector, affinity, taints/tolerations.
- Helm: chart structure, values, templates, releases, rollback.
- kubectl mastery: get, describe, logs, exec, port-forward, cp, rollout, scale, drain, cordon.
- Troubleshooting: CrashLoopBackOff, ImagePullBackOff, Pending pods, OOMKilled.
- CKAD-style exercises (timed).
- CKA extras: etcd backup/restore, cluster upgrade, RBAC debugging.

**Modul 6 — Jenkins**
- Arhitectură: master/agent, executors, agents.
- Pipelines: declarative vs scripted.
- Jenkinsfile: stages, steps, post, when, parallel.
- Shared libraries.
- Credentials, secrets management.
- Plugins esențiale.
- Build agents (static, dynamic, Docker, Kubernetes).
- Webhooks + SCM integration.
- Pipeline as Code best practices.

**Modul 7 — Ansible**
- Arhitectură: control node, managed nodes, inventory.
- Comenzi ad-hoc: ansible, ansible-doc.
- Playbooks: tasks, modules, handlers.
- Variabile, facts, magic variables.
- Templates (Jinja2).
- Roles (structure: tasks, handlers, defaults, vars, templates, files, meta).
- Ansible Galaxy.
- Collections.
- Dynamic inventory.
- Vault (secrets).
- AWX / Ansible Automation Platform basics.

**Modul 8 — Terraform + AWS**
- Terraform: providers, resources, data sources, state.
- HCL sintaxă.
- Comenzi: init, plan, apply, destroy, refresh, import, taint.
- State management (local vs remote, locking).
- Modules (root, child, public registry).
- Variables, outputs, locals.
- Workspaces.
- Terraform Cloud / Enterprise basics.
- AWS DevOps services: CodeCommit, CodeBuild, CodeDeploy, CodePipeline.
- CloudFormation comparison.
- AWS IAM pt. Terraform (least privilege).
- S3 backend pentru state cu DynamoDB locking.

**Modul 9+ — Expert tier (optional, la alegere)**
- **Observability**: Prometheus, Grafana, ELK, Loki, OpenTelemetry, distributed tracing.
- **Security**: Vault, Trivy, Falco, OPA/Gatekeeper, container security, SBOM.
- **Networking**: BGP basics, DNS deep dive, service mesh (Istio, Linkerd), CNI internals.
- **SRE practices**: SLO/SLI/SLA, error budgets, incident response, postmortems, blameless culture.
- **Chaos engineering**: Chaos Mesh, Litmus basics.
- **CI/CD patterns**: GitOps (ArgoCD, Flux), trunk-based dev, progressive delivery (canary, blue-green).
- **Cost optimization**: FinOps basics, AWS cost explorer, rightsizing.
- **Database ops**: PostgreSQL operare (backup, PITR, replicare).

---

## 6. Interleaving (logică de mixare între module)

**Principiu pedagogic:** interleaved practice (amestecarea cardurilor din module
diferite în aceeași sesiune) e **semnificativ mai eficientă** decât blocked
practice (termini tot Linux, apoi treci la Git). Studiile cognitive arată
retenție mai bună pe termen lung.

**Implementare:**

### 6.1 Lesson mode (când ești activ pe un modul)

Când intri într-o lecție pe modulul `M`:

| Tip card | Pondere |
|----------|---------|
| Carduri noi din modulul `M` (concept nou) | 50% |
| Carduri noi din modulul `M-1` (revenire la modulul anterior) | 15% |
| Carduri noi din modulul `M-2` (review spaced) | 10% |
| Carduri SRS due din orice modul (weak spot detection) | 25% |

### 6.2 Review mode (SRS)

Pure spaced repetition, **toate modulele**, ordonate după `next_review_at`.

### 6.3 Mix mode (advanced, în setări)

User poate alege „Amestecă tot" — 50% din modulul curent + 50% din SRS
weak spots pe orice modul.

### 6.4 Weak spot detection

Un „weak spot" = card cu `correct_count / total_reviews < 0.7` SAU
card cu `next_review_at < now - 1 day` (overdue).

Algoritmul suprafețează automat aceste carduri în orice sesiune, indiferent
de modulul curent.

---

## 7. Non-goals (ce NU facem în v1)

- ❌ Aplicație nativă iOS/Android (PWA e suficient)
- ❌ Multi-user social (leaderboards, prietenii, boss battles)
- ❌ AI tutor conversațional (chatbot)
- ❌ XP vizibil, ligi, badge-uri, inimi, energy system
- ❌ Limită zilnică / gating / paywall
- ❌ Mod offline (decizie explicită)
- ❌ Editor de cod integrat pe telefon (Monaco, vim, etc.)
- ❌ Keyboard shortcuts avansate (UX mobile-first)
- ❌ Suport pentru LPIC-3 sau CHAOS engineering la nivel expert în v1 (amânat)
- ❌ Pulumi (eliminat din scope)

Astea se pot adăuga în v2 dacă apar cerințe reale.

---

## 8. Arhitectură de sistem (high-level)

```
┌──────────────────────────────────────────────────────────┐
│                       CLOUDFLARE EDGE                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Pages (CDN) │  │  Workers     │  │  Workers     │    │
│  │  SvelteKit   │  │  (API SSR +  │  │  (API pure)  │    │
│  │  static + SSR│  │   edge)      │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │            │
│         └─────────────────┼──────────────────┘            │
│                           │                                │
│         ┌─────────────────┼──────────────────┐            │
│         ▼                 ▼                  ▼            │
│   ┌──────────┐      ┌──────────┐       ┌──────────┐      │
│   │    D1    │      │    R2    │       │    KV     │      │
│   │  SQLite  │      │  media   │       │  cache +  │      │
│   │  (users, │      │ (log     │       │  sessions │      │
│   │  cards,  │      │  images, │       │           │      │
│   │ reviews) │      │  audio)  │       │           │      │
│   └──────────┘      └──────────┘       └──────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  Cloudflare Zero Trust (Access)               │       │
│  │  ├─ Allow: <user-email> (inițial)             │       │
│  │  └─ Allow: any (după open registration)       │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
            │
            │  (Cloudflare Tunnel / Tailscale)
            ▼
┌──────────────────────────────────────────────────────────┐
│         HOMELAB (Lenovo ThinkCentre i5 gen 7, 16GB)       │
│  ┌──────────────────────────────────────────────────┐    │
│  │  k3s cluster (lightweight K8s)                    │    │
│  │  ├─ sandbox-* namespaces (izolate per exercițiu)  │    │
│  │  ├─ jenkins agent (pentru exerciții pipeline)     │    │
│  │  └─ scenario-runner (provisionare exerciții)       │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
            ▲
            │  scraping jobs (CI sau local)
            │
┌──────────────────────────────────────────────────────────┐
│                  CONTENT PIPELINE                          │
│  Surse: 46 transcrieri | Reddit | YouTube | KodeKloud    │
│         Glassdoor | kubernetes.io | docker docs | etc.   │
│  + Certificări: LPI, CKAD, CKA, DCA, Jenkins, Terraform,  │
│    AWS DevOps Pro, CKS, RH Ansible, GitHub Actions,       │
│    GitLab CI                                                │
│                          ▼                                 │
│   Normalizare → Tag-uire → Generare întrebări → Validare │
└──────────────────────────────────────────────────────────┘
```

**Rațiune:**
- **Cloudflare Edge** = latență mică worldwide, cost zero, scalare automată.
- **D1** = SQLite la edge, perfect pt. read-heavy (review sessions), replicare automată.
- **R2** = doar pt. media (diagrame, log screenshots).
- **KV** = sesiuni și cache, never used pt. primary data.
- **Zero Trust** = acces securizat inițial doar pt. owner, ulterior public.
- **Homelab** = izolat, expus prin tunnel securizat, DOAR pt. exerciții hands-on.
- **Content pipeline** = batch, idempotent, versionat în Git, sursa adevărului.

---

## 9. Stack tehnic (cu rațiune)

| Layer | Alegere | Rațiune |
|-------|---------|---------|
| **Frontend framework** | SvelteKit 2.x (Svelte 5 runes) | Bundle mic, performant pe mobil, SSR nativ pe Workers |
| **Adapter** | `@sveltejs/adapter-cloudflare` | Deployment direct pe Workers, edge SSR |
| **Stilizare** | Tailwind CSS 4 + `@tailwindcss/forms` | Utility-first, design tokens ușor de optimizat pt. touch |
| **Backend** | Cloudflare Workers (TypeScript) | Edge-native, latență mică, free tier generos |
| **API framework** | Hono (pe Workers) | Mic, type-safe, validation built-in |
| **DB** | Cloudflare D1 (SQLite la edge) | Free 5GB, replicare automată, latency < 10ms la edge |
| **ORM** | Drizzle ORM 0.36+ | Type-safe, SQL-first, zero overhead, migrări declarative |
| **Validare** | Zod 3+ | Single source of truth pt. tipuri, runtime validation |
| **Auth** | Better Auth (self-hosted) | Open source, sessions + OAuth, zero vendor lock |
| **Access control** | Cloudflare Zero Trust | Email gating inițial, public ulterior |
| **PWA** | `@vite-pwa/sveltekit` | Service worker + manifest, workbox integration |
| **Limbaj** | TypeScript 5.5+ (strict mode) | Type safety end-to-end |
| **Package manager** | pnpm 9+ | Eficient, workspace-friendly |
| **Testing unit** | Vitest | Compat cu Vite, rapid, ESM-native |
| **Testing E2E** | Playwright | Mobile emulation built-in, reliable |
| **Linting** | ESLint 9 (flat config) + Prettier 3 | Standard, plugin ecosystem matur |
| **CI/CD** | GitHub Actions → Cloudflare Pages | Free pt. public repos, integrări oficiale |
| **Observabilitate** | Sentry (free tier) + Cloudflare Analytics | Free, integrare SvelteKit prin `@sentry/sveltekit` |
| **Hosting homelab** | k3s + Cloudflare Tunnel | Lightweight, expus securizat fără port forwarding |
| **Reverse proxy homelab** | Cloudflare Tunnel (cloudflared) | Zero porturi deschise, auth integrat |
| **Licență** | Apache 2.0 | Patent grant explicit, standard pt. proiecte de infra |

**Versiuni pinned (2026-09-23):** Node 20 LTS, SvelteKit 2.15+, Svelte 5.20+,
Tailwind 4.0+, Drizzle ORM 0.36+, Wrangler 4+, TypeScript 5.5+.

---

## 10. Model de date (DDL)

```sql
-- Utilizatori
CREATE TABLE users (
  id              TEXT PRIMARY KEY,             -- ulid
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  password_hash   TEXT,                          -- null if OAuth only
  oauth_provider  TEXT,                          -- 'google', 'github', null
  oauth_id        TEXT,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  settings_json   TEXT NOT NULL DEFAULT '{}',
  created_at      INTEGER NOT NULL,             -- unix ms
  last_seen_at    INTEGER
);

CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);

-- Deck-uri (modulele 0-9)
CREATE TABLE decks (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,             -- 'linux', 'kubernetes'
  title       TEXT NOT NULL,
  title_en    TEXT,
  description TEXT,
  level       TEXT NOT NULL,                    -- 'beginner' | 'intermediate' | 'advanced'
  order_idx   INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 0,
  cert_target TEXT,                              -- 'LPIC-1,LPIC-2', 'CKAD,CKA', etc.
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_decks_published ON decks(published, order_idx);

-- Topic-uri (sub-capitole într-un modul)
CREATE TABLE topics (
  id          TEXT PRIMARY KEY,
  deck_id     TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  parent_id   TEXT REFERENCES topics(id),
  name        TEXT NOT NULL,
  name_en     TEXT,
  order_idx   INTEGER NOT NULL DEFAULT 0,
  concept_md  TEXT NOT NULL                      -- explicația de la începutul lecției (markdown)
);

CREATE INDEX idx_topics_deck ON topics(deck_id, order_idx);

-- User-topic levels (output placement test + override)
CREATE TABLE user_topic_levels (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id      TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  level        TEXT NOT NULL,                   -- 'junior' | 'mid' | 'senior'
  score        INTEGER,                          -- 0-100 din placement
  source       TEXT NOT NULL,                    -- 'placement' | 'manual' | 'srs-inferred'
  set_at       INTEGER NOT NULL,
  PRIMARY KEY (user_id, deck_id)
);

-- Card-uri (întrebări)
CREATE TABLE cards (
  id            TEXT PRIMARY KEY,
  topic_id      TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                   -- 'choice' | 'multi' | 'order' | 'match' | 'fill' | 'log_tap' | 'swipe'
  difficulty    INTEGER NOT NULL DEFAULT 3,     -- 1..5
  level         TEXT NOT NULL DEFAULT 'junior',  -- 'junior' | 'mid' | 'senior' | 'expert'
  prompt        TEXT NOT NULL,
  prompt_en     TEXT,
  payload_json  TEXT NOT NULL,
  answer_json   TEXT NOT NULL,
  source        TEXT,                            -- 'whisper:lesson-12' | 'reddit:abc' | 'cert:CKAD:topic-3' | etc.
  source_url    TEXT,
  tags_json     TEXT NOT NULL DEFAULT '[]',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX idx_cards_topic ON cards(topic_id, difficulty);
CREATE INDEX idx_cards_tags ON cards(tags_json);
CREATE INDEX idx_cards_level ON cards(level);

-- Reviews (SRS state per card per user)
CREATE TABLE reviews (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id        TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ease_factor    REAL NOT NULL DEFAULT 2.5,
  interval_days  INTEGER NOT NULL DEFAULT 0,
  repetitions    INTEGER NOT NULL DEFAULT 0,
  next_review_at INTEGER NOT NULL,
  last_review_at INTEGER,
  last_quality   INTEGER,                        -- 0..5
  total_reviews  INTEGER NOT NULL DEFAULT 0,
  correct_count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, card_id)
);

CREATE INDEX idx_reviews_due ON reviews(user_id, next_review_at);

-- Streaks
CREATE TABLE streaks (
  user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_active_date  TEXT,                       -- 'YYYY-MM-DD' în timezone-ul userului
  total_reviews     INTEGER NOT NULL DEFAULT 0,
  total_correct     INTEGER NOT NULL DEFAULT 0
);

-- Sesiuni de studiu
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at   INTEGER NOT NULL,
  ended_at     INTEGER,
  cards_seen   INTEGER NOT NULL DEFAULT 0,
  cards_correct INTEGER NOT NULL DEFAULT 0,
  mode         TEXT NOT NULL DEFAULT 'review',  -- 'review' | 'lesson' | 'interview' | 'placement'
  deck_id      TEXT REFERENCES decks(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id, started_at);
```

**Constrângeri:**
- Toate ID-urile: ULID (sortable, URL-safe).
- Timpuri: `INTEGER` (unix ms) — ușor de comparat, timezone-agnostic.
- `payload_json` și `answer_json` permit tipuri noi fără migrare.
- `level` per card permite filtrare pe user_topic_levels.

---

## 11. Placement test (Test nivel)

### 11.1 Declanșare
- La primul login (obligatoriu).
- Din profil, buton „Retest nivel" (opțional).

### 11.2 Structură
- 40-50 întrebări, **mixate** pe toate modulele (4-5 per modul).
- Distribuție de difficulty: 30% ușor, 50% mediu, 20% greu.
- Mix de tipuri: 50% choice, 30% fill, 20% log-tap.
- Timp per întrebare: nelimitat (placement ≠ exam).
- Bară de progres vizibilă.

### 11.3 Scorare
- Per modul: `correct / total`.
- Mapare la nivel:
  - `score < 50%` → junior
  - `50-75%` → mid
  - `> 75%` → senior
- Per întrebare: se aplică weight pe difficulty (ușor = 1x, greu = 2x).

### 11.4 Rezultat
- Ecran cu scor per modul.
- Override per modul cu confirm dialog („Eu știu asta, vreau mid/senior").
- Salvare în `user_topic_levels` cu `source='placement'`.

### 11.5 Selecție de carduri post-placement
- Modul cu nivel `junior` → afișează carduri cu `level IN ('junior')` + difficulty 1-3.
- Modul cu nivel `mid` → afișează `level IN ('junior','mid')` + difficulty 2-4.
- Modul cu nivel `senior` → afișează `level IN ('mid','senior','expert')` + difficulty 3-5.

---

## 12. Algoritm SRS — SuperMemo 2 (adaptat)

**Principii:**
- Quality 0-5 de la user (pe mobil: **3 butoane** — Greșit / Greu / Ușor).
- Mapare: Greșit=2, Greu=4, Ușor=5.
- Quality ≥ 4: interval crește.
- Quality ≤ 3: interval reset.
- Ease factor scade la greșeli, crește la ușor (min 1.3).

```ts
function scheduleReview(card: Review, quality: 0|1|2|3|4|5, now: number): Review {
  let { ease_factor, interval_days, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval_days = 0;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions += 1;
  }

  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ease_factor = Math.max(1.3, ease_factor);

  const next_review_at = quality < 3
    ? now + 10 * 60 * 1000
    : now + interval_days * 86400 * 1000;

  return {
    ...card,
    ease_factor,
    interval_days,
    repetitions,
    next_review_at,
    last_review_at: now,
    last_quality: quality,
    total_reviews: card.total_reviews + 1,
    correct_count: card.correct_count + (quality >= 3 ? 1 : 0)
  };
}
```

**Selecție de carduri pt. sesiune (review mode):**
1. Carduri cu `next_review_at <= now` (due).
2. Dacă mai puțin de 20 due → adaugă din weak spots (`correct_count / total_reviews < 0.7`).
3. Dacă tot mai puțin de 20 → adaugă din topic-uri neacoperite.

**Selecție lesson mode** (cu interleaving, vezi secțiunea 6):
- 50% din modulul curent (conform nivel placement).
- 25% SRS due din orice modul.
- 15% din modulul `M-1`.
- 10% din modulul `M-2`.

---

## 13. Tipuri de carduri (payload schema)

### 13.1 `choice` — alegere simplă
```ts
payload: {
  options: { id: string, text: string, text_en?: string }[]  // 4 opțiuni
}
answer: {
  correct_option_id: string,
  explanation: string,
  explanation_en?: string
}
```

### 13.2 `multi` — alegere multiplă
```ts
payload: {
  options: { id: string, text: string }[]   // 4-6 opțiuni
}
answer: {
  correct_option_ids: string[],              // 2-4 corecte
  explanation: string
}
```

### 13.3 `order` — drag-to-order
```ts
payload: {
  items: { id: string, text: string }[]      // 3-7 iteme
}
answer: {
  correct_order: string[],
  explanation: string
}
```

### 13.4 `match` — conectează perechi
```ts
payload: {
  left: { id: string, text: string }[],
  right: { id: string, text: string }[]
}
answer: {
  pairs: { left_id: string, right_id: string }[],
  explanation: string
}
```

### 13.5 `fill` — completează (max 30 char)
```ts
payload: {
  before: string,        // "kubectl ___ -f deployment.yaml"
  after?: string,
  hint?: string
}
answer: {
  correct: string[],     // variante acceptate
  case_sensitive: boolean,
  explanation: string
}
```

### 13.6 `log_tap` — atinge linia din log
```ts
payload: {
  log: string,           // log multilinie cu 8-15 linii
  hint?: string
}
answer: {
  target_line_substring: string,   // substring unic
  explanation: string
}
```

### 13.7 `swipe` — card rapid (review)
```ts
payload: {
  front: string,
  back: string,
  tags?: string[]
}
answer: {
  // nu are „corect" — evaluat prin swipe
}
```

---

## 14. Pipeline de conținut

```
   Surse                          Normalizare              Generare              Validare            Publicare
┌─────────────┐               ┌───────────────┐        ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│ 46 x Whisper│               │               │        │              │      │              │     │              │
│ Reddit API  │─── scrape ──▶│ Concepte +    │──▶ manual ──▶│ Carduri JSON │──▶ lint + spot │──▶│  PR + D1     │
│ YouTube Nana│               │ Comenzi +     │  (cu    │ validate     │      │   check      │     │  migration   │
│ KodeKloud   │               │ Greșeli +     │  suba-  │ Zod schema   │      │              │     │              │
│ Glassdoor   │               │ Patterns      │  genți) │              │      │              │     │              │
│ Cert curricula│            │ + certificări │        │              │      │              │     │              │
│ k8s/docker  │               │               │        │              │      │              │     │              │
│ /jenkins.io │               │               │        │              │      │              │     │              │
└─────────────┘               └───────────────┘        └──────────────┘      └──────────────┘     └──────────────┘
```

### 14.1 Surse de conținut (consolidat)

**Surse primare:**
- Cele 46 transcrieri Whisper (ale tale)
- Reddit API (r/devops, r/kubernetes, r/docker, r/jenkinsci, r/ansible, r/terraform, r/prometheus, r/sysadmin)

**Surse video:**
- TechWorld with Nana (YouTube transcripts)
- KodeKloud (cursuri publice)
- Killer.sh (CKAD/CKA practice)

**Surse pt. interviuri:**
- Reddit interview threads
- Glassdoor (parafrazat)

**Surse pt. certificări (syllabi oficiale):**
- LPI: Linux Essentials, LPIC-1, LPIC-2 syllabi (publice)
- CNCF: CKAD, CKA, CKS curricula (publice)
- Docker: DCA exam guide
- Jenkins: Jenkins Engineer certification guide
- Red Hat: Ansible Automation Platform exam objectives
- HashiCorp: Terraform Associate exam guide
- AWS: DevOps Engineer Professional exam guide
- GitHub: Actions certification guide
- GitLab: CI/CD certification guide
- CNCF: Prometheus + Grafana cert guides

**Surse docs (referință pt. comenzi canonice):**
- kubernetes.io
- docs.docker.com
- jenkins.io/doc
- docs.ansible.com
- developer.hashicorp.com/terraform
- docs.aws.amazon.com/codedeploy etc.

### 14.2 Adaptoare per sursă (în `scripts/sources/`)
- `whisper.ts` — ia .txt/.srt/.vtt, curăță (diacritice, termeni tehnici)
- `reddit.ts` — Reddit API, subreddituri țintă, query-uri predefinite
- `youtube.ts` — transcript API pt. Nana și alții
- `kodekloud.ts` — scrape cursuri publice, respectă robots.txt
- `glassdoor.ts` — Playwright headless, fallback la manual review
- `official-docs.ts` — sitemap + parse pt. kubernetes.io / docker docs / jenkins docs
- `cert-curricula.ts` — pull exam objectives de la LPI/CNCF/Docker/Jenkins/etc.

### 14.3 Generatoare de carduri (manual, cu subagenți)
- `choice.ts`, `multi.ts`, `order.ts`, `match.ts`, `fill.ts`, `log-tap.ts`, `interview.ts`
- **Input:** concept normalizat (de la o sursă).
- **Output:** 1+ carduri JSON validate cu Zod.
- **Quality gate:** explicație obligatorie, sursa obligatorie, tag-uri obligatorii.

### 14.4 Validare
- Zod schema per tip de card.
- Lint automat: text prea lung, opțiuni prea similare, lipsă explicație, lipsă sursă.
- Manual spot-check: 5% random pe PR.
- Orice modificare → PR → review → merge → D1 migration.

### 14.5 Etică
- Extragem **concepte, comenzi, pattern-uri, greșeli frecvente** (fapte, nu copyrightabile).
- Citez cu link când e cazul (Reddit, bloguri).
- Cursurile plătite le rezum, nu copiez verbatim.
- Curriculum-uri de certificare sunt publice, le folosim ca ghid structural.

---

## 15. Principii UX (mobile-first)

**Reguli absolute:**
1. Tap targets ≥ 44x44 px (Apple HIG), ideal 48-52 px.
2. Font minim 16px body, 14px meta — fără zoom.
3. Fără hover — totul prin tap.
4. Vertical scroll doar — landscape opțional.
5. One-handed usage — acțiuni principale în jumătatea inferioară.
6. Feedback haptic pe acțiuni importante — `navigator.vibrate(10)`.
7. Loading states vizibile — skeleton, nu spinner blocant.

**Layout dashboard:**
```
┌──────────────────────────────────────────┐
│ 🔥 12 day streak              ⚙️ Profil  │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────┐  ┌──────────────┐      │
│ │  📊 Test     │  │  🎯 Interviuri│      │
│ │   nivel      │  │              │      │
│ └──────────────┘  └──────────────┘      │
│                                          │
│ ┌──────────────────────────────────┐    │
│ │  📚 Cursuri                      │    │
│ │  ▶ Continuă: Linux - Permisiuni │    │
│ │  Drum: 0 → 1 → 2 → 3 → ... → 9   │    │
│ │  ▓▓▓▓▓▓░░░░░░░  Module 1/10      │    │
│ └──────────────────────────────────┘    │
│                                          │
│ ┌──────────────────────────────────┐    │
│ │  🃏 Review azi: 24 carduri       │    │
│ │  ⏱ ~15 min                      │    │
│ │  [ Start review ]                │    │
│ └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Layout lecție (când ești într-un topic):**
```
┌──────────────────────────────────────────┐
│ ◀ Linux › Permisiuni                     │
├──────────────────────────────────────────┤
│                                          │
│  [ Concept explicație - markdown scurt ] │
│                                          │
│  chmod schimbă permisiunile unui fișier  │
│  sau director. Sintaxa:                  │
│  chmod [ugoa][+-=][rwx] file             │
│                                          │
│  Exemple:                                │
│  chmod 755 script.sh                     │
│  chmod u+x run.sh                        │
│                                          │
├──────────────────────────────────────────┤
│  Exercițiu 1 / 5                         │
│                                          │
│  Care e permisiunea minimă pt. un        │
│  script executabil de owner?             │
│                                          │
│  ┌────────────┐                          │
│  │  644       │                          │
│  └────────────┘                          │
│  ┌────────────┐                          │
│  │  700       │                          │
│  └────────────┘                          │
│  ┌────────────┐                          │
│  │  755       │                          │
│  └────────────┘                          │
│  ┌────────────┐                          │
│  │  777       │                          │
│  └────────────┘                          │
│                                          │
├──────────────────────────────────────────┤
│ 🔥 12 day streak          [ Skip topic ] │
└──────────────────────────────────────────┘
```

**Microinteracțiuni:**
- Apăsare buton: scale 0.97 pe 100ms.
- Correct: flash verde scurt + haptic.
- Incorrect: shake scurt + roșu + arată explicația.
- Streak crește: animație subtilă la incrementare.

**Dark mode by default** (DevOps = terminal vibe), light mode opțional.

---

## 16. Gamification (doar streak, nimic altceva)

**Streak counter:**
- Incrementare la prima activitate din zi (≥ 1 card review sau 1 lecție terminată).
- Reset la 24h fără activitate (în timezone-ul userului).
- Afișat persistent în footer.
- „Longest streak" salvat ca record personal.

**Indicatori de progres NON-gamification (OK pt. că nu blochează):**
- Progres pe drum (`Module 1/10`) — bară de progres.
- Scor per modul placement (`Junior → Mid → Senior`).
- Recap săptămânal: câte review-uri, ce arii slabe.

**Fără:**
- ❌ XP / puncte vizibile.
- ❌ Inimi / energy / gating.
- ❌ Liga / leaderboard.
- ❌ Badge-uri (momentan).
- ❌ Notificări push (decizie: nu vrei să fi bombădat).

**Important:** streak-ul NU e piedică. Poți să stai 3 zile fără activitate,
a 4-a zi faci 5 ore. Pierzi streak-ul, nu pierzi nimic altceva. Progresul e în
SRS state, nu în streak.

---

## 17. Sandbox (homelab) — exerciții hands-on

**Scop:** exerciții în care NU doar alegi un răspuns, ci execuți comenzi reale
într-un cluster izolat.

**Setup:**
- **k3s** pe ThinkCentre (consum mic, perfect pt. 16GB RAM).
- **Cloudflare Tunnel** expune sandbox-ul securizat.
- **Namespace per exercițiu** — izolare completă, ștergere automată după sesiune.
- **TTL** pe exerciții: 30 min default, max 2h.

**Flow exercițiu (pe telefon):**
```
1. User alege exercițiul ("Debug Pod care nu pornește")
2. Web app → API → sandbox-runner creează namespace
3. Se afișează:
   - context (ce ar trebui să facă)
   - log-uri inițiale (cu problema)
   - 4-6 opțiuni de diagnostic SAU
   - short-fill pe comenzi reale (kubectl ___) SAU
   - tap pe linia din log care explică problema
4. La răspuns corect → se aplică fix-ul real în cluster
5. User vede pod-ul pornind (sau starea finală)
6. Cleanup automat
```

**Ce NU face userul pe telefon:**
- Scrie comenzi libere.
- Terminal interactiv.
- Editare YAML.

**Limitări acceptate:**
- Exercițiile hands-on sunt 20-30% din total; restul sunt quiz-uri.
- Hands-on pe telefon = „choose the right kubectl command", „identify the broken manifest", „read the log".
- Hands-on real cu exec liber = pe viitor, când ai acces la laptop.

---

## 18. Interview mode

**Declanșare:** buton „Interviuri" pe dashboard.

**Flow:**
```
1. Alege stack-ul (Docker / K8s / Jenkins / Linux / Git / Ansible / Terraform+AWS / mixed)
2. Alege dificultatea (junior / mid / senior / leetcode-style)
3. Alege durata (10 / 20 / 30 min)
4. Start
5. Întrebare cronometrată (60-90 sec default):
   - Choice: „Ce face această comandă?"
   - Fill: „kubectl ___ deployment myapp --replicas=5"
   - Order: pașii unui rollout
   - Log-tap: identifică linia cu eroarea
6. Fiecare răspuns: arată explicația + link la sursă (Reddit thread / Glassdoor)
7. La final: scor, breakdown pe topic, recomandări
```

**Întrebările vin din:**
- Sursele publice scrape-uite (Reddit, Glassdoor, leetcode-style).
- Generare specială pe tipare reale de interviu.
- Carduri cu tag `interview`.

---

## 19. Open source & Git workflow

### 19.1 Repo
- **GitHub:** `github.com/<user>/devopsdojo` (public, open-source).
- **Licență:** Apache 2.0.
- **Fișiere necesare la init:**
  - `LICENSE` (textul Apache 2.0)
  - `README.md` (intro, screenshot, install, deploy, contribute)
  - `CONTRIBUTING.md` (cum adaugi conținut, card schema, validare)
  - `CODE_OF_CONDUCT.md` (Contributor Covenant)
  - `SECURITY.md` (cum raportezi vulnerabilități)
  - `.github/ISSUE_TEMPLATE/` (bug report, feature request, content request)
  - `.github/PULL_REQUEST_TEMPLATE.md` (checklist pt. PR-uri de conținut)

### 19.2 Branch strategy
- `main` = production, auto-deploy pe Cloudflare Pages.
- Branch-uri feature: `feat/<scope>`, `content/<deck>`, `fix/<scope>`, `docs/<scope>`.
- Branch protection pe `main`: 1 approver (tu) + CI verde.

### 19.3 PR workflow
- **PR code (feat/fix):**
  - CI: lint + typecheck + unit tests + build.
  - Preview deploy pe `pr-<n>.devopsdojo.pages.dev`.
  - Review și merge → auto-deploy production.
- **PR content (`content/<deck>`):**
  - CI: Zod validation pe toate cardurile noi/modificate + lint + diff vizibil.
  - Preview: se vede cum arată noile carduri în UI (preview URL).
  - Review și merge → conținutul intră în D1 via migration.
- **PR docs:**
  - CI: lint markdown + link check.
  - Merge fără deploy.

### 19.4 Deploy flow
```
PR opened → CI rulează → Preview URL creat
                              ↓
                       Code/content review
                              ↓
                       Merge pe main
                              ↓
              ┌───────────────┴───────────────┐
              ▼                               ▼
   D1 migrations aplicate          Cloudflare Pages
   (dacă sunt)                     deploy production
              ↓                               ↓
              └───────────────┬───────────────┘
                              ▼
              Zero Trust re-verifică accesul
                              ▼
                  App live pe domeniu
```

### 19.5 Fork-to-deploy
- README va documenta cum oricine poate face fork + propriul deployment.
- Necesită: cont Cloudflare (free), setare secrets în GitHub, run `pnpm deploy`.
- D1 e per-deployment (fiecare fork are DB-ul lui).

---

## 20. Structură proiect

```
/workspace
├── README.md
├── LICENSE                          # Apache 2.0
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── wrangler.toml                    # config Cloudflare
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                   # lint + test + build
│   │   ├── deploy.yml               # deploy pe Cloudflare Pages la merge main
│   │   └── content-validate.yml     # validare Zod pe PR de conținut
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   ├── feature.md
│   │   └── content.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── src/
│   ├── app.html
│   ├── app.css
│   ├── hooks.client.ts
│   ├── hooks.server.ts
│   │
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   ├── auth/
│   │   │   │   ├── better-auth.ts
│   │   │   │   └── guards.ts
│   │   │   ├── srs/
│   │   │   │   └── supermemo.ts
│   │   │   ├── placement/
│   │   │   │   ├── questions.ts
│   │   │   │   └── scorer.ts
│   │   │   ├── interleaving/
│   │   │   │   └── selector.ts
│   │   │   ├── sandbox/
│   │   │   │   ├── client.ts
│   │   │   │   └── runner.ts
│   │   │   └── api/
│   │   │       ├── cards.ts
│   │   │       ├── reviews.ts
│   │   │       ├── decks.ts
│   │   │       ├── placement.ts
│   │   │       └── interview.ts
│   │   ├── client/
│   │   │   ├── stores/
│   │   │   │   ├── session.svelte.ts
│   │   │   │   ├── streak.svelte.ts
│   │   │   │   └── settings.svelte.ts
│   │   │   ├── components/
│   │   │   │   ├── cards/
│   │   │   │   │   ├── ChoiceCard.svelte
│   │   │   │   │   ├── MultiCard.svelte
│   │   │   │   │   ├── OrderCard.svelte
│   │   │   │   │   ├── MatchCard.svelte
│   │   │   │   │   ├── FillCard.svelte
│   │   │   │   │   ├── LogTapCard.svelte
│   │   │   │   │   └── SwipeCard.svelte
│   │   │   │   ├── placement/
│   │   │   │   │   ├── PlacementCard.svelte
│   │   │   │   │   └── ResultCard.svelte
│   │   │   │   ├── interview/
│   │   │   │   │   ├── TimerCard.svelte
│   │   │   │   │   └── ScoreCard.svelte
│   │   │   │   ├── ui/
│   │   │   │   │   ├── Button.svelte
│   │   │   │   │   ├── StreakBadge.svelte
│   │   │   │   │   ├── ProgressBar.svelte
│   │   │   │   │   └── BottomNav.svelte
│   │   │   │   └── layout/
│   │   │   │       ├── Header.svelte
│   │   │   │       └── Footer.svelte
│   │   │   ├── pwa/
│   │   │   │   └── register.ts
│   │   │   └── utils/
│   │   │       ├── haptic.ts
│   │   │       ├── analytics.ts
│   │   │       └── format.ts
│   │   ├── srs/
│   │   │   ├── supermemo.ts
│   │   │   └── types.ts
│   │   ├── cards/
│   │   │   ├── types.ts             # Zod schemas per tip
│   │   │   └── validator.ts
│   │   └── shared/
│   │       ├── types.ts
│   │       └── constants.ts
│   │
│   └── routes/
│       ├── +layout.svelte
│       ├── +layout.ts
│       ├── +page.svelte             # dashboard (3 moduri + streak + review)
│       ├── onboarding/
│       │   └── placement/
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       ├── login/
│       │   ├── +page.svelte
│       │   └── +page.server.ts
│       ├── decks/
│       │   ├── +page.svelte
│       │   └── [slug]/
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       ├── lesson/
│       │   └── [deckId]/
│       │       └── [topicId]/
│       │           ├── +page.svelte
│       │           └── +page.server.ts
│       ├── review/
│       │   └── +page.svelte
│       ├── interview/
│       │   ├── +page.svelte
│       │   ├── +page.server.ts
│       │   └── [sessionId]/
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       └── api/
│           ├── cards/
│           │   ├── +server.ts
│           │   └── [id]/+server.ts
│           ├── reviews/
│           │   ├── +server.ts
│           │   └── due/+server.ts
│           ├── placement/
│           │   ├── start/+server.ts
│           │   └── submit/+server.ts
│           ├── streak/+server.ts
│           └── sandbox/
│               ├── +server.ts
│               └── [id]/+server.ts
│
├── content/
│   ├── decks/
│   │   ├── devops-fundamentals.json
│   │   ├── linux.json
│   │   ├── git.json
│   │   ├── app-packages.json
│   │   ├── docker.json
│   │   ├── kubernetes.json
│   │   ├── jenkins.json
│   │   ├── ansible.json
│   │   ├── terraform-aws.json
│   │   └── expert/
│   │       ├── observability.json
│   │       ├── security.json
│   │       ├── networking.json
│   │       ├── sre.json
│   │       ├── chaos.json
│   │       └── cicd-patterns.json
│   ├── questions/
│   └── sources/
│       └── ATTRIBUTION.md
│
├── scripts/
│   ├── sources/
│   │   ├── whisper.ts
│   │   ├── reddit.ts
│   │   ├── youtube.ts
│   │   ├── kodekloud.ts
│   │   ├── glassdoor.ts
│   │   ├── official-docs.ts
│   │   └── cert-curricula.ts
│   ├── generators/
│   │   ├── choice.ts
│   │   ├── multi.ts
│   │   ├── order.ts
│   │   ├── match.ts
│   │   ├── fill.ts
│   │   ├── log-tap.ts
│   │   └── interview.ts
│   ├── placement/
│   │   └── generate-pool.ts
│   ├── ingest.ts
│   ├── validate.ts
│   └── seed-dev.ts
│
├── infra/
│   ├── cloudflare/
│   │   ├── wrangler.toml
│   │   ├── _routes.json
│   │   ├── zero-trust-policy.yml
│   │   └── bindings.d.ts
│   └── homelab/
│       ├── README.md
│       ├── k3s-install.sh
│       ├── cloudflared-config.yml
│       └── sandbox/
│           ├── runner.ts
│           └── scenarios/
│               ├── broken-pod.json
│               ├── stuck-deployment.json
│               └── jenkins-pipeline-broken.json
│
├── tests/
│   ├── unit/
│   │   ├── srs.test.ts
│   │   ├── cards.test.ts
│   │   ├── placement.test.ts
│   │   ├── interleaving.test.ts
│   │   └── generators.test.ts
│   ├── integration/
│   │   ├── api.test.ts
│   │   └── auth.test.ts
│   └── e2e/
│       ├── dashboard.spec.ts
│       ├── placement.spec.ts
│       ├── lesson-flow.spec.ts
│       ├── review-flow.spec.ts
│       ├── interview-flow.spec.ts
│       └── mobile-ux.spec.ts
│
└── docs/
    ├── architecture.md              # ← ACEST FIȘIER
    ├── data-model.md
    ├── content-pipeline.md
    ├── curriculum.md                # detalii per modul
    ├── deployment.md
    ├── contributing.md
    ├── adr/                         # Architecture Decision Records
    │   ├── 001-cloudflare-over-vercel.md
    │   ├── 002-drizzle-over-prisma.md
    │   ├── 003-mobile-only-no-editor.md
    │   ├── 004-streak-only-gamification.md
    │   ├── 005-apache-20-license.md
    │   ├── 006-interleaving-pedagogy.md
    │   └── 007-certification-anchored-curriculum.md
    └── screenshots/
```

---

## 21. Standarde de cod

**Limbaj:**
- TypeScript strict mode (`"strict": true`, `"noUncheckedIndexedAccess": true`).
- Zero `any` în codul de producție.
- ESM only.

**Stil:**
- ESLint 9 flat config + Prettier 3.
- Max line length 100, 2-space indent, single quotes, trailing commas all.
- Sort imports automat.

**Commits:**
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `content:`.
- Branch naming: `feat/<scope>`, `content/<deck>`, `fix/<scope>`, `docs/<scope>`.

**Testing:**
- Unit: 80%+ coverage pe `lib/srs`, `lib/cards`, `lib/placement`, `lib/interleaving`.
- E2E: flow-uri critice (login → placement → cursuri → review → streak).
- Mobile UX: viewport 375x667 (iPhone SE) și 390x844 (iPhone 14).

**CI:**
- PR → lint + typecheck + unit tests + content validation → preview deploy.
- Merge pe main → deploy production.

**Performance budgets:**
- Bundle initial (gzip): < 100 KB.
- Time to interactive: < 2s pe 4G.
- API p50: < 100ms, p95: < 500ms.

**Securitate:**
- HTTPS only.
- CSP strict (no inline scripts, no eval).
- Secrets în Cloudflare dashboard, niciodată în repo.
- Rate limiting pe API.
- Input validation cu Zod pe toate endpoint-urile.

---

## 22. Roadmap (faze + livrabile)

| Fază | Nume | Zile | Livrabil concret |
|------|------|------|------------------|
| **0** | Fundație | 1-2 | SvelteKit + D1 + Drizzle + auth + Zero Trust + PWA + SRS + placement skeleton, pe date fictive |
| **1** | UX core (3 moduri) | 2-3 | Dashboard cu 3 butoane, placement flow, lecție, review, swipe, streak counter |
| **2** | Content pipeline | 3-5 | Adaptoare pt. toate sursele, primele 200 carduri validate, content schema stabilit |
| **3** | Curriculum modul 0+1+2 | 5-7 | DevOps Fundamentals + Linux + Git complete (LPI + GitHub Actions coverage) |
| **4** | Curriculum modul 3+4+5 | 7-12 | App Packages + Docker (DCA) + K8s (CKAD+CKA+Helm) |
| **5** | Curriculum modul 6+7+8 | 12-16 | Jenkins + Ansible + Terraform+AWS |
| **6** | Interviuri + expert tier | 16-20 | Interview mode complet, modulele expert opționale |
| **7** | Polish + mobile testing | 20-22 | Testare pe device real, explicații verificate, SRS calibrat |
| **8** | Sandbox (homelab) | 22+ | k3s pe ThinkCentre, primele exerciții hands-on |
| **9** | Open launch | 25+ | Repo public, README finalizat, CONTRIBUTING.md, public registration (sau menținut closed) |

**Punct de oprire natural: faza 7.** Aplicație completă, conținut serios,
experiență fluidă pe telefon, gata de folosit zi de zi.

**MVP (faza 1 done):** poți să-ți setezi placement-ul și să faci primele
review-uri pe Linux (cu conținut placeholder).

---

## 23. Costuri (lunar)

| Componentă | Cost |
|------------|------|
| Cloudflare Pages | $0 |
| Cloudflare Workers (~3M req/lună) | $0 |
| Cloudflare D1 (5GB, 5M citiri/zi) | $0 |
| Cloudflare R2 (10GB) | $0 |
| Cloudflare KV (100K citiri/zi) | $0 |
| Cloudflare Tunnel (homelab) | $0 |
| Cloudflare Zero Trust (50 users) | $0 |
| Better Auth (self-hosted) | $0 |
| Sentry (free, 5K events/lună) | $0 |
| GitHub Actions (public repo, 2000 min/lună) | $0 |
| Reddit API (free, 100 req/min) | $0 |
| Domeniu (deja achiziționat) | $0 |
| **Total lunar** | **$0** |

**Costuri viitoare posibile:**
- Dacă free tier-ul Cloudflare e depășit (improbabil la volum personal).
- LLM API pt. generare întrebări (opțional, evitat în v1).

---

## 24. Riscuri (și mitigări)

| Risc | Prob. | Impact | Mitigare |
|------|-------|--------|----------|
| Calitate slabă transcrieri Whisper | Medie | Mediu | Cleanup automat + verificare 5%. |
| Conținut curs plătit fără permisiune | Scăzut | Mare | Extragem DOAR fapte (concepte/comenzi). Atribuire în `ATTRIBUTION.md`. |
| Glassdoor anti-bot | Medie | Scăzut | Fallback pe Reddit. Glassdoor nu e blocant. |
| Homelab offline / inaccesibil | Scăzut | Mediu | Sandbox e 20-30% din conținut. Restul merge fără. |
| Cloudflare free tier depășit | Scăzut | Scăzut | Monitoring în dashboard. Upgrade la $5/lună Workers Paid dacă e necesar. |
| Timp generare conținut prea lung | Medie | Mediu | Generare incrementală, PR-uri mici, livrabil zilnic. Fără LLM = mai lent, control mai mare. |
| Burnout dezvoltare (1 persoană) | Medie | Mare | Faze scurte cu livrabile concrete. Fiecare fază = URL live. |
| Certificare curriculum se schimbă | Scăzut | Mediu | Curriculum-ul e versionat; la update, PR nou cu delta. |
| Interleaving prea agresiv (frustrează user) | Scăzut | Scăzut | Pondere ajustabilă în setări. Telemetrie pt. feedback. |
| Open source = presiune socială | Scăzut | Scăzut | Repo public dar fără publicitate agresivă. Contribuții opționale. |

---

## 25. Ce aplic default (din răspunsuri)

- **Licență:** Apache 2.0
- **Alocare efort:** Hybrid (C) — 60% breadth Junior + 40% depth Mid pe Linux/K8s
- **Placement override:** permis cu confirm dialog
- **Onboarding UX:** primul lucru e placement, apoi dashboard
- **Repo setup:** `LICENSE` + `README` + `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` + `SECURITY.md`
- **Fork-to-deploy:** documentat în README

---

## 26. Ce am nevoie ca să pornesc (Faza 0)

1. **Numele repo-ului GitHub** — propun `devopsdojo` (trebuie să fie disponibil).
2. **Subdomain-ul** — confirmă `<nume>.valegboth.win` sau specifică altul.
3. **Transcrierile Whisper** — link repo / Drive / atașamente / copiate în `/workspace/transcripts/`.
4. **Cloudflare account ID** — îmi trebuie pt. wrangler config.
5. **GitHub username** — pt. setup Actions și repo init.
6. **Confirmare faza 0** — începem cu SvelteKit + D1 + Drizzle + auth + PWA + SRS skeleton, pe date fictive.

Când am 1-6, Faza 0 începe.
