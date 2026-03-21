import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) throw new Error('User profile not found. Contact your administrator.');
    setUserProfile(snap.data());
    return user;
  }

  async function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  async function createAccount(email, password, profileData) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      ...profileData,
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.uid), profile);
    setUserProfile(profile);
    return user;
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function refreshProfile() {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) setUserProfile(snap.data());
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) setUserProfile(snap.data());
        } catch (e) { console.error('Profile fetch error:', e); }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser, userProfile, loading,
    login, logout, createAccount, resetPassword, refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
