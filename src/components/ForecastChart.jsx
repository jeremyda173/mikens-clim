import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

function ForecastChart({ dataPoints, units }) {
  const chartPayload = useMemo(() => {
    if (!dataPoints?.length) {
      return null
    }

    const labels = dataPoints.map((point) => point.label)
    const temperatureData = dataPoints.map((point) => point.temperature)
    const humidityData = dataPoints.map((point) => point.humidity)

    return {
      data: {
        labels,
        datasets: [
          {
            label: `Temperatura (${units === 'metric' ? '°C' : '°F'})`,
            data: temperatureData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.18)',
            pointBackgroundColor: '#fff',
            pointBorderColor: '#2563eb',
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Humedad (%)',
            data: humidityData,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            borderDash: [6, 4],
            pointRadius: 0,
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  return `${context.dataset.label}: ${Math.round(context.raw)} ${
                    units === 'metric' ? '°C' : '°F'
                  }`
                }
                return `${context.dataset.label}: ${Math.round(context.raw)}%`
              },
            },
          },
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(148, 163, 184, 0.2)',
            },
            ticks: {
              callback: (value) => `${value}°`,
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (value) => `${value}%`,
            },
            min: 0,
            max: 100,
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    }
  }, [dataPoints, units])

  if (!chartPayload) {
    return <p className="chart-empty">Sin datos de pronóstico disponibles.</p>
  }

  return <Line data={chartPayload.data} options={chartPayload.options} />
}

export default ForecastChart
