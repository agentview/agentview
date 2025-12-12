function WeatherItem({ value }: { value: any }) {

  <div>Weather block</div>

  // let current;
  // try {
  //   current = JSON.parse(value.output.text).current_condition[0];
  // } catch (e) {
  //   return <BaseItem title="Weather Tool Result" value="Weather data unavailable" variant="muted" />;
  // }
  // if (!current) {
  //   return <BaseItem title="Weather Tool Result" value="Weather data unavailable" variant="muted" />;
  // }

  // // Render as a single, friendly line with emojis
  // const tempC = current.temp_C;
  // const desc = current.weatherDesc?.[0]?.value;
  // const feels = current.FeelsLikeC;
  // const humidity = current.humidity;
  // const wind = current.windspeedKmph;
  // const weatherIcons: Record<string, string> = {
  //   "Partly cloudy": "⛅️",
  //   "Cloudy": "☁️",
  //   "Sunny": "☀️",
  //   "Clear": "🌙",
  //   "Rain": "🌧️",
  //   "Mist": "🌫️",
  //   "Snow": "❄️",
  //   "Thunder": "⛈️"
  // };
  // // Default to description or emoji cloud if none
  // const emoji = weatherIcons[desc] || "🌡️";
  // const summary = `${emoji} ${desc}, ${tempC}°C, feels like ${feels}°C, 💧${humidity}%, 💨${wind}km/h`;

  // return <BaseItem title="Weather Tool Result" value={summary} variant="muted" />
}