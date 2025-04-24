// src/context/AuthContext.js
import React, {createContext, useState, useEffect} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '../firebase/config'; // Import the auth instance

export const AuthContext = createContext();

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the auth instance directly
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{user, loading}}>
      {children}
    </AuthContext.Provider>
  );
}
