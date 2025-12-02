// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJoA-WP-dziqDpbWCnlVPbKQMxUnlfP_I",
  authDomain: "airbnb-app-5c057.firebaseapp.com",
  projectId: "airbnb-app-5c057",
  storageBucket: "airbnb-app-5c057.firebasestorage.app",
  messagingSenderId: "925185395841",
  appId: "1:925185395841:web:0fe5ddb70387df48c51180",
  measurementId: "G-QMNGZGN4YN",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
