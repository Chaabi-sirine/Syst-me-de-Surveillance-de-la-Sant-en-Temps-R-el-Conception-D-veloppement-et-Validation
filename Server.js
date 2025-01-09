const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2/promise"); // Use mysql2 for database connection

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database Configuration
const dbConfig = {
    host: "localhost", // Change this to your database host
    user: "root",      // Change this to your database username
    password: "root1234", // Change this to your database password
    database: "iot_health_monitor", // Change this to your database name
};

// Thresholds
let thresholds = {
    bodyTemp: 37.5, // Default body temperature threshold
    ambientTemp: 30.0, // Default ambient temperature threshold
    movement: 10.0, // Default movement threshold
};

// Helper Function to Connect to Database
async function getConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Database connection successful!");
        return connection;
    } catch (error) {
        console.error("Error connecting to database:", error);
        throw error;
    }
}

// API Endpoints

// Fetch real-time sensor data
app.get("/sensorData", async (req, res) => {
    try {
        console.log("Fetching real-time sensor data...");
        const connection = await getConnection();
        const [rows] = await connection.query(
            "SELECT body_temp, ambient_temp, accel_x, accel_y, accel_z FROM sensor_readings ORDER BY timestamp DESC LIMIT 1"
        );
        await connection.end();

        if (rows.length === 0) {
            console.log("No real-time data available.");
            return res.json({
                bodyTemp: { value: null, status: "Normal" },
                ambientTemp: { value: null, status: "Normal" },
                movement: { value: null, status: "Normal" },
            });
        }

        const latestData = rows[0];
        const bodyTemp = latestData.body_temp || 0;
        const ambientTemp = latestData.ambient_temp || 0;
        const accel_x = latestData.accel_x || 0;
        const accel_y = latestData.accel_y || 0;
        const accel_z = latestData.accel_z || 0;

        // Calculate movement as the magnitude of the acceleration vector
        const movement = Math.sqrt(
            Math.pow(accel_x, 2) + Math.pow(accel_y, 2) + Math.pow(accel_z, 2)
        ).toFixed(2);

        // Determine status based on thresholds
        const bodyTempStatus = bodyTemp > thresholds.bodyTemp ? "Alert" : "Normal";
        const ambientTempStatus = ambientTemp > thresholds.ambientTemp ? "Alert" : "Normal";
        const movementStatus = movement > thresholds.movement ? "Alert" : "Normal";

        res.json({
            bodyTemp: { value: bodyTemp, status: bodyTempStatus },
            ambientTemp: { value: ambientTemp, status: ambientTempStatus },
            movement: { value: parseFloat(movement), status: movementStatus },
        });
    } catch (error) {
        console.error("Error fetching real-time sensor data:", error);
        res.status(500).send("Error fetching sensor data");
    }
});

// Fetch historical data for charts
app.get("/historicalData", async (req, res) => {
    try {
        console.log("Fetching historical data...");
        const connection = await getConnection();
        const [rows] = await connection.query(
            "SELECT timestamp, body_temp, ambient_temp, accel_x, accel_y, accel_z FROM sensor_readings ORDER BY timestamp DESC LIMIT 100"
        );
        await connection.end();

        const historicalData = rows.map((row) => {
            // Handle null values for acceleration components
            const accel_x = row.accel_x !== null ? row.accel_x : 0;
            const accel_y = row.accel_y !== null ? row.accel_y : 0;
            const accel_z = row.accel_z !== null ? row.accel_z : 0;

            // Calculate movement as the magnitude of the acceleration vector
            const movement = Math.sqrt(
                Math.pow(accel_x, 2) + Math.pow(accel_y, 2) + Math.pow(accel_z, 2)
            ).toFixed(2); // Limit to 2 decimal places

            return {
                timestamp: row.timestamp,
                bodyTemp: row.body_temp !== null ? row.body_temp : 0, // Default to 0 if null
                ambientTemp: row.ambient_temp !== null ? row.ambient_temp : 0, // Default to 0 if null
                movement: parseFloat(movement), // Calculated movement value
            };
        });

        res.json(historicalData);
    } catch (error) {
        console.error("Error fetching historical data:", error);
        res.status(500).send("Error fetching historical data");
    }
});

// Endpoint to set thresholds
app.post("/setThresholds", (req, res) => {
    const { bodyTemp, ambientTemp, movement } = req.body;

    if (bodyTemp !== undefined) thresholds.bodyTemp = parseFloat(bodyTemp);
    if (ambientTemp !== undefined) thresholds.ambientTemp = parseFloat(ambientTemp);
    if (movement !== undefined) thresholds.movement = parseFloat(movement);

    console.log("Thresholds updated:", thresholds);
    res.send("Thresholds updated successfully");
});

// RGB LED Control Endpoint
app.post("/setRgbLed", (req, res) => {
    const { color } = req.query;

    if (!["off", "red", "green", "blue"].includes(color)) {
        res.status(400).send("Invalid color. Allowed values are: off, red, green, blue.");
        return;
    }

    console.log(`RGB LED set to: ${color}`);
    res.send(`RGB LED set to ${color}`);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://127.0.0.1:${port}`);
});
