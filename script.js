// ** ATENÇÃO: Substitua pelas suas chaves de API reais! **
const WEATHER_API_KEY = 'f0e1675e976256e9e65a2dd2390a9326'; // <-- COLE SUA CHAVE AQUI
const NEWS_API_KEY = '04a0f859492f488ea87b3b80525dfd35';

// --- MAPEAMENTO DOS ELEMENTOS DO DOM ---
const domElements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    weatherInfo: document.getElementById('weather-info'),
    cityName: document.getElementById('city-name'),
    weatherIcon: document.getElementById('weather-icon'),
    currentTemp: document.getElementById('current-temp'),
    weatherDescription: document.getElementById('weather-description'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    precipitation: document.getElementById('precipitation'), // NOVO ELEMENTO
    tempToggle: document.getElementById('temp-toggle'),
    loadingSpinner: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    hourlyForecastContainer: document.getElementById('hourly-forecast'),
    hourlyForecastSection: document.querySelector('.hourly-forecast'),
    dailyForecastContainer: document.getElementById('forecast-container'),
    dailyForecastSection: document.querySelector('.daily-forecast'),
    newsList: document.getElementById('news-list'),
    newsCategorySelect: document.getElementById('news-category'),
    newsContainer: document.querySelector('.news-container'),
    localTime: document.getElementById('time-only'),
    dateFull: document.getElementById('date-full'),
    dayOfWeek: document.getElementById('day-of-week'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    visibility: document.getElementById('visibility'),
    aqi: document.getElementById('aqi'),
    themeToggle: document.getElementById('theme-toggle'),
    favoriteBtn: document.getElementById('favorite-btn'),
    favoritesList: document.getElementById('favorites-list'),
};

let isMetric = true;
let currentWeatherData = {};
let favorites = JSON.parse(localStorage.getItem('favoriteCities')) || [];
let timeInterval;

// --- FUNÇÕES DE UTILIDADE ---
const formatTime = (timestamp, timezone) => {
    const date = new Date((timestamp + timezone) * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
};

const getFormattedDate = (timestamp, timezone) => {
    const date = new Date((timestamp + timezone) * 1000);
    const options = { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' };
    const dateString = date.toLocaleDateString('pt-BR', options);
    const [dayOfWeek, ...rest] = dateString.split(', ');
    return { dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1), dateFull: rest.join(', ') };
};

const convertTemperature = (temp) => {
    const kelvin = parseFloat(temp);
    if (isMetric) {
        return `${Math.round(kelvin - 273.15)}°C`;
    } else {
        return `${Math.round((kelvin - 273.15) * 9/5 + 32)}°F`;
    }
};

const getAQIDescription = (aqi) => {
    let description = '';
    let className = `aqi-${aqi}`;
    switch (aqi) {
        case 1: description = 'Bom'; break;
        case 2: description = 'Razoável'; break;
        case 3: description = 'Moderado'; break;
        case 4: description = 'Ruim'; break;
        case 5: description = 'Muito Ruim'; break;
        default: description = 'N/A'; className = '';
    }
    return `<span class="aqi-tag ${className}">${description}</span>`;
};

// --- CONTROLE DE UI ---
const showLoading = () => {
    domElements.weatherInfo.classList.add('hidden');
    domElements.hourlyForecastSection.classList.add('hidden');
    domElements.dailyForecastSection.classList.add('hidden');
    domElements.newsContainer.classList.add('hidden');
    domElements.errorMessage.classList.add('hidden');
    domElements.loadingSpinner.style.display = 'block';
    domElements.searchBtn.disabled = true;
};

const hideLoading = () => {
    domElements.loadingSpinner.style.display = 'none';
    domElements.searchBtn.disabled = false;
};

const showError = (message) => {
    hideLoading();
    domElements.errorMessage.textContent = message;
    domElements.errorMessage.classList.remove('hidden');
};

// --- LÓGICA DE BUSCA DE DADOS (COM ROTAS ALTERNATIVAS) ---
const fetchWeatherData = async (city) => {
    showLoading();
    try {
        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${WEATHER_API_KEY}`);
        const geoData = await geoResponse.json();
        if (!geoData || geoData.length === 0) throw new Error('Cidade não encontrada.');
        
        const { lat, lon, name, country } = geoData[0];
        
        const [weatherResponse, forecastResponse, aqiResponse] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&lang=pt_br`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&lang=pt_br`),
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`)
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) throw new Error('Não foi possível obter os dados do clima.');
        
        currentWeatherData.weather = await weatherResponse.json();
        currentWeatherData.forecast = await forecastResponse.json();
        currentWeatherData.aqi = aqiResponse.ok ? (await aqiResponse.json()).list[0].main.aqi : { list: [{ main: { aqi: 'N/A' } }] };
        
        updateUI();
        await fetchNews(name);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
};

// --- ATUALIZAÇÃO DA INTERFACE (COM CARDS DETALHADOS) ---
const updateUI = () => {
    const { weather, forecast, aqi } = currentWeatherData;
    if (timeInterval) clearInterval(timeInterval);

    domElements.cityName.textContent = `${weather.name}, ${weather.sys.country}`;
    updateFavoriteStatus(domElements.cityName.textContent);

    const timezone = weather.timezone;
    const { dayOfWeek, dateFull } = getFormattedDate(weather.dt, timezone);
    domElements.dayOfWeek.textContent = dayOfWeek;
    domElements.dateFull.textContent = dateFull;
    domElements.localTime.textContent = formatTime(Date.now() / 1000, timezone);
    timeInterval = setInterval(() => domElements.localTime.textContent = formatTime(Date.now() / 1000, timezone), 1000);

    domElements.currentTemp.textContent = convertTemperature(weather.main.temp);
    domElements.weatherDescription.textContent = weather.weather[0].description.charAt(0).toUpperCase() + weather.weather[0].description.slice(1);
    domElements.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
    domElements.feelsLike.textContent = convertTemperature(weather.main.feels_like);
    domElements.humidity.textContent = `${weather.main.humidity}%`;
    domElements.windSpeed.textContent = `${(weather.wind.speed * 3.6).toFixed(1)} km/h`;
    domElements.sunrise.textContent = formatTime(weather.sys.sunrise, timezone);
    domElements.sunset.textContent = formatTime(weather.sys.sunset, timezone);
    domElements.visibility.textContent = `${(weather.visibility / 1000).toFixed(1)} km`;
    domElements.aqi.innerHTML = getAQIDescription(aqi);

    // --- LÓGICA DA PRECIPITAÇÃO ---
    // Pega a precipitação da última hora (se houver)
    const precipLastHour = (weather.rain && weather.rain['1h']) || (weather.snow && weather.snow['1h']) || 0;
    
    // Calcula o total de precipitação para o dia atual a partir da previsão
    const todayDateStr = new Date((weather.dt + timezone) * 1000).toISOString().split('T')[0];
    let precipToday = 0;
    forecast.list.forEach(item => {
        const itemDateStr = new Date((item.dt + timezone) * 1000).toISOString().split('T')[0];
        if (itemDateStr === todayDateStr) {
            precipToday += (item.rain && item.rain['3h']) || (item.snow && item.snow['3h']) || 0;
        }
    });
    
    domElements.precipitation.textContent = `${precipLastHour.toFixed(1)} mm (hora) / ${precipToday.toFixed(1)} mm (dia)`;


    // --- ATUALIZAÇÃO DA PREVISÃO POR HORA ---
    domElements.hourlyForecastContainer.innerHTML = forecast.list.slice(0, 8).map(hour => {
        const rainProb = hour.pop ? (hour.pop * 100).toFixed(0) : 0;
        return `
            <div class="hourly-item">
                <p class="forecast-time">${formatTime(hour.dt, timezone)}</p>
                <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}.png" alt="${hour.weather[0].description}">
                <p class="forecast-temp">${convertTemperature(hour.main.temp)}</p>
                <div class="forecast-details">
                    <p><i data-feather="umbrella" class="details-icon"></i> ${rainProb}%</p>
                    <p><i data-feather="wind" class="details-icon"></i> ${(hour.wind.speed * 3.6).toFixed(0)} km/h</p>
                </div>
            </div>
        `;
    }).join('');

    // --- ATUALIZAÇÃO DA PREVISÃO PARA 5 DIAS ---
    const dailyForecasts = {};
    forecast.list.forEach(item => {
        const date = new Date((item.dt + timezone) * 1000).toISOString().split('T')[0];
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                temps: [], winds: [], humidities: [], rains: [],
                icon: item.weather[0].icon, description: item.weather[0].description
            };
        }
        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].winds.push(item.wind.speed);
        dailyForecasts[date].humidities.push(item.main.humidity);
        if (item.rain && item.rain['3h']) {
            dailyForecasts[date].rains.push(item.rain['3h']);
        }
    });

    domElements.dailyForecastContainer.innerHTML = Object.keys(dailyForecasts).slice(0, 5).map(date => {
        const dayData = dailyForecasts[date];
        const timestamp = new Date(date).getTime() / 1000;
        const { dayOfWeek } = getFormattedDate(timestamp, 0);

        const avgWind = (dayData.winds.reduce((a, b) => a + b, 0) / dayData.winds.length) * 3.6;
        const avgHumidity = dayData.humidities.reduce((a, b) => a + b, 0) / dayData.humidities.length;
        const totalRain = dayData.rains.reduce((a, b) => a + b, 0);

        return `
            <div class="forecast-item">
                <h3 class="daily-day">${dayOfWeek.substring(0, 3)}.</h3>
                <img src="https://openweathermap.org/img/wn/${dayData.icon}.png" alt="${dayData.description}" class="weather-icon-medium">
                <p class="daily-temp"><strong>${convertTemperature(Math.max(...dayData.temps))}</strong> / ${convertTemperature(Math.min(...dayData.temps))}</p>
                <p class="daily-description">${dayData.description}</p>
                <div class="daily-details-container">
                    <p><i data-feather="umbrella" class="details-icon"></i> ${totalRain.toFixed(1)} mm</p>
                    <p><i data-feather="wind" class="details-icon"></i> ${avgWind.toFixed(0)} km/h</p>
                    <p><i data-feather="droplet" class="details-icon"></i> ${Math.round(avgHumidity)}%</p>
                </div>
            </div>
        `;
    }).join('');

    domElements.weatherInfo.classList.remove('hidden');
    domElements.hourlyForecastSection.classList.remove('hidden');
    domElements.dailyForecastSection.classList.remove('hidden');
    feather.replace();
};

// --- LÓGICA DE NOTÍCIAS (sem alterações) ---
const fetchNews = async (query, category = 'general') => {
    domElements.newsContainer.classList.remove('hidden');
    domElements.newsList.innerHTML = '<p>Carregando notícias...</p>';
    try {
        let response = await fetch(`https://newsapi.org/v2/top-headlines?q=${encodeURIComponent(query)}&category=${category}&language=pt&apiKey=${NEWS_API_KEY}`);
        let data = await response.json();
        
        if (data.status === 'error' || data.totalResults === 0) {
            response = await fetch(`https://newsapi.org/v2/top-headlines?country=br&category=${category}&language=pt&apiKey=${NEWS_API_KEY}`);
            data = await response.json();
        }

        if (data.articles && data.articles.length > 0) {
            displayNews(data.articles);
        } else {
            domElements.newsList.innerHTML = '<p>Nenhuma notícia encontrada.</p>';
        }
    } catch (error) {
        domElements.newsList.innerHTML = `<p>Erro ao carregar notícias.</p>`;
    }
};

const displayNews = (articles) => {
    domElements.newsList.innerHTML = articles.slice(0, 5).map(article => {
        if (!article.title || !article.description) return '';
        return `
            <div class="news-item">
                ${article.urlToImage ? `<img src="${article.urlToImage}" alt="${article.title}" style="width:100px; height:100px; object-fit: cover; border-radius: 8px;">` : ''}
                <div>
                    <h4 class="news-title-link"><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h4>
                </div>
            </div>
        `;
    }).join('');
};

// --- LÓGICA DE FAVORITOS (sem alterações) ---
const renderFavorites = () => {
    if (favorites.length === 0) {
        domElements.favoritesList.innerHTML = '<p style="font-size: 0.9em; color: var(--text-secondary-color);">Salve suas cidades favoritas clicando na estrela ★</p>';
    } else {
        domElements.favoritesList.innerHTML = favorites.map(city => `<button class="favorite-city-btn">${city}</button>`).join('');
        domElements.favoritesList.querySelectorAll('.favorite-city-btn').forEach(btn => {
            btn.onclick = () => fetchWeatherData(btn.textContent);
        });
    }
};

const updateFavoriteStatus = (cityName) => {
    domElements.favoriteBtn.classList.toggle('is-favorite', favorites.includes(cityName));
};

const toggleFavorite = () => {
    const cityName = domElements.cityName.textContent;
    if (!cityName) return;
    const index = favorites.indexOf(cityName);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(cityName);
    }
    localStorage.setItem('favoriteCities', JSON.stringify(favorites));
    renderFavorites();
    updateFavoriteStatus(cityName);
};

// --- LÓGICA DO TEMA (sem alterações) ---
const applyTheme = (theme) => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    domElements.themeToggle.checked = theme === 'dark';
};

// --- INICIALIZAÇÃO E EVENT LISTENERS (sem alterações) ---
const addEventListeners = () => {
    domElements.searchBtn.onclick = () => {
        if (domElements.cityInput.value.trim()) fetchWeatherData(domElements.cityInput.value.trim());
    };
    domElements.cityInput.onkeypress = (e) => {
        if (e.key === 'Enter') domElements.searchBtn.click();
    };
    domElements.tempToggle.onclick = () => {
        isMetric = !isMetric;
        if (Object.keys(currentWeatherData).length) updateUI();
    };
    domElements.themeToggle.onchange = () => {
        const newTheme = domElements.themeToggle.checked ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };
    domElements.favoriteBtn.onclick = toggleFavorite;
    domElements.newsCategorySelect.onchange = (e) => {
        const category = e.target.value;
        const currentCityName = currentWeatherData.weather?.name || 'brasil';
        fetchNews(currentCityName, category);
    };
};

const initializeApp = () => {
    addEventListeners();
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    renderFavorites();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${WEATHER_API_KEY}`);
                const data = await response.json();
                fetchWeatherData(data[0]?.name || 'Florianópolis');
            },
            () => { fetchWeatherData('Florianópolis'); }
        );
    } else {
        fetchWeatherData('Florianópolis');
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);