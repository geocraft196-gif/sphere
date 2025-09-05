/**
 * Chart.js Setup and Helpers
 * Handles chart creation and configuration for dashboard
 */

// Import Chart.js from CDN (will be loaded in HTML)
// This file assumes Chart.js is available globally

/**
 * Create a line chart for score trends
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} data - Array of {date, score} objects
 * @param {string} label - Chart label
 * @returns {Chart} - Chart.js instance
 */
export function createScoreTrendChart(canvas, data, label = 'Score Over Time') {
  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(item => item.date.toLocaleDateString()),
      datasets: [{
        label: label,
        data: data.map(item => item.score),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date'
          },
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Score (%)'
          },
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

/**
 * Create a bar chart for subject performance
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} subjectData - Object with subject names as keys and scores as values
 * @returns {Chart} - Chart.js instance
 */
export function createSubjectPerformanceChart(canvas, subjectData) {
  const ctx = canvas.getContext('2d');
  
  const subjects = Object.keys(subjectData);
  const scores = Object.values(subjectData).map(data => data.averageScore || 0);
  
  // Color scheme for subjects
  const colors = [
    '#10b981', // Biology - Green
    '#f59e0b', // Chemistry - Orange
    '#8b5cf6', // Physics - Purple
    '#84cc16', // Geology - Lime
    '#ef4444'  // English - Red
  ];
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: subjects,
      datasets: [{
        label: 'Average Score',
        data: scores,
        backgroundColor: colors.slice(0, subjects.length),
        borderColor: colors.slice(0, subjects.length),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const subject = context.label;
              const data = subjectData[subject];
              return [
                `Average Score: ${context.parsed.y}%`,
                `Attempts: ${data.attempts || 0}`,
                `Best Score: ${data.bestScore || 0}%`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Subject'
          },
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Average Score (%)'
          },
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  });
}

/**
 * Create a doughnut chart for attempt distribution
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} subjectData - Object with subject names as keys and attempt counts as values
 * @returns {Chart} - Chart.js instance
 */
export function createAttemptDistributionChart(canvas, subjectData) {
  const ctx = canvas.getContext('2d');
  
  const subjects = Object.keys(subjectData);
  const attempts = Object.values(subjectData).map(data => data.attempts || 0);
  
  // Filter out subjects with no attempts
  const filteredData = subjects.reduce((acc, subject, index) => {
    if (attempts[index] > 0) {
      acc.subjects.push(subject);
      acc.attempts.push(attempts[index]);
    }
    return acc;
  }, { subjects: [], attempts: [] });
  
  if (filteredData.subjects.length === 0) {
    // Show empty state
    ctx.font = '16px Inter';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('No attempts yet', canvas.width / 2, canvas.height / 2);
    return null;
  }
  
  const colors = [
    '#10b981', // Biology - Green
    '#f59e0b', // Chemistry - Orange
    '#8b5cf6', // Physics - Purple
    '#84cc16', // Geology - Lime
    '#ef4444'  // English - Red
  ];
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: filteredData.subjects,
      datasets: [{
        data: filteredData.attempts,
        backgroundColor: colors.slice(0, filteredData.subjects.length),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
              const percentage = Math.round((context.parsed / total) * 100);
              return `${context.label}: ${context.parsed} attempts (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

/**
 * Create a progress chart showing completion over time
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} data - Array of daily attempt data
 * @returns {Chart} - Chart.js instance
 */
export function createProgressChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(item => item.date.toLocaleDateString()),
      datasets: [{
        label: 'Attempts',
        data: data.map(item => item.attemptCount),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date'
          },
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Number of Attempts'
          },
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

/**
 * Update chart data
 * @param {Chart} chart - Chart.js instance
 * @param {Array} newData - New data array
 * @param {string} dataKey - Key to extract from data objects (optional)
 */
export function updateChartData(chart, newData, dataKey = null) {
  if (!chart) return;
  
  if (dataKey) {
    chart.data.datasets[0].data = newData.map(item => item[dataKey]);
  } else {
    chart.data.datasets[0].data = newData;
  }
  
  chart.update('none'); // Update without animation for better performance
}

/**
 * Destroy chart instance
 * @param {Chart} chart - Chart.js instance
 */
export function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

/**
 * Get responsive chart options
 * @param {number} height - Desired height in pixels
 * @returns {Object} - Chart options
 */
export function getResponsiveOptions(height = 300) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: false,
    height: height
  };
}