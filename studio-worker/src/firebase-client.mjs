import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";
import { workerConfig } from "./config.mjs";

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), databaseURL: workerConfig.databaseURL, storageBucket: workerConfig.storageBucket });
export const database = getDatabase(app);
export const bucket = getStorage(app).bucket();
