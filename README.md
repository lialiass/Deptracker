# DebtTracker

Application mobile-first de suivi des dettes, créances, comptes, proches et revenus futurs.

## Fonctionnalités

- **Tableau de bord** — métriques globales (dettes, créances, solde net) et vue synthétique de chaque entité
- **Entités** — gestion des comptes bancaires et proches, avec solde réel et solde calculé
- **Ajouter une opération** — prêt, emprunt, remboursement, transfert, avance, ajustement
- **Historique** — liste des opérations filtrables par type et par texte
- **Revenus futurs** — planification et encaissement en 3 étapes avec répartition sur les dettes
- **Authentification Supabase** — données isolées par utilisateur (Row Level Security)

## Stack

- React 18 + Vite
- Supabase (Auth + PostgreSQL + RLS)
- React Router v6
- CSS custom variables (dark/light mode)

## Installation

```bash
npm install
```

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Le schéma Supabase est dans `supabase-setup.sql`.

## Lancement local

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Déploiement Vercel

| Paramètre         | Valeur        |
|-------------------|---------------|
| Root Directory    | *(vide)*      |
| Build Command     | `npm run build` |
| Output Directory  | `dist`        |
| Install Command   | `npm install` |
