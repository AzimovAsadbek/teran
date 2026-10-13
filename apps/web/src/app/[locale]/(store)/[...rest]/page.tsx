import { notFound } from 'next/navigation';

/** Any unknown storefront path renders the branded, localised 404 inside the store layout. */
export default function CatchAll() {
  notFound();
}
