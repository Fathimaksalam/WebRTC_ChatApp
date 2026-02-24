"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, KeySquare, Sparkles } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;

    // In a real app we might validate or create a room on the backend first.
    // Here we'll just navigate to the room page.
    localStorage.setItem("aether_username", userName.trim());
    router.push(`/room/${roomId.trim()}`);
  };

  const handleCreateNew = () => {
    if (!userName.trim()) {
      alert("Please enter a display name first.");
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem("aether_username", userName.trim());
    router.push(`/room/${newRoomId}`);
  };

  return (
    <main className={styles.container}>
      {/* Decorative background gradients */}
      <div className={styles.gradientOrb1} />
      <div className={styles.gradientOrb2} />

      <div className={`glass-panel animate-fade-in ${styles.card}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Video className={styles.icon} size={28} />
            </div>
            <h1>Aether</h1>
          </div>
          <p className={styles.subtitle}>Premium High-Definition Meetings</p>
        </div>

        <form className={styles.form} onSubmit={handleJoin}>
          <div className={styles.inputGroup}>
            <label>Display Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="E.g. Alex"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Room Code</label>
            <div className={styles.roomInputWrapper}>
              <KeySquare className={styles.inputIcon} size={20} />
              <input
                type="text"
                className={`input-field ${styles.roomInput}`}
                placeholder="Enter code to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={`btn btn-primary ${styles.joinBtn}`} disabled={!roomId || !userName}>
            Join Meeting
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          type="button"
          className={`btn ${styles.createBtn}`}
          onClick={handleCreateNew}
        >
          <Sparkles size={20} />
          <span>Create New Meeting</span>
        </button>
      </div>
    </main>
  );
}
