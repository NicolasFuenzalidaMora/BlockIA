import { onRequest } from "firebase-functions/https";
import twilio from "twilio";
import cors from "cors";

const corsHandler = cors({ origin: true });

// Credenciales directamente para probar
const accountSid = "ACe620708c686041e42125b4985e5ea07c";
const authToken = "9c6035276fbfebea583c6accc4dfb296";
const TWILIO_NUMBER = "+18106708302";

const client = twilio(accountSid, authToken);

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
