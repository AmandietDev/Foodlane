// Système de traduction pour l'application

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
    fr: "Recettes",
    en: "Recipes",
    es: "Recetas",
    de: "Rezepte",
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

