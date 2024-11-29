import mqtt from "mqtt";
import promclient from "prom-client";
// @deno-types="@types/express"
import express from "express";
import { Buffer } from "node:buffer";

const client = mqtt.connect(`mqtt:${Deno.env.get("MQTT_HOST")}`, {
    username: Deno.env.get("MQTT_USERNAME"),
    password: Deno.env.get("MQTT_PASSWORD"),
    port: Number(Deno.env.get("MQTT_PASSWORD")),
    connectTimeout: 10 * 1000,
});
console.log("Connecting...");
client.on("connect", () => {
    client.subscribe([
        "icnss/temperature",
        "icnss/humidity",
        "icnss/co",
    ]);
    console.log("Connected!");
});
client.on("reconnect", () => {
    console.log("Reconnecting...");
});
client.on("error", () => {
    console.log("Connection failed, exiting...");
    client.end();
    Deno.exit();
});

const tempGauge = new promclient.Gauge({
    name: "temperature",
    help: "Temperature Gauge",
});

const humGauge = new promclient.Gauge({
    name: "humidity",
    help: "Humidity Gauge",
});

const carbonGauge = new promclient.Gauge({
    name: "carbon",
    help: "Carbon Gauge",
});

const tempHandler = (message: Buffer) => {
    const temp = Number(message.toString());
    tempGauge.set(temp);
};

const humHandler = (message: Buffer) => {
    const hum = Number(message.toString());
    humGauge.set(hum);
};

const carbonHandler = (message: Buffer) => {
    const carbon = Number(message.toString());
    carbonGauge.set(carbon);
};

client.on("message", (topic, message, _) => {
    console.log(`Message received: ${topic}: ${message.toString()}`);
    
    switch (topic) {
        case "icnss/temperature":
            tempHandler(message);
            break;
        case "icnss/humidity":
            humHandler(message);
            break;
        case "icnss/co":
            carbonHandler(message);
            break;
        default:
            break;
    }
    // ...
});

const app = express();
app.get("/metrics", async (_, res) => {
    res.set("Content-Type", promclient.register.contentType)
        .send(await promclient.register.metrics());
});
app.listen(3000);
