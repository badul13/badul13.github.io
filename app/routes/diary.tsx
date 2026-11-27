import type { Route } from './+types/diary';
import { getCollection } from '~/lib/content.server';
import { Shell } from '~/components/Shell';
import { DiaryCalendar } from '~/components/DiaryCalendar';

export function meta() {
  return [{ title: 'Diary · badul13' }];
}

export async function loader() {
  return {
    written: Object.fromEntries(getCollection('diary').map((e) => [e.date, e.id])),
    year: new Date().getFullYear(),
  };
}

export default function Diary({ loaderData }: Route.ComponentProps) {
  return (
    <Shell>
      <h1>Diary</h1>
      <DiaryCalendar year={loaderData.year} written={loaderData.written} />
    </Shell>
  );
}
