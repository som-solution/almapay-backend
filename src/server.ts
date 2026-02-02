import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlmaPay Sandbox Server running on port ${PORT}`);
    console.log(`Server accessible on all network interfaces (0.0.0.0)`);
    console.log(`Environment: Sandbox Simulation`);
});
