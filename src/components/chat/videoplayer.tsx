import './videoplayer.css';
import { useEffect, useRef, useState } from "react";

export const VideoPlayer = ({ src, width, height }: { src: string, width: number, height: number }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else void videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) setDuration(videoRef.current.duration);
    };

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !videoRef.current || duration === 0) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const newTime = (clickX / width) * duration;

        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.readyState >= 1) {
            setDuration(video.duration);
        }
    }, [src]);

    const progress = (currentTime / duration) * 100 || 0;

    return (
        <div className="video-player-container" style={{ width: `${width}px`, height: `${height}px`, position: 'relative', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                src={src}
                className="chat-video-element"
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleLoadedMetadata}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />

            {!isPlaying && (
                <button className="center-play-button" onClick={togglePlay}>
                    <span className="material-symbols-rounded">play_arrow</span>
                </button>
            )}

            <div className="video-controls-toolbar">
                <div
                    className="progress-bar-wrapper"
                    onClick={handleScrub}
                    ref={progressBarRef}
                >
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${String(progress)}%` }} />
                    </div>
                </div>

                <div className="toolbar-content">
                    <div className="toolbar-left">
                        <button className="icon-btn" onClick={togglePlay}>
                            <span className="material-symbols-rounded">
                                {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                        <div className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>

                    <div className="toolbar-right">
                        <button className="icon-btn">
                            <span className="material-symbols-rounded">volume_up</span>
                        </button>
                        <button className="icon-btn" onClick={() => videoRef.current?.requestFullscreen()}>
                            <span className="material-symbols-rounded">fullscreen</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};