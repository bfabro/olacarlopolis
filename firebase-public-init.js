(function initializePublicFirebase() {
  "use strict";

  if (!window.firebase?.initializeApp || !window.firebase?.database) {
    console.error("Firebase público indisponível durante a inicialização.");
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDWHsZSHwVFpD88ChUywjw_GdZPifdrRGI",
    authDomain: "contadoracessos.firebaseapp.com",
    databaseURL: "https://contadoracessos-default-rtdb.firebaseio.com",
    projectId: "contadoracessos",
    storageBucket: "contadoracessos.firebasestorage.app",
    messagingSenderId: "521517291315",
    appId: "1:521517291315:web:74f8d878d2d8769460d046",
    measurementId: "G-BXPWYWK61F"
  };

  const firebaseApp = firebase.apps?.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  window.publicFirebaseApp = firebaseApp;
  window.publicFirebaseDatabase = firebase.database(firebaseApp);
})();
