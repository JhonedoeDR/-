importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAjcD8w1rMolAw_q3f6n02B2N8JJuhgFB0",
  authDomain: "dailytool-3414b.firebaseapp.com",
  projectId: "dailytool-3414b",
  storageBucket: "dailytool-3414b.firebasestorage.app",
  messagingSenderId: "832994228236",
  appId: "1:832994228236:web:374f1ed1ba4a8a394a1629",
});

const messaging = firebase.messaging();

// アプリを閉じている/バックグラウンドの時にプッシュを受け取った際の表示
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || '通知';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body,
    icon: './icons/icon-192.png',
  });
});
