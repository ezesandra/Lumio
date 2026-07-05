export interface StudyPlanEvent {
  title: string;
  description?: string | null;
  date: Date;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

function parseDateTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
}

export function getGoogleCalendarUrl(event: StudyPlanEvent): string {
  const start = parseDateTime(event.date, event.startTime);
  const end = parseDateTime(event.date, event.endTime);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", event.title);
  
  if (event.description) {
    url.searchParams.append("details", event.description);
  }
  
  url.searchParams.append("dates", `${formatGoogleDate(start)}/${formatGoogleDate(end)}`);
  
  return url.toString();
}

export function generateICS(event: StudyPlanEvent): string {
  const start = parseDateTime(event.date, event.startTime);
  const end = parseDateTime(event.date, event.endTime);
  const now = new Date();

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lumio App//EN",
    "BEGIN:VEVENT",
    `UID:${now.getTime()}@lumio.app`,
    `DTSTAMP:${formatGoogleDate(now)}`,
    `DTSTART:${formatGoogleDate(start)}`,
    `DTEND:${formatGoogleDate(end)}`,
    `SUMMARY:${event.title}`,
    ...(event.description ? [`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n");
}
