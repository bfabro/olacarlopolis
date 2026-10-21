import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";
import { workerConfig } from "./config.mjs";

export const firebaseApp = getApps()[0] || initializeApp({ credential: applicationDefault(), databaseURL: workerConfig.databaseURL, storageBucket: workerConfig.storageBucket });
export const database = getDatabase(firebaseApp);
export const bucket = getStorage(firebaseApp).bucket();
