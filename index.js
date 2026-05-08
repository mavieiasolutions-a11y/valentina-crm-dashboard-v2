const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/valentina_calls';

console.log('Starting server...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected successfully');
})
.catch(err => {
    console.error('MongoDB connection error:', err.message);
});

// Schema para llamadas
const callSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    companyName: { type: String, required: true },
    status: {
        type: String,
        required: true,
        enum: ['Sí', 'No', 'Demo', 'Volver a llamar']
    },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now }
});

const Call = mongoose.model('Call', callSchema);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        res.json({
            status: 'OK',
            database: dbStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Obtener todas las llamadas
app.get('/api/calls', async (req, res) => {
    try {
        const calls = await Call.find().sort({ date: -1 });
        res.json(calls);
    } catch (error) {
        console.error('Error fetching calls:', error);
        res.status(500).json({ error: 'Error fetching calls' });
    }
});

// Agregar nueva llamada
app.post('/api/calls', async (req, res) => {
    try {
        const { phoneNumber, companyName, status, notes } = req.body;

        if (!phoneNumber || !companyName || !status) {
            return res.status(400).json({
                error: 'Phone number, company name, and status are required'
            });
        }

        const newCall = new Call({
            phoneNumber: phoneNumber.trim(),
            companyName: companyName.trim(),
            status: status,
            notes: notes ? notes.trim() : '',
            date: new Date()
        });

        const savedCall = await newCall.save();
        res.status(201).json({
            message: 'Call registered successfully',
            call: savedCall
        });

    } catch (error) {
        console.error('Error creating call:', error);
        res.status(500).json({ error: 'Error registering call' });
    }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo de errores
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Solo iniciar servidor en desarrollo
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Exportar para Vercel
module.exports = app;