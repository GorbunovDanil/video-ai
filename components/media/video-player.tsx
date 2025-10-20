"use client";

import { useRef, useState } from "react";
import { PauseIcon, PlayIcon, RotateCwIcon, Volume2Icon, VolumeXIcon } from "lucide-react";

export function VideoPlayer({
  src,
  poster,
  aspect = "9/16",
  caption,
}: {
  src: string;
  poster?: string;
  aspect?: string;
  caption?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
    setIsPlaying(true);
  };

  return (
    <figure className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div
          className="relative w-full"
          style={{ aspectRatio: aspect ?? "16/9" }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={src}
            poster={poster}
            muted={isMuted}
            loop
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-slate-950/80 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-full border border-slate-700 p-1.5 text-white transition hover:border-slate-500"
            >
              {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-full border border-slate-700 p-1.5 text-white transition hover:border-slate-500"
            >
              {isMuted ? <VolumeXIcon className="h-4 w-4" /> : <Volume2Icon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={restart}
              className="rounded-full border border-slate-700 p-1.5 text-white transition hover:border-slate-500"
            >
              <RotateCwIcon className="h-4 w-4" />
            </button>
          </div>
          <span className="text-slate-400">{caption ?? "Preview"}</span>
        </div>
      </div>
      {caption ? <figcaption className="text-xs text-slate-400">{caption}</figcaption> : null}
    </figure>
  );
}
