import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface PeerStream {
    socketId: string;
    userId: string;
    userName: string;
    stream: MediaStream;
}

interface ChatMessage {
    id: string;
    senderName: string;
    message: string;
    timestamp: number;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export function useWebRTC(roomId: string, userName: string) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<PeerStream[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string>("");

    const socketRef = useRef<Socket | null>(null);
    const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
    const userIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));
    const userNamesRef = useRef<{ [socketId: string]: string }>({});

    const connectToNewUser = useCallback((targetSocketId: string, targetUserId: string, targetUserName: string, localStream: MediaStream) => {
        if (peersRef.current[targetSocketId]) {
            console.warn("Peer connection already exists for:", targetSocketId);
            return;
        }

        const peer = new RTCPeerConnection(iceServers);
        peersRef.current[targetSocketId] = peer;
        userNamesRef.current[targetSocketId] = targetUserName;

        localStream.getTracks().forEach(track => {
            peer.addTrack(track, localStream);
        });


        peer.ontrack = (event) => {
            setPeers(prev => {
                const existing = prev.find(p => p.socketId === targetSocketId);
                if (existing) return prev;
                return [...prev, {
                    socketId: targetSocketId,
                    userId: targetUserId,
                    userName: targetUserName,
                    stream: event.streams[0]
                }];
            });
        };

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit("ice-candidate", {
                    target: targetSocketId,
                    caller: socketRef.current.id,
                    candidate: event.candidate
                });
            }
        };

        peer.createOffer().then(sdp => {
            peer.setLocalDescription(sdp);
            socketRef.current?.emit("offer", {
                target: targetSocketId,
                caller: socketRef.current.id,
                sdp
            });
        }).catch(err => console.error("Error creating offer:", err));
    }, []);

    useEffect(() => {
        let isStopped = false;

        // 1. Get User Media with Fallback
        const getMedia = async () => {
            try {
                return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (err) {
                console.warn("Could not get video+audio, trying audio only", err);
                try {
                    return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                } catch (audioErr) {
                    console.warn("Could not get audio either, using empty stream", audioErr);
                    setError("Could not access camera/microphone. You are in viewer mode.");
                    return new MediaStream();
                }
            }
        };

        getMedia()
            .then((stream) => {
                if (isStopped) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                setLocalStream(stream);

                // 2. Initialize Socket (if not exists)
                if (!socketRef.current) {
                    socketRef.current = io(SOCKET_URL);
                }

                socketRef.current.on("connect", () => {
                    socketRef.current?.emit("join-room", roomId, userIdRef.current, userName);
                });

                socketRef.current.on("room-participants", (participants: any[]) => {
                    participants.forEach(p => {
                        userNamesRef.current[p.socketId] = p.userName;
                    });
                });

                socketRef.current.on("user-connected", (targetUserId: string, targetSocketId: string, targetUserName: string) => {
                    connectToNewUser(targetSocketId, targetUserId, targetUserName, stream);
                });

                socketRef.current.on("offer", async (payload: { caller: string, sdp: RTCSessionDescriptionInit }) => {
                    const peer = new RTCPeerConnection(iceServers);
                    peersRef.current[payload.caller] = peer;

                    stream.getTracks().forEach(track => {
                        peer.addTrack(track, stream);
                    });

                    peer.ontrack = (event) => {
                        setPeers(prev => {
                            const existing = prev.find(p => p.socketId === payload.caller);
                            if (existing) return prev;
                            return [...prev, {
                                socketId: payload.caller,
                                userId: "unknown",
                                userName: userNamesRef.current[payload.caller] || "Participant",
                                stream: event.streams[0]
                            }];
                        });
                    };

                    peer.onicecandidate = (event) => {
                        if (event.candidate) {
                            socketRef.current?.emit("ice-candidate", {
                                target: payload.caller,
                                caller: socketRef.current.id,
                                candidate: event.candidate
                            });
                        }
                    };

                    try {
                        if (peer.signalingState !== "stable") {
                            await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                            const answer = await peer.createAnswer();
                            await peer.setLocalDescription(answer);

                            socketRef.current?.emit("answer", {
                                target: payload.caller,
                                caller: socketRef.current.id,
                                sdp: answer
                            });
                        } else if (payload.sdp) {
                            // If stable, we only set if we are the polite peer or if its a new offer.
                            // For simplicity in this base version, we just check for non-stable.
                            await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                            const answer = await peer.createAnswer();
                            await peer.setLocalDescription(answer);

                            socketRef.current?.emit("answer", {
                                target: payload.caller,
                                caller: socketRef.current.id,
                                sdp: answer
                            });
                        }
                    } catch (err) {
                        console.error("Error handling offer:", err);
                    }
                });

                socketRef.current.on("answer", async (payload: { caller: string, sdp: RTCSessionDescriptionInit }) => {
                    const peer = peersRef.current[payload.caller];
                    if (peer && peer.signalingState !== "stable") {
                        try {
                            await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        } catch (err) {
                            console.error("Error setting remote answer:", err);
                        }
                    }
                });

                socketRef.current.on("ice-candidate", (payload: { caller: string, candidate: RTCIceCandidateInit }) => {
                    const peer = peersRef.current[payload.caller];
                    if (peer) {
                        peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    }
                });

                socketRef.current.on("user-disconnected", (userId: string, socketId: string) => {
                    if (peersRef.current[socketId]) {
                        peersRef.current[socketId].close();
                        delete peersRef.current[socketId];
                    }
                    setPeers(prev => prev.filter(p => p.socketId !== socketId));
                });

                socketRef.current.on("chat-message", (payload: ChatMessage) => {
                    setMessages(prev => [...prev, payload]);
                });
            })
            .catch((err) => {
                console.error("Critical error in WebRTC setup:", err);
                setError("A critical error occurred while setting up the connection.");
            });

        return () => {
            isStopped = true;
            // Cleanup
            localStream?.getTracks().forEach(track => track.stop());
            Object.values(peersRef.current).forEach(peer => peer.close());
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, userName]);

    const sendMessage = (message: string) => {
        if (!socketRef.current || !message.trim()) return;
        const msgPayload: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            senderName: userName,
            message,
            timestamp: Date.now()
        };
        socketRef.current.emit("chat-message", { roomId, ...msgPayload });
    };

    const shareScreen = async (onStop?: () => void) => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = screenStream.getVideoTracks()[0];

            // Replace video track for all peers
            Object.values(peersRef.current).forEach(peer => {
                const sender = peer.getSenders().find(s => s.track?.kind === "video");
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            // Update local stream
            if (localStream) {
                const newLocalStream = new MediaStream([
                    videoTrack,
                    ...localStream.getAudioTracks()
                ]);
                setLocalStream(newLocalStream);
            }

            videoTrack.onended = () => {
                // Revert to camera
                stopScreenShare();
                if (onStop) onStop();
            };

            return true;
        } catch (err) {
            console.error("Error sharing screen", err);
            return false;
        }
    };

    const stopScreenShare = async () => {
        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = cameraStream.getVideoTracks()[0];

            Object.values(peersRef.current).forEach(peer => {
                const sender = peer.getSenders().find(s => s.track?.kind === "video");
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            if (localStream) {
                const newLocalStream = new MediaStream([
                    videoTrack,
                    ...localStream.getAudioTracks()
                ]);
                setLocalStream(newLocalStream);
            }
        } catch (error) {
            console.error("Cannot revert to camera", error);
        }
    };

    const toggleAudio = (enabled: boolean) => {
        if (localStream && localStream.getAudioTracks().length > 0) {
            localStream.getAudioTracks()[0].enabled = enabled;
        }
    };

    const toggleVideo = (enabled: boolean) => {
        if (localStream && localStream.getVideoTracks().length > 0) {
            localStream.getVideoTracks()[0].enabled = enabled;
        }
    };

    return {
        localStream,
        peers,
        messages,
        sendMessage,
        shareScreen,
        stopScreenShare,
        toggleAudio,
        toggleVideo,
        error
    };
}
