---
name: pre-push-checks
description: Vérifier que tous les jobs de la pipeline CI (quality, e2e-smoke) passent avant de pousser sur main, sur origin ou sur lionel. À utiliser dès qu'on commite ou pousse du code du dashboard SENDAM.
---

# Vérifications avant push

Ne jamais pousser tant que **tous** les jobs de `.github/workflows/ci.yml` n'ont pas passé en local. La CI tourne sur `main` et sur les pull requests.

## Les jobs à rejouer

1. **quality** : `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`.
2. **e2e-smoke** (après quality) : build de production, puis les tests Playwright `auth-smoke`, `auth-expiration`, `register-scroll` et `qr-payload`, avec `--workers=1`.

Si la CI change (jobs ou specs), relire `ci.yml` et rejouer exactement ces étapes.

## Procédure

Rejouer la pipeline sur le **commit** à pousser, dans un worktree propre, pour ne pas toucher au serveur de dev (port 3000) ni à son dossier `.next`.

```powershell
git worktree add --detach D:\ci-wt HEAD
cd D:\ci-wt
pnpm install --frozen-lockfile
$env:NEXT_PUBLIC_API_BASE_URL = 'https://dstest.easywaka.com'
pnpm lint; pnpm exec tsc --noEmit; pnpm build
$env:CI = '1'; $env:PORT = '3100'
pnpm exec playwright install chromium
pnpm exec playwright test tests/e2e/auth-smoke.spec.ts tests/e2e/auth-expiration.spec.ts tests/e2e/register-scroll.spec.ts tests/e2e/qr-payload.spec.ts --workers=1
```

Nettoyage une fois fini : supprimer `D:\ci-wt\node_modules`, puis `git worktree remove --force D:\ci-wt` et `git worktree prune`.

Les avertissements ESLint existants ne bloquent pas (seules les erreurs comptent). Chaque commande doit se terminer avec le code 0.

## Pièges Windows déjà rencontrés

- **Chemin court obligatoire** : un worktree dans un dossier au chemin long (par exemple le dossier temporaire de l'assistant) fait échouer `pnpm build` avec « Can't resolve … » sur presque tous les modules, car les chemins sous `node_modules/.pnpm` dépassent 260 caractères. Utiliser un chemin court comme `D:\ci-wt`.
- **Installer depuis PowerShell, pas depuis Git Bash** : Git Bash crée des liens symboliques de style `/tmp/...` que Turbopack ne sait pas suivre. Lancer `pnpm install` et `pnpm build` depuis PowerShell.
- **Ne pas lancer `pnpm build` dans le projet principal** pendant que `next dev` tourne : le build écrase `.next` et casse le serveur de dev.
- **Ne pas partager `node_modules` par un lien** entre le projet et le worktree : Turbopack ne le suit pas non plus.
- `gh` n'est pas installé sur cette machine : le résultat de la CI GitHub se consulte sur le site, pas en ligne de commande.

## Pousser

Une fois tout au vert :

- Remotes : `origin` (jakemelvin/ls-board) et `lionel` (EazyWaka/SENDAM-Dashboard).
- Avant de pousser, `git fetch` les deux remotes et vérifier qu'ils ne sont pas en avance sur `main` (`git rev-list --left-right --count main...origin/main`).
- Pousser sur `origin main`, puis sur `lionel main`.
- Messages de commit : style `fix: …` / `feat: …`, en anglais, factuels. Aucune mention de co-auteur ni d'outil.
- Ne pas committer `tsconfig.tsbuildinfo`, `.claude/launch.json` ni `skills-lock.json`.

Si un job échoue : corriger, recommiter, puis rejouer **toute** la procédure avant de pousser.
