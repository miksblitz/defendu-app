#!/usr/bin/env python3
"""
Extract MediaPipe pose landmarks from a video and label frames with keypresses.
Output: Excel file with columns [frame, label, landmark_0_x, landmark_0_y, ...] for training.

Usage:
  python extract_pose_data.py --video "https://res.cloudinary.com/.../video.mp4" --output jab_data.xlsx
  python extract_pose_data.py --video path/to/local.mp4 --output reps.xlsx
  python extract_pose_data.py --video video.mp4 --output out.xlsx --speed 0.5

Options:
  --speed  Playback speed (default 1.0). Use 0.5 for half speed, 0.25 for quarter.
  --portrait  Rotate display to portrait (for landscape videos).
  --max-height  Max display height in pixels (default 640). Window is smaller.

Keys:
  U - Good rep (label: good_rep)
  J - Jab (label: jab)
  H - Hook (label: hook)
  P - Other positive (label: positive)
  N - Bad / skip (label: bad)
  Space - Pause / resume
  Q - Quit and save to Excel
"""

import argparse
import re
import tempfile
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import pandas as pd


# Key -> label for exporting
KEY_LABELS = {
    "u": "good_rep",
    "j": "jab",
    "h": "hook",
    "p": "positive",
    "n": "bad",
}

MP_POSE_LANDMARK_COUNT = 33

# Category -> folder name (lowercase, underscores)
CATEGORY_FOLDERS = {
    "punching": "punching",
    "kicking": "kicking",
    "elbow strikes": "elbow_strikes",
    "knee strikes": "knee_strikes",
    "defensive moves": "defensive_moves",
}


def slug(s: str) -> str:
    """One word: no spaces, alphanumeric only. E.g. 'Jab fundamentals' -> 'Jabfundamentals', 'Mikel Aboyme' -> 'MikelAboyme'."""
    if not s or not isinstance(s, str):
        return "module"
    # Remove non-alphanumeric, collapse spaces to nothing (so "Jab fundamentals" -> "Jabfundamentals")
    out = re.sub(r"[^a-zA-Z0-9]+", "", s.strip())
    return out or "module"


def category_folder(category: str) -> str:
    """Map module category to folder name."""
    if not category:
        return "other"
    key = category.strip().lower()
    return CATEGORY_FOLDERS.get(key) or re.sub(r"[^a-zA-Z0-9]+", "_", key).strip("_") or "other"


def default_output_path(title: str, trainer: str, category: str) -> str:
    """Build path like punching/Jab_MikelAboyme_pose_data.csv."""
    folder = category_folder(category)
    title_slug = slug(title) or "module"
    trainer_slug = slug(trainer) or "trainer"
    name = f"{title_slug}_{trainer_slug}_pose_data.csv"
    return f"{folder}/{name}"


def download_video(url: str) -> str:
    """Download video from URL to a temp file; return local path."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        path = f.name
    urllib.request.urlretrieve(url, path)
    return path


def landmark_row(landmarks, frame_index: int, label: str) -> dict:
    """Build a flat dict for one frame: frame, label, then l0_x, l0_y, l0_z, l0_v, ..."""
    row = {"frame": frame_index, "label": label}
    for i, lm in enumerate(landmarks.landmark):
        if i >= MP_POSE_LANDMARK_COUNT:
            break
        row[f"lm_{i}_x"] = lm.x
        row[f"lm_{i}_y"] = lm.y
        row[f"lm_{i}_z"] = lm.z
        row[f"lm_{i}_v"] = lm.visibility
    return row


def run(video_path: str, output_path: str, speed: float = 1.0, portrait: bool = True, max_height: int = 640) -> None:
    mp_pose = mp.solutions.pose
    mp_draw = mp.solutions.drawing_utils
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    # Delay between frames: slower speed = longer delay (e.g. 0.5 speed = 2x delay)
    delay_ms = max(1, int(1000 / (fps * speed)))

    records = []
    paused = False
    current_label = "good_rep"
    last_frame_index = -1
    last_landmarks = None

    print("Keys: U=good_rep, J=jab, H=hook, P=positive, N=bad, Space=pause, Q=quit & save")
    print("When you see a good rep, press U (or J/H/P/N) to save that frame's pose.\n")

    frame_index = -1
    while True:
        if not paused:
            ret, frame = cap.read()
            if not ret:
                break
            frame_index += 1
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)
            last_frame_index = frame_index
            last_landmarks = results.pose_landmarks

            if results.pose_landmarks:
                mp_draw.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    mp_draw.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                    mp_draw.DrawingSpec(color=(255, 255, 255), thickness=1),
                )

            cv2.putText(
                frame,
                f"Frame {frame_index} / {total_frames} | Next label: {current_label}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )

            # Portrait: rotate landscape video 90° counterclockwise for upright display
            if portrait:
                frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            # Resize to smaller window (max height in pixels)
            h, w = frame.shape[:2]
            if h > max_height:
                scale = max_height / h
                new_w = int(w * scale)
                frame = cv2.resize(frame, (new_w, max_height), interpolation=cv2.INTER_AREA)

            cv2.imshow("Pose - press key to label frame, Q to quit", frame)

        key = cv2.waitKey(delay_ms if not paused else 0) & 0xFF
        if key == ord("q"):
            break
        if key == ord(" "):
            paused = not paused
            continue
        if key in [ord(k) for k in KEY_LABELS]:
            label = KEY_LABELS[chr(key)]
            if last_landmarks is not None:
                row = landmark_row(last_landmarks, last_frame_index, label)
                records.append(row)
                print(f"Recorded frame {last_frame_index} as {label}")
            else:
                print("No pose in current frame, not recorded.")

    cap.release()
    cv2.destroyAllWindows()
    pose.close()

    if not records:
        print("No frames recorded. Exiting.")
        return

    df = pd.DataFrame(records)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    if str(output_path).lower().endswith(".csv"):
        df.to_csv(output_path, index=False)
    else:
        df.to_excel(output_path, index=False, engine="openpyxl")
    print(f"Saved {len(records)} rows to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Extract pose landmarks from video with keypress labels")
    parser.add_argument("--video", required=True, help="Video URL or local file path")
    parser.add_argument("--output", help="Output path (default: category/Title_Trainer_pose_data.csv if --title/--trainer/--category given)")
    parser.add_argument("--title", help="Module title (for default output filename)")
    parser.add_argument("--trainer", help="Trainer name (for default output filename)")
    parser.add_argument("--category", help="Module category: Punching, Kicking, Elbow Strikes, Knee Strikes, Defensive Moves (creates that folder)")
    parser.add_argument("--speed", type=float, default=0.5, help="Playback speed (default 0.5 = half speed)")
    parser.add_argument("--no-portrait", action="store_true", help="Do not rotate to portrait (keep landscape)")
    parser.add_argument("--max-height", type=int, default=640, help="Max display height in pixels (default 640)")
    args = parser.parse_args()

    output_path = args.output
    if not output_path and args.title and args.trainer and args.category:
        output_path = default_output_path(args.title, args.trainer, args.category)
        print(f"Output: {output_path}")
    if not output_path:
        output_path = "pose_data.csv"

    video_path = args.video
    if video_path.startswith("http://") or video_path.startswith("https://"):
        print("Downloading video...")
        video_path = download_video(video_path)
        try:
            run(
                video_path,
                output_path,
                speed=args.speed,
                portrait=not args.no_portrait,
                max_height=args.max_height,
            )
        finally:
            Path(video_path).unlink(missing_ok=True)
    else:
        run(
            video_path,
            output_path,
            speed=args.speed,
            portrait=not args.no_portrait,
            max_height=args.max_height,
        )


if __name__ == "__main__":
    main()
