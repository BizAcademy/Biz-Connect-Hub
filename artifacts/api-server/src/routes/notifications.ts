import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Fake notifications matching SBC style (with flag emojis)
const FAKE_NOTIFICATIONS = [
  { id: 1, name: "Jean-Paul M. 🇨🇲", city: "Douala", action: "vient de s'inscrire", time: "il y a 2 min" },
  { id: 2, name: "Aïssatou D. 🇸🇳", city: "Dakar", action: "vient de rejoindre le réseau", time: "il y a 4 min" },
  { id: 3, name: "Kofi A. 🇨🇮", city: "Abidjan", action: "vient de s'inscrire", time: "il y a 6 min" },
  { id: 4, name: "Fatou N. 🇨🇲", city: "Yaoundé", action: "vient de rejoindre le réseau", time: "il y a 9 min" },
  { id: 5, name: "Mamadou B. 🇲🇱", city: "Bamako", action: "vient de s'inscrire", time: "il y a 11 min" },
  { id: 6, name: "Carine L. 🇬🇦", city: "Libreville", action: "vient de rejoindre le réseau", time: "il y a 14 min" },
  { id: 7, name: "Ibrahim T. 🇹🇬", city: "Lomé", action: "vient de s'inscrire", time: "il y a 18 min" },
  { id: 8, name: "Marie-Claire O. 🇨🇬", city: "Brazzaville", action: "vient de rejoindre le réseau", time: "il y a 21 min" },
  { id: 9, name: "Serge K. 🇧🇯", city: "Cotonou", action: "vient de s'inscrire", time: "il y a 25 min" },
  { id: 10, name: "Aminata C. 🇬🇳", city: "Conakry", action: "vient de rejoindre le réseau", time: "il y a 30 min" },
  { id: 11, name: "Patrick N. 🇨🇩", city: "Kinshasa", action: "vient de s'inscrire", time: "il y a 35 min" },
  { id: 12, name: "Rokhaya S. 🇸🇳", city: "Saint-Louis", action: "vient de rejoindre le réseau", time: "il y a 42 min" },
  { id: 13, name: "Bocovo R. 🇧🇯", city: "Porto-Novo", action: "vient de s'inscrire", time: "il y a 45 min" },
  { id: 14, name: "Diabaté F. 🇨🇮", city: "Bouaké", action: "vient de rejoindre le réseau", time: "il y a 52 min" },
];

// GET /notifications
router.get("/notifications", async (_req, res): Promise<void> => {
  res.json(FAKE_NOTIFICATIONS);
});

export default router;
