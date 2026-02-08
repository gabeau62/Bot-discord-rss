const { Client, GatewayIntentBits } = require("discord.js");
const Parser = require("rss-parser");
require("dotenv").config();

const parser = new Parser();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const RSS_URL = process.env.RSS_URL;
const TOKEN = process.env.TOKEN;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 10 * 60 * 1000; // 10 minutes par défaut

let lastPost = "";
let rssCheckInterval;

// Validation des variables d'environnement au démarrage
function validateEnvironment() {
  const missingVars = [];
  
  if (!CHANNEL_ID) missingVars.push("CHANNEL_ID");
  if (!RSS_URL) missingVars.push("RSS_URL");
  if (!TOKEN) missingVars.push("TOKEN");
  
  if (missingVars.length > 0) {
    console.error(`❌ Variables d'environnement manquantes: ${missingVars.join(", ")}`);
    process.exit(1);
  }
  
  console.log("✅ Variables d'environnement validées");
}

// Événement: Bot connecté
client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  console.log(`📢 Vérification RSS toutes les ${CHECK_INTERVAL / 1000} secondes`);
  
  // Vérifier immédiatement au démarrage
  checkRSS();
  
  // Puis vérifier toutes les X minutes
  rssCheckInterval = setInterval(checkRSS, CHECK_INTERVAL);
});

// Vérification du flux RSS
async function checkRSS() {
  try {
    console.log("🔄 Vérification du flux RSS...");
    const feed = await parser.parseURL(RSS_URL);
    
    if (!feed.items || feed.items.length === 0) {
      console.warn("⚠️ Aucun article trouvé dans le flux RSS");
      return;
    }
    
    const latest = feed.items[0];
    
    // Vérifier si c'est un nouvel article
    if (!latest.link) {
      console.warn("⚠️ Article sans lien, ignoré");
      return;
    }
    
    if (latest.link === lastPost) {
      console.log("ℹ️ Aucun nouvel article");
      return;
    }
    
    // Mettre à jour le dernier post
    lastPost = latest.link;
    
    // Envoyer le message
    const channel = await client.channels.fetch(CHANNEL_ID);
    
    if (!channel) {
      console.error(`❌ Canal avec l'ID ${CHANNEL_ID} non trouvé`);
      return;
    }
    
    if (!channel.isTextBased()) {
      console.error("❌ Le canal n'est pas un canal texte");
      return;
    }
    
    // Formater le message
    const embed = {
      color: 0xFF0000,
      title: latest.title || "Sans titre",
      description: latest.contentSnippet || "Pas de description",
      url: latest.link,
      timestamp: latest.pubDate ? new Date(latest.pubDate) : new Date(),
      footer: {
        text: "RSS Feed"
      }
    };
    
    await channel.send({ embeds: [embed] });
    console.log(`✅ Nouvel article envoyé: ${latest.title}`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la vérification RSS:", error.message);
  }
}

// Gestion des erreurs du client
client.on("error", error => {
  console.error("❌ Erreur Discord:", error.message);
});

client.on("warn", warning => {
  console.warn("⚠️ Avertissement Discord:", warning);
});

// Gestion des erreurs non attrapées
process.on("unhandledRejection", error => {
  console.error("❌ Erreur non gérée:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Exception non attrapée:", error);
  process.exit(1);
});

// Validation et connexion
validateEnvironment();
client.login(TOKEN);