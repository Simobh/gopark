# Gopark

Gopark est une application web moderne de réservation de places de parking, conçue pour simplifier la recherche et la gestion du stationnement urbain. Développée avec **Angular 20** et l'écosystème **Firebase**, elle offre une expérience utilisateur fluide et réactive.

## Fonctionnalités Principales

### Espace Utilisateur
*   **Recherche Interactive** : Exploration des parkings disponibles via une carte dynamique (Mapbox) ou par recherche locale.
*   **Réservation Simplifiée** : Processus de réservation intuitif avec sélection des dates et horaires.
*   **Favoris** : Sauvegarde des parkings préférés pour un accès rapide.
*   **Historique** : Consultation détaillée des réservations passées et à venir dans la section `Mes Réservations` et `Historique`.
*   **Gestion de Profil** : Modification des informations personnelles et sécurisation du compte.

### Administration
*   **Centre de Notifications** : Interface dédiée (`admin/notifications`) pour la gestion des alertes et le suivi de l'activité.

## Stack Technique

Ce projet repose sur une architecture robuste et moderne :

*   **Frontend** : [Angular v20](https://angular.dev/) - Performance et modularité.
*   **Backend & Cloud** : [Firebase](https://firebase.google.com/)
    *   *Authentication* : Gestion sécurisée des utilisateurs (Login/Register).
    *   *Firestore* : Base de données NoSQL temps réel.
    *   *Hosting* : Hébergement rapide et sécurisé.
*   **Services Tiers** :
    *   [Mapbox GL](https://www.mapbox.com/) : Cartographie avancée.
    *   [Bootstrap 5](https://getbootstrap.com/) : Design responsive et composants UI.
    *   [SweetAlert2](https://sweetalert2.github.io/) : Alertes et pop-ups esthétiques.

## Installation et Démarrage

### Prérequis
Assurez-vous d'avoir installé :
*   [Node.js](https://nodejs.org/) (version LTS recommandée)
*   [Angular CLI](https://angular.dev/tools/cli) : `npm install -g @angular/cli`

### Configuration Locale

1.  **Cloner le dépôt**
    ```bash
    git clone https://github.com/votre-user/gopark.git
    cd gopark
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Lancer le serveur de développement**
    ```bash
    ng serve
    ```
    Rendez-vous sur `http://localhost:4200/`. L'application se rechargera automatiquement lors des modifications.

## Scripts Disponibles

*   `npm start` : Lance le serveur de développement.
*   `npm run build` : Compile le projet pour la production dans le dossier `dist/`.
*   `npm run build:static` : Build optimisé.
*   `npm run deploy` : Déploie l'application sur Firebase Hosting (nécessite les droits d'accès).
*   `npm test` : Lance les tests unitaires via Karma.

## Sécurité

L'application utilise des **Guards Angular** (`authGuard`, `publicGuard`) pour protéger les routes sensibles (ex: `/settings`, `/reservations`) et rediriger les utilisateurs non authentifiés.
