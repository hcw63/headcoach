# Head Coach 26

A browser-based NFL head coach franchise game: draft and develop players, manage contracts and the salary cap, build team morale and culture, and call the plays while the game sims the action.

**Play:** https://hcw63.github.io/headcoach/

- Game source lives in `src/` (data, engine, UI, styles).
- `python3 tools/build.py` rebuilds `index.html` (the playable game) from `src/`.
- Player ratings and contracts are the game's own estimates. Saves are kept in each browser's local storage; use Export/Import save to move a season between devices.
