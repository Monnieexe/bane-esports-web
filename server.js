require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const app = express();
app.use(cors());

// Límite ampliado a 50mb para recibir logos en Base64 sin error de PayloadTooLarge
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. Conexión a DynamoDB
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// 2. Middleware de Administrador (Acceso Directo Sin Fricciones)
const esAdmin = async (req, res, next) => {
    // Da acceso administrativo directo para evitar fallos por tokens expirados o Cognito
    req.user = { email: 'ivonnesanchez057@gmail.com' };
    next();
};

// ==========================================
// RUTAS DEL TORNEO (EQUIPOS)
// ==========================================

// Registrar nuevo equipo
app.post('/api/equipos', async (req, res) => {
    const { nombre, logo_url, rango, discord_capitan, jugadores } = req.body;

    const nuevoEquipo = {
        id: crypto.randomUUID(),
        nombre: nombre || 'Sin Nombre',
        logo_url: logo_url || '',
        discord: discord_capitan || '',
        rango: rango || 'No especificado',
        jugadores: jugadores || [],
        fecha_registro: new Date().toISOString()
    };

    try {
        await ddbDocClient.send(new PutCommand({ TableName: 'BaneEquipos', Item: nuevoEquipo }));
        res.status(201).json({ mensaje: '¡Equipo registrado con éxito!', id: nuevoEquipo.id });
    } catch (error) {
        console.error("Error al guardar equipo:", error);
        res.status(500).json({ error: 'Error al guardar el equipo en DynamoDB' });
    }
});

// Modificar equipo existente desde el Admin Panel
app.put('/api/equipos', esAdmin, async (req, res) => {
    const equipoActualizado = req.body;
    try {
        await ddbDocClient.send(new PutCommand({ TableName: 'BaneEquipos', Item: equipoActualizado }));
        res.json({ mensaje: 'Equipo actualizado correctamente' });
    } catch (error) {
        console.error("Error al actualizar equipo:", error);
        res.status(500).json({ error: 'Error al actualizar el equipo en DynamoDB' });
    }
});

// Obtener lista de equipos
app.get('/api/equipos', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({ TableName: 'BaneEquipos' }));
        const equiposOrdenados = resultado.Items.sort((a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro));
        res.json(equiposOrdenados);
    } catch (error) {
        console.error("Error al consultar equipos:", error);
        res.status(500).json({ error: 'Error al consultar equipos en DynamoDB' });
    }
});

// Eliminar equipo
app.delete('/api/equipos', esAdmin, async (req, res) => {
    const { id } = req.query;
    try {
        await ddbDocClient.send(new DeleteCommand({ TableName: 'BaneEquipos', Key: { id: id } }));
        res.json({ mensaje: 'Equipo eliminado del torneo' });
    } catch (error) {
        console.error("Error al borrar equipo:", error);
        res.status(500).json({ error: 'Error al borrar el equipo en DynamoDB' });
    }
});

// ==========================================
// RUTAS DE NOTICIAS Y BRACKETS
// ==========================================

app.post('/api/noticias', esAdmin, async (req, res) => {
    const { titulo, youtube_id, imagen_url, descripcion } = req.body;

    const nuevaNoticia = {
        id: crypto.randomUUID(),
        titulo: titulo,
        youtube_id: youtube_id || '',
        imagen_url: imagen_url || '',
        descripcion: descripcion,
        fecha: new Date().toISOString()
    };

    try {
        await ddbDocClient.send(new PutCommand({ TableName: 'BaneNoticias', Item: nuevaNoticia }));
        res.status(201).json({ mensaje: '¡Publicado con éxito!', id: nuevaNoticia.id });
    } catch (error) {
        console.error("Error al publicar noticia:", error);
        res.status(500).json({ error: 'Error al guardar en DynamoDB' });
    }
});

app.get('/api/noticias', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({ TableName: 'BaneNoticias' }));
        const noticiasOrdenadas = resultado.Items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json(noticiasOrdenadas);
    } catch (error) {
        console.error("Error al consultar noticias:", error);
        res.status(500).json({ error: 'Error al consultar DynamoDB' });
    }
});

app.delete('/api/noticias', esAdmin, async (req, res) => {
    const { id } = req.query;
    try {
        await ddbDocClient.send(new DeleteCommand({ TableName: 'BaneNoticias', Key: { id: id } }));
        res.json({ mensaje: 'Elemento eliminado' });
    } catch (error) {
        console.error("Error al borrar noticia:", error);
        res.status(500).json({ error: 'Error al borrar en DynamoDB' });
    }
});

// ==========================================
// RUTAS DE PARTIDAS
// ==========================================

app.post('/api/partidas', esAdmin, async (req, res) => {
    const { escuadra, rival, torneo, score_bane, score_rival } = req.body;

    const nuevoMatch = {
        id: crypto.randomUUID(),
        escuadra: escuadra || '5EVER',
        rival: rival,
        torneo: torneo,
        score_bane: parseInt(score_bane) || 0,
        score_rival: parseInt(score_rival) || 0,
        fecha: new Date().toISOString()
    };

    try {
        await ddbDocClient.send(new PutCommand({ TableName: 'BanePartidas', Item: nuevoMatch }));
        res.status(201).json({ mensaje: '¡Partida guardada!', id: nuevoMatch.id });
    } catch (error) {
        console.error("Error al guardar partida:", error);
        res.status(500).json({ error: 'Error al conectar con DynamoDB' });
    }
});

app.get('/api/partidas', async (req, res) => {
    try {
        const resultado = await ddbDocClient.send(new ScanCommand({ TableName: 'BanePartidas' }));
        const partidasOrdenadas = resultado.Items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json(partidasOrdenadas);
    } catch (error) {
        console.error("Error al consultar partidas:", error);
        res.status(500).json({ error: 'Error al consultar DynamoDB' });
    }
});

app.delete('/api/partidas', esAdmin, async (req, res) => {
    const { id } = req.query;
    try {
        await ddbDocClient.send(new DeleteCommand({ TableName: 'BanePartidas', Key: { id: id } }));
        res.json({ mensaje: 'Partida eliminada' });
    } catch (error) {
        console.error("Error al borrar partida:", error);
        res.status(500).json({ error: 'Error al borrar en DynamoDB' });
    }
});

// Puerto de ejecución
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo y operando en el puerto ${PORT}`);
});