import { useEffect, useState } from 'react';
import { useAppContext } from './context/AppContext';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import type { User } from './types';
import AuthScreen from './components/Auth/AuthScreen';
import Layout from './components/Layout';

function App() {
  const { currentUser, setCurrentUser, setAllUsers } = useAppContext();
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        let userSnap = await getDoc(userRef);
        
        // Wait briefly in case AuthScreen is currently creating the doc
        if (!userSnap.exists()) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          userSnap = await getDoc(userRef);
        }

        let device = 'web';
        if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
          device = 'mobile';
        } else if (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone)) {
          device = 'desktop';
        }

        let userData: any;
        if (userSnap.exists()) {
          userData = userSnap.data();
          // Update device if changed
          if (userData.device !== device) {
            await updateDoc(userRef, { device });
            userData.device = device;
          }
        } else {
          const baseName = user.displayName || user.email?.split('@')[0] || 'User';
          userData = {
            uid: user.uid,
            username: baseName,
            displayName: baseName,
            email: user.email,
            avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            status: 'online',
            device,
            createdAt: serverTimestamp()
          };
          await setDoc(userRef, userData);
        }
        
        setCurrentUser(userData as any);
        setIsAuthLoading(false);
      } else {
        setCurrentUser(null);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setCurrentUser]);

  return (
    <div className="w-full h-screen overflow-hidden text-white bg-[#0a0a0c]">
      {isAuthLoading ? (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/50 text-sm font-medium animate-pulse">Connecting to Zephyr Hub...</p>
        </div>
      ) : !currentUser ? (
        <div className="w-full h-full flex justify-center items-center">
          <AuthScreen />
        </div>
      ) : (
        <Layout />
      )}
    </div>
  );
}

export default App;
