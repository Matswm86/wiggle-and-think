#!/usr/bin/env python3
"""make_music.py — bake a downloaded track into a beat-aligned seamless loop.

The site's track engine (audio.js) assumes every file in assets/music/ starts
exactly ON beat 1 and is exactly N bars long (4/4), so it can loop the whole
file and lock animations/SFX to the beat grid with zero per-file offsets.

Pipeline per track:
  1. ffmpeg-decode to float32; measure tempo (onset-flux autocorrelation,
     checked against the catalogue's claimed BPM) and the beat-1 phase.
  2. Cut from the first confident downbeat to a whole number of bars,
     ending before any outro fade; 60 ms equal-power crossfade of the seam.
  3. RMS-normalize to a shared loudness target; encode 128k MP3.

Usage:
  python3 tools/make_music.py <raw-file> --bpm <claimed> --slug <name> [--max-bars 48]
Prints a JSON manifest line on success:  {"src": ..., "bpm": ..., "bars": ...}
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 44100
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "assets" / "music"


def decode(path: Path, sr: int = SR, mono: bool = False) -> np.ndarray:
    ch = 1 if mono else 2
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le",
         "-ac", str(ch), "-ar", str(sr), "-"],
        capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    return x if mono else x.reshape(-1, 2)


def onset_flux(mono: np.ndarray, hop: int = 512, win: int = 1024) -> np.ndarray:
    """Spectral-flux onset envelope at SR/hop frames per second."""
    pad = (len(mono) - win) % hop
    if pad:
        mono = np.pad(mono, (0, hop - pad))
    frames = np.lib.stride_tricks.sliding_window_view(mono, win)[::hop]
    mag = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
    flux = np.maximum(np.diff(mag, axis=0), 0).sum(axis=1)
    flux -= flux.mean()
    return np.maximum(flux, 0)


def detect_bpm(flux: np.ndarray, fps: float, claimed: float | None) -> float:
    """Autocorrelation tempo in 50–170 BPM; prefer the peak nearest a claim."""
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lags = np.arange(len(ac))
    cands = []
    for lag in range(int(fps * 60 / 170), int(fps * 60 / 50)):
        if 0 < lag < len(ac) - 1 and ac[lag] >= ac[lag - 1] and ac[lag] >= ac[lag + 1]:
            cands.append((ac[lag], 60.0 * fps / lag))
    if not cands:
        raise SystemExit("no tempo peak found")
    cands.sort(reverse=True)
    if claimed:
        near = [c for c in cands[:12] for m in (0.5, 1.0, 2.0)
                if abs(c[1] * m - claimed) / claimed < 0.04]
        if near:
            best = max(near)[1]
            for m in (0.5, 1.0, 2.0):          # fold into the claimed octave
                if abs(best * m - claimed) / claimed < 0.04:
                    return best * m
    return cands[0][1]


def beat_phase(flux: np.ndarray, fps: float, bpm: float) -> float:
    """Offset (s) of the beat grid that catches the most onset energy."""
    period = fps * 60.0 / bpm
    best, best_e = 0.0, -1.0
    for frac in np.arange(0, 1, 0.02):
        idx = np.arange(frac * period, len(flux) - 1, period).astype(int)
        e = flux[idx].sum()
        if e > best_e:
            best_e, best = e, frac * period
    return best / fps


def bake(raw: Path, claimed_bpm: float | None, slug: str, max_bars: int) -> dict:
    stereo = decode(raw)
    mono = stereo.mean(axis=1)
    fps = SR / 512
    flux = onset_flux(mono)
    bpm = detect_bpm(flux, fps, claimed_bpm)
    if claimed_bpm and abs(bpm - claimed_bpm) / claimed_bpm > 0.04:
        print(f"  ⚠ detected {bpm:.1f} BPM vs claimed {claimed_bpm} — using detected",
              file=sys.stderr)
    spb = 60.0 / bpm
    bar = 4 * spb
    t0 = beat_phase(flux, fps, bpm)
    # skip a near-silent intro: advance bar by bar until the bar has real energy
    rms_all = np.sqrt(np.mean(mono ** 2))
    while t0 + bar < len(mono) / SR:
        seg = mono[int(t0 * SR): int((t0 + bar) * SR)]
        if np.sqrt(np.mean(seg ** 2)) > 0.35 * rms_all:
            break
        t0 += bar
    # usable end: last point still above 35 % of overall RMS (outro fades drop off)
    hop_rms = np.sqrt(np.convolve(mono ** 2, np.ones(SR // 4) / (SR // 4), "same"))
    above = np.nonzero(hop_rms > 0.35 * rms_all)[0]
    t_end = (above[-1] / SR) if len(above) else len(mono) / SR
    bars = int((t_end - t0 - 0.1) / bar)
    bars = max(4, min(bars, max_bars))
    n0, ln = int(t0 * SR), int(round(bars * bar * SR))
    if n0 + ln > len(stereo):
        bars -= 1
        ln = int(round(bars * bar * SR))
    loop = stereo[n0: n0 + ln].copy()
    # equal-power 60 ms crossfade: blend the bar that FOLLOWS the cut into the head
    xf = int(0.06 * SR)
    tail = stereo[n0 + ln: n0 + ln + xf]
    if len(tail) == xf:
        a = np.sin(0.5 * np.pi * np.linspace(0, 1, xf))[:, None]
        loop[:xf] = loop[:xf] * a + tail * np.sqrt(1 - a ** 2)
    # loudness: normalize to a shared RMS target, then true-peak limit
    rms = np.sqrt(np.mean(loop ** 2))
    loop *= min(10 ** (-16 / 20) / max(rms, 1e-9), 0.99 / max(np.abs(loop).max(), 1e-9))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{slug}.mp3"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR),
         "-i", "-", "-c:a", "libmp3lame", "-b:a", "128k", str(out)],
        input=loop.astype(np.float32).tobytes(), check=True)
    return {"src": f"assets/music/{slug}.mp3", "bpm": round(bpm, 2), "bars": bars,
            "secs": round(ln / SR, 2), "kb": out.stat().st_size // 1024}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("raw", type=Path)
    ap.add_argument("--bpm", type=float, default=None, help="claimed BPM from the catalogue")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--max-bars", type=int, default=48)
    args = ap.parse_args()
    print(json.dumps(bake(args.raw, args.bpm, args.slug, args.max_bars)))
