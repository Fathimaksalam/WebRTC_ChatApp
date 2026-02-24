"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Sparkles, ArrowRight, Copy, Share2, PlayCircle, Shield, Zap, MonitorUp } from "lucide-react";
import styles from "./page.module.css";
import { useTheme } from "@/context/ThemeContext";

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();

  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("");

  const [showNameModal, setShowNameModal] = useState<"create" | "join" | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("syncmeet_username");
    if (savedName) setUserName(savedName);
  }, []);

  const handleStartMeetingClick = () => {
    setShowNameModal("create");
  };

  const handleJoinMeetingClick = () => {
    if (!roomId.trim()) return;
    setShowNameModal("join");
  };

  const submitNameAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    localStorage.setItem("syncmeet_username", userName.trim());

    if (showNameModal === "create") {
      const newRoomId = Math.random().toString(36).substring(2, 9);

      // Register this user as the creator of this room
      const owned = JSON.parse(localStorage.getItem("syncmeet_owned_rooms") || "[]");
      if (!owned.includes(newRoomId)) {
        owned.push(newRoomId);
        localStorage.setItem("syncmeet_owned_rooms", JSON.stringify(owned));
      }

      setCreatedRoomId(newRoomId);
      setShowNameModal(null);
      setShowShareModal(true);
    } else if (showNameModal === "join") {
      setShowNameModal(null);
      router.push(`/room/${roomId.trim()}`);
    }
  };

  const proceedToRoom = () => {
    router.push(`/room/${createdRoomId}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${createdRoomId}`);
  };

  const shareViaWhatsApp = () => {
    // Removed name from message as requested
    const text = `Join my secure video meeting!\n\nMeeting ID: ${createdRoomId}\nLink: ${window.location.origin}/room/${createdRoomId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <main className={styles.container}>
      {/* Header */}
      <nav className={styles.navbar}>
        <div className={styles.logoInfo}>
          <div className={styles.logoCircles}>
            <div className={styles.circleBack}></div>
            <div className={styles.circleFront}></div>
          </div>
          <span className={styles.logoText}>SyncMeet</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#">Home</a>
          <a href="#features">Features</a>
          <a href="#">Pricing</a>
          <a href="#">Blog</a>
        </div>
        <div className={styles.navActions}>
          <button className={styles.signInBtn}>Sign In</button>
        </div>
      </nav>

      {/* Name Modal */}
      {showNameModal && (
        <div className={styles.modalOverlay}>
          <form onSubmit={submitNameAndProceed} className={`glass-panel ${styles.modalCard}`}>
            <h2>{showNameModal === "create" ? "Start a Meeting" : "Join Meeting"}</h2>
            <p>Please enter your display name to continue.</p>
            <label className={styles.inputLabel}>YOUR NAME</label>
            <input
              type="text"
              className={styles.styledInput}
              placeholder="e.g. Alex"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActionsRow}>
              <button type="button" className={`btn ${styles.secondaryBtn}`} onClick={() => setShowNameModal(null)}>Cancel</button>
              <button type="submit" className={`btn btn-primary ${styles.primaryBtn}`} disabled={!userName.trim()}>
                Continue <ArrowRight size={16} style={{ marginLeft: 8 }} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Share Modal Interstitial */}
      {showShareModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalCard}`}>
            <div className={styles.modalHeader}>
              <h2>Meeting Ready</h2>
              <p>Share this link with others so they can join.</p>
            </div>

            <div className={styles.idBox}>
              <span className={styles.idLabel}>Meeting ID</span>
              <strong className={styles.idValue}>{createdRoomId}</strong>
            </div>

            <div className={styles.modalActionsCol}>
              <button className={`btn ${styles.secondaryBtn}`} onClick={copyToClipboard}>
                <Copy size={18} /> Copy Link
              </button>
              <button className={`btn ${styles.whatsappBtn}`} onClick={shareViaWhatsApp}>
                <Share2 size={18} /> Share via WhatsApp
              </button>
            </div>

            <button className={`btn btn-primary ${styles.enterBtn}`} onClick={proceedToRoom}>
              Enter Room <ArrowRight size={18} style={{ marginLeft: 8 }} />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className={styles.heroSection}>
        {/* Background Glows */}
        <div className={styles.glowLeft}></div>
        <div className={styles.glowRight}></div>

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Connect Instantly.<br />Sync Seamlessly.</h1>
          <p className={styles.heroSubtitle}>
            Experience crystal-clear video calls and instant messaging, all in one place. Stay in sync, anytime, anywhere.
          </p>

          <div className={styles.heroActionRow}>
            <button className={styles.startMeetingBtn} onClick={handleStartMeetingClick}>
              Start Meeting
            </button>
            <button className={styles.watchDemoBtn}>
              <PlayCircle size={20} /> Watch Demo
            </button>
          </div>

          <div className={styles.joinBox}>
            <span className={styles.joinText}>Or join an existing meeting:</span>
            <div className={styles.joinInputWrapper}>
              <input
                type="text"
                placeholder="Enter Meeting ID"
                className={styles.joinInput}
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
              />
              <button
                className={styles.joinBtn}
                onClick={handleJoinMeetingClick}
                disabled={!roomId.trim()}
              >
                Join
              </button>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          {/* Decorative Window Mockup matching the vibe */}
          <div className={styles.mockupWindow}>
            <div className={styles.mockupHeader}>
              <div className={styles.dots}><span></span><span></span><span></span></div>
              <div className={styles.mockupTitle}>SyncMeet Room</div>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.mockupGrid}>
                <div className={styles.mockupVideo}></div>
                <div className={styles.mockupVideo}></div>
                <div className={styles.mockupVideo}></div>
                <div className={styles.mockupVideo}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Your All-In-One Video & Messaging App</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#4f46e5' }}><Video size={24} color="white" /></div>
            <h3>HD Video</h3>
            <p>Experience sharp, clear video calls. See every detail with high-quality.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#8b5cf6' }}><Zap size={24} color="white" /></div>
            <h3>Real-Time Messaging</h3>
            <p>Instantly chat with participants during calls. Share links and thoughts seamlessly.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#0ea5e9' }}><MonitorUp size={24} color="white" /></div>
            <h3>Screen Sharing</h3>
            <p>Effortlessly share your screen with a click. Perfect for presentations and collaboration.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#3b82f6' }}><Shield size={24} color="white" /></div>
            <h3>Secure & Private</h3>
            <p>Your conversations are peer-to-peer encrypted and secure. Privacy is our priority.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
