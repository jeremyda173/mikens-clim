import { useCallback, useEffect, useMemo, useState } from 'react'
import ForecastChart from './ForecastChart'
import MetricCard from './MetricCard'

const DEFAULT_CITY = 'Madrid'
const REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutos
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5'

const TEMPERATURE_UNIT = {
  metric: '°C',
  imperial: '°F',
}

const WIND_UNIT = {
  metric: 'm/s',
  imperial: 'mph',
}

function formatTemperature(value, units) {
  if (typeof value !== 'number') {
    return '--'
  }
  return `${Math.round(value)}${TEMPERATURE_UNIT[units]}`
}

function formatWindSpeed(value, units) {
  if (typeof value !== 'number') {
    return '--'
  }
  return `${value.toFixed(1)} ${WIND_UNIT[units]}`
}

function formatVisibility(value) {
  if (typeof value !== 'number') {
    return '--'
  }
  return `${(value / 1000).toFixed(1)} km`
}

function formatSunEvent(timestamp, timezoneOffset) {
  if (!timestamp) {
    return '--'
  }
  const date = new Date((timestamp + timezoneOffset) * 1000)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
}

function formatUpdatedAt(date) {
  if (!date) {
    return null
  }
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function buildForecastPoints(forecast) {
  if (!forecast?.list?.length) {
    return []
  }

  const timezoneOffset = forecast.city?.timezone ?? 0
  return forecast.list.slice(0, 8).map((item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000)
    const label = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(localDate)

    return {
      label,
      temperature: item.main?.temp ?? null,
      humidity: item.main?.humidity ?? null,
      precipitation: Math.round((item.pop ?? 0) * 100),
    }
  })
}

function WeatherDashboard() {
  const [city, setCity] = useState(DEFAULT_CITY)
  const [searchTerm, setSearchTerm] = useState(DEFAULT_CITY)
  const [units, setUnits] = useState('metric')
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY

  const fetchWeather = useCallback(
    async (overrideCity = city, overrideUnits = units) => {
      if (!apiKey) {
        setError(
          'Falta la clave de API de OpenWeather. Agrega VITE_OPENWEATHER_API_KEY a un archivo .env.local en la raíz del proyecto.'
        )
        return
      }

      const trimmedCity = overrideCity.trim()
      if (!trimmedCity) {
        setError('Ingresa una ciudad válida para continuar.')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          q: trimmedCity,
          units: overrideUnits,
          appid: apiKey,
          lang: 'es',
        })

        const [currentRes, forecastRes] = await Promise.all([
          fetch(`${WEATHER_API_BASE}/weather?${params.toString()}`),
          fetch(`${WEATHER_API_BASE}/forecast?${params.toString()}`),
        ])

        if (!currentRes.ok) {
          throw new Error('No encontramos datos para esa ubicación.')
        }

        if (!forecastRes.ok) {
          throw new Error('Ocurrió un problema al obtener el pronóstico extendido.')
        }

        const [current, forecast] = await Promise.all([currentRes.json(), forecastRes.json()])

        setWeatherData({ current, forecast })
        setLastUpdated(new Date())
      } catch (fetchError) {
        setWeatherData(null)
        setError(fetchError.message)
      } finally {
        setLoading(false)
      }
    },
    [apiKey, city, units]
  )

  useEffect(() => {
    fetchWeather()
    const intervalId = setInterval(() => {
      fetchWeather()
    }, REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [fetchWeather])

  const forecastPoints = useMemo(() => buildForecastPoints(weatherData?.forecast), [weatherData])

  const currentCityName = weatherData?.current?.name

  const backgroundImageUrl = useMemo(() => {
    const backgroundCity = currentCityName ?? city
    if (!backgroundCity) {
      return null
    }
    const query = encodeURIComponent(backgroundCity.split(',')[0])
    return `https://source.unsplash.com/1600x900/?${query},city,skyline`
  }, [currentCityName, city])

  useEffect(() => {
    if (!backgroundImageUrl) {
      document.documentElement.style.removeProperty('--city-background-image')
      return
    }
    const formattedValue = `url("${backgroundImageUrl}")`
    document.documentElement.style.setProperty('--city-background-image', formattedValue)

    return () => {
      document.documentElement.style.removeProperty('--city-background-image')
    }
  }, [backgroundImageUrl])

  const metrics = useMemo(() => {
    if (!weatherData?.current) {
      return []
    }

    const { current } = weatherData

    return [
      {
        label: 'Sensación térmica',
        value: formatTemperature(current.main?.feels_like, units),
      },
      {
        label: 'Humedad relativa',
        value: `${current.main?.humidity ?? '--'}%`,
        helper: forecastPoints[0] ? `Próx. lluvia: ${forecastPoints[0].precipitation}%` : undefined,
      },
      {
        label: 'Viento',
        value: formatWindSpeed(current.wind?.speed, units),
      },
      {
        label: 'Presión',
        value: `${current.main?.pressure ?? '--'} hPa`,
      },
      {
        label: 'Visibilidad',
        value: formatVisibility(current.visibility),
      },
      {
        label: 'Nubosidad',
        value: `${current.clouds?.all ?? '--'}%`,
      },
      {
        label: 'Salida del sol',
        value: formatSunEvent(current.sys?.sunrise, current.timezone ?? 0),
      },
      {
        label: 'Puesta del sol',
        value: formatSunEvent(current.sys?.sunset, current.timezone ?? 0),
      },
    ]
  }, [weatherData, units, forecastPoints])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = searchTerm.trim()
    if (!trimmed) {
      setError('Ingresa una ciudad válida para continuar.')
      return
    }
    setCity(trimmed)
    fetchWeather(trimmed, units)
  }

  const handleUnitChange = (newUnits) => {
    setUnits(newUnits)
    fetchWeather(city, newUnits)
  }

  const handleRefresh = () => {
    fetchWeather()
  }

  const currentWeather = weatherData?.current
  const weatherDescription = currentWeather?.weather?.[0]
  const locationLabel = currentWeather
    ? `${currentWeather.name}, ${currentWeather.sys?.country ?? ''}`
    : city

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Mikens Meteorología</h1>
          <p className="dashboard__subtitle">Visualiza el clima en tiempo real con pronósticos actualizados cada 10 minutos.</p>
        </div>
        <div className="dashboard__meta">
          {lastUpdated ? <span>Actualizado a las {formatUpdatedAt(lastUpdated)}</span> : null}
          <button type="button" className="refresh-button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar ahora'}
          </button>
        </div>
      </header>

      <section className="controls-panel">
        <form className="search-form" onSubmit={handleSubmit}>
          <label className="search-form__label" htmlFor="city-input">
            Ciudad
          </label>
          <div className="search-form__group">
            <input
              id="city-input"
              type="text"
              placeholder="Ej. Bogotá, MX"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="primary-button" disabled={loading}>
              Buscar
            </button>
          </div>
        </form>

        <div className="unit-toggle" role="group" aria-label="Cambiar unidades">
          <button
            type="button"
            className={units === 'metric' ? 'active' : ''}
            onClick={() => handleUnitChange('metric')}
            disabled={units === 'metric' || loading}
          >
            °C
          </button>
          <button
            type="button"
            className={units === 'imperial' ? 'active' : ''}
            onClick={() => handleUnitChange('imperial')}
            disabled={units === 'imperial' || loading}
          >
            °F
          </button>
        </div>
      </section>

      {error ? <div className="status-message status-message--error">{error}</div> : null}

      {currentWeather ? (
        <section className="current-weather">
          <div className="current-weather__summary">
            <div>
              <p className="current-weather__location">{locationLabel}</p>
              <p className="current-weather__temperature">{formatTemperature(currentWeather.main?.temp, units)}</p>
              {weatherDescription ? (
                <p className="current-weather__description">{weatherDescription.description}</p>
              ) : null}
            </div>
            <div className="current-weather__visual">
              <div className="sky-scene" aria-hidden="true">
                <span className="sky-scene__sun" />
                <span className="sky-scene__cloud sky-scene__cloud--one" />
                <span className="sky-scene__cloud sky-scene__cloud--two" />
              </div>
              {weatherDescription?.icon ? (
                <img
                  className="current-weather__icon"
                  src={`https://openweathermap.org/img/wn/${weatherDescription.icon}@4x.png`}
                  alt={weatherDescription.description}
                  loading="lazy"
                />
              ) : null}
            </div>
          </div>

          <div className="forecast-overview">
            <h2>Pronóstico próximo</h2>
            <div className="forecast-overview__chips">
              {forecastPoints.slice(0, 4).map((point) => (
                <span className="forecast-chip" key={point.label}>
                  <strong>{point.label}</strong>
                  <span>{formatTemperature(point.temperature, units)}</span>
                  <span>{point.precipitation}% lluvia</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : loading ? (
        <p className="status-message">Cargando datos meteorológicos…</p>
      ) : null}

      {metrics.length ? (
        <section className="metrics-grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} helper={metric.helper} />
          ))}
        </section>
      ) : null}

      <section className="chart-card">
        <div className="chart-card__header">
          <h2>Tendencia en las próximas horas</h2>
          <p>Visualiza temperatura y humedad en intervalos de 3 horas.</p>
        </div>
        <div className="chart-card__body">
          {loading && !forecastPoints.length ? (
            <p className="status-message">Cargando pronósticos…</p>
          ) : (
            <ForecastChart dataPoints={forecastPoints} units={units} />
          )}
        </div>
      </section>
    </div>
  )
}

export default WeatherDashboard
