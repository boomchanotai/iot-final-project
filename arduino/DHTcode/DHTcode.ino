#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

#define DHTPIN 5
#define DHTTYPE DHT22 // DHT 22 (AM2302), AM2321
DHT dht(DHTPIN, DHTTYPE);

#define relay1 2

// WIFI
const char* ssid = "Sathit";
const char* password = "0962396259";

// Config MQTT Server
#define mqtt_server "driver.cloudmqtt.com"
#define mqtt_port 18672
#define mqtt_user "qurygeum"
#define mqtt_password "vDKjrZ5FpIHJ"

WiFiClient espClient;
PubSubClient client(espClient);

char buf[20];

void setup() {
  Serial.begin(115200);
  Serial.println(F("DHTxx test!"));
  dht.begin();

  pinMode(relay1, OUTPUT);

  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}
void loop() {
  // WiFi
  if (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP8266Client", mqtt_user, mqtt_password)) {
      Serial.println("connected");
      client.subscribe("/Boomzaza");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println("try again in 5 seconds");
      delay(5000);
      return;
    }
  }
  client.loop();

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  client.publish("/Boomzaza/temperature", String(t).c_str());
  client.publish("/Boomzaza/humidity", String(h).c_str());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  String msg = "";
  int i = 0;
  while (i < length) msg += (char)payload[i++];

  if (msg == "GET") {
    client.publish("/Boomzaza", (digitalRead(relay1) ? "relay1_on" : "relay1_off"));
    return;
  }
  //  else if (msg == "GET_TEMP") {
  //
  //    buf[20] = 0;
  //    return;
  //  }

  digitalWrite(relay1, (msg == "relay1_on" ? LOW : HIGH));
  Serial.println(msg);
}
