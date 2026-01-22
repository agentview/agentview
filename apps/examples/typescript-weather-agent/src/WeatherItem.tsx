// import { ItemCard, ItemCardMarkdown, ItemCardTitle } from "@agentview/studio";
import { Step, StepContent, StepTitle } from "@agentview/studio";
import type { SessionItemDisplayComponentProps } from "agentview";
import { Wrench } from "lucide-react";

export function WeatherItem({ item, resultItem }: SessionItemDisplayComponentProps) {
  const args = JSON.parse(item.arguments);

  if (!resultItem) {
    return <WeatherItemWrapper location={args.location}>Checking weather...</WeatherItemWrapper>
  }

  let current;
  try {
    current = JSON.parse(resultItem.output.text).current_condition[0];
  } catch (e) {
    return <WeatherItemWrapper location={args.location}>Weather data unavailable for <span className="font-medium">{args.location}</span></WeatherItemWrapper>;
  }

  if (!current) {
    return <WeatherItemWrapper location={args.location}>Weather data unavailable for <span className="font-medium">{args.location}</span></WeatherItemWrapper>;
  }

  // Render as a single, friendly line with emojis
  const tempC = current.temp_C;
  const desc = current.weatherDesc?.[0]?.value;
  const feels = current.FeelsLikeC;
  const humidity = current.humidity;
  const wind = current.windspeedKmph;
  const weatherIcons: Record<string, string> = {
    "Partly cloudy": "⛅️",
    "Cloudy": "☁️",
    "Sunny": "☀️",
    "Clear": "🌙",
    "Rain": "🌧️",
    "Mist": "🌫️",
    "Snow": "❄️",
    "Thunder": "⛈️"
  };
  // Default to description or emoji cloud if none
  const emoji = weatherIcons[desc] || "🌡️";
  const summary = `${emoji} ${desc}, ${tempC}°C, feels like ${feels}°C, 💧${humidity}%, 💨${wind}km/h`;

  return <WeatherItemWrapper location={args.location}>{summary}</WeatherItemWrapper>
}

function WeatherItemWrapper({ children, location }: { children: React.ReactNode, location: string }) {
  return <Step>
    <StepTitle><Wrench /> Weather Check: <span className="font-medium">{location}</span></StepTitle>
    <StepContent className="text-gray-700">
      {children}
    </StepContent>
  </Step>
}