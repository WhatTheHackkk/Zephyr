import { useEffect, useState } from 'react';
import { useAppContext } from './context/AppContext';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import type { User } from './types';
import AuthScreen from './components/Auth/AuthScreen';
import Layout from './components/Layout';
import { OnboardingModal } from './components/Modals/OnboardingModal';
import ContextMenu from './components/Modals/ContextMenu';

function App() {
  const { currentUser, setCurrentUser, setAllUsers, contextMenu, setContextMenu } = useAppContext();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Listen to all users
  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      setAllUsers(users);
    });
    return () => unsubscribe();
  }, [setAllUsers]);

  // Global context menu handler for "generic" clicks
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // If we didn't click inside a specific element that stops propagation, show generic menu
      if (!contextMenu) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          type: 'generic'
        });
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [contextMenu, setContextMenu]);

  useEffect(() => {
    let userUnsub: () => void;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        let userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const baseName = user.displayName || user.email?.split('@')[0] || 'User';
          await setDoc(userRef, {
            uid: user.uid,
            username: baseName,
            displayName: baseName,
            email: user.email,
            avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            status: 'online',
            device: 'web',
            activeDMs: [],
            createdAt: serverTimestamp()
          });
        }

        userUnsub = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            let device = 'web';
            if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
              device = 'mobile';
            } else if (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone)) {
              device = 'desktop';
            }

            if (userData.device !== device) {
              await updateDoc(userRef, { device });
              userData.device = device;
            }
            setCurrentUser(userData as any);
            setIsAuthLoading(false);
          }
        });
      } else {
        if (userUnsub) userUnsub();
        setCurrentUser(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsub) userUnsub();
    };
  }, [setCurrentUser]);

  return (
    <div className="w-full h-screen overflow-hidden text-white bg-[#0a0a0c]">
      {isAuthLoading ? (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <div className="w-12 h-12 border-4 border-accent-dark/20 border-t-accent-dark rounded-full animate-spin mb-4"></div>
          <p className="text-white/50 text-sm font-medium animate-pulse">Connecting to Zephyr Hub...</p>
        </div>
      ) : !currentUser ? (
        <div className="w-full h-full flex justify-center items-center">
          <AuthScreen />
        </div>
      ) : (
        <>
          <Layout />
          {currentUser && !currentUser.profileCompleted && <OnboardingModal />}
          <ContextMenu />
        </>
      )}
    </div>
  );
}

export default App;
