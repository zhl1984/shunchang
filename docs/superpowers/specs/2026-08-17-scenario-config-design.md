# Scenario Configuration Design

The page uses a typed `Scenario` model exposed by `src/api/scenario.ts`, a Pinia store mirroring the dataset store, and a focused table page. Until a backend contract is available, the store seeds one clearly marked placeholder record; the API function remains the future integration boundary. Buttons are rendered without mutation behavior.
