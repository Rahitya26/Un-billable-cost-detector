const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_NAME = 'unbillable_predictor';
const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
};

async function createDatabase() {
    const client = new Client({
        ...DB_CONFIG,
        database: 'postgres', // Connect to default DB to create new one
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Creating database ${DB_NAME}...`);
            await client.query(`CREATE DATABASE "${DB_NAME}"`);
            console.log('Database created.');
        } else {
            console.log('Database already exists.');
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
}

async function seed() {
    await createDatabase();

    const client = new Client({
        ...DB_CONFIG,
        database: DB_NAME,
    });

    try {
        await client.connect();
        
        const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8');
        console.log('Running seed SQL...');
        await client.query(seedSql);
        console.log('Seed completed successfully.');
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        await client.end();
    }
}

seed();
