require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Conexión a DynamoDB (Tu base de datos en AWS)
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// 2. Configuración de Cognito
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

// 🚨 LISTA VIP DE CORREOS DE ADMINISTRADORES 🚨
// Añade aquí los correos que tendrán permiso de guardar datos
const CORREOS_ADMIN = [
    'ivonnesanchez057@gmail.com', 
    'luke@baneesports.com',
    'mary@baneesports.com'
];

// 3. Cadenero de Seguridad (Middleware)
const esAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No autenticado. Inicia sesión." });

    const token = authHeader.split(" ")[1];

    try {
        const payload = await verifier.verify(token);
        const correoUsuario = payload.email;
        
        // Verifica si el correo está en la lista VIP
        if (CORREOS_ADMIN.includes(correoUsuario)) {
            req.user = payload; 
            next(); // Pase VIP concedido
        } else {
            res.status(403).json({ error: "Acceso denegado. Tu correo no pertenece al staff de BANE." });
        }
    } catch (err) {
        console.error("Error de token:", err);
        return res.status(401).json({ error: "Token inválido o expirado." });
    }
};

// ==========================================
// RUTAS DE PARTIDAS
// ==========================================

// POST: Guardar partida (PROTEGIDO POR esAdmin)
app.post('/api/partidas', esAdmin, async (req, res) => {
    const { rival, torneo, score_bane, score_rival } = req.body;
    
    const nuevoMatch = {
        id: crypto.randomUUID(), 
        rival: rival,
        torneo: torneo,
        score_bane: parseInt(score_bane),
        score_rival: parseInt(score_rival),
        fecha: new Date().toISOString() 
    };

    try {
        await ddbDocClient.send(new PutCommand({
            TableName: 'BanePartidas',
            Item: nuevoMatch
        }));
        res.status(201).json({ mensaje: '¡Partida guardada!', id: nuevoMatch.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al conectar con AWS' });
    }
});

// GET: Leer partidas (PÚBLICO)
app.get('/api/partidas', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({ TableName: 'BanePartidas' }));
        const partidasOrdenadas = resultado.Items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json(partidasOrdenadas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar AWS' });
    }
});

// DELETE: Borrar partida (PROTEGIDO POR esAdmin)
app.delete('/api/partidas', esAdmin, async (req, res) => {
    const { id } = req.query;
    try {
        await ddbDocClient.send(new DeleteCommand({
            TableName: 'BanePartidas',
            Key: { id: id }
        }));
        res.json({ mensaje: 'Partida eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al borrar en AWS' });
    }
});

// ==========================================
// RUTAS DE NOTICIAS
// ==========================================

// POST: Publicar noticia (PROTEGIDO POR esAdmin)
app.post('/api/noticias', esAdmin, async (req, res) => {
    const { titulo, youtube_id, descripcion } = req.body;

    const nuevaNoticia = {
        id: crypto.randomUUID(),
        titulo: titulo,
        youtube_id: youtube_id,
        descripcion: descripcion,
        fecha: new Date().toISOString()
    };

    try {
        await ddbDocClient.send(new PutCommand({
            TableName: 'BaneNoticias',
            Item: nuevaNoticia
        }));
        res.status(201).json({ mensaje: '¡Noticia publicada!', id: nuevaNoticia.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al publicar en AWS' });
    }
});

// GET: Leer noticias (PÚBLICO)
app.get('/api/noticias', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({ TableName: 'BaneNoticias' }));
        const noticiasOrdenadas = resultado.Items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json(noticiasOrdenadas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar AWS' });
    }
});

// DELETE: Borrar noticia (PROTEGIDO POR esAdmin)
app.delete('/api/noticias', esAdmin, async (req, res) => {
    const { id } = req.query;
    try {
        await ddbDocClient.send(new DeleteCommand({
            TableName: 'BaneNoticias',
            Key: { id: id }
        }));
        res.json({ mensaje: 'Noticia eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al borrar en AWS' });
    }
});

// ==========================================
// CONFIGURACIÓN DE PUERTO DINÁMICO
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor blindado listo y operando en el puerto ${PORT}`);
});