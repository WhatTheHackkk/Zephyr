import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, UserPlus } from 'lucide-react';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [username, setUsername] = useState(''); // Only for signup
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login Logic
        let loginEmail = identifier;
        
        // If it doesn't look like an email, assume it's a username
        if (!identifier.includes('@')) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', identifier.toLowerCase()));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            throw new Error('Username not found.');
          }
          loginEmail = querySnapshot.docs[0].data().email;
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
      } else {
        // Signup Logic
        if (!identifier.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (!username.trim() || username.includes(' ')) {
          throw new Error('Username cannot contain spaces.');
        }

        const cleanUsername = username.toLowerCase().trim();

        // Check if username is taken
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', cleanUsername));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error('Username is already taken.');
        }

        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, identifier, password);
        
        // Create user doc immediately so App.tsx can pick it up
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          username: cleanUsername,
          displayName: cleanUsername,
          email: identifier,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
          status: 'online',
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!identifier) {
      setError('Please enter your email or username first.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      let resetEmail = identifier;
      
      if (!identifier.includes('@')) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', identifier.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Username not found.');
        }
        resetEmail = querySnapshot.docs[0].data().email;
      }

      await sendPasswordResetEmail(auth, resetEmail);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="liquid-glass p-8 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-cyan-500 rounded-full mix-blend-screen filter blur-[40px] opacity-20"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-purple-500 rounded-full mix-blend-screen filter blur-[40px] opacity-20"></div>

      <div className="text-center mb-8 relative z-10">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">Zephyr</h1>
        <p className="text-white/60 mt-2 text-sm uppercase tracking-widest font-medium">Memories worth sharing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <input 
          type="text" 
          placeholder={isLogin ? "Email or Username" : "Email address"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="liquid-input w-full"
          required
        />
        
        {!isLogin && (
          <input 
            type="text" 
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="liquid-input w-full"
            required
            pattern="^\S+$"
            title="Username cannot contain spaces"
          />
        )}

        <input 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="liquid-input w-full"
          required
        />
        
        {isLogin && (
          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={handleResetPassword}
              disabled={loading}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center bg-red-400/10 p-2 rounded">{error}</p>}
        {message && <p className="text-green-400 text-sm text-center bg-green-400/10 p-2 rounded">{message}</p>}

        <button disabled={loading} type="submit" className="liquid-btn liquid-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
          {loading ? 'Processing...' : (isLogin ? 'Login to Zephyr' : 'Create Account')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setMessage('');
            setIdentifier('');
            setPassword('');
            setUsername('');
          }} 
          className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );
};

export default AuthScreen;
