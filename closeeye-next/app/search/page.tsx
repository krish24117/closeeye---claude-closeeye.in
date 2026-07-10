import { redirect } from 'next/navigation'

// Global search indexed only demo data (fabricated families/guardians/invoices),
// so it's disabled for launch. The ⌘K launcher is also removed from the layout.
// Neutralised here until search is wired to real records.
export default function SearchPage() {
  redirect('/')
}
