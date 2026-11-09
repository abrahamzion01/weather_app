# Weather

A responsive weather app that shows current conditions and a seven-day forecast for your location or a searched city. Select any Nigerian state or the Federal Capital Territory to see a forecast for its capital.

## Run locally

Open `index.html` in a browser, or serve this folder from a local web server (for example, `python -m http.server 8000`) and visit `http://localhost:8000`. Browser geolocation requires a secure context, which includes `localhost` and HTTPS.

## Data and privacy

Weather forecasts and place search use the public [Open-Meteo API](https://open-meteo.com/) and require no API key. Your coordinates are requested only after you select **Use my location** and are sent to Open-Meteo to retrieve the forecast; they are not stored by this app. If you decline or location is unavailable, search by city or choose a Nigerian state instead.
