import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes), provideClientHydration(withEventReplay()), provideFirebaseApp(() => initializeApp({ projectId: "gopark-5aaa3", appId: "1:95612175459:web:666d6b87a31e3bfaae6456", storageBucket: "gopark-5aaa3.firebasestorage.app", apiKey: "AIzaSyBL-dfD1K1BvgY-qpmM_uXtbTl_vPmyLn8", authDomain: "gopark-5aaa3.firebaseapp.com", messagingSenderId: "95612175459" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())
  ]
};
