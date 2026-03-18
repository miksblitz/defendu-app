# How the recommendation system works (plain-English guide)

This document explains **what we built**, **why each step exists**, and **how to know it’s working**.

---

## 1. What problem we’re solving

We have **skill profiles**: each user answered questions about:

- **Physical attributes** – height, weight, age, gender, limitations  
- **Preferences** – preferred techniques, training goals  
- **Past experience** – experience level, martial arts background, duration  
- **Fitness capabilities** – current fitness level, training frequency, injuries  

We want to **recommend “similar” users** (or later, content) so the app can say things like “people like you also did X” or “recommended for your profile”.

**Idea:** Turn each profile into a **vector of numbers**, then define “similar” as **close in that number space**. The machine learning part learns a good way to compress and compare those vectors.

---

## 2. Step 1: Data (what the model sees)

**Where it lives:** Firebase `skillProfiles/{uid}`. For training we export those into a single JSON file (array or object keyed by `uid`).

**What we need:** Every profile must have `physicalAttributes`, `preferences`, `pastExperience`, `fitnessCapabilities`. The Python code matches the app’s `SkillProfile` shape in `data/schema.py`.

**Why it matters:** The model only sees what we put in that JSON. If the app adds a new question, we have to add it to the schema and encoding so the model can use it.

---

## 3. Step 2: Encoding (profile → vector of numbers)

**File:** `features/encode.py`

**Problem:** The model can’t use “Male”, “Punching”, or “Complete Beginner” directly. We need a **fixed-length list of numbers** for every profile.

**What we do:**

- **Numbers (height, weight, age)**  
  We **normalize** them to 0–1 using the same min/max as the app (e.g. height 80–250 cm). So 175 cm → about 0.56.

- **Single choice (e.g. gender, experience level)**  
  **One-hot:** one slot per option, only one is 1, the rest 0.  
  Example: gender `["Male","Female","Other"]` → Male = `[1,0,0]`, Female = `[0,1,0]`.

- **Multiple choice (e.g. techniques, goals, martial arts)**  
  **Multi-hot:** one slot per option, can be 1 in several.  
  Example: techniques Punching + Kicking → `[1,1,0,0,0,0]` for the 6 technique options.

We **concatenate** all these pieces into **one long vector** (same length for every user). That vector is the **input** to the model.

**Why it matters:** Same profile always gives the same vector. The list of options (vocabularies) in `config/vocabularies.py` must match the app exactly, or the encoding is wrong.

---

## 4. Step 3: The model (autoencoder)

**File:** `model/recommendation_model.py`

**What it is:** An **autoencoder** – a network that:

1. Takes the encoded profile vector (input).
2. **Compresses** it through a small “bottleneck” (the **latent** vector, e.g. 32 numbers).
3. **Reconstructs** the original vector from that bottleneck (output).

We **train** it so that output ≈ input (reconstruction error is small). So the bottleneck has to capture the “important” structure of the profile.

**Why we use it:** We don’t have labels like “user A is similar to user B”. So we don’t train “is this pair similar?”. We train “reconstruct the profile”. The **bottleneck (latent) vector** becomes our **profile embedding**: two profiles with similar latent vectors are treated as similar.

**Layers in simple terms:**

- **Dense:** “Multiply by a matrix and add a bias, then apply a function (e.g. ReLU).”
- **BatchNormalization:** Puts activations on a similar scale so training is stable.
- **Dropout:** Randomly zeros some values so the model doesn’t over-rely on a few inputs.

Training: we give the same vector as input and target; the loss (e.g. binary cross-entropy) measures how well we reconstruct it. Over many **epochs**, the encoder learns a good compression.

---

## 5. Step 4: Recommendations (similar = close in latent space)

**File:** `inference.py` and the `recommend()` logic

**After training we only keep the encoder** (input → latent). We do **not** use the decoder for recommendations.

**To recommend for user A:**

1. Encode their profile → vector `v`.
2. Run the encoder → latent vector `e_A`.
3. For every other user B, we already have their encoded vector; we run the encoder to get `e_B`.
4. **Similarity:** e.g. **cosine similarity** between `e_A` and `e_B` (or negative L2 distance). Higher = more similar.
5. **Recommendation:** Sort by similarity and take the **top-k** (e.g. top 5) other users. Those are “similar profiles”.

So: **recommendation = nearest neighbours in latent space.**

---

## 6. End-to-end flow (what runs when)

**Training (`train.py`):**

1. Load profiles from JSON.
2. Encode each → matrix `X` (one row per user).
3. Build autoencoder (input dim = length of one encoded vector, latent dim = e.g. 32).
4. Train: input `X`, target `X` (reconstruct).
5. Save the **encoder** and metadata (input_dim, latent_dim, list of uids) to `output/`.

**Inference (`inference.py`):**

1. Load encoder and metadata.
2. Load the same (or compatible) profiles JSON.
3. If query is “by uid”: get that user’s encoded vector. If “by profile file”: encode that one profile.
4. Get latent for query and for all profiles; compute similarities; return top-k uids + scores.

**Using it in the app:** Either (A) precompute recommendations (e.g. for every uid) and store in Firebase under `recommendations/{uid}`, and the app reads that; or (B) the app calls a backend/Cloud Function that runs the encoder and similarity and returns top-k. Either way, the app just needs to **read** the list of recommended uids (or scores) and show “Recommended for you” or “People like you”.

---

## 7. How to know it’s working

**In the terminal:**

1. **Train:**  
   `python train.py --data sample_profiles.json --epochs 50 --out-dir ./output`  
   You should see loss go down and the encoder saved under `output/encoder`.

2. **Inference:**  
   `python inference.py --model-dir ./output --profiles sample_profiles.json --uid user1 --top-k 3`  
   You should see 3 lines with `uid` and similarity score (and JSON). Different uids should get different rankings (e.g. user4 might be close to user1 if they’re both beginners).

**In the app:**

- **Option A (precomputed):** Run a script that writes recommendations to Firebase (e.g. `recommendations/{uid}/similarUserIds`). In the app, on the dashboard, read that path and show a “Recommended for you” or “People like you” section. If the section appears and shows a number or list when you’re logged in, the pipeline is working end-to-end.
- **Option B (API):** Backend runs the encoder + similarity and returns top-k. The app calls that API and displays the result. If the app shows recommendations that change when you change your profile and retrain, it’s working.

**Sanity checks:**

- More profiles → better similarity (more variety to compare).
- After retraining, recommendations can change (model and embeddings are updated).
- Same profile + same model → same recommendations (deterministic).

---

## 8. Summary table

| Step        | What happens                          | Where |
|------------|----------------------------------------|-------|
| Data       | Export skill profiles to JSON          | Firebase → `profiles.json` |
| Encode     | Profile → one fixed-size number vector | `features/encode.py` |
| Train      | Autoencoder learns to compress vector  | `train.py`, `model/recommendation_model.py` |
| Embed      | Encoder turns vector → latent vector   | Saved `encoder` model |
| Recommend  | Top-k nearest uids in latent space      | `inference.py` |
| Module rank| Optional merge: similar-users + profile–module fit | `export_recommendations.py` + `features/profile_module_fit.py` |
| In app     | Read recommendations, show UI          | Firebase `recommendations/{uid}` or API |

You now know: **data → encode → train (autoencoder) → encoder = embedding → similarity = recommendation**, and how to verify it in the terminal and in the app.

---

## 9. Merged module ranking (Option C)

When you pass **`--modules modules.json`** to `export_recommendations.py`, recommended modules are **re-ranked** by a combination of:

1. **Collaborative score:** How many similar users completed this module (normalized).
2. **Profile–module fit (content):** How well the module matches the user’s capabilities and wants:
   - **Intensity** vs experience/fitness (prefer modules at or slightly above their level).
   - **Wants:** category overlap with preferred techniques and training goals.
   - **Capabilities:** slight penalty for high physical-demand modules if the user has limitations or injuries.

**Merge:** `combined = merge_weight * collab + (1 - merge_weight) * content`. Default `--merge-weight 0.5` gives equal weight. Use `0` for content-only, `1` for similar-users-only.

**Data needed:** Export your Firebase `modules` collection to a JSON file (object keyed by `moduleId` or array of module objects). Each module should include `intensityLevel`, `physicalDemandTags`, `spaceRequirements`, and `category` so profile–module fit can be computed.

---

## 10. Training the model every time (retrain)

To **retrain the AI** with fresh data:

1. **Export skill profiles** from Firebase (`skillProfiles/`) to a JSON file, e.g. `profiles.json`, in or next to `ml-recommendation`.
2. **Run training** from `ml-recommendation` with the venv activated:

   ```powershell
   cd ml-recommendation
   .\.venv\Scripts\Activate.ps1
   python train.py --data profiles.json --epochs 50 --out-dir ./output
   ```

   This overwrites `output/encoder.keras` and `output/metadata.json`. Run this whenever you have new or updated profiles and want the model to reflect them.

3. **Optionally**, right after training, regenerate recommendations:

   ```powershell
   python export_recommendations.py --model-dir ./output --profiles profiles.json --user-progress userProgress.json --modules "D:\DEFENDU\defendu-app\modules.json" --out recommendations.json --top-k-users 5 --top-k-modules 10
   ```

**Convenience script:** From `ml-recommendation` you can run:

- **Train only:** `.\retrain.ps1`
- **Train then export:** `.\retrain.ps1 -ExportAfter -UserProgressPath userProgress.json -ModulesPath "D:\DEFENDU\defendu-app\modules.json"`

Use `-ProfilesPath` if your profiles file is elsewhere (e.g. `.\retrain.ps1 -ProfilesPath ..\exports\profiles.json`).

---

## 11. Why diverse profiles are good for the model

**Yes, diverse profiles are optimal for training.**

- **Richer latent space:** The encoder learns to separate “users like A” from “users like B” when profiles differ (injuries, limb differences, goals, martial arts). If everyone looks the same, similarity is less meaningful.
- **Inclusive recommendations:** Users with limitations (e.g. “no legs”, “knee injury”) get matched to **similar users** and to modules that fit (the profile–module fit layer already penalizes high physical demand when `limitations` or `injuries` are set). Without such profiles in training, the model has nothing to learn from for those cases.
- **Different perspectives:** Varied goals (personal safety only, fitness only, confidence), preferred techniques (punching only vs kicking vs defensive moves), and martial arts backgrounds make the embedding reflect what people want. Recommendations then stay relevant for each segment.

**Included in `diverse_profiles.json`:** 20 profiles with varied attributes: knee/back/shoulder injury, asthma, arthritis; wheelchair / no use of legs / no use of arms / limited both; different ages, goals, martial arts (BJJ, boxing, Krav Maga, Muay Thai, TKD, MMA); beginners to expert. Use it alone or merged with your real exports for training:

```powershell
python train.py --data diverse_profiles.json --epochs 50 --out-dir ./output
```
