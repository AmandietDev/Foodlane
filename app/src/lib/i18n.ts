// Système de traduction pour l'application

import { PLANNER_I18N } from "./i18nPlannerBundle";

export type Locale = "fr" | "en" | "es" | "de";

interface Translations {
  [key: string]: {
    fr: string;
    en: string;
    es: string;
    de: string;
  };
}

const translations: Translations = {
  // Navigation
  "nav.cuisine": {
    fr: "Menus",
    en: "Meal plans",
    es: "Menús",
    de: "Speisepläne",
  },
  "nav.ressources": {
    fr: "Mon carnet",
    en: "My notebook",
    es: "Mi cuaderno",
    de: "Mein Notizbuch",
  },
  "nav.equilibre": {
    fr: "Mon suivi",
    en: "My tracking",
    es: "Mi seguimiento",
    de: "Meine Verfolgung",
  },
  "nav.menu": {
    fr: "Menu",
    en: "Menu",
    es: "Menú",
    de: "Menü",
  },
  /** Navigation principale (4 onglets) — préférer ces clés côté UI */
  "nav.menus": {
    fr: "Accueil",
    en: "Home",
    es: "Inicio",
    de: "Start",
  },
  "nav.recettes": {
    fr: "Recettes",
    en: "Recipes",
    es: "Recetas",
    de: "Rezepte",
  },
  "nav.assistant": {
    fr: "Assistant",
    en: "Coach",
    es: "Asistente",
    de: "Assistent",
  },
  "nav.parametres": {
    fr: "Réglages",
    en: "Settings",
    es: "Ajustes",
    de: "Einstellungen",
  },

  // Menu - Onglets
  "menu.tab.account": {
    fr: "Compte",
    en: "Account",
    es: "Cuenta",
    de: "Konto",
  },
  "menu.tab.settings": {
    fr: "Paramètres",
    en: "Settings",
    es: "Configuración",
    de: "Einstellungen",
  },
  "menu.tab.household": {
    fr: "Foyer",
    en: "Household",
    es: "Hogar",
    de: "Haushalt",
  },
  "menu.tab.contact": {
    fr: "Contact",
    en: "Contact",
    es: "Contacto",
    de: "Kontakt",
  },

  // Compte
  "account.login": {
    fr: "Connexion",
    en: "Login",
    es: "Iniciar sesión",
    de: "Anmelden",
  },
  "account.signup": {
    fr: "Créer un compte",
    en: "Create account",
    es: "Crear cuenta",
    de: "Konto erstellen",
  },
  "account.logout": {
    fr: "Déconnexion",
    en: "Logout",
    es: "Cerrar sesión",
    de: "Abmelden",
  },
  "account.update": {
    fr: "Modifier mes informations",
    en: "Update my information",
    es: "Actualizar mi información",
    de: "Meine Informationen aktualisieren",
  },

  // Paramètres - Notifications
  "settings.notifications": {
    fr: "Notifications",
    en: "Notifications",
    es: "Notificaciones",
    de: "Benachrichtigungen",
  },
  "settings.notifications.new_recipes": {
    fr: "Nouvelles recettes",
    en: "New recipes",
    es: "Nuevas recetas",
    de: "Neue Rezepte",
  },
  "settings.notifications.menu_ideas": {
    fr: "Idées de menus / newsletters",
    en: "Menu ideas / newsletters",
    es: "Ideas de menús / boletines",
    de: "Menüideen / Newsletter",
  },
  "settings.notifications.reminders": {
    fr: "Rappels",
    en: "Reminders",
    es: "Recordatorios",
    de: "Erinnerungen",
  },
  "settings.notifications.reminders.desc": {
    fr: 'Ex: "Pense à utiliser ce que tu as au frigo"',
    en: 'E.g. "Remember to use what you have in the fridge"',
    es: 'Ej: "Recuerda usar lo que tienes en la nevera"',
    de: 'Z.B. "Denke daran, das zu verwenden, was du im Kühlschrank hast"',
  },

  // Paramètres - Apparence
  "settings.appearance": {
    fr: "Apparence",
    en: "Appearance",
    es: "Apariencia",
    de: "Erscheinungsbild",
  },
  "settings.appearance.dark_mode": {
    fr: "Mode sombre",
    en: "Dark mode",
    es: "Modo oscuro",
    de: "Dunkler Modus",
  },
  "settings.appearance.dark_mode.desc": {
    fr: "Active le thème sombre pour un confort visuel optimal",
    en: "Enable dark theme for optimal visual comfort",
    es: "Activa el tema oscuro para una comodidad visual óptima",
    de: "Dunkles Theme für optimalen visuellen Komfort aktivieren",
  },
  "settings.appearance.language": {
    fr: "Langue",
    en: "Language",
    es: "Idioma",
    de: "Sprache",
  },
  "settings.appearance.language.desc": {
    fr: "Choisis la langue de l'application",
    en: "Choose the application language",
    es: "Elige el idioma de la aplicación",
    de: "Wähle die Anwendungssprache",
  },
  "settings.appearance.calories": {
    fr: "Afficher les calories",
    en: "Show calories",
    es: "Mostrar calorías",
    de: "Kalorien anzeigen",
  },
  "settings.appearance.calories.desc": {
    fr: "Affiche les informations nutritionnelles",
    en: "Display nutritional information",
    es: "Mostrar información nutricional",
    de: "Nährwertinformationen anzeigen",
  },

  // Paramètres - Publicités
  "settings.ads": {
    fr: "Publicités",
    en: "Advertising",
    es: "Publicidad",
    de: "Werbung",
  },
  "settings.ads.free_version": {
    fr: "Version gratuite avec publicités",
    en: "Free version with ads",
    es: "Versión gratuita con publicidad",
    de: "Kostenlose Version mit Werbung",
  },
  "settings.ads.premium_no_ads": {
    fr: "Passer à Premium sans publicités",
    en: "Upgrade to Premium without ads",
    es: "Actualizar a Premium sin publicidad",
    de: "Auf Premium ohne Werbung upgraden",
  },

  // Paramètres - Performance
  "settings.performance": {
    fr: "Performance / usage",
    en: "Performance / usage",
    es: "Rendimiento / uso",
    de: "Leistung / Nutzung",
  },
  "settings.performance.clear_cache": {
    fr: "Effacer le cache / données locales",
    en: "Clear cache / local data",
    es: "Borrar caché / datos locales",
    de: "Cache / lokale Daten löschen",
  },
  "settings.performance.clear_cache.desc": {
    fr: "Supprime toutes les données locales et le cache de l'application",
    en: "Delete all local data and application cache",
    es: "Eliminar todos los datos locales y la caché de la aplicación",
    de: "Alle lokalen Daten und den Anwendungs-Cache löschen",
  },

  // Abonnement
  "subscription.title": {
    fr: "Abonnement",
    en: "Subscription",
    es: "Suscripción",
    de: "Abonnement",
  },
  "subscription.current": {
    fr: "Type d'abonnement actuel",
    en: "Current subscription type",
    es: "Tipo de suscripción actual",
    de: "Aktueller Abonnementtyp",
  },
  "subscription.free": {
    fr: "Gratuit",
    en: "Free",
    es: "Gratis",
    de: "Kostenlos",
  },
  "subscription.premium": {
    fr: "Premium",
    en: "Premium",
    es: "Premium",
    de: "Premium",
  },
  "subscription.features": {
    fr: "Ce que débloque le Premium",
    en: "What Premium unlocks",
    es: "Lo que desbloquea Premium",
    de: "Was Premium freischaltet",
  },
  "subscription.feature.scan": {
    fr: "Scan photo de frigo",
    en: "Fridge photo scan",
    es: "Escaneo de foto de nevera",
    de: "Kühlschrank-Foto-Scan",
  },
  "subscription.feature.shopping_list": {
    fr: "Liste de courses automatique",
    en: "Automatic shopping list",
    es: "Lista de compras automática",
    de: "Automatische Einkaufsliste",
  },
  "subscription.feature.extra_recipes": {
    fr: "Recettes supplémentaires",
    en: "Extra recipes",
    es: "Recetas adicionales",
    de: "Zusätzliche Rezepte",
  },
  "subscription.feature.no_ads": {
    fr: "Sans publicités",
    en: "No ads",
    es: "Sin publicidad",
    de: "Keine Werbung",
  },
  "subscription.upgrade": {
    fr: "Passer à Premium",
    en: "Upgrade to Premium",
    es: "Actualizar a Premium",
    de: "Auf Premium upgraden",
  },
  "subscription.billing": {
    fr: "Historique de facturation",
    en: "Billing history",
    es: "Historial de facturación",
    de: "Rechnungsverlauf",
  },
  "subscription.store": {
    fr: "Voir sur le store",
    en: "View on store",
    es: "Ver en la tienda",
    de: "Im Store ansehen",
  },

  // Common
  "common.save": {
    fr: "Enregistrer",
    en: "Save",
    es: "Guardar",
    de: "Speichern",
  },
  "common.cancel": {
    fr: "Annuler",
    en: "Cancel",
    es: "Cancelar",
    de: "Abbrechen",
  },
  "common.confirm": {
    fr: "Confirmer",
    en: "Confirm",
    es: "Confirmar",
    de: "Bestätigen",
  },
  "common.delete": {
    fr: "Supprimer",
    en: "Delete",
    es: "Eliminar",
    de: "Löschen",
  },
  "common.back": {
    fr: "Retour",
    en: "Back",
    es: "Volver",
    de: "Zurück",
  },
  "common.next": {
    fr: "Suivant",
    en: "Next",
    es: "Siguiente",
    de: "Weiter",
  },
  "common.generate": {
    fr: "Générer",
    en: "Generate",
    es: "Generar",
    de: "Generieren",
  },
  "common.search": {
    fr: "Rechercher",
    en: "Search",
    es: "Buscar",
    de: "Suchen",
  },
  "common.filter": {
    fr: "Filtrer",
    en: "Filter",
    es: "Filtrar",
    de: "Filter",
  },

  // Page d'accueil
  "home.title": {
    fr: "Quels aliments as-tu chez toi ?",
    en: "What foods do you have at home?",
    es: "¿Qué alimentos tienes en casa?",
    de: "Welche Lebensmittel hast du zu Hause?",
  },
  "home.subtitle": {
    fr: "Écris un aliment puis appuie sur Entrée pour l'ajouter à la liste.",
    en: "Write a food item then press Enter to add it to the list.",
    es: "Escribe un alimento y luego presiona Enter para agregarlo a la lista.",
    de: "Schreibe ein Lebensmittel und drücke dann Enter, um es zur Liste hinzuzufügen.",
  },
  "home.example": {
    fr: "Exemple : pâtes, tomates, thon…",
    en: "Example: pasta, tomatoes, tuna…",
    es: "Ejemplo: pasta, tomates, atún…",
    de: "Beispiel: Nudeln, Tomaten, Thunfisch…",
  },
  "home.tagline": {
    fr: "Ta diététicienne privée t'accompagne à équilibrer tes repas et faciliter ton organisation.",
    en: "Your private nutritionist accompanies you to balance your meals and facilitate your organization.",
    es: "Tu nutricionista privada te acompaña para equilibrar tus comidas y facilitar tu organización.",
    de: "Deine private Ernährungsberaterin begleitet dich dabei, deine Mahlzeiten auszugleichen und deine Organisation zu erleichtern.",
  },
  "home.description": {
    fr: "Trouve des recettes avec ce que tu as déjà, ou crée un menu et génère ta liste de courses.",
    en: "Find recipes with what you already have, or create a menu and generate your shopping list.",
    es: "Encuentra recetas con lo que ya tienes, o crea un menú y genera tu lista de compras.",
    de: "Finde Rezepte mit dem, was du bereits hast, oder erstelle ein Menü und generiere deine Einkaufsliste.",
  },
  "home.type.all": {
    fr: "Tous",
    en: "All",
    es: "Todos",
    de: "Alle",
  },
  "home.type.sweet": {
    fr: "Sucré",
    en: "Sweet",
    es: "Dulce",
    de: "Süß",
  },
  "home.type.savory": {
    fr: "Salé",
    en: "Savory",
    es: "Salado",
    de: "Herzhaft",
  },
  "home.results.title": {
    fr: "Résultats de recherche",
    en: "Search results",
    es: "Resultados de búsqueda",
    de: "Suchergebnisse",
  },
  "home.results.no_results": {
    fr: "Aucune recette trouvée",
    en: "No recipes found",
    es: "No se encontraron recetas",
    de: "Keine Rezepte gefunden",
  },
  "home.loading": {
    fr: "Chargement…",
    en: "Loading…",
    es: "Cargando…",
    de: "Laden…",
  },
  "home.error": {
    fr: "Impossible de récupérer les recettes pour le moment. Réessaie un peu plus tard.",
    en: "Unable to retrieve recipes at the moment. Please try again later.",
    es: "No se pueden recuperar las recetas en este momento. Inténtalo de nuevo más tarde.",
    de: "Rezepte können derzeit nicht abgerufen werden. Bitte versuche es später erneut.",
  },

  // Foyer
  "household.title": {
    fr: "Profil alimentaire du foyer",
    en: "Household dietary profile",
    es: "Perfil alimentario del hogar",
    de: "Haushaltsernährungsprofil",
  },
  "household.dietary.title": {
    fr: "Régimes particuliers",
    en: "Special diets",
    es: "Dietas especiales",
    de: "Spezielle Diäten",
  },
  "household.dietary.desc": {
    fr: "Sélectionne les régimes alimentaires qui s'appliquent à ton foyer. Les recettes seront automatiquement filtrées selon ces critères.",
    en: "Select the dietary regimes that apply to your household. Recipes will be automatically filtered according to these criteria.",
    es: "Selecciona los regímenes alimentarios que se aplican a tu hogar. Las recetas se filtrarán automáticamente según estos criterios.",
    de: "Wähle die Ernährungsregime aus, die auf deinen Haushalt zutreffen. Rezepte werden automatisch nach diesen Kriterien gefiltert.",
  },
  "household.allergies.title": {
    fr: "Aversions et allergies alimentaires",
    en: "Food aversions and allergies",
    es: "Aversiones y alergias alimentarias",
    de: "Lebensmittelabneigungen und Allergien",
  },
  "household.allergies.desc": {
    fr: "Indique les aliments ou ingrédients que tu souhaites exclure des recettes proposées (ex: arachides, crustacés, etc.).",
    en: "Indicate the foods or ingredients you want to exclude from the suggested recipes (e.g., peanuts, shellfish, etc.).",
    es: "Indica los alimentos o ingredientes que deseas excluir de las recetas sugeridas (ej: cacahuetes, mariscos, etc.).",
    de: "Gib die Lebensmittel oder Zutaten an, die du von den vorgeschlagenen Rezepten ausschließen möchtest (z.B. Erdnüsse, Schalentiere, etc.).",
  },
  "household.allergies.placeholder": {
    fr: "Ex: arachides, crustacés, œufs...",
    en: "E.g.: peanuts, shellfish, eggs...",
    es: "Ej.: cacahuetes, mariscos, huevos...",
    de: "z.B.: Erdnüsse, Schalentiere, Eier...",
  },
  "household.allergies.tip": {
    fr: "💡 Les recettes contenant ces ingrédients seront automatiquement exclues des résultats de recherche.",
    en: "💡 Recipes containing these ingredients will be automatically excluded from search results.",
    es: "💡 Las recetas que contengan estos ingredientes se excluirán automáticamente de los resultados de búsqueda.",
    de: "💡 Rezepte, die diese Zutaten enthalten, werden automatisch aus den Suchergebnissen ausgeschlossen.",
  },
  "household.equipment.title": {
    fr: "Équipements disponibles",
    en: "Available equipment",
    es: "Equipamiento disponible",
    de: "Verfügbare Ausrüstung",
  },
  "household.equipment.desc": {
    fr: "Sélectionne les équipements de cuisine dont tu disposes. Les recettes seront adaptées en conséquence.",
    en: "Select the kitchen equipment you have. Recipes will be adapted accordingly.",
    es: "Selecciona el equipamiento de cocina que tienes. Las recetas se adaptarán en consecuencia.",
    de: "Wähle die Küchenausrüstung aus, die du hast. Rezepte werden entsprechend angepasst.",
  },
  "household.people.title": {
    fr: "Nombre de personnes",
    en: "Number of people",
    es: "Número de personas",
    de: "Anzahl der Personen",
  },
  "household.people.desc": {
    fr: "Nombre de personnes pour lesquelles tu cuisines habituellement.",
    en: "Number of people you usually cook for.",
    es: "Número de personas para las que sueles cocinar.",
    de: "Anzahl der Personen, für die du normalerweise kochst.",
  },

  // Contact
  "contact.title": {
    fr: "Contact & Support",
    en: "Contact & Support",
    es: "Contacto y Soporte",
    de: "Kontakt & Support",
  },
  "contact.faq.title": {
    fr: "Questions fréquentes (FAQ)",
    en: "Frequently Asked Questions (FAQ)",
    es: "Preguntas Frecuentes (FAQ)",
    de: "Häufig gestellte Fragen (FAQ)",
  },
  "contact.form.not_found": {
    fr: "Tu n'as pas trouvé de réponse dans la FAQ ?",
    en: "Didn't find an answer in the FAQ?",
    es: "¿No encontraste una respuesta en las FAQ?",
    de: "Keine Antwort in den FAQ gefunden?",
  },
  "contact.form.title": {
    fr: "Nous contacter",
    en: "Contact us",
    es: "Contáctanos",
    de: "Kontaktiere uns",
  },
  "contact.form.success": {
    fr: "✓ Message envoyé avec succès !",
    en: "✓ Message sent successfully!",
    es: "✓ ¡Mensaje enviado con éxito!",
    de: "✓ Nachricht erfolgreich gesendet!",
  },
  "contact.form.success.desc": {
    fr: "Nous te répondrons dans les plus brefs délais.",
    en: "We will get back to you as soon as possible.",
    es: "Te responderemos lo antes posible.",
    de: "Wir werden uns so schnell wie möglich bei dir melden.",
  },

  "faq.1.q": {
    fr: "Comment Foodlane adapte-t-il les quantités des recettes ?",
    en: "How does Foodlane adjust recipe quantities?",
    es: "¿Cómo ajusta Foodlane las cantidades de las recetas?",
    de: "Wie passt Foodlane die Rezeptmengen an?",
  },
  "faq.1.a": {
    fr: "Le nombre de personnes du foyer (onglet Foyer ou préférences menus) est enregistré dans Supabase. Les ingrédients des menus générés et la liste de courses sont mis à l’échelle en conséquence. Pour un foyer de 5 personnes, tu peux choisir des portions pour 4, 5 ou 6.",
    en: "Your household size (Household tab or meal preferences) is saved in Supabase. Generated menus and the grocery list scale accordingly. For a household of 5, you can choose portions for 4, 5, or 6.",
    es: "El tamaño del hogar (pestaña Hogar o preferencias de menús) se guarda en Supabase. Los menús generados y la lista de compras se escalan. Para 5 personas, puedes elegir raciones para 4, 5 o 6.",
    de: "Die Haushaltsgröße (Tab Haushalt oder Menü-Einstellungen) wird in Supabase gespeichert. Menüs und Einkaufsliste werden skaliert. Bei 5 Personen kannst du Portionen für 4, 5 oder 6 wählen.",
  },
  "faq.2.q": {
    fr: "Où sont stockées mes préférences (foyer, allergies, équipements) ?",
    en: "Where are my preferences (household, allergies, equipment) stored?",
    es: "¿Dónde se guardan mis preferencias (hogar, alergias, equipamiento)?",
    de: "Wo werden meine Einstellungen (Haushalt, Allergien, Geräte) gespeichert?",
  },
  "faq.2.a": {
    fr: "Les préférences du planificateur de menus (questionnaire première connexion, page Préférences menus, synchronisation depuis l’onglet Foyer pour le nombre de personnes) sont enregistrées dans Supabase et utilisées pour la génération IA et la liste de courses.",
    en: "Meal-planner preferences (onboarding, Meal preferences page, and household size sync from the Household tab) are stored in Supabase and used for AI generation and the grocery list.",
    es: "Las preferencias del planificador (cuestionario inicial, página de preferencias y sincronización del hogar) están en Supabase y se usan para la IA y la lista de compras.",
    de: "Menü-Planer-Einstellungen (Onboarding, Einstellungsseite, Haushalt-Tab) liegen in Supabase und steuern KI und Einkaufsliste.",
  },
  "faq.3.q": {
    fr: "Comment la liste de courses regroupe-t-elle les ingrédients ?",
    en: "How does the grocery list merge ingredients?",
    es: "¿Cómo agrupa la lista de la compra los ingredientes?",
    de: "Wie führt die Einkaufsliste Zutaten zusammen?",
  },
  "faq.3.a": {
    fr: "Les ingrédients identiques (même produit, même type d’unité, ex. plusieurs recettes avec des œufs) sont additionnés en une seule ligne. Les quantités sont arrondies pour un achat réaliste (ex. grammes ronds, nombre entier de citrons ou de boîtes de thon).",
    en: "Same ingredients (same product and unit kind, e.g. eggs from several recipes) are summed into one line. Quantities are rounded for realistic shopping (e.g. round grams, whole lemons or cans of tuna).",
    es: "Los mismos ingredientes (misma unidad, p. ej. huevos de varias recetas) se suman en una línea. Las cantidades se redondean para comprar mejor.",
    de: "Gleiche Zutaten (gleiche Einheit, z. B. Eier aus mehreren Rezepten) werden zu einer Zeile addiert. Mengen werden kaufnah gerundet.",
  },
  "faq.4.q": {
    fr: "Puis-je utiliser l’app dans une autre langue que le français ?",
    en: "Can I use the app in a language other than French?",
    es: "¿Puedo usar la app en otro idioma que no sea francés?",
    de: "Kann ich die App außer auf Französisch nutzen?",
  },
  "faq.4.a": {
    fr: "Oui : choisis la langue dans les paramètres. L’interface et la liste de courses s’adaptent. Les noms de recettes en base restent souvent en français ; les consignes envoyées à l’IA tiennent compte de ta langue pour les textes générés.",
    en: "Yes: pick a language in settings. The UI and grocery list adapt. Recipe names in the database may stay in French; AI instructions follow your language for generated text.",
    es: "Sí: elige idioma en ajustes. La interfaz y la lista se adaptan. Los nombres de recetas pueden seguir en francés; la IA usa tu idioma en textos generados.",
    de: "Ja: Sprache in den Einstellungen wählen. UI und Einkaufsliste passen sich an. Rezeptnamen können auf Französisch bleiben; KI-Ausgaben folgen deiner Sprache.",
  },
  "faq.5.q": {
    fr: "Comment générer un menu de la semaine ?",
    en: "How do I generate a weekly menu?",
    es: "¿Cómo genero un menú semanal?",
    de: "Wie erstelle ich einen Wochenplan?",
  },
  "faq.5.a": {
    fr: "Depuis le tableau de bord ou la page Planifier, lance la génération : tes préférences Supabase sont lues, une proposition de repas est créée (avec IA si configurée) et une liste de courses consolidée est enregistrée.",
    en: "From the dashboard or Plan page, start generation: your Supabase preferences are loaded, meals are proposed (with AI if configured), and a consolidated grocery list is saved.",
    es: "Desde el tablero o Planificar, inicia la generación: se cargan tus preferencias en Supabase, se proponen comidas (con IA si aplica) y se guarda la lista de compras.",
    de: "Über das Dashboard oder „Planen“ starten: Supabase-Einstellungen werden geladen, Mahlzeiten vorgeschlagen (optional KI), Einkaufsliste gespeichert.",
  },
  "faq.6.q": {
    fr: "Comment donner mon avis ou contacter Foodlane ?",
    en: "How can I give feedback or contact Foodlane?",
    es: "¿Cómo envío mi opinión o contacto con Foodlane?",
    de: "Wie gebe ich Feedback oder kontaktiere Foodlane?",
  },
  "faq.6.a": {
    fr: "Dans Menu > Contact, utilise le formulaire « Donner mon avis » (satisfaction, facilité, recommandation, commentaire) ou « Nous contacter ». Tout est adressé à contact@foodlane.fr.",
    en: "In Menu > Contact, use “Give feedback” (ratings + comment) or “Contact us”. Everything is sent to contact@foodlane.fr.",
    es: "En Menú > Contacto, usa «Dar mi opinión» o «Contáctanos». Todo se envía a contact@foodlane.fr.",
    de: "Unter Menü > Kontakt: „Feedback“ oder „Kontakt“. Alles geht an contact@foodlane.fr.",
  },
  "faq.7.q": {
    fr: "Quelle est la différence entre l’onglet Foyer et la page Préférences menus ?",
    en: "What is the difference between the Household tab and Meal preferences?",
    es: "¿Qué diferencia hay entre Hogar y Preferencias de menús?",
    de: "Unterschied Tab „Haushalt“ und Seite „Menü-Einstellungen“?",
  },
  "faq.7.a": {
    fr: "C’est le même questionnaire (équipements, temps de cuisine, objectifs d’utilisation, repas…). Tu peux le remplir depuis Réglages > Foyer ou depuis la page « Mes préférences » ; les données sont les mêmes sur ton compte Supabase.",
    en: "It is the same questionnaire (equipment, cooking time, goals, meals…). You can edit it under Settings > Household or on the “My preferences” page; data is the same on your Supabase account.",
    es: "Es el mismo cuestionario (equipos, tiempo de cocina, objetivos, comidas…). Puedes editarlo en Ajustes > Hogar o en « Mis preferencias »; los datos son los mismos en tu cuenta.",
    de: "Es ist derselbe Fragebogen (Geräte, Kochzeit, Ziele, Mahlzeiten…). Bearbeiten unter Einstellungen > Haushalt oder „Meine Menü-Einstellungen“; dieselben Daten in Supabase.",
  },
  "faq.8.q": {
    fr: "Mes favoris et menus sont-ils sauvegardés dans le cloud ?",
    en: "Are my favorites and menus saved in the cloud?",
    es: "¿Se guardan favoritos y menús en la nube?",
    de: "Werden Favoriten und Menüs in der Cloud gespeichert?",
  },
  "faq.8.a": {
    fr: "Avec un compte connecté, les menus générés et listes de courses associées sont stockés dans Supabase. Les favoris peuvent aussi être enregistrés côté serveur selon les fonctionnalités activées ; certaines données locales peuvent coexister sur l’appareil.",
    en: "With a signed-in account, generated menus and grocery lists are stored in Supabase. Favorites may also sync depending on features; some data may still exist locally on the device.",
    es: "Con cuenta, menús y listas están en Supabase. Los favoritos pueden sincronizarse según la función; puede haber datos locales.",
    de: "Mit Konto: Menüs und Einkaufslisten in Supabase. Favoriten je nach Feature; lokale Daten möglich.",
  },

  "feedback.title": {
    fr: "Donner mon avis",
    en: "Give feedback",
    es: "Dar mi opinión",
    de: "Feedback geben",
  },
  "feedback.subtitle": {
    fr: "Quelques notes et ton commentaire nous aident à améliorer Foodlane.",
    en: "A few ratings and your comment help us improve Foodlane.",
    es: "Unas notas y tu comentario nos ayudan a mejorar Foodlane.",
    de: "Ein paar Bewertungen und dein Kommentar helfen uns, Foodlane zu verbessern.",
  },
  "feedback.stars.satisfaction": {
    fr: "Satisfaction générale",
    en: "Overall satisfaction",
    es: "Satisfacción general",
    de: "Allgemeine Zufriedenheit",
  },
  "feedback.stars.ease": {
    fr: "Facilité d’utilisation",
    en: "Ease of use",
    es: "Facilidad de uso",
    de: "Benutzerfreundlichkeit",
  },
  "feedback.stars.recommend": {
    fr: "Probabilité de recommander Foodlane",
    en: "Likelihood to recommend Foodlane",
    es: "Probabilidad de recomendar Foodlane",
    de: "Wahrscheinlichkeit, Foodlane weiterzuempfehlen",
  },
  "feedback.comment": {
    fr: "Ton retour (texte libre)",
    en: "Your feedback (free text)",
    es: "Tu comentario (texto libre)",
    de: "Dein Feedback (freier Text)",
  },
  "feedback.comment.placeholder": {
    fr: "Ce qui te plaît, ce qui pourrait être mieux…",
    en: "What you like, what could be better…",
    es: "Lo que te gusta, lo que mejorarías…",
    de: "Was dir gefällt, was besser sein könnte…",
  },
  "feedback.email_optional": {
    fr: "Email (optionnel, pour te recontacter)",
    en: "Email (optional, so we can reply)",
    es: "Email (opcional, para responderte)",
    de: "E-Mail (optional, für Antworten)",
  },
  "feedback.submit": {
    fr: "Envoyer mon avis",
    en: "Send feedback",
    es: "Enviar opinión",
    de: "Feedback senden",
  },
  "feedback.sending": {
    fr: "Envoi…",
    en: "Sending…",
    es: "Enviando…",
    de: "Wird gesendet…",
  },
  "feedback.thanks.title": {
    fr: "Merci pour ton avis !",
    en: "Thanks for your feedback!",
    es: "¡Gracias por tu opinión!",
    de: "Danke für dein Feedback!",
  },
  "feedback.thanks.desc": {
    fr: "Ton message a bien été transmis à l’équipe Foodlane.",
    en: "Your message has been sent to the Foodlane team.",
    es: "Tu mensaje se ha enviado al equipo de Foodlane.",
    de: "Deine Nachricht wurde an das Foodlane-Team gesendet.",
  },
  "feedback.error.short": {
    fr: "Écris au moins quelques mots dans le commentaire.",
    en: "Please write at least a few words in the comment.",
    es: "Escribe al menos unas palabras en el comentario.",
    de: "Bitte schreibe mindestens ein paar Worte in den Kommentar.",
  },
  "feedback.error.send": {
    fr: "Impossible d’envoyer pour le moment. Réessaie plus tard.",
    en: "Could not send right now. Please try again later.",
    es: "No se pudo enviar. Inténtalo más tarde.",
    de: "Senden fehlgeschlagen. Bitte später erneut versuchen.",
  },

  ...PLANNER_I18N,
};

let currentLocale: Locale = "fr";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("foodlane-locale", locale);
    
    // Synchroniser aussi avec les préférences utilisateur
    try {
      const STORAGE_KEY = "foodlane_user_preferences";
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.langue = locale;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
  }
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    // D'abord essayer de charger depuis les préférences utilisateur
    try {
      const STORAGE_KEY = "foodlane_user_preferences";
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.langue && ["fr", "en", "es", "de"].includes(parsed.langue)) {
          return parsed.langue;
        }
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
    
    // Sinon, utiliser la clé de locale directe
    const saved = localStorage.getItem("foodlane-locale") as Locale | null;
    if (saved && ["fr", "en", "es", "de"].includes(saved)) {
      return saved;
    }
  }
  return currentLocale;
}

export function t(key: string): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  return translation[getLocale()] || translation.fr;
}

// Initialiser la locale au chargement
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("foodlane-locale");
  if (saved && ["fr", "en", "es", "de"].includes(saved)) {
    currentLocale = saved as Locale;
  }
}

