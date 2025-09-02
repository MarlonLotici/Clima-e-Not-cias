const gnewsApiKey = '4ba24431ba69a0b9f193cbbe0be37103';

const cityInput = document.getElementById('city-input');
const datalist = document.getElementById('cities-datalist');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.getElementById('weather-info');
const cityName = document.getElementById('city-name');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temp');
const description = document.getElementById('description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const rainVolume = document.getElementById('rain-volume');
const tempToggle = document.getElementById('temp-toggle');
const localTime = document.getElementById('local-time');
const dayOfWeekEl = localTime.querySelector('.day-of-week');
const dateFullEl = localTime.querySelector('.date-full');
const timeOnlyEl = localTime.querySelector('.time-only');

const hourlyForecast = document.getElementById('hourly-forecast');
const hourlyContainer = document.getElementById('hourly-container');

const forecastTabs = document.getElementById('forecast-tabs');
const forecastContainer = document.getElementById('forecast-container');
const forecastButtons = document.querySelectorAll('.forecast-btn');

const newsContainer = document.getElementById('news-container');
const newsList = document.getElementById('news-list');
const newsTopicSelect = document.getElementById('news-topic');

const loadingSpinner = document.getElementById('loading-spinner');
const feedbackMessage = document.getElementById('feedback-message');

let weatherDataCache = null;
let isCelsius = true;

// Ao carregar a página, sempre tenta obter a localização atual
window.addEventListener('load', () => {
    showLoading('Obtendo sua localização atual...');
    getLocation();
});

cityInput.addEventListener('input', async () => {
    const query = cityInput.value.trim();
    if (query.length > 2) {
        await getAutocompleteSuggestions(query);
    } else {
        datalist.innerHTML = '';
    }
});

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        showLoading(`Buscando dados para ${city}...`);
        getCoordinates(city);
        getNews(newsTopicSelect.value);
    }
});

tempToggle.addEventListener('click', () => {
    isCelsius = !isCelsius;
    tempToggle.textContent = isCelsius ? '°F' : '°C';
    if (weatherDataCache) {
        displayWeatherData(weatherDataCache.current, weatherDataCache.city);
        displayForecast(weatherDataCache.daily, document.querySelector('.forecast-btn.active').dataset.days);
        displayHourlyForecast(weatherDataCache.hourly);
    }
});

forecastButtons.forEach(button => {
    button.addEventListener('click', () => {
        forecastButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const days = parseInt(button.dataset.days);
        if (weatherDataCache && weatherDataCache.daily) {
            displayForecast(weatherDataCache.daily, days);
        }
    });
});

newsTopicSelect.addEventListener('change', (event) => {
    const topic = event.target.value;
    getNews(topic);
});

function showLoading(message) {
    weatherInfo.classList.add('hidden');
    hourlyForecast.classList.add('hidden');
    forecastTabs.classList.add('hidden');
    forecastContainer.classList.add('hidden');
    newsContainer.classList.add('hidden');
    loadingSpinner.style.display = 'block';
    feedbackMessage.textContent = message;
    feedbackMessage.style.color = '#2C3E50';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    feedbackMessage.textContent = '';
    weatherInfo.classList.remove('hidden');
    hourlyForecast.classList.remove('hidden');
    forecastTabs.classList.remove('hidden');
    forecastContainer.classList.remove('hidden');
    newsContainer.classList.remove('hidden');
}

function displayError(message) {
    showLoading();
    loadingSpinner.style.display = 'none';
    feedbackMessage.textContent = message;
    feedbackMessage.style.color = '#e74c3c';
}

async function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                getCityName(latitude, longitude);
                getWeatherData(latitude, longitude, 'Sua Localização', localTimezone);
            },
            () => {
                // Se a geolocalização for negada ou falhar, tenta usar a última cidade salva
                const lastCity = localStorage.getItem('lastCity');
                if (lastCity) {
                    showLoading(`Não foi possível obter sua localização. Carregando clima para ${lastCity}...`);
                    getCoordinates(lastCity);
                } else {
                    getLocationByIP();
                }
            }
        );
    } else {
        getLocationByIP();
    }
}

async function getLocationByIP() {
    showLoading('Geolocalização não suportada. Buscando por IP...');
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
            const localTimezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            const locationName = `${data.city || 'Sua Localização'}, ${data.region_code || data.country_code}`;
            getWeatherData(data.latitude, data.longitude, locationName, localTimezone);
        } else {
            displayError('Não foi possível obter sua localização. Por favor, digite o nome da cidade.');
        }
    } catch (error) {
        console.error('Erro ao buscar localização por IP:', error);
        displayError('Não foi possível obter sua localização. Por favor, digite o nome da cidade.');
    }
}

async function getCityName(lat, lon) {
    try {
        const geoApiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const response = await fetch(geoApiUrl);
        if (!response.ok) {
            throw new Error('Erro ao buscar nome da cidade.');
        }
        const data = await response.json();
        
        const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.suburb || data.address.hamlet;
        const state = data.address.state || data.address.state_code || data.address.country;

        let locationName = 'Sua Localização';
        if (city && state) {
            locationName = `${city}, ${state}`;
        } else if (city) {
            locationName = city;
        } else if (state) {
            locationName = state;
        }
        
        cityName.textContent = locationName;

    } catch (error) {
        console.error("Erro ao obter nome da cidade por coordenadas:", error);
        cityName.textContent = 'Sua Localização';
    }
}

async function getAutocompleteSuggestions(query) {
    const geoApiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=pt&format=json`;
    try {
        const response = await fetch(geoApiUrl);
        const data = await response.json();
        datalist.innerHTML = '';
        if (data.results) {
            data.results.forEach(result => {
                const option = document.createElement('option');
                const displayRegion = result.admin1 ? result.admin1 : result.country;
                option.value = `${result.name}, ${displayRegion}`;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro no autocompletar:', error);
    }
}

async function getCoordinates(city) {
    showLoading(`Buscando dados para ${city}...`);
    try {
        const citySearch = city.includes(',') ? city.split(',')[0].trim() : city;
        const geoApiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${citySearch}&count=1&language=pt&format=json`;
        const response = await fetch(geoApiUrl);

        if (!response.ok) {
            throw new Error('Erro na busca de coordenadas. Verifique o nome da cidade.');
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('Cidade não encontrada.');
        }

        const { latitude, longitude, name, country, timezone } = data.results[0];
        getWeatherData(latitude, longitude, `${name}, ${country}`, timezone);
        localStorage.setItem('lastCity', city);
    } catch (error) {
        displayError(error.message);
    }
}

async function getWeatherData(lat, lon, city, timezone) {
    try {
        const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean&hourly=temperature_2m,weather_code,precipitation_probability,rain&timezone=${timezone}&forecast_days=6`;
        const response = await fetch(weatherApiUrl);

        if (!response.ok) {
            throw new Error('Erro ao buscar dados do clima.');
        }

        weatherDataCache = await response.json();
        weatherDataCache.city = city;
        weatherDataCache.timezone = timezone;
        
        displayWeatherData(weatherDataCache.current, weatherDataCache.city);
        displayForecast(weatherDataCache.daily, 3);
        displayHourlyForecast(weatherDataCache.hourly);
        hideLoading();
    } catch (error) {
        displayError(error.message);
    }
}

async function getNews(topic = 'breaking-news') {
    try {
        const gnewsApiUrl = `https://gnews.io/api/v4/top-headlines?topic=${topic}&lang=pt&token=${gnewsApiKey}&max=10`;
        const response = await fetch(gnewsApiUrl);

        if (!response.ok) {
            throw new Error(`Erro ao buscar notícias: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
            displayNews(data.articles);
        } else {
            newsList.innerHTML = `<p class="error-message">Nenhum artigo encontrado para o tópico selecionado.</p>`;
        }
    } catch (error) {
        console.error('Erro na API de Notícias:', error);
        newsList.innerHTML = `<p class="error-message">Não foi possível carregar as notícias. Por favor, tente novamente mais tarde.</p>`;
    }
}

function displayWeatherData(data, city) {
    cityName.textContent = city;

    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    dayOfWeekEl.textContent = capitalizeFirstLetter(now.toLocaleDateString('pt-BR', { weekday: 'long' }));
    dateFullEl.textContent = now.toLocaleDateString('pt-BR', dateOptions);
    timeOnlyEl.textContent = now.toLocaleTimeString('pt-BR', timeOptions);

    weatherIcon.src = getWeatherIcon(data.weather_code, now.getHours());
    
    const tempValue = isCelsius ? data.temperature_2m : (data.temperature_2m * 9/5) + 32;
    temperature.textContent = `${Math.round(tempValue)}°${isCelsius ? 'C' : 'F'}`;

    description.textContent = getWeatherDescription(data.weather_code);
    humidity.textContent = `Umidade: ${data.relative_humidity_2m}%`;
    windSpeed.textContent = `Vento: ${data.wind_speed_10m} km/h`;
    rainVolume.textContent = `Chuva (últ. hora): ${data.precipitation ? data.precipitation.toFixed(1) : 0} mm`;

    setDynamicBackground(data.weather_code);

    weatherInfo.classList.remove('hidden');
    hourlyForecast.classList.remove('hidden');
    forecastTabs.classList.remove('hidden');
    forecastContainer.classList.remove('hidden');
    newsContainer.classList.remove('hidden');
}

function displayHourlyForecast(hourlyData) {
    hourlyContainer.innerHTML = '';
    const now = new Date();
    let currentHourIndex = hourlyData.time.findIndex(time => new Date(time).getHours() === now.getHours() && new Date(time).getDate() === now.getDate());

    if (currentHourIndex === -1 || new Date(hourlyData.time[currentHourIndex]) < now) {
        currentHourIndex = hourlyData.time.findIndex(time => new Date(time) >= now);
    }
    
    for (let i = 0; i < 24; i++) {
        const index = currentHourIndex + i;
        if (hourlyData.time[index]) {
            const time = hourlyData.time[index];
            const temp = hourlyData.temperature_2m[index];
            const code = hourlyData.weather_code[index];
            const rain = hourlyData.rain[index];
    
            const date = new Date(time);
            const hour = date.getHours();
    
            const hourlyItem = document.createElement('div');
            hourlyItem.classList.add('hourly-item');
            hourlyItem.innerHTML = `
                <p>${hour}:00</p>
                <img src="${getWeatherIcon(code, hour)}" alt="ícone do clima">
                <p>${Math.round(isCelsius ? temp : (temp * 9/5) + 32)}°${isCelsius ? 'C' : 'F'}</p>
                <p>Chuva: ${rain ? rain.toFixed(1) : 0} mm</p>
            `;
            hourlyContainer.appendChild(hourlyItem);
        }
    }
}

function displayForecast(dailyData, days) {
    forecastContainer.innerHTML = '';
    
    for (let i = 1; i <= days; i++) { 
        if (!dailyData.time[i]) continue;

        const date = new Date(dailyData.time[i]);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayNumber = date.getDate();
        
        const maxTemp = isCelsius ? dailyData.temperature_2m_max[i] : (dailyData.temperature_2m_max[i] * 9/5) + 32;
        const minTemp = isCelsius ? dailyData.temperature_2m_min[i] : (dailyData.temperature_2m_min[i] * 9/5) + 32;

        const forecastItem = document.createElement('div');
        forecastItem.classList.add('forecast-item');
        forecastItem.innerHTML = `
            <h3>${capitalizeFirstLetter(dayName)} <br> Dia ${dayNumber}</h3>
            <img src="${getWeatherIcon(dailyData.weather_code[i], 12)}" alt="ícone do clima"> 
            <p>Máx: ${Math.round(maxTemp)}°${isCelsius ? 'C' : 'F'} | Mín: ${Math.round(minTemp)}°${isCelsius ? 'C' : 'F'}</p>
            <p class="forecast-desc">${getWeatherDescription(dailyData.weather_code[i])}</p>
            <p>Umidade: ${Math.round(dailyData.relative_humidity_2m_mean[i])}%</p>
            <p>Chuva: ${dailyData.precipitation_sum[i].toFixed(1)} mm</p>
        `;
        forecastContainer.appendChild(forecastItem);
    }
}

function displayNews(articles) {
    newsList.innerHTML = '';
    articles.forEach((article, index) => {
        if (!article.title || !article.url) return;
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item');
        newsItem.setAttribute('data-id', `news-${index}`);
        
        newsItem.innerHTML = `
            <h4 class="news-title-link"><a href="${article.url}" target="_blank">${article.title}</a></h4>
            <p>${article.description || ''}</p>
            <button class="close-news-btn" data-id="news-${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        newsList.appendChild(newsItem);
    });

    document.querySelectorAll('.close-news-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const itemId = event.target.closest('.close-news-btn').dataset.id;
            document.querySelector(`.news-item[data-id="${itemId}"]`).remove();
        });
    });
}

function getWeatherIcon(code, hour) {
    const isDay = hour > 6 && hour < 18;
    
    // URL da imagem de lua mais bonita (substitua pelo caminho do seu arquivo)
    const nightIcon = 'http://googleusercontent.com/image_generation_content/0';

    const iconMap = {
        0: isDay ? 'http://openweathermap.org/img/wn/01d.png' : nightIcon,
        1: isDay ? 'http://openweathermap.org/img/wn/01d.png' : nightIcon,
        2: isDay ? 'http://openweathermap.org/img/wn/02d.png' : 'http://openweathermap.org/img/wn/02n.png',
        3: 'http://openweathermap.org/img/wn/04d.png',
        45: 'http://openweathermap.org/img/wn/50d.png',
        48: 'http://openweathermap.org/img/wn/50d.png',
        51: 'http://openweathermap.org/img/wn/09d.png',
        53: 'http://openweathermap.org/img/wn/09d.png',
        55: 'http://openweathermap.org/img/wn/09d.png',
        61: 'http://openweathermap.org/img/wn/10d.png',
        63: 'http://openweathermap.org/img/wn/10d.png',
        65: 'http://openweathermap.org/img/wn/10d.png',
        71: 'http://openweathermap.org/img/wn/13d.png',
        73: 'http://openweathermap.org/img/wn/13d.png',
        75: 'http://openweathermap.org/img/wn/13d.png',
        80: 'http://openweathermap.org/img/wn/09d.png',
        81: 'http://openweathermap.org/img/wn/09d.png',
        82: 'http://openweathermap.org/img/wn/09d.png',
        95: 'http://openweathermap.org/img/wn/11d.png',
        96: 'http://openweathermap.org/img/wn/11d.png',
        99: 'http://openweathermap.org/img/wn/11d.png',
    };
    return iconMap[code] || 'http://openweathermap.org/img/wn/01d.png';
}

function getWeatherDescription(code) {
    const descriptionMap = {
        0: 'Céu limpo',
        1: 'Céu limpo',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Névoa',
        48: 'Névoa',
        51: 'Chuvisco',
        53: 'Chuvisco',
        55: 'Chuvisco',
        61: 'Chuva fraca',
        63: 'Chuva moderada',
        65: 'Chuva forte',
        71: 'Neve fraca',
        73: 'Neve moderada',
        75: 'Neve forte',
        80: 'Pancadas de chuva',
        81: 'Pancadas de chuva',
        82: 'Pancadas de chuva',
        95: 'Trovoadas',
        96: 'Trovoadas com granizo',
        99: 'Trovoadas com granizo',
    };
    return descriptionMap[code] || 'Não disponível';
}

function setDynamicBackground(code) {
    const body = document.body;
    body.className = '';
    
    if (code >= 0 && code <= 1) {
        body.classList.add('weather-clear');
    } else if (code >= 2 && code <= 3) {
        body.classList.add('weather-clouds');
    } else if (code >= 51 && code <= 65) {
        body.classList.add('weather-rain');
    } else if (code >= 71 && code <= 75) {
        body.classList.add('weather-snow');
    } else if (code >= 95 && code <= 99) {
        body.classList.add('weather-storm');
    } else {
        body.style.backgroundImage = 'none';
        body.style.backgroundColor = 'var(--bg-color)';
    }
}

// Nova função para capitalizar a primeira letra
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}