# The 1807 portfolio overhaul release report

## Repository state

- Repository root: `C:\Users\Wildf\OneDrive\Desktop\chains.io-1807streamline`
- Starting branch: `feature/hydrion-product-page`
- Starting HEAD: `c0cf7291867ee752e8ec54cde586729ee74eb5dd`
- Release branch: `release/the1807-portfolio-overhaul`
- Starting `origin/main`: `be59969778c39c241fb13be4ce32c755265d24dc`
- GitHub Pages remains configured for the root of `main`.
- `main` was not checked out, changed, pushed, or deployed.

## Historical restoration

Commit `66feb39` was selected as the behavioral restoration source. It is the last inspected revision with the portrait-led normal portfolio and accessible puzzle before the 1807OS choice was introduced.

Candidates and restoration details are documented in [historical-restoration.md](historical-restoration.md).

The historical puzzle behavior was adapted rather than copied over newer routing, metadata, product work, or certificate infrastructure. The current Canvas 2D neon network was retained because it provides a more efficient version of the historical visual identity.

## Removed systems

- Removed all face-navigation markup, coordinate regions, CSS, JavaScript, and prototype output.
- Removed the OS selector from the puzzle completion flow.
- Removed 1807OS deep routes, application scripts, module registry, shell, station, and stylesheet.
- Retained only a no-index redirect at the former top-level entry URL; obsolete deep URLs resolve through the custom 404 behavior.
- Removed 1807OS from navigation, footer, sitemap, generated route index, About, Contact, and Links.

## Architecture

Primary navigation:

- Work
- Hub
- About
- Contact

Primary routes:

- `/`
- `/work/`
- `/hub/`
- `/hydrion/`
- `/modoroco/`
- `/clipsense/`
- `/about/`
- `/contact/`
- `/certific8te/`

`/home/`, `/products/`, and `/projects/` are compatibility redirects and are excluded from the sitemap.

The homepage contains the shark loader, puzzle, portrait hero, exactly three flagship product panels, Hub preview, capabilities, About summary, contact, and footer.

## Brand implementation

The approved mapping is documented in [brand-asset-map.md](brand-asset-map.md).

- `logo.png`: company header, footer, and metadata.
- `logooss.png`: minimal shark loader and puzzle image.
- `favicon.ico`: default site favicon.
- `logoos.png`: expressive puzzle-completion payoff, requested only after the puzzle is solved.
- Product pages use only owner-supplied product artwork and real screenshots.

No generic icon is used as a company or product logo.

## Assets and privacy

- Six exact duplicate Hydrion screenshots were detected by SHA-256 between `hydrion/hydrion_webpage_photos/` and `assets/images/products/hydrion/`.
- The canonical production location is `assets/images/products/hydrion/`.
- The 22-file, 10.82 MB Hydrion source-export directory is preserved locally and excluded from production.
- Eleven unused Hydrion character exports totaling 22.07 MB are preserved locally and excluded from production. Their visual quality is unchanged; production transfer reduction is 100% because they are not referenced or committed.
- `prototype/` is preserved locally and excluded.
- The certificate file that exposed an email address in its filename was renamed to `Certificate-of-Completion.pdf`.
- The generated certificate manifest contains 13 supported public files and no local paths.
- Known limitation: the approved expressive `logoos.png` is 5.3 MB. It is lazy-requested only after successful puzzle completion and is not loaded on normal or returning-page startup.

## Entry and motion

- Loader duration: 900 ms under normal motion and 120 ms under reduced motion.
- Loader uses the minimal shark and a native CSS scanning signal.
- Puzzle supports pointer, touch, keyboard focus, skip, and failure bypass.
- Completion is remembered in `sessionStorage`.
- Returning visitors enter directly and may replay the intro from the footer.
- The signal field uses Canvas 2D, caps device-pixel-ratio at 1.5, reduces mobile density, pauses when hidden, handles resize, and supports reduced motion.
- No Three.js, GSAP, video background, or new runtime dependency was added.

## Validation

Commands passing:

- `npm run streamline:build`
- `npm run certs:sync`
- `npm run sync`
- `npm run audit`
- `npm run smoke`
- `npm run certs:check`
- `npm run certs:test`
- `npm run hydrion:check`
- `git diff --check`

Browser smoke coverage:

- 28 desktop/mobile route checks.
- Loader-to-puzzle transition.
- Keyboard-focusable puzzle.
- Skip-intro behavior.
- Session persistence and returning visitor bypass.
- Custom 404.
- Broken images, internal resources, console exceptions, layout overflow, signal-field initialization, certificate search, and direct clean-route access.

Representative local measurements from the smoke browser are sequential-run observations, not lab-grade Lighthouse claims:

| Route | Requests | Transfer | JavaScript | CSS | Images | Observed FCP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 17 | 1.27 MB | 32.7 KB | 317 KB | 921 KB | 368–900 ms |
| `/hub/` | 12 | 1.09 MB | 9.6 KB | 17.2 KB | 1.06 MB | 312–484 ms |
| `/hydrion/` | 22–30 | 0.63–4.18 MB | 48.6 KB | 20.1 KB | 0.55–4.10 MB | variable during screenshot media loading |
| `/modoroco/` | 25 | 0.62 MB | 48.6 KB | 20.1 KB | 547 KB | 696–960 ms |
| `/clipsense/` | 25 | 1.45 MB | 48.6 KB | 20.1 KB | 1.37 MB | 0.5–0.9 s normally; one screenshot run was delayed by local browser contention |

Startup media and below-fold media remain separated through native lazy loading.

## Screenshots

Desktop and mobile captures for the homepage, Hub, Hydrion, Modoroco, and ClipSense are stored in `docs/release-screenshots/`.

## Known limitations

- Legacy archive assets that are no longer in primary navigation still produce size warnings; the 36.7 MB robotics video is not loaded by the new portfolio.
- The expressive shark source asset should receive an owner-approved optimized derivative in a future follow-up.
- Performance values above were gathered through the existing local CDP smoke browser rather than Lighthouse.

Merging this branch into `main` will immediately update the public GitHub Pages site. The pull request must remain draft until manual approval.
