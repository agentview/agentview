import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

export const weatherAgent = (options?: { userLocation: string }) => new Agent({
  name: 'Weather Assistant',
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'medium', summary: 'auto' }
  },
  instructions: `You are a helpful general-purpose assistant. You have super skill of checking the weather for any location. The user is currently at location: ${options?.userLocation ?? "Unknown"}.`,
  tools: [
    tool({
      name: 'weather_tool',
      description: 'Get weather information for a location using wttr.in',
      parameters: z.object({
        location: z.string().describe('The city name to get weather for'),
      }),
      execute: async ({ location }) => {

        // Sleep for 1 second before fetching weather data
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return warsawWeather;

        console.log('executing weather tool for location: ', location);
        const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j2`);
        if (!response.ok) {
          return { error: 'Failed to fetch weather data' };
        }
        return await response.json();
      },
    })
  ],
});


const warsawWeather = {
  "current_condition": [
      {
          "FeelsLikeC": "-13",
          "FeelsLikeF": "8",
          "cloudcover": "0",
          "humidity": "38",
          "localObsDateTime": "2026-02-03 03:15 PM",
          "observation_time": "02:15 PM",
          "precipInches": "0.0",
          "precipMM": "0.0",
          "pressure": "1018",
          "pressureInches": "30",
          "temp_C": "-7",
          "temp_F": "20",
          "uvIndex": "0",
          "visibility": "10",
          "visibilityMiles": "6",
          "weatherCode": "113",
          "weatherDesc": [
              {
                  "value": "Sunny"
              }
          ],
          "weatherIconUrl": [
              {
                  "value": ""
              }
          ],
          "winddir16Point": "E",
          "winddirDegree": "89",
          "windspeedKmph": "18",
          "windspeedMiles": "11"
      }
  ],
  "nearest_area": [
      {
          "areaName": [
              {
                  "value": "Warsaw"
              }
          ],
          "country": [
              {
                  "value": "Poland"
              }
          ],
          "latitude": "52.250",
          "longitude": "21.000",
          "population": "1651676",
          "region": [
              {
                  "value": ""
              }
          ],
          "weatherUrl": [
              {
                  "value": ""
              }
          ]
      }
  ],
  "request": [
      {
          "query": "Lat 52.23 and Lon 21.01",
          "type": "LatLon"
      }
  ],
  "weather": [
      {
          "astronomy": [
              {
                  "moon_illumination": "99",
                  "moon_phase": "Waning Gibbous",
                  "moonrise": "06:35 PM",
                  "moonset": "07:58 AM",
                  "sunrise": "07:14 AM",
                  "sunset": "04:26 PM"
              }
          ],
          "avgtempC": "-12",
          "avgtempF": "10",
          "date": "2026-02-03",
          "maxtempC": "-8",
          "maxtempF": "18",
          "mintempC": "-15",
          "mintempF": "4",
          "sunHour": "9.0",
          "totalSnow_cm": "0.0",
          "uvIndex": "0"
      },
      {
          "astronomy": [
              {
                  "moon_illumination": "95",
                  "moon_phase": "Waning Gibbous",
                  "moonrise": "07:56 PM",
                  "moonset": "08:10 AM",
                  "sunrise": "07:12 AM",
                  "sunset": "04:28 PM"
              }
          ],
          "avgtempC": "-6",
          "avgtempF": "21",
          "date": "2026-02-04",
          "maxtempC": "-4",
          "maxtempF": "25",
          "mintempC": "-10",
          "mintempF": "14",
          "sunHour": "6.8",
          "totalSnow_cm": "2.8",
          "uvIndex": "0"
      },
      {
          "astronomy": [
              {
                  "moon_illumination": "89",
                  "moon_phase": "Waning Gibbous",
                  "moonrise": "09:13 PM",
                  "moonset": "08:20 AM",
                  "sunrise": "07:10 AM",
                  "sunset": "04:30 PM"
              }
          ],
          "avgtempC": "-1",
          "avgtempF": "31",
          "date": "2026-02-05",
          "maxtempC": "1",
          "maxtempF": "33",
          "mintempC": "-3",
          "mintempF": "26",
          "sunHour": "6.8",
          "totalSnow_cm": "0.0",
          "uvIndex": "0"
      }
  ]
}