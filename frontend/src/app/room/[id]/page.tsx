"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, Send, Link, Check, X } from "lucide-react";
import styles from "./page.module.css";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoPlayer from "@/components/VideoPlayer";

export default function Room() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [userName, setUserName] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        const name = localStorage.getItem("aether_username");
        if (!name) {
            router.push("/");
        } else {
            setUserName(name);
        }
    }, [router]);

    const {
        localStream,
        peers,
        messages,
        sendMessage,
        shareScreen,
        stopScreenShare,
        toggleAudio,
        toggleVideo,
        error,
        isWaiting,
        isHost,
        joinRequests,
        isJoined,
        respondToJoinRequest
    } = useWebRTC(id, userName || "Guest");

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isChatOpen]);

    if (!userName) return null; // Wait for username to load

    const handleToggleMute = () => {
        toggleAudio(isMuted); // If currently muted (true), we want to enable audio
        setIsMuted(!isMuted);
    };

    const handleToggleVideo = () => {
        toggleVideo(isVideoOff);
        setIsVideoOff(!isVideoOff);
    };

    const handleToggleScreen = async () => {
        if (isScreenSharing) {
            await stopScreenShare();
            setIsScreenSharing(false);
        } else {
            const success = await shareScreen(() => setIsScreenSharing(false));
            if (success) setIsScreenSharing(true);
        }
    };

    const handleLeave = () => {
        window.location.href = "/";
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/room/${id}`;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            sendMessage(chatInput);
            setChatInput("");
        }
    };

    return (
        <div className={styles.container}>
            {/* Waiting Room Screen */}
            {isWaiting && !isJoined && (
                <div className={styles.waitingOverlay}>
                    <div className={styles.waitingCard}>
                        <div className={styles.waitingSpinner}></div>
                        <h2>Asking to join...</h2>
                        <p>You will join the meeting when the host lets you in.</p>
                        <button className="btn btn-secondary" onClick={handleLeave} style={{ marginTop: 24 }}>
                            Leave
                        </button>
                    </div>
                </div>
            )}

            {/* Host Join Requests Toast */}
            {isHost && joinRequests.length > 0 && (
                <div className={styles.hostToasts}>
                    {joinRequests.map(req => (
                        <div key={req.socketId} className={styles.toastCard}>
                            <p><strong>{req.userName}</strong> wants to join this meeting.</p>
                            <div className={styles.toastActions}>
                                <button className={styles.toastBtnDeny} onClick={() => respondToJoinRequest(req.socketId, false)}>Deny</button>
                                <button className={styles.toastBtnAdmit} onClick={() => respondToJoinRequest(req.socketId, true)}>Admit</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logoInfo}>
                    <div className={styles.logoIcon}><Video size={20} /></div>
                    <h2>Aether</h2>
                </div>
                <div className={styles.roomInfo}>
                    <button className={styles.roomBadge} onClick={handleCopyLink} title="Copy Meeting Link">
                        {linkCopied ? <Check size={14} /> : <Link size={14} />}
                        {linkCopied ? "Copied Link!" : `Room: ${id}`}
                    </button>
                </div>
                <div className={styles.userInfo}>
                    {isHost && <span className={styles.hostBadge}>Host</span>}
                    {userName}
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Error Banner */}
                {error && (
                    <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "var(--danger)", padding: "10px 20px", borderRadius: 8, zIndex: 50 }}>
                        {error}
                    </div>
                )}

                {/* Video Grid Area */}
                <div className={`${styles.videoGridContainer} ${isChatOpen ? styles.shrink : ""}`}>
                    <div className={styles.videoGrid}>

                        {/* Local Video */}
                        <VideoPlayer
                            stream={isVideoOff ? null : localStream}
                            userName={userName}
                            isLocal={true}
                            isMuted={isMuted}
                        />

                        {/* Remote Peers */}
                        {peers.map((peer) => (
                            <VideoPlayer
                                key={peer.socketId}
                                stream={peer.stream}
                                userName={peer.userName}
                                isLocal={false}
                            />
                        ))}

                    </div>
                </div>

                {/* Chat Sidebar Area */}
                <div className={`${styles.chatSidebar} ${isChatOpen ? styles.open : ""}`}>
                    <div className={styles.chatHeader}>
                        <h3>In-Call Messages</h3>
                        <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => setIsChatOpen(false)}>
                            &times;
                        </button>
                    </div>
                    <div className={styles.chatMessages}>
                        <div className={styles.systemMessage}>Welcome to the room, {userName}!</div>
                        {messages.map((msg) => {
                            const isMine = msg.senderName === userName;
                            return (
                                <div key={msg.id} className={`${styles.chatBubbleWrapper} ${isMine ? styles.chatBubbleWrapperSelf : ""}`}>
                                    {!isMine && <div className={styles.chatSender}>{msg.senderName}</div>}
                                    <div className={`${styles.chatBubble} ${isMine ? styles.chatBubbleSelf : styles.chatBubbleOther}`}>
                                        <div className={styles.chatText}>{msg.message}</div>
                                        <div className={styles.chatTime}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                    <form className={styles.chatInputArea} onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="Send a message..."
                            className="input-field"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button type="submit" className={`btn-icon ${styles.sendBtn}`}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Controls Bar */}
            <footer className={styles.controlsBar}>
                <div className={styles.controlsGroup}>
                    <button
                        className={`btn-icon ${isMuted ? "inactive" : ""}`}
                        onClick={handleToggleMute}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    <button
                        className={`btn-icon ${isVideoOff ? "inactive" : ""}`}
                        onClick={handleToggleVideo}
                        title={isVideoOff ? "Start Camera" : "Stop Camera"}
                    >
                        {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                    </button>

                    <button
                        className={`btn-icon ${isScreenSharing ? "active" : ""}`}
                        onClick={handleToggleScreen}
                        title="Share Screen"
                    >
                        <MonitorUp size={22} />
                    </button>
                </div>

                <button className={`btn btn-danger ${styles.leaveBtn}`} onClick={handleLeave}>
                    <PhoneOff size={20} />
                    <span>Leave Room</span>
                </button>

                <div className={styles.controlsGroup}>
                    <button
                        className={`btn-icon ${isChatOpen ? "active" : ""}`}
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        title="Chat"
                    >
                        <MessageSquare size={22} />
                    </button>
                </div>
            </footer>
        </div>
    );
}
