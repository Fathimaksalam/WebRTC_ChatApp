"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, MessageSquare, Send, Link, Check, Moon, Sun, Hand, SmilePlus } from "lucide-react";
import styles from "./page.module.css";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoPlayer from "@/components/VideoPlayer";
import { useTheme } from "@/context/ThemeContext";

const EMOJIS = ["👍", "❤️", "😂", "👏", "🎉", "😮"];

export default function Room() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    const [userName, setUserName] = useState("");
    const [namePrompt, setNamePrompt] = useState("");
    const [needsName, setNeedsName] = useState(false);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    // Interactions State
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
        const name = localStorage.getItem("syncmeet_username");
        if (!name) {
            setNeedsName(true);
        } else {
            setUserName(name);
        }
    }, []);

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (namePrompt.trim()) {
            localStorage.setItem("syncmeet_username", namePrompt.trim());
            setUserName(namePrompt.trim());
            setNeedsName(false);
        }
    };

    const {
        localStream, peers, messages, sendMessage, shareScreen,
        stopScreenShare, toggleAudio, toggleVideo, error, isWaiting,
        isHost, joinRequests, isJoined, respondToJoinRequest,
        reactions, raisedHands, sendReaction, toggleHand
    } = useWebRTC(id, userName || "Guest");

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isChatOpen]);

    if (needsName) {
        return (
            <div className={styles.container}>
                <div className={styles.namePromptOverlay}>
                    <form onSubmit={handleNameSubmit} className={`glass-panel ${styles.namePromptCard}`} style={{ maxWidth: 400, padding: 32, borderRadius: 16 }}>
                        <h2 style={{ marginBottom: 8, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Join Meeting</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Please enter your display name to join the call.</p>

                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>YOUR NAME</label>
                        <input
                            type="text"
                            className={styles.chatInputNeo}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                            placeholder="e.g. Alex"
                            value={namePrompt}
                            onChange={e => setNamePrompt(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className={`btn btn-primary`} style={{ marginTop: 24, width: '100%' }} disabled={!namePrompt.trim()}>
                            Join Meeting
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!userName) return null;

    const handleToggleMute = () => {
        toggleAudio(isMuted);
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

    const handleToggleHand = () => {
        setIsHandRaised(!isHandRaised);
        toggleHand();
    };

    const handleSendReaction = (emoji: string) => {
        sendReaction(emoji);
        setShowEmojiPicker(false);
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

    const renderReactions = (targetSocketId: string | 'local') => {
        const peerIds = peers.map(p => p.socketId);
        const userReactions = reactions.filter(r => {
            if (targetSocketId === 'local') return !peerIds.includes(r.socketId);
            return r.socketId === targetSocketId;
        });

        return userReactions.map(r => (
            <div key={r.id} className={styles.floatingReaction}>
                {r.emoji}
            </div>
        ));
    };

    return (
        <div className={styles.container}>
            {/* Waiting Room */}
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
                    <div className={styles.logoCircles} style={{ position: 'relative', width: 28, height: 28, marginRight: 8 }}>
                        <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#3b82f6', top: 0, right: 0 }}></div>
                        <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#8b5cf6', bottom: 0, left: 0, mixBlendMode: 'screen' }}></div>
                    </div>
                    <h2>SyncMeet</h2>
                </div>

                <div className={styles.headerActions}>
                    <button className={styles.roomBadge} onClick={handleCopyLink} title="Copy Meeting Link">
                        {linkCopied ? <Check size={14} /> : <Link size={14} />}
                        {linkCopied ? "Copied Link!" : `Room ID: ${id}`}
                    </button>
                    <button className={styles.themeToggleNav} onClick={toggleTheme}>
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {error && (
                    <div className={styles.errorBanner}>{error}</div>
                )}

                <div className={`${styles.videoGridContainer} ${isChatOpen ? styles.shrink : ""}`}>
                    <div className={styles.videoGrid}>
                        {/* Local Video */}
                        <div className={styles.videoContainerWrapper}>
                            <VideoPlayer
                                stream={isVideoOff ? null : localStream}
                                userName={userName}
                                isLocal={true}
                                isMuted={isMuted}
                            />
                            {isHandRaised && <div className={styles.handIndicator}><Hand size={20} color="#eab308" /></div>}
                            {renderReactions('local')}
                        </div>

                        {/* Remote Peers */}
                        {peers.map((peer) => (
                            <div key={peer.socketId} className={styles.videoContainerWrapper}>
                                <VideoPlayer
                                    stream={peer.stream}
                                    userName={peer.userName}
                                    isLocal={false}
                                />
                                {raisedHands.includes(peer.socketId) && <div className={styles.handIndicator}><Hand size={20} color="#eab308" /></div>}
                                {renderReactions(peer.socketId)}
                            </div>
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
                        <div className={styles.systemMessage}>Secure, peer-to-peer chat started.</div>
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
                            placeholder="Type a message..."
                            className={styles.chatInputNeo}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button type="submit" className={styles.sendNeoBtn}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Controls Bar */}
            <footer className={styles.controlsBar}>
                <div className={styles.controlsGroup}>
                    {/* Time or custom subtle UI could go here */}
                    {isHost && <span className={styles.hostBadgeNeo}>Host</span>}
                    <span className={styles.userNameNeo}>{userName}</span>
                </div>

                <div className={styles.centerControls}>
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
                        {isVideoOff ? <VideoOff size={22} /> : <VideoIcon size={22} />}
                    </button>

                    <button
                        className={`btn-icon ${isScreenSharing ? "active" : ""}`}
                        onClick={handleToggleScreen}
                        title="Share Screen"
                    >
                        <MonitorUp size={22} />
                    </button>

                    <div className={styles.reactionWrapper}>
                        <button
                            className={`btn-icon`}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            title="React"
                        >
                            <SmilePlus size={22} />
                        </button>
                        {showEmojiPicker && (
                            <div className={styles.emojiPicker}>
                                {EMOJIS.map(e => (
                                    <button key={e} onClick={() => handleSendReaction(e)} className={styles.emojiBtn}>{e}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        className={`btn-icon ${isHandRaised ? "activeWarning" : ""}`}
                        onClick={handleToggleHand}
                        title="Raise Hand"
                    >
                        <Hand size={22} />
                    </button>

                    <button className={`btn btn-danger ${styles.leaveBtnNeo}`} onClick={handleLeave}>
                        <PhoneOff size={20} />
                    </button>
                </div>

                <div className={styles.controlsGroup} style={{ justifyContent: 'flex-end' }}>
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
