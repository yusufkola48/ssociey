import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail, 
  sendEmailVerification 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  userProfile: any;
  loading: boolean;
  registerWithEmail: (email: string, password: string, username: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data());
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const registerWithEmail = async (email: string, password: string, username: string) => {
    try {
      // Kullanıcı adı kontrolü
      const usernameExists = await checkUsernameExists(username);
      if (usernameExists) {
        throw new Error('Username already taken');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

      // Kullanıcı profili oluşturma
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        email,
        username: username.toLowerCase(),
        displayName: username,
        photoURL: '',
        createdAt: serverTimestamp(),
        isPrivate: false,
        gameIds: {},
        bio: '',
        socialLinks: {},
        followers: [],
        following: [],
        savedPosts: []
      });

      toast.success('Registration successful! Please verify your email.');
    } catch (error: any) {
      if (error.message === 'Username already taken') {
        toast.error('Username already taken. Please choose a different one.');
      } else {
        toast.error(error.message || 'Registration failed');
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const userDocRef = doc(db, 'users', result.user.uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        let baseUsername = result.user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
        let username = baseUsername;
        let counter = 1;

        while (await checkUsernameExists(username)) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email,
          username,
          displayName: result.user.displayName || username,
          photoURL: result.user.photoURL || '',
          createdAt: serverTimestamp(),
          isPrivate: false,
          gameIds: {},
          bio: '',
          socialLinks: {},
          followers: [],
          following: [],
          savedPosts: []
        });
      }

      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent');
    } catch (error: any) {
      toast.error(error.message || 'Password reset failed');
      throw error;
    }
  };

  const verifyEmail = async () => {
    try {
      if (user) {
        await sendEmailVerification(user);
        toast.success('Verification email sent');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification email sending failed');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
