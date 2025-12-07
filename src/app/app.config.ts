import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { routes } from './app.routes';
import { getDatabase, provideDatabase } from '@angular/fire/database';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Temporairement désactivé pour corriger la duplication visuelle
    // provideClientHydration(withEventReplay()),

    importProvidersFrom(
      BrowserAnimationsModule,
      MatCardModule,
      MatButtonModule,
      MatIconModule
    ),

    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'gopark-5aaa3',
        appId: '1:95612175459:web:666d6b87a31e3bfaae6456',
        storageBucket: 'gopark-5aaa3.firebasestorage.app',
        apiKey: 'AIzaSyBL-dfD1K1BvgY-qpmM_uXtbTl_vPmyLn8',
        authDomain: 'gopark-5aaa3.firebaseapp.com',
        messagingSenderId: '95612175459',
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()), provideFirebaseApp(() => initializeApp({ projectId: "gopark-5aaa3", appId: "1:95612175459:web:666d6b87a31e3bfaae6456", storageBucket: "gopark-5aaa3.firebasestorage.app", apiKey: "AIzaSyBL-dfD1K1BvgY-qpmM_uXtbTl_vPmyLn8", authDomain: "gopark-5aaa3.firebaseapp.com", messagingSenderId: "95612175459", projectNumber: "95612175459", version: "2" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideDatabase(() => getDatabase())
  ],
};

