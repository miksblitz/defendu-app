# Pose data extractor (OpenCV + MediaPipe)

Use this tool to extract MediaPipe pose landmarks from module technique videos and label frames for AI training. Run it on your **computer** (not the mobile app).

Output is **CSV by default**, saved in category folders with filenames like `punching/Jab_MikelAboyme_pose_data.csv`.

## Setup

```bash
cd pose-data-extractor
pip install -r requirements.txt
```

## Usage

**With module info (recommended)** – output goes to `category/Title_Trainer_pose_data.csv`:

```bash
python extract_pose_data.py --video "https://...video.mp4" --title "Jab fundamentals" --trainer "Mikel Aboyme" --category "Punching"
```

Creates: `punching/Jabfundamentals_MikelAboyme_pose_data.csv`

**Category folders:** punching, kicking, elbow_strikes, knee_strikes, defensive_moves (plus "other" for unknown categories).

**From a local file with custom output:**

```bash
python extract_pose_data.py --video path/to/video.mp4 --output punching/MyDrill_Trainer_pose_data.csv
```

**Slower playback and portrait display (default):**

- Video plays at **half speed** by default (`--speed 0.5`). Use `--speed 0.25` for quarter speed.
- **Portrait mode** is on by default (landscape videos are rotated 90° so they display upright). Use `--no-portrait` to keep landscape.
- Window is limited to **640px height** by default. Use `--max-height 480` for a smaller window.

Example: quarter speed, smaller window:

```bash
python extract_pose_data.py --video video.mp4 --output out.xlsx --speed 0.25 --max-height 480
```

A window opens showing the video with the MediaPipe skeleton overlay.

## Keys

| Key | Label saved |
|-----|-------------|
| **U** | jab |
| **I** | hook |
| **O** | uppercut |
| **G** | good_rep |
| **P** | positive |
| **N** | bad |
| **Space** | Pause / resume video |
| **Q** | Quit and save Excel file |

When you see a good rep (or the move you want to label), press the key. That frame's 33 pose landmarks (x, y, z, visibility) are written to the Excel file. Press **Q** when done to save and exit.

## Output

Excel file columns: `frame`, `label`, then `lm_0_x`, `lm_0_y`, `lm_0_z`, `lm_0_v`, … for all 33 landmarks. Use this file to train your mobile pose model (e.g. good vs bad rep, or jab/hook/uppercut classifier).
