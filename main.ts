// Entry point for the Leonida trophy guide (make.fun bounty gta6-trophy-guide-01). Node 22, standard library only.
// The guide itself is the static site in app/: all 55 Grand Theft Auto VI trophies with their official names,
// descriptions and grades, a written guide and a cited source for each one, a seven-stage roadmap to the platinum,
// and a checklist whose ticks persist in the browser. It runs fully offline: every file it loads sits under app/,
// and the only links that leave the machine are the source citations a reader chooses to follow.
// Running this program is how the entry is handed in: it copies app/ and screenshots/ into the output directory
// and writes dossier.json there with buildDossier from vendor/makefun-frontend.ts. That vendored file stays
// exactly as the kit shipped it, because the scorer rebuilds the dossier with its own copy and expects the
// same bytes back.
// Try the guide locally with `node serve.ts`, then open http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR names the output directory:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
