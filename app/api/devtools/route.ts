import { NextResponse } from 'next/server';

export async function GET() {
  // Return an empty JSON object to satisfy Chrome DevTools
  // This prevents the 404 error in the console
  return NextResponse.json({}, { status: 200 });
}

