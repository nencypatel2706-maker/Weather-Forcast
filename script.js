const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");

const statusMessage = document.getElementById("status-message");

const currentWeather = document.getElementById("current-weather");
const forecastSection = document.getElementById("forecast-section");
const forecastContainer = document.getElementById("forecast-container");

function getWeatherInfo(code) {

    if (code === 0) {
        return { description: "Clear Sky", icon: "☀️" };
    }

    if (code === 1 || code === 2) {
        return { description: "Partly Cloudy", icon: "🌤️" };
    }

    if (code === 3) {
        return { description: "Cloudy", icon: "☁️" };
    }

    if ([45, 48].includes(code)) {
        return { description: "Foggy", icon: "🌫️" };
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
        return { description: "Drizzle", icon: "🌦️" };
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return { description: "Rainy", icon: "🌧️" };
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return { description: "Snowy", icon: "❄️" };
    }

    if ([95, 96, 99].includes(code)) {
        return { description: "Thunderstorm", icon: "⛈️" };
    }

    return { description: "Unknown Weather", icon: "🌡️" };
}


function showMessage(message, type = "") {

    statusMessage.textContent = message;
    statusMessage.className = type;
}


let validationTimer;

cityInput.addEventListener("input", function () {

    clearTimeout(validationTimer);

    validationTimer = setTimeout(function () {

        const city = cityInput.value.trim();

        if (city.length === 0) {
            showMessage("");
            return;
        }

        const validCity = /^[\p{L}\s.'-]+$/u.test(city);

        if (!validCity) {
            showMessage(
                "Please enter a valid city name.",
                "error"
            );
        } else {
            showMessage("");
        }

    }, 400);

});

// =====================================
// 6. Search Form
// =====================================

searchForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    clearTimeout(validationTimer);

    const city = cityInput.value.trim();

    // Validate empty input
    if (!city) {
        showMessage("Please enter a city name.", "error");
        cityInput.focus();
        return;
    }

    // Validate city name
    if (!/^[\p{L}\s.'-]+$/u.test(city)) {
        showMessage("Please enter a valid city name.", "error");
        return;
    }

    try {

        searchButton.disabled = true;
        searchButton.textContent = "Searching...";

        currentWeather.classList.add("hidden");
        forecastSection.classList.add("hidden");

        showMessage("Fetching weather information...");

        // =====================================
        // 7. Fetch City Coordinates
        // =====================================

        const geoURL = `${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

        const geoResponse = await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error("Unable to search for the city. Please try again.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Please check the spelling.");
        }

        const location = geoData.results[0];

        const latitude = location.latitude;
        const longitude = location.longitude;

        // =====================================
        // 8. Fetch Weather Data
        // =====================================

        const weatherURL =
            `${WEATHER_API}?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
            `&forecast_days=5&timezone=auto`;

        const weatherResponse = await fetch(weatherURL);

        if (!weatherResponse.ok) {
            throw new Error("Weather service is unavailable. Please try again later.");
        }

        const weatherData = await weatherResponse.json();

        if (!weatherData.current || !weatherData.daily) {
            throw new Error("Weather information is currently unavailable.");
        }

        // =====================================
        // 9. Display Weather Information
        // =====================================

        displayCurrentWeather(location, weatherData);
        displayForecast(weatherData.daily);

        showMessage(
            `Weather updated successfully for ${location.name}!`,
            "success"
        );

    } catch (error) {

        console.error("Weather Error:", error);

        showMessage(
            error.message || "Something went wrong. Please try again.",
            "error"
        );

    } finally {

        searchButton.disabled = false;
        searchButton.textContent = "Search";

    }

});


function displayCurrentWeather(location, data) {

    const current = data.current;
    const weather = getWeatherInfo(current.weather_code);

    document.getElementById("city-name").textContent =
        `${location.name}, ${location.country}`;

    document.getElementById("current-icon").textContent =
        weather.icon;

    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m);

    document.getElementById("weather-description").textContent =
        weather.description;

    document.getElementById("feels-like").textContent =
        `${Math.round(current.apparent_temperature)}°C`;

    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}%`;

    document.getElementById("wind-speed").textContent =
        `${current.wind_speed_10m} km/h`;

    currentWeather.classList.remove("hidden");

}

// =====================================
// 11. Display Five-Day Forecast
// =====================================

function displayForecast(daily) {

    forecastContainer.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {

        const weather = getWeatherInfo(daily.weather_code[i]);

        const date = new Date(daily.time[i] + "T12:00:00");

        const dayName = date.toLocaleDateString("en-US", {
            weekday: "short"
        });

        const forecastCard = document.createElement("div");

        forecastCard.className = "forecast-card";

        const day = document.createElement("p");
        day.className = "forecast-day";
        day.textContent = dayName;

        const icon = document.createElement("div");
        icon.className = "forecast-icon";
        icon.textContent = weather.icon;

        const temperature = document.createElement("p");
        temperature.className = "forecast-temp";
        temperature.textContent =
            `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`;

        const description = document.createElement("p");
        description.className = "forecast-description";
        description.textContent = weather.description;

        forecastCard.append(day, icon, temperature, description);

        forecastContainer.appendChild(forecastCard);

    }

    forecastSection.classList.remove("hidden");

}
