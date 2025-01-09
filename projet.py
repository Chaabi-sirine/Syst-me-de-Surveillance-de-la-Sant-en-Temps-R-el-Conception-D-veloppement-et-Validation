import paho.mqtt.client as mqtt

# MQTT Configuration
mqtt_server = "broker.emqx.io"
mqtt_port = 1883
mqtt_user = ""
mqtt_password = ""
client_id = "python_subscriber"

# MQTT Topics
topic_temperature_ds18b20 = "topic_sensor_temperature_ds18b20"
topic_temperature_ntc = "topic_sensor_temperature_ntc"
topic_accel = "topic_sensor_acceleration"
topic_ds18b20_alert = "alert/ds18b20_temperature"
topic_ntc_alert = "alert/ntc_temperature"
topic_accel_alert = "alert/acceleration"

# Thresholds for alerts
ds18b20_threshold = 30.0  # DS18B20 temperature threshold
ntc_threshold = 30.0      # NTC temperature threshold
accel_threshold = 2.0     # Accelerometer threshold for alert

# Callback when connected to the MQTT broker
def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code: {rc}")
    client.subscribe(topic_temperature_ds18b20)
    client.subscribe(topic_temperature_ntc)
    client.subscribe(topic_accel)

# Callback when a message is received from a subscribed topic
def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode("utf-8")

    print(f"Received message on topic '{topic}': {payload}")

    # Process messages for each topic
    if topic == topic_temperature_ds18b20:
        ds18b20_temp = float(payload)
        print(f"DS18B20 Temperature: {ds18b20_temp}°C")
        if ds18b20_temp > ds18b20_threshold:
            print("DS18B20 temperature alert!")
            client.publish(topic_ds18b20_alert, "1")  # Send alert
        else:
            client.publish(topic_ds18b20_alert, "0")  # Clear alert

    elif topic == topic_temperature_ntc:
        ntc_temp = float(payload)
        print(f"NTC Temperature: {ntc_temp}°C")
        if ntc_temp > ntc_threshold:
            print("NTC temperature alert!")
            client.publish(topic_ntc_alert, "1")  # Send alert
        else:
            client.publish(topic_ntc_alert, "0")  # Clear alert

    elif topic == topic_accel:
        accel_data = payload.split()
        accel_x = float(accel_data[0].split(":")[1])
        accel_y = float(accel_data[1].split(":")[1])
        accel_z = float(accel_data[2].split(":")[1])

        print(f"Acceleration - X: {accel_x}, Y: {accel_y}, Z: {accel_z}")
        if abs(accel_x) > accel_threshold or abs(accel_y) > accel_threshold or abs(accel_z) > accel_threshold:
            print("Acceleration alert!")
            client.publish(topic_accel_alert, "1")  # Send alert
        else:
            client.publish(topic_accel_alert, "0")  # Clear alert

# Initialize the MQTT client
client = mqtt.Client(client_id)
client.on_connect = on_connect
client.on_message = on_message

# Connect to the MQTT broker
client.username_pw_set(mqtt_user, mqtt_password)
client.connect(mqtt_server, mqtt_port, 60)

# Loop to keep the connection alive and process incoming messages
try:
    print("Listening for MQTT messages...")
    client.loop_forever()  # Maintain connection and process messages
except KeyboardInterrupt:
    print("Exiting...")
