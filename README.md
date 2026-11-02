# MP4 STUDIO (React + TypeScript + Vite)

MP4 STUDIO est une application de conversion vidéo dans le navigateur construite avec **React**, **TypeScript**, **Vite** et **Tailwind CSS**, utilisant **FFmpeg WebAssembly** (`@ffmpeg/ffmpeg`).

## Fonctionnalités principales

- **Conversion 100% locale :** Traitement des fichiers vidéo directement dans le navigateur client via WebAssembly. Aucune vidéo n'est envoyée vers un serveur externe.
- **Support multi-fichiers :** Glisser-déposer ou sélection de plusieurs vidéos simultanément (`.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mp4`, etc.).
- **Paramètres de conversion ajustables :**
  - **Qualité vidéo :** Haute (CRF 18), Équilibrée (CRF 23 - par défaut), Légère (CRF 28).
  - **Résolution maximale :** Conserver l'originale, Full HD (1080p), HD (720p), 480p.
  - **Audio :** AAC à 128 kb/s, 192 kb/s, 256 kb/s ou Sans audio.
- **Suivi de progression en temps réel :** Barre de progression fluide pour chaque vidéo en cours de traitement.
- **Téléchargement direct :** Téléchargement instantané des fichiers MP4 convertis.

## Démarrage rapide

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Construction de production
npm run build
```
