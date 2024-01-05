#include <Arduino.h>
#include <FastLED.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <AsyncElegantOTA.h>



unsigned long ota_progress_millis = 0;
AsyncWebServer server(80);
void setupOTA(void) {
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "Hi! This is a sample response.");
  });

  AsyncElegantOTA.begin(&server);    // Start AsyncElegantOTA
  server.begin();
  Serial.println("HTTP server started");
}


#define WIFI_SSID "ssid"
#define WIFI_PASSWORD "12345678"
void setupWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  char emptyMsg[1] = "";
  char pointMsg[2] = ".";
  Serial.println(emptyMsg);
    // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println(pointMsg);
  }
  Serial.println(emptyMsg);
  char connectedToMsg[14] = "Connected to ";
  Serial.println(connectedToMsg);
  Serial.println(WIFI_SSID);
  char ipAddrMsg[30];
  sprintf(ipAddrMsg, "IP address: %s", WiFi.localIP().toString().c_str());
  Serial.println(ipAddrMsg);
}



// This example shows several ways to set up and use 'palettes' of colors
// with FastLED.
//
// These compact palettes provide an easy way to re-colorize your
// animation on the fly, quickly, easily, and with low overhead.
//
// USING palettes is MUCH simpler in practice than in theory, so first just
// run this sketch, and watch the pretty lights as you then read through
// the code.  Although this sketch has eight (or more) different color schemes,
// the entire sketch compiles down to about 6.5K on AVR.
//
// FastLED provides a few pre-configured color palettes, and makes it
// extremely easy to make up your own color schemes with palettes.
//
// Some notes on the more abstract 'theory and practice' of
// FastLED compact palettes are at the bottom of this file.


#define DIN_PIN     27
#define NUM_LEDS    250
#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB
CRGB leds[NUM_LEDS];
 
int DELAY_MS = 10;

uint8_t BRIGHTNESS = 50;
bool hueLoop = true;

CRGBPalette16 currentPalette;
TBlendType    currentBlending;
 
extern CRGBPalette16 myRedWhiteBluePalette;
extern const TProgmemPalette16 myRedWhiteBluePalette_p PROGMEM;
 
void setupFastLED(){
    delay( 3000 ); // power-up safety delay
    FastLED.addLeds<LED_TYPE, DIN_PIN, COLOR_ORDER>(leds, NUM_LEDS).setCorrection( TypicalLEDStrip );
    FastLED.setBrightness(  BRIGHTNESS );
    
    currentPalette = RainbowColors_p;
    currentBlending = LINEARBLEND;
}


#define MODBUS_SERVER "10.50.0.253"
#define MODBUS_PORT 1883
WiFiClient wifiClient;
PubSubClient pubSubClient(wifiClient);

void modbusCallback(char* topic, byte* payload, unsigned int length) {
  char payloadChar[sizeof(payload)];
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
    payloadChar[i] = (char)payload[i];
  }
  Serial.println();

  String payloadStr = String(payloadChar);
  payloadStr.trim();
  
  if (strcmp(topic, "/devices/ws2812b/controls/brightness") == 0) {
    BRIGHTNESS = payloadStr.toInt();
    Serial.printf("brithness set to %d\n", BRIGHTNESS);
  }
  if (strcmp(topic, "/devices/ws2812b/controls/hueLoop") == 0) {
    if(payloadStr.toInt() == 1) {
      hueLoop = true;
    } else {
      hueLoop = false;
    }
  }
  if (strcmp(topic, "/devices/ws2812b/controls/delayMs") == 0) {
      DELAY_MS = payloadStr.toInt();
  }
}

void setupModbus() {
  pubSubClient.setServer(MODBUS_SERVER, MODBUS_PORT);
  pubSubClient.setCallback(modbusCallback);
}

void modbusReconnect() {
  // Loop until we're reconnected
  while (!pubSubClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    // Attempt to connect
    if (pubSubClient.connect(clientId.c_str())) {
      Serial.println("connected");
      pubSubClient.subscribe("/devices/ws2812b/controls/brightness");
      pubSubClient.subscribe("/devices/ws2812b/controls/hueLoop");
      pubSubClient.subscribe("/devices/ws2812b/controls/delayMs");
    } else {
      Serial.print("failed, rc=");
      Serial.print(pubSubClient.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

void modbusLoop() {
  if (!pubSubClient.connected()) {
    modbusReconnect();
  }
  pubSubClient.loop();
}

void ChangePalettePeriodically();
void FillLEDsFromPaletteColors( uint8_t colorIndex);

 
void FillLEDsFromPaletteColors( uint8_t colorIndex)
{
    uint8_t brightness = 255;
    
    for( int i = 0; i < NUM_LEDS; ++i) {
        leds[i] = ColorFromPalette( currentPalette, colorIndex, brightness, currentBlending);
        colorIndex += 3;
    }
}
 
 
// There are several different palettes of colors demonstrated here.
//
// FastLED provides several 'preset' palettes: RainbowColors_p, RainbowStripeColors_p,
// OceanColors_p, CloudColors_p, LavaColors_p, ForestColors_p, and PartyColors_p.
//
// Additionally, you can manually define your own color palettes, or you can write
// code that creates color palettes on the fly.  All are shown here.
 void SetupTotallyRandomPalette();
 void SetupPurpleAndGreenPalette();
 void SetupPurpleAndGreenPalette();
 void SetupBlackAndWhiteStripedPalette();

void ChangePalettePeriodically()
{
    uint8_t secondHand = (millis() / 1000) % 60;
    static uint8_t lastSecond = 99;
    
    FastLED.setBrightness(BRIGHTNESS);
    if(!hueLoop) {
        return;
    }

    if( lastSecond != secondHand) {
        lastSecond = secondHand;
        if( secondHand ==  0)  { currentPalette = RainbowColors_p;         currentBlending = LINEARBLEND; }
        if( secondHand == 10)  { currentPalette = RainbowStripeColors_p;   currentBlending = NOBLEND;  }
        if( secondHand == 15)  { currentPalette = RainbowStripeColors_p;   currentBlending = LINEARBLEND; }
        if( secondHand == 20)  { SetupPurpleAndGreenPalette();             currentBlending = LINEARBLEND; }
        if( secondHand == 25)  { SetupTotallyRandomPalette();              currentBlending = LINEARBLEND; }
        if( secondHand == 30)  { SetupBlackAndWhiteStripedPalette();       currentBlending = NOBLEND; }
        if( secondHand == 35)  { SetupBlackAndWhiteStripedPalette();       currentBlending = LINEARBLEND; }
        if( secondHand == 40)  { currentPalette = CloudColors_p;           currentBlending = LINEARBLEND; }
        if( secondHand == 45)  { currentPalette = PartyColors_p;           currentBlending = LINEARBLEND; }
        if( secondHand == 50)  { currentPalette = myRedWhiteBluePalette_p; currentBlending = NOBLEND;  }
        if( secondHand == 55)  { currentPalette = myRedWhiteBluePalette_p; currentBlending = LINEARBLEND; }
    }
}
 
// This function fills the palette with totally random colors.
void SetupTotallyRandomPalette()
{
    for( int i = 0; i < 16; ++i) {
        currentPalette[i] = CHSV( random8(), 255, random8());
    }
}
 
// This function sets up a palette of black and white stripes,
// using code.  Since the palette is effectively an array of
// sixteen CRGB colors, the various fill_* functions can be used
// to set them up.
void SetupBlackAndWhiteStripedPalette()
{
    // 'black out' all 16 palette entries...
    fill_solid( currentPalette, 16, CRGB::Black);
    // and set every fourth one to white.
    currentPalette[0] = CRGB::White;
    currentPalette[4] = CRGB::White;
    currentPalette[8] = CRGB::White;
    currentPalette[12] = CRGB::White;
    
}
 
// This function sets up a palette of purple and green stripes.
void SetupPurpleAndGreenPalette()
{
    CRGB purple = CHSV( HUE_PURPLE, 255, 255);
    CRGB green  = CHSV( HUE_GREEN, 255, 255);
    CRGB black  = CRGB::Black;
    
    currentPalette = CRGBPalette16(
                                   green,  green,  black,  black,
                                   purple, purple, black,  black,
                                   green,  green,  black,  black,
                                   purple, purple, black,  black );
}
 
 
// This example shows how to set up a static color palette
// which is stored in PROGMEM (flash), which is almost always more
// plentiful than RAM.  A static PROGMEM palette like this
// takes up 64 bytes of flash.
const TProgmemPalette16 myRedWhiteBluePalette_p PROGMEM =
{
    CRGB::Red,
    CRGB::Gray, // 'white' is too bright compared to red and blue
    CRGB::Blue,
    CRGB::Black,
    
    CRGB::Red,
    CRGB::Gray,
    CRGB::Blue,
    CRGB::Black,
    
    CRGB::Red,
    CRGB::Red,
    CRGB::Gray,
    CRGB::Gray,
    CRGB::Blue,
    CRGB::Blue,
    CRGB::Black,
    CRGB::Black
};
 
 
 
// Additional notes on FastLED compact palettes:
//
// Normally, in computer graphics, the palette (or "color lookup table")
// has 256 entries, each containing a specific 24-bit RGB color.  You can then
// index into the color palette using a simple 8-bit (one byte) value.
// A 256-entry color palette takes up 768 bytes of RAM, which on Arduino
// is quite possibly "too many" bytes.
//
// FastLED does offer traditional 256-element palettes, for setups that
// can afford the 768-byte cost in RAM.
//
// However, FastLED also offers a compact alternative.  FastLED offers
// palettes that store 16 distinct entries, but can be accessed AS IF
// they actually have 256 entries; this is accomplished by interpolating
// between the 16 explicit entries to create fifteen intermediate palette
// entries between each pair.
//
// So for example, if you set the first two explicit entries of a compact 
// palette to Green (0,255,0) and Blue (0,0,255), and then retrieved 
// the first sixteen entries from the virtual palette (of 256), you'd get
// Green, followed by a smooth gradient from green-to-blue, and then Blue.


#define LED_PIN     2
int led_status = HIGH;

void ledUpdate(int v) {
  digitalWrite(LED_PIN, v);
}

void ledBlink( void * parameter ) {
  const TickType_t xDelay = 1000 / portTICK_PERIOD_MS;
  for(;;) {
    switch (led_status)
    {
    case HIGH:
      led_status = LOW;
      break;  
    default:
      led_status = HIGH;
      break;
    }
    ledUpdate(led_status);
    vTaskDelay(xDelay);
    Serial.printf("blink %d\n", led_status);
  }
}

void setupLedBlink()  {
    pinMode(LED_PIN, OUTPUT);

    xTaskCreate(
                    ledBlink,          /* Task function. */
                    "ledBlink",        /* String with name of task. */
                    10000,            /* Stack size in bytes. */
                    NULL,             /* Parameter passed as input of the task */
                    1,                /* Priority of the task. */
                    NULL);            /* Task handle. */
}


void setup() {
    Serial.begin(9600);
    setupLedBlink();
    setupWifi();
    setupFastLED();
    setupModbus();
    setupOTA();
}

void loop()
{
    modbusLoop();
    ChangePalettePeriodically();
    
    static uint8_t startIndex = 0;
    startIndex = startIndex + 1; /* motion speed */
    
    FillLEDsFromPaletteColors( startIndex);
    
    FastLED.show();
    
    if (DELAY_MS > 0) {
      FastLED.delay(DELAY_MS);
    }
    
}