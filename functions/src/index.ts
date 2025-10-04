import { onRequest } from "firebase-functions/https";
import twilio from "twilio";
import * as cors from "cors";

// ⚠️ Credenciales ahora desde variables de entorno
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error(
    "Debes definir TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en tus variables de entorno"
  );
}

const client = twilio(accountSid, authToken);

// Número de Twilio desde el que se enviarán los SMS
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;
if (!TWILIO_NUMBER) {
  throw new Error("Debes definir TWILIO_NUMBER en tus variables de entorno");
}

// Crear middleware CORS
const corsHandler = cors({ origin: true });

export const sendSms = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).send({ error: "Falta 'to' o 'message'" });
      return;
    }

    try {
      const response = await client.messages.create({
        body: message,
        from: TWILIO_NUMBER,
        to,
      });

      res.status(200).send({
        success: true,
        sid: response.sid,
        message: `Mensaje enviado a ${to}`,
      });
    } catch (error: any) {
      console.error("Error Twilio:", error);
      res.status(500).send({
        success: false,
        error: error.message || error,
      });
    }
  });
});
