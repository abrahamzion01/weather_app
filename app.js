const forecastEndpoint = "https://api.open-meteo.com/v1/forecast";
const geocodingEndpoint = "https://geocoding-api.open-meteo.com/v1/search";
const nigerianStates = [
  ["Abia", "Umuahia"],
  ["Adamawa", "Yola"],
  ["Akwa Ibom", "Uyo"],
  ["Anambra", "Awka"],
  ["Bauchi", "Bauchi"],
  ["Bayelsa", "Yenagoa"],
  ["Benue", "Makurdi"],
  ["Borno", "Maiduguri"],
  ["Cross River", "Calabar"],
  ["Delta", "Asaba"],
  ["Ebonyi", "Abakaliki"],
  ["Edo", "Benin City"],
  ["Ekiti", "Ado-Ekiti"],
  ["Enugu", "Enugu"],
  ["Gombe", "Gombe"],
  ["Imo", "Owerri"],
  ["Jigawa", "Dutse"],
  ["Kaduna", "Kaduna"],
  ["Kano", "Kano"],
  ["Katsina", "Katsina"],
  ["Kebbi", "Birnin Kebbi"],
  ["Kogi", "Lokoja"],
  ["Kwara", "Ilorin"],
  ["Lagos", "Ikeja"],
  ["Nasarawa", "Lafia"],
  ["Niger", "Minna"],
  ["Ogun", "Abeokuta"],
  ["Ondo", "Akure"],
  ["Osun", "Osogbo"],
  ["Oyo", "Ibadan"],
  ["Plateau", "Jos"],
  ["Rivers", "Port Harcourt"],
  ["Sokoto", "Sokoto"],
  ["Taraba", "Jalingo"],
  ["Yobe", "Damaturu"],
  ["Zamfara", "Gusau"],
  ["Federal Capital Territory", "Abuja"]
];
const weatherDescriptions = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Light showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy showers", "🌧️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Thunderstorm with hail", "⛈️"]
};

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#location-input"),
  searchButton: document.querySelector(".search-button"),
  nigeriaState: document.querySelector("#nigeria-state"),
  locationButton: document.querySelector("#location-button"),
  results: document.querySelector("#search-results"),
  status: document.querySelector("#status-message"),
  content: document.querySelector("#weather-content"),
  unitToggle: document.querySelector("#unit-toggle"),
  date: document.querySelector("#current-date"),
  location: document.querySelector("#location-name"),
  timezone: document.querySelector("#timezone-label"),
  icon: document.querySelector("#current-icon"),
  condition: document.querySelector("#current-condition"),
  feelsLike: document.querySelector("#feels-like"),
  temperature: document.querySelector("#current-temperature"),
  temperatureUnit: document.querySelector("#current-unit"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  precipitation: document.querySelector("#precipitation"),
  forecast: document.querySelector("#forecast-grid")
};

let useFahrenheit = false;
let activeRequest = 0;
let lastWeather = null;

function populateNigerianStates() {
  const fragment = document.createDocumentFragment();
  nigerianStates.forEach(([state, capital]) => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = `${state} — ${capital}`;
    fragment.append(option);
  });
  elements.nigeriaState.append(fragment);
}

function describeWeather(code) {
  return weatherDescriptions[code] || ["Unknown conditions", "🌤️"];
}

function formatTemperature(value) {
  const temperature = useFahrenheit ? (value * 9) / 5 + 32 : value;
  return Math.round(temperature);
}

function showStatus(message, kind = "info") {
  elements.status.hidden = false;
  elements.status.dataset.kind = kind;
  elements.status.replaceChildren();
  const icon = document.createElement("span");
  icon.className = "status-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = kind === "error" ? "!" : kind === "loading" ? "◌" : "✦";
  const text = document.createElement("span");
  text.textContent = message;
  elements.status.append(icon, text);
}

function setBusy(isBusy) {
  elements.searchButton.disabled = isBusy;
  elements.locationButton.disabled = isBusy;
  elements.searchButton.textContent = isBusy ? "Loading..." : "Search";
}

function makeWeatherUrl(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "7",
    timezone: "auto",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh"
  });
  return `${forecastEndpoint}?${params}`;
}

async function loadWeather(location) {
  const requestId = ++activeRequest;
  setBusy(true);
  elements.results.hidden = true;
  elements.content.hidden = true;
  showStatus("Getting the latest forecast...", "loading");

  try {
    const response = await fetch(makeWeatherUrl(location.latitude, location.longitude));
    if (!response.ok) throw new Error("Weather service is unavailable right now.");
    const weather = await response.json();
    if (!weather.current || !weather.daily) throw new Error("The weather service returned incomplete forecast data.");
    if (requestId !== activeRequest) return;

    lastWeather = { location, weather };
    renderWeather(location, weather);
    elements.content.hidden = false;
    elements.status.hidden = true;
  } catch (error) {
    if (requestId !== activeRequest) return;
    showStatus(error.message || "Could not load the forecast. Please try again.", "error");
  } finally {
    if (requestId === activeRequest) setBusy(false);
  }
}

function renderWeather(location, weather) {
  const current = weather.current;
  const [condition, icon] = describeWeather(current.weather_code);
  const now = new Date();
  elements.location.textContent = location.name;
  elements.date.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: weather.timezone
  }).format(now);
  elements.timezone.textContent = weather.timezone ? weather.timezone.replaceAll("_", " ") : "";
  elements.icon.textContent = icon;
  elements.condition.textContent = condition;
  elements.feelsLike.textContent = `Feels like ${formatTemperature(current.apparent_temperature)}°`;
  elements.temperature.textContent = formatTemperature(current.temperature_2m);
  elements.temperatureUnit.textContent = useFahrenheit ? "°F" : "°C";
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  elements.precipitation.textContent = `${Number(current.precipitation).toFixed(1)} mm`;
  renderForecast(weather.daily);
}

function renderForecast(daily) {
  const fragment = document.createDocumentFragment();
  daily.time.forEach((date, index) => {
    const [condition, icon] = describeWeather(daily.weather_code[index]);
    const dateObject = new Date(`${date}T12:00:00`);
    const day = document.createElement("article");
    day.className = `forecast-day${index === 0 ? " today" : ""}`;

    const dayName = document.createElement("div");
    dayName.className = "day-name";
    dayName.textContent = index === 0
      ? "Today"
      : new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(dateObject);

    const weatherIcon = document.createElement("span");
    weatherIcon.className = "weather-icon forecast-icon";
    weatherIcon.setAttribute("aria-label", condition);
    weatherIcon.textContent = icon;

    const forecastCondition = document.createElement("div");
    forecastCondition.className = "forecast-condition";
    forecastCondition.textContent = condition;

    const temperatures = document.createElement("div");
    temperatures.className = "forecast-temps";
    const high = document.createElement("strong");
    high.textContent = `${formatTemperature(daily.temperature_2m_max[index])}°`;
    const low = document.createElement("span");
    low.textContent = `${formatTemperature(daily.temperature_2m_min[index])}°`;
    temperatures.append(high, low);

    const rain = document.createElement("p");
    rain.className = "precipitation-chance";
    const probability = daily.precipitation_probability_max?.[index];
    rain.textContent = probability == null || probability === 0 ? " " : `☂ ${probability}%`;

    day.append(dayName, weatherIcon, forecastCondition, temperatures, rain);
    fragment.append(day);
  });
  elements.forecast.replaceChildren(fragment);
}

async function searchLocations(query) {
  const params = new URLSearchParams({ name: query, count: "10", language: "en", format: "json" });
  const response = await fetch(`${geocodingEndpoint}?${params}`);
  if (!response.ok) throw new Error("Location search is unavailable right now.");
  const data = await response.json();
  return data.results || [];
}

function normalizeStateName(name) {
  const normalized = name.toLowerCase().replace(/\s+state$/, "").replace(/\s+/g, " ").trim();
  return normalized === "federal capital territory" ? "fct" : normalized;
}

async function loadNigerianState(stateName) {
  const state = nigerianStates.find(([name]) => name === stateName);
  if (!state) return;

  const requestId = ++activeRequest;
  setBusy(true);
  elements.content.hidden = true;
  elements.results.hidden = true;
  showStatus(`Finding ${state[1]}, ${state[0]}...`, "loading");

  try {
    const places = await searchLocations(state[1]);
    if (requestId !== activeRequest) return;
    const nigeriaPlaces = places.filter((place) => place.country_code === "NG");
    const matchingState = nigeriaPlaces.find((place) => (
      normalizeStateName(place.admin1 || "") === normalizeStateName(state[0])
      && place.name.toLowerCase() === state[1].toLowerCase()
    ));

    if (!matchingState) {
      showStatus(`Couldn't find ${state[1]} in ${state[0]}, Nigeria. Try searching for the city instead.`, "error");
      return;
    }

    elements.input.value = `${state[1]}, ${state[0]}, Nigeria`;
    await loadWeather({
      name: `${state[1]}, ${state[0]}, Nigeria`,
      latitude: matchingState.latitude,
      longitude: matchingState.longitude
    });
  } catch (error) {
    if (requestId === activeRequest) {
      showStatus(error.message || `Couldn't find a forecast for ${state[0]}, Nigeria.`, "error");
    }
  } finally {
    if (requestId === activeRequest) setBusy(false);
  }
}

function locationLabel(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).filter((part, index, list) => list.indexOf(part) === index).join(", ");
}

function showLocationChoices(places) {
  const fragment = document.createDocumentFragment();
  places.forEach((place, index) => {
    const button = document.createElement("button");
    button.className = "result-option";
    button.type = "button";
    button.role = "option";
    button.setAttribute("aria-selected", "false");
    const name = document.createElement("strong");
    name.textContent = place.name;
    const detail = document.createElement("span");
    detail.textContent = [place.admin1, place.country].filter(Boolean).join(", ");
    button.append(name, detail);
    button.addEventListener("click", () => {
      elements.input.value = locationLabel(place);
      loadWeather({ name: locationLabel(place), latitude: place.latitude, longitude: place.longitude });
    });
    fragment.append(button);
    if (index < places.length - 1) button.setAttribute("aria-setsize", String(places.length));
    button.setAttribute("aria-posinset", String(index + 1));
  });
  elements.results.replaceChildren(fragment);
  elements.results.hidden = false;
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = elements.input.value.trim();
  if (!query) {
    elements.input.focus();
    showStatus("Enter a city or place name to search.", "error");
    return;
  }

  const requestId = ++activeRequest;
  setBusy(true);
  elements.results.hidden = true;
  showStatus(`Searching for ${query}...`, "loading");
  try {
    const places = await searchLocations(query);
    if (requestId !== activeRequest) return;
    if (places.length === 0) {
      showStatus(`We couldn't find “${query}”. Try another city name.`, "error");
      return;
    }
    if (places.length === 1) {
      const place = places[0];
      await loadWeather({ name: locationLabel(place), latitude: place.latitude, longitude: place.longitude });
    } else {
      setBusy(false);
      showLocationChoices(places);
      showStatus("Choose the location you meant from the suggestions.");
    }
  } catch (error) {
    if (requestId === activeRequest) showStatus(error.message || "Location search failed. Please try again.", "error");
  } finally {
    if (requestId === activeRequest) setBusy(false);
  }
});

elements.nigeriaState.addEventListener("change", () => {
  if (elements.nigeriaState.value) loadNigerianState(elements.nigeriaState.value);
});

elements.locationButton.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    showStatus("Location is not available in this browser. Search for a city instead.", "error");
    elements.input.focus();
    return;
  }
  const requestId = ++activeRequest;
  showStatus("Waiting for your location permission...", "loading");
  setBusy(true);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (requestId !== activeRequest) return;
      loadWeather({
        name: "Your location",
        latitude: coords.latitude,
        longitude: coords.longitude
      });
    },
    (error) => {
      if (requestId !== activeRequest) return;
      setBusy(false);
      if (error.code === error.PERMISSION_DENIED) {
        showStatus("Location access was denied. Search for a city to see its forecast.", "error");
      } else if (error.code === error.TIMEOUT) {
        showStatus("Finding your location took too long. Try again or search for a city.", "error");
      } else {
        showStatus("We couldn't determine your location. Search for a city instead.", "error");
      }
      elements.input.focus();
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
  );
});

elements.unitToggle.addEventListener("click", () => {
  useFahrenheit = !useFahrenheit;
  elements.unitToggle.setAttribute("aria-pressed", String(useFahrenheit));
  elements.unitToggle.setAttribute("aria-label", `Switch to ${useFahrenheit ? "Celsius" : "Fahrenheit"}`);
  if (lastWeather) renderWeather(lastWeather.location, lastWeather.weather);
});

populateNigerianStates();

document.addEventListener("click", (event) => {
  if (!elements.results.contains(event.target) && !elements.form.contains(event.target)) {
    elements.results.hidden = true;
  }
});
