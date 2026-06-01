require('dotenv').config(); // <--- Esta línea lee tu archivo .env oculto
const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto'); 

const app = express();
app.use(cors());
app.use(express.json());

// Configurar la conexión con Amazon DynamoDB en AWS
const client = new DynamoDBClient({
    region: 'us-east-2', // Cambia esto si elegiste otra región (ej: us-east-1)
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

// ==========================================
// RUTAS PARA LA SECCIÓN DE PARTIDAS
// ==========================================

app.post('/api/partidas', async (req, res) => {
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
        res.status(201).json({ mensaje: '¡Partida guardada con éxito en AWS DynamoDB!', id: nuevoMatch.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al conectar con AWS' });
    }
});

app.get('/api/partidas', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({
            TableName: 'BanePartidas'
        }));
        const partidasOrdenadas = resultado.Items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json(partidasOrdenadas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar las partidas en AWS' });
    }
});

// ==========================================
// RUTAS PARA LA SECCIÓN DE NOTICIAS / VLOG
// ==========================================

app.post('/api/noticias', async (req, res) => {
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
        res.status(201).json({ mensaje: '¡Noticia/Vlog publicado con éxito en AWS!', id: nuevaNoticia.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al publicar en AWS' });
    }
});

app.get('/api/noticias', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({
            TableName: 'BaneNoticias'
        }));
        const noticiasOrdenadas = resultado.Items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json(noticiasOrdenadas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar las noticias en AWS' });
    }
});

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor de BANE Esports corriendo en http://localhost:3000');
});