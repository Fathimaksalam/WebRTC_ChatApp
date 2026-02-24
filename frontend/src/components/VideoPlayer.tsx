import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";
import styles from "./VideoPlayer.module.css";

interface VideoPlayerProps {
    stream: MediaStream | null;
    userName: string;
    isMuted?: boolean;
    isLocal?: boolean;
}

export default function VideoPlayer({ stream, userName, isMuted = false, isLocal = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) {
        return (
            <div className={styles.videoWrapper}>
                <div className={styles.videoPlaceholder}>
                    <div className={styles.avatar}>{userName.charAt(0).toUpperCase()}</div>
                </div>
                <div className={styles.videoLabel}>
                    {userName} {isLocal ? "(You)" : ""}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.videoWrapper}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal} // Always mute local video to avoid echo
                className={styles.videoElement}
            />
            <div className={styles.videoLabel}>
                {userName} {isLocal ? "(You)" : ""}
                {isMuted && <MicOff size={14} className={styles.statusIcon} />}
            </div>
        </div>
    );
}
