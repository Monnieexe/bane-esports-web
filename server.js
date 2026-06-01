const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto'); // Para generar IDs únicos universales

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurar la conexión con Amazon DynamoDB en AWS
// Nota: Las credenciales (accessKeyId y secretAccessKey) se recomienda configurarlas
// mediante variables de entorno (.env) por seguridad, no escritas directamente en el código.
const client = new DynamoDBClient({
    region: 'us-east-2', // La región de AWS que elijan (ej. Ohio)
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// El DocumentClient nos permite enviar y recibir objetos JSON nativos de JS de forma limpia
const ddbDocClient = DynamoDBDocumentClient.from(client);

// ==========================================
// RUTAS PARA LA SECCIÓN DE PARTIDAS
// ==========================================

// Guardar una nueva partida desde el panel de administración (admin.html)
app.post('/api/partidas', async (req, require) => {
    const { rival, torneo, score_bane, score_rival } = req.body;
    
    const nuevoMatch = {
        id: crypto.randomUUID(), // Genera un ID único e irrepetible
        rival: rival,
        torneo: torneo,
        score_bane: parseInt(score_bane),
        score_rival: parseInt(score_rival),
        fecha: new Date().toISOString() // Fecha y hora exacta de registro
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

// Obtener todas las partidas para mostrarlas en la web pública (index.html)
app.get('/api/partidas', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({
            TableName: 'BanePartidas'
        }));
        // Retorna la lista ordenada por fecha (más reciente primero)
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

// Publicar noticia desde admin.html
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

// Obtener noticias para index.html
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

// Iniciar servidor en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor de BANE Esports corriendo en http://localhost:3000');
});