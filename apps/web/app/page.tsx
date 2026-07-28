import { redirect } from 'next/navigation';

export default function Home() {
  // In the demo the dashboard is the front door.
  redirect('/dashboard');
}
