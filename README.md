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

## Emails transactionnels (reset de mot de passe)

Supabase utilise un serveur SMTP partagé limité à **2 emails/heure** en développement. Pour la production, configurer un SMTP personnalisé dans **Supabase Dashboard → Project Settings → Auth → SMTP Settings** :

| Service    | Plan gratuit       |
|------------|--------------------|
| [Resend](https://resend.com)     | 3 000 emails/mois  |
| [Brevo](https://brevo.com)      | 300 emails/jour    |
| [SendGrid](https://sendgrid.com) | 100 emails/jour    |
| [Postmark](https://postmarkapp.com) | payant uniquement |

Penser aussi à configurer l'**URL de redirection** dans Supabase Dashboard → Auth → URL Configuration → Redirect URLs (ajouter `https://<votre-domaine>/reset-password`).

## Déploiement Vercel

| Paramètre         | Valeur        |
|-------------------|---------------|
| Root Directory    | *(vide)*      |
| Build Command     | `npm run build` |
| Output Directory  | `dist`        |
| Install Command   | `npm install` |
