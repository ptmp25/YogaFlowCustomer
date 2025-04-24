// src/firebase/config.js
import {initializeApp, getApps} from 'firebase/app';
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import {getDatabase, ref} from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  // my api key 
};

// Initialize Firebase
const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ✅ Correct way to initialize Auth for React Native
const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize database
const database = getDatabase(firebaseApp);

// Create references
const classesRef = ref(database, 'classes');
const bookingsRef = ref(database, 'bookings');
const usersRef = ref(database, 'users');

export { firebaseApp, auth, database, classesRef, bookingsRef, usersRef };