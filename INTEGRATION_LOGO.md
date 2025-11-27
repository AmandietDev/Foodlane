# Guide d'intégration du logo Foodlane

## Comment ajouter l'image du logo

1. **Place ton fichier logo dans le dossier `public/`**
   - Nom du fichier : `logo.png` ou `logo.svg`
   - Formats supportés : PNG, SVG, JPG, WEBP
   - Taille recommandée : au moins 200x200px pour une bonne qualité

2. **Structure du dossier**
   ```
   foodlane-app/
   ├── public/
   │   └── logo.png  ← Place ton logo ici
   ├── app/
   │   └── components/
   │       └── Logo.tsx
   ```

3. **Le composant Logo est déjà configuré**
   - Il cherche automatiquement `/logo.png` dans le dossier `public/`
   - Si tu utilises un autre nom ou format, modifie la ligne dans `app/components/Logo.tsx` :
     ```tsx
     src="/logo.png"  // Change ici si nécessaire
     ```

4. **Test**
   - Après avoir ajouté le logo, rafraîchis la page
   - Le logo devrait apparaître en haut de la page d'accueil

## Palette de couleurs adaptée au logo

Les couleurs de l'application ont été adaptées pour correspondre au logo :
- **Fond principal** : `#FAF6F0` (beige très clair)
- **Cartes/éléments** : `#F5E6D8` (beige rosé - couleur principale du logo)
- **Bordures** : `#D4C4B8` (beige moyen)
- **Texte principal** : `#53484E` (brun foncé - contour du logo)
- **Accents** : `#CAAFA0` et `#BB8C78` (beiges chauds)






