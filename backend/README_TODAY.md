# Today's checklist — Person 1 (API + Backend + Data)

## 1. Accounts (do first, ~10 min)
- [ ] Dashboard account at dashboard.fortyguard.com
- [ ] Generate one heatmap visually for each city (Ashburn VA + Phoenix)
- [ ] Generate API key in Profile tab
- [ ] Clone the Temperature API Quickstart repo, run notebooks 00 and 01
- [ ] Note your plan tier (Basic/Premium) and tell the team

## 2. Backend (runs today, no key required)
- [ ] `pip install -r requirements.txt`
- [ ] `cp .env.example .env`
- [ ] `uvicorn main:app --reload --port 8000`
- [ ] Open http://localhost:8000/docs — hit `/api/environmental/northern_virginia`
      and `/api/environmental/phoenix`, confirm you get back JSON matching
      the data contract (mock data, but same shape Person 2/3 will consume)

## 3. Hand off to the team NOW, don't wait for step 4
Tell Person 2 and Person 3: "hit localhost:8000/api/environmental/{city} —
build against this today, I'll swap mock for live data underneath without
changing the shape."

## 4. Go live (once you have a real key + quickstart's `fortyguard` package)
- [ ] Copy the `fortyguard` package from the quickstart repo into this
      project (or `pip install` it if it's packaged that way — check the
      quickstart README)
- [ ] Set `FORTYGUARD_MOCK_MODE=false` in `.env`
- [ ] Re-test both endpoints — compare live values against what you saw
      in notebook 01/02 to sanity-check units and field names
- [ ] Confirm caching is working: hit the same city+date+time twice,
      second call should be instant (reading from `.cache/`, not the API)

## 5. If you have time left today
- [ ] Add the other 3 demo-city options (Dallas-Fort Worth, Atlanta, Chicago)
      to `config.py` — same pattern, just new polygon + point
- [ ] Wire up `persistence_hours` (heat persistence) — check the handbook's
      endpoint docs for how FortyGuard exposes this, or compute it yourself
      from repeated heatmap/env_params calls across a time range
