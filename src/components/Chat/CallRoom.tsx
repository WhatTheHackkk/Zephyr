import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ChevronLeft, Loader2, Users } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, addDoc, updateDoc } from 'firebase/firestore';

interface RemotePeer {
  uid: string;
  name: string;
  stream: MediaStream;
}

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

const VideoPlayer = ({ stream, isLocal, name }: { stream: MediaStream, isLocal?: boolean, name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-black/40 rounded-2xl overflow-hidden aspect-video border border-white/5 flex flex-col items-center justify-center shadow-lg group animate-in zoom-in-95 duration-300">
      {stream.getVideoTracks().length === 0 || !stream.getVideoTracks()[0].enabled ? (
        <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center text-3xl font-bold uppercase text-accent border border-accent/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          {name.charAt(0)}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 z-10 transition-opacity text-white border border-white/10 shadow-lg">
        <div className={`w-2 h-2 rounded-full ${stream.getAudioTracks()[0]?.enabled !== false ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
        {name} {isLocal && <span className="text-white/50">(You)</span>}
      </div>
    </div>
  );
};

const CallRoom = () => {
  const { currentUser, setMobileView, activeChannel, leftSidebarOpen, setLeftSidebarOpen } = useAppContext();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const unsubscribes = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
    }
  }, [isMuted, isVideoOff, localStream]);

  useEffect(() => {
    if (!currentUser) return;

    let myStream: MediaStream;
    const myUid = currentUser.uid;
    const roomPath = `channel_calls_${activeChannel}`;

    const setupCall = async () => {
      try {
        setIsConnecting(true);
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(myStream);

        // Add self to participants
        await setDoc(doc(db, roomPath, myUid), {
          name: currentUser.displayName || currentUser.username,
          joinedAt: Date.now()
        });

        // Listen for participants
        const q = query(collection(db, roomPath));
        const unsubParticipants = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const participantData = change.doc.data();
            const otherUid = change.doc.id;

            if (otherUid === myUid) return;

            if (change.type === 'added') {
              handleNewParticipant(otherUid, participantData.name);
            }
            if (change.type === 'removed') {
              handleParticipantLeft(otherUid);
            }
          });
        });
        unsubscribes.current.push(unsubParticipants);
        setIsConnecting(false);

      } catch (err) {
        console.error("Failed to start call:", err);
        setIsConnecting(false);
      }
    };

    const handleNewParticipant = async (otherUid: string, otherName: string) => {
      if (peerConnections.current.has(otherUid)) return;

      const pc = new RTCPeerConnection(configuration);
      peerConnections.current.set(otherUid, pc);

      myStream.getTracks().forEach(track => {
        pc.addTrack(track, myStream);
      });

      pc.ontrack = (event) => {
        setRemotePeers(prev => {
          if (prev.find(p => p.uid === otherUid)) return prev;
          return [...prev, { uid: otherUid, name: otherName, stream: event.streams[0] }];
        });
      };

      const isCaller = myUid < otherUid;
      const connId = isCaller ? `${myUid}_${otherUid}` : `${otherUid}_${myUid}`;
      const connRef = doc(db, `${roomPath}_connections`, connId);
      const myCandidatesRef = collection(connRef, `candidates_${myUid}`);
      const otherCandidatesRef = collection(connRef, `candidates_${otherUid}`);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(myCandidatesRef, event.candidate.toJSON());
        }
      };

      if (isCaller) {
        // Caller creates offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(connRef, { offer: { type: offer.type, sdp: offer.sdp } });

        // Listen for answer
        const unsubAnswer = onSnapshot(connRef, (docSnap) => {
          const data = docSnap.data();
          if (data?.answer && !pc.currentRemoteDescription) {
            const answerDesc = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDesc);
          }
        });
        unsubscribes.current.push(unsubAnswer);

      } else {
        // Callee waits for offer
        const unsubOffer = onSnapshot(connRef, async (docSnap) => {
          const data = docSnap.data();
          if (data?.offer && !pc.currentRemoteDescription) {
            const offerDesc = new RTCSessionDescription(data.offer);
            await pc.setRemoteDescription(offerDesc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(connRef, { answer: { type: answer.type, sdp: answer.sdp } });
          }
        });
        unsubscribes.current.push(unsubOffer);
      }

      // Listen for remote candidates
      const unsubCandidates = onSnapshot(otherCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate).catch(e => console.error(e));
          }
        });
      });
      unsubscribes.current.push(unsubCandidates);
    };

    const handleParticipantLeft = (otherUid: string) => {
      const pc = peerConnections.current.get(otherUid);
      if (pc) {
        pc.close();
        peerConnections.current.delete(otherUid);
      }
      setRemotePeers(prev => prev.filter(p => p.uid !== otherUid));
    };

    setupCall();

    return () => {
      // Cleanup
      unsubscribes.current.forEach(unsub => unsub());
      if (myStream) myStream.getTracks().forEach(t => t.stop());
      peerConnections.current.forEach(pc => pc.close());
      deleteDoc(doc(db, roomPath, myUid)).catch(console.error);
    };
  }, [activeChannel, currentUser]);

  const handleHangup = () => {
    setMobileView('channels');
    setLeftSidebarOpen(!leftSidebarOpen);
  };

  if (!currentUser) return null;

  return (
    <div className="liquid-glass h-full flex flex-col gravity-target relative overflow-hidden bg-[#0A0A0F]">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleHangup}
            className="text-white/70 hover:text-white transition-colors mr-1"
          >
            <ChevronLeft size={24} className="md:hidden" />
            <div className="hidden md:block">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </div>
          </button>
          <div className="w-8 h-8 rounded-full bg-accent-dark/20 flex items-center justify-center">
            <Users size={16} className="text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-lg capitalize leading-tight text-white">{activeChannel}</h3>
            <p className="text-xs text-white/50">End-to-End Encrypted Voice & Video</p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto hide-scrollbar relative">
        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-20">
            <Loader2 size={48} className="animate-spin mb-4 text-accent" />
            <p>Connecting securely to {activeChannel}...</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto h-full auto-rows-max place-content-center">
          {localStream && (
            <VideoPlayer 
              stream={localStream} 
              isLocal 
              name={currentUser.displayName || currentUser.username} 
            />
          )}
          
          {remotePeers.map(peer => (
            <VideoPlayer 
              key={peer.uid} 
              stream={peer.stream} 
              name={peer.name} 
            />
          ))}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-6 bg-black/40 backdrop-blur-xl border-t border-white/5 shrink-0 flex items-center justify-center gap-4 z-10">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button 
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
        
        <button 
          onClick={handleHangup}
          className="w-16 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20 transition-all hover:scale-105"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallRoom;
