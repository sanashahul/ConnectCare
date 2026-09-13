# Cadence — prototype

A single-file, dependency-free prototype of an Anki-shaped study client that
lives inside the school's LMS. Open `index.html` in any browser; there is no
build step and no network call.

## What it demonstrates

| Flow | Where |
| --- | --- |
| Conversational setup that designs the app (load, Step target, accent, theme, card size, density) | first run, and Preferences → Run setup again |
| LMS connection and the nightly deck build | Canvas tab |
| Anki deck list with live New / Learn / Due counts | Decks tab |
| Reviewer with real scheduling (`1`–`4`, space, Esc) | Study Now |
| School deck exchange with drag-to-sort import | Exchange tab |
| Step 1 pacing and tag-matched unsuspending | Step 1 tab |

## Notes on fidelity

- New-card counts are capped by the daily limit chosen during setup, the way
  Anki caps them. Change the limit in Preferences and the deck list re-splits.
- Answering moves cards between the three count columns: new → learning,
  a lapse sends a review card back to learning.
- Intervals are computed per card state and formatted as Anki formats them
  (`<1m`, `<6m`, `1d`, `2.4mo`).
- Only a slice of tonight's build is written out as real cards; the deck counts
  carry the remainder, and the congratulations screen says so rather than
  pretending otherwise.

Ridgeline SOM, the student and the exchange decks are invented. The medical
content, objective codes and scheduling behavior are real.
