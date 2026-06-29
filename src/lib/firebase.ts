import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADspo5ZFNY6usVxVReFSU5cPJJHW7fHeM",
  authDomain: "zephyr-59e60.firebaseapp.com",
  projectId: "zephyr-59e60",
  storageBucket: "zephyr-59e60.firebasestorage.app",
  messagingSenderId: "1888424487",
  appId: "1:1888424487:web:ad194f287526cc4a15b402"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
