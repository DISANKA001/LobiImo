# LobiImo — Product Requirements

## Vision
Plateforme mobile d'immobilier à Kinshasa mettant en relation clients (locataires / acheteurs) et bailleurs, avec l'admin LobiImo comme intermédiaire de confiance.

## Rôles
- **Client** : parcourt les annonces, ajoute des favoris, exprime son intérêt via un bouton unique. Suit le statut de mise en relation.
- **Bailleur** : publie et gère ses biens (soumis à validation admin), reçoit les mises en relation confirmées.
- **Admin** (accès caché : 5 taps sur le logo) : valide les annonces, gère la mise en relation client/bailleur, encaisse les commissions.

## Communication
Aucune conversation directe entre client et bailleur.
Client → "Je suis intéressé" → notification admin (badge dans l'app admin).
Admin → contacte les deux parties → statut passe à "Mise en relation confirmée".

## Commissions & Paiements
- Location : commission = **1 mois de loyer**
- Vente : commission = **10% du prix**
- Paiement enregistré par l'admin :
  - **Présentiel** (paiement immédiat, marqué "payé")
  - **Stripe** (lien de checkout, marqué "payé" après confirmation)

## Screens principaux
- Welcome / Login / Register / Admin login caché
- Client : Home (feed avec filtres Location/Vente + recherche), Favoris, Mes intérêts, Profil
- Bailleur : Dashboard (stats), Mes biens, Ajouter, Intérêts reçus, Profil
- Admin : Dashboard KPIs, Gestion biens, Intérêts (mise en relation), Finances (commissions), Utilisateurs

## Design
Palette blanc + bleu (brand `#0A4D68`, secondaire `#088395`). iOS-Native clean, français.

## Stack
- Backend : FastAPI + MongoDB + JWT (bcrypt) + Stripe (checkout sessions)
- Frontend : Expo SDK 54 + expo-router + expo-image-picker
- Storage : `@/src/utils/storage` (secure)

## Fichier de départ
Document source `Lobi imo.docx` fourni par l'utilisateur, spécifiant : nom, ville (Kinshasa), 3 portails, couleurs blanc/bleu, mécanisme d'intérêt, favoris, commissions.
