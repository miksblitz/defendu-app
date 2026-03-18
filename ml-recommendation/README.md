# DEFENDU Skill Profile Recommendation (TensorFlow)

Machine learning pipeline for **recommending similar users** (or later: content) based on DEFENDU skill profiles. It uses:

- **Physical attributes** (height, weight, age, gender, limitations)
- **Preferences** (preferred techniques, training goals)
- **Past experience** (experience level, martial arts background, duration)
- **Fitness capabilities** (current level, training frequency, injuries)

Data and option values match the app screens: `physicalAttributesQuestion`, `preferencesQuestions`, `pastexperienceQuestion`, `fitnessCapabilitiesQuestion`.

## Setup

**You must use Python 3.10, 3.11, or 3.12.** Python 3.13/3.14 often cause `metadata-generation-failed` or “No matching distribution” when installing numpy/TensorFlow, so the venv must be created with an older interpreter.

**1. Create a venv with a supported Python** (from **`ml-recommendation`**):

```powershell
# If you have Python 3.12 installed (e.g. as py -3.12):
py -3.12 -m venv .venv

# Or use the full path to a supported Python, e.g.:
# C:\Python312\python.exe -m venv .venv
```

**2. Activate and install:**

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**3. Run training:**

```powershell
python train.py --data sample_profiles.json --epochs 50 --out-dir ./output
```

**Don’t have 3.10–3.12?** Install [Python 3.12](https://www.python.org/downloads/) (or 3.11) and use it to create the venv as above.

## Data: Export skill profiles

Profiles live in Firebase at `skillProfiles/{uid}`. Export them to a single JSON file in one of these formats:

**Option A – Array (e.g. from Firebase export or admin export):**

```json
[
  {
    "uid": "user1",
    "physicalAttributes": { "height": 175, "weight": 70, "age": 28, "gender": "Male" },
    "preferences": { "preferredTechnique": ["Punching"], "trainingGoal": ["Personal Safety"] },
    "pastExperience": { "experienceLevel": "Complete Beginner", "martialArtsBackground": [], "previousTrainingDetails": "None" },
    "fitnessCapabilities": { "currentFitnessLevel": "Moderate", "trainingFrequency": "1-2 times per week" }
  }
]
```

**Option B – Object keyed by UID (e.g. Firebase Realtime DB export):**

```json
{
  "user1": { "physicalAttributes": { ... }, "preferences": { ... }, "pastExperience": { ... }, "fitnessCapabilities": { ... } }
}
```

Save as e.g. `profiles.json` in `ml-recommendation` (or pass the path to the scripts).

## Train

Run from **`ml-recommendation`** (so that `data`, `config`, `features`, `model` resolve):

```bash
cd ml-recommendation
python train.py --data profiles.json --epochs 50 --latent-dim 32 --out-dir ./output
```

- **`--data`** – Path to your profiles JSON.
- **`--epochs`** – Training epochs (default 50).
- **`--latent-dim`** – Size of the profile embedding (default 32).
- **`--out-dir`** – Where to save the encoder and metadata (default `./output`).

Outputs:

- `output/encoder/` – Keras encoder model (embedding only).
- `output/metadata.json` – `input_dim`, `latent_dim`, `uids`.
- `output/profile_uids.json` – List of UIDs in training order.

## Recommend (inference)

Get the **top-k profiles most similar** to a given profile.

**By UID** (query user is in the same `--profiles` file):

```bash
python inference.py --model-dir ./output --profiles profiles.json --uid USER_UID --top-k 5
```

**By single profile file** (e.g. one profile JSON):

```bash
python inference.py --model-dir ./output --profiles profiles.json --profile query_profile.json --top-k 5
```

Results are printed as tab-separated `uid score` and as JSON.

## How it works

1. **Encode** – Each profile is turned into a fixed-size vector:
   - Numerics (height, weight, age) → min-max normalized.
   - Single-choice (gender, experience level, fitness level, etc.) → one-hot.
   - Multi-choice (techniques, goals, martial arts) → multi-hot.

2. **Model** – A small **autoencoder** (TensorFlow/Keras) is trained to reconstruct the encoded vector. The **bottleneck (latent) vector** is used as the profile embedding.

3. **Recommendation** – For a query profile, we take its latent vector and find the **top-k** profiles with the highest **cosine similarity** (or L2 similarity) in latent space.

So “recommendation” here means **“profiles similar to this one”** (e.g. for “users like you” or as input to another recommender).

## Using the encoder in your app/backend

1. Export the encoder (e.g. from `output/encoder`) to your backend or a small service.
2. When a user opens the app or a “recommended for you” screen:
   - Encode their skill profile with the same `encode_profile()` logic (or call a small Python/Node service that uses this encoder).
   - Compute similarities against all (or a subset of) profile embeddings.
   - Return the top-k UIDs or use them to fetch content.

You can reimplement the encoding in TypeScript/JavaScript using the same vocabularies and normalization so the app never needs to call Python at request time.

## How to see it working in the app

The app dashboard shows **"Recommended for you"** – the **best-suited modules** for each user. Recommendations **refresh every 5 modules** the user completes (you re-run the export with the latest completion data and re-upload to Firebase).

**1. Track completed modules**

The app records completion when the user taps **Save Progress** on the module complete step. Data is stored at `userProgress/{uid}` with `completedModuleIds` (array) and `completedCount`. Add Firebase rules so each user can read/write their own:

```json
"userProgress": {
  "$uid": {
    ".read": "$uid === auth.uid",
    ".write": "$uid === auth.uid"
  }
}
```

**2. Generate recommendations (similar users + recommended modules)**

With only profiles (no completion data):

```bash
python export_recommendations.py --model-dir ./output --profiles profiles.json --out recommendations.json --top-k-users 5
```

With completion data (so each user gets **recommended module IDs** – modules that similar users completed):

- Export from Firebase: `userProgress` (each key = uid, value = `{ completedModuleIds: string[], completedCount: number }`) into e.g. `userProgress.json`.
- Run:

```bash
python export_recommendations.py --model-dir ./output --profiles profiles.json --user-progress userProgress.json --out recommendations.json --top-k-users 5 --top-k-modules 10
```

Output shape: `{ "uid1": { "similarUserIds": [...], "recommendedModuleIds": ["moduleId1", ...] }, ... }`.

**Merged ranking (similar users + profile–module fit)** – If you pass a modules JSON, recommendations are re-ranked by both “similar users did it” and “best suited to this profile” (intensity, goals, limitations). You need a modules export first:

1. **Export modules from Firebase** (Realtime Database). From the **defendu-app** project root:

   ```bash
   cd defendu-app
   node scripts/export-modules.js
   ```
   This writes `modules.json` in the app root (only `moduleId`, `intensityLevel`, `physicalDemandTags`, `spaceRequirements`, `category`). To write directly into ml-recommendation:  
   `node scripts/export-modules.js ../ml-recommendation/modules.json`

   **Credentials:** Same as other admin scripts. Either put `serviceAccountKey.json` in the **defendu-app** project root (download from Firebase Console → Project Settings → Service Accounts → Generate new private key), or set `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` and `FIREBASE_DATABASE_URL`.

2. **Run export with `--modules` and optional `--merge-weight`:**

   ```bash
   cd ml-recommendation
   python export_recommendations.py --model-dir ./output --profiles profiles.json --user-progress userProgress.json --modules modules.json --merge-weight 0.5 --out recommendations.json --top-k-modules 10
   ```
   `--merge-weight 0.5` = 50% similar-users, 50% profile–module fit. Use `1` for similar-users only, `0` for profile–module fit only.

**3. Write to Firebase**

Upload each `recommendations/{uid}` with **both** `similarUserIds` and `recommendedModuleIds` (arrays). The dashboard uses `recommendedModuleIds` to show the "Recommended for you" module cards.

**4. Firebase rules for recommendations**

```json
"recommendations": {
  "$uid": {
    ".read": "$uid === auth.uid",
    ".write": "auth.uid !== null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
  }
}
```

**5. Refresh every 5 completed modules**

When a user completes their 5th, 10th, 15th, … module, the app shows an alert that recommendations have been refreshed. To actually update the list:

- Re-export `userProgress` from Firebase.
- Re-run `export_recommendations.py` with `--user-progress userProgress.json`.
- Re-upload the new `recommendations.json` to Firebase (overwrite `recommendations/{uid}` for each user).

You can run this manually after milestones or automate it (e.g. scheduled job or Cloud Function that exports userProgress, runs the script, and writes back to Firebase).

**Learn the pipeline:** See **`HOW_IT_WORKS.md`** for the full explanation of data, encoding, model, and similarity.

## File layout

```
ml-recommendation/
├── config/
│   └── vocabularies.py   # Categorical options (aligned with app)
├── data/
│   ├── schema.py        # SkillProfile dataclasses + from_dict
│   └── load_data.py     # load_profiles_from_json()
├── features/
│   └── encode.py        # encode_profile(), get_encoding_dim()
├── model/
│   └── recommendation_model.py  # Autoencoder + encoder
├── train.py             # Train and save encoder + metadata
├── inference.py         # Top-k similar profiles
├── export_recommendations.py   # Export per-uid recommendations to JSON
├── HOW_IT_WORKS.md      # Plain-English guide to the whole pipeline
├── requirements.txt
└── README.md
```

Keep **`config/vocabularies.py`** in sync with the app’s question screens so encoding matches what users see.
