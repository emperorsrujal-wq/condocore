import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
  updateEmail as updateFbEmail, updatePassword as updateFbPassword,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider } from '../firebase';

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

    // Auto-create tenant record so they're immediately linked to their property
    if (['tenant', 'owner'].includes(profileData.role) && profileData.propertyId) {
      await addDoc(collection(db, 'tenants'), {
        userId: user.uid,
        name: profileData.name,
        email,
        unit: profileData.unit || '',
        property: profileData.property || '',
        propertyId: profileData.propertyId,
        status: 'active',
        type: 'Residential',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    setUserProfile(profile);
    return user;
  }

  async function handleProviderLogin(provider) {
    const { user } = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      const profile = {
        name: user.displayName || 'OAuth User',
        email: user.email,
        role: 'tenant', // Default to basic tenant access
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        initials: (user.displayName || 'O U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      };
      await setDoc(userRef, profile);
      setUserProfile(profile);
    } else {
      setUserProfile(snap.data());
    }
    return user;
  }

  const loginWithGoogle = () => handleProviderLogin(googleProvider);
  const loginWithApple = () => handleProviderLogin(appleProvider);

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function updateUserEmail(newEmail) {
    if (!currentUser) return;
    await updateFbEmail(currentUser, newEmail);
    await setDoc(doc(db, 'users', currentUser.uid), { email: newEmail, updatedAt: serverTimestamp() }, { merge: true });
    await refreshProfile();
  }

  async function updateUserPassword(newPassword) {
    if (!currentUser) return;
    return updateFbPassword(currentUser, newPassword);
  }

  async function updateProfile(data) {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    await refreshProfile();
  }

  async function refreshProfile() {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) setUserProfile(snap.data());
    } catch (e) { console.error('Refresh profile error:', e); }
  }

  useEffect(() => {
    console.log('AuthProvider: Auth listener initializing...');
    
    // Safety timeout to ensure app eventually renders if Firebase hangs
    const timer = setTimeout(() => {
      console.log('AuthProvider: Safety timeout, forcing loading=false');
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timer); // Prevent the 5s safety timeout from firing if we succeed
      console.log('AuthProvider: Auth state changed, user=', user?.email);
      setCurrentUser(user);
      if (user) {
        try {
          console.log('AuthProvider: Fetching profile for', user.uid);
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            console.log('AuthProvider: Profile found. Role:', data.role, 'Data:', data);
            setUserProfile(data);
          } else {
            console.log('AuthProvider: Profile NOT found');
          }
        } catch (e) { 
          console.error('Profile fetch error:', e); 
        }
      } else {
        setUserProfile(null);
      }
      console.log('AuthProvider: Setting loading=false');
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const value = {
    currentUser, userProfile, loading,
    login, logout, createAccount, resetPassword, refreshProfile,
    updateUserEmail, updateUserPassword, updateProfile,
    loginWithGoogle, loginWithApple
  };

  console.log('AuthProvider: rendering, loading=', loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
