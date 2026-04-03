import { NextRequest, NextResponse } from 'next/server';
import {
  Payment,
  addDriver,
  createPayment,
  getDriversBySeason,
  getPaymentsByRound,
  updatePayment,
} from '@/lib/dbService';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

type ImportPaymentStatus = 'paid' | 'pending';

interface ParsedRow {
  orderNumber: string;
  orderDate: string;
  firstName: string;
  lastName: string;
  email: string;
  totalTicketPrice: number;
  paymentStatus: ImportPaymentStatus;
  phoneNumber: string;
  dateOfBirth: string;
}

interface AggregatedRow {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  totalTicketPrice: number;
  paymentStatus: ImportPaymentStatus;
  phoneNumber: string;
  dateOfBirth: string;
  orderNumber: string;
  orderDate: string;
}

interface PreviewChange {
  driverName: string;
  isNew: boolean;
  action: 'create' | 'update';
  paymentStatus: ImportPaymentStatus;
  currentPaymentStatus: string | null;
}

const REQUIRED_COLUMNS = ['guest first name', 'guest last name', 'payment status'];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function parseAmount(rawValue: string): number {
  if (!rawValue) return 0;
  const cleaned = rawValue.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDateOfBirth(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) return '';

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const parts = value.split(/[\/-]/).map((part) => part.trim());
  if (parts.length === 3) {
    const [partA, partB, partC] = parts;
    const day = Number(partA);
    const month = Number(partB);
    const year = Number(partC.length === 2 ? `20${partC}` : partC);

    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    }
  }

  return '';
}

function normalizePaymentStatus(rawValue: string): ImportPaymentStatus {
  const value = rawValue.trim().toLowerCase();
  if (['paid', 'succeeded', 'successful', 'completed', 'complete'].includes(value)) {
    return 'paid';
  }
  return 'pending';
}

function parseCsv(rawContent: string): string[][] {
  const rows: string[][] = [];
  const firstLine = rawContent.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
  const delimiter = (firstLine.match(/\t/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? '\t' : ',';

  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < rawContent.length; i++) {
    const char = rawContent[i];
    const nextChar = rawContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = '';

      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function buildDriverKey(firstName: string, lastName: string, email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }
  return `name:${`${firstName} ${lastName}`.trim().toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const seasonId = String(formData.get('seasonId') || '').trim();
    const roundId = String(formData.get('roundId') || '').trim();
    const csvFile = formData.get('file');

    if (!seasonId || !roundId) {
      return NextResponse.json({ error: 'seasonId and roundId are required' }, { status: 400 });
    }

    if (!csvFile || typeof csvFile === 'string') {
      return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
    }

    const csvText = await csvFile.text();
    const parsedRows = parseCsv(csvText);

    if (parsedRows.length < 2) {
      return NextResponse.json({ error: 'CSV file has no data rows' }, { status: 400 });
    }

    const headers = parsedRows[0].map(normalizeHeader);
    const headerIndex = new Map<string, number>();
    headers.forEach((header, index) => headerIndex.set(header, index));

    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerIndex.has(column));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `CSV missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      );
    }

    const getValue = (row: string[], column: string) => {
      const index = headerIndex.get(column);
      if (index === undefined) return '';
      return String(row[index] || '').trim();
    };

    const aggregated = new Map<string, AggregatedRow>();
    let skippedRows = 0;

    for (let i = 1; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const firstName = getValue(row, 'guest first name');
      const lastName = getValue(row, 'guest last name');
      const email = getValue(row, 'email');
      const paymentStatus = normalizePaymentStatus(getValue(row, 'payment status'));

      if (!firstName && !lastName && !email) {
        skippedRows++;
        continue;
      }

      const key = buildDriverKey(firstName, lastName, email);
      const amount = parseAmount(getValue(row, 'total ticket price') || getValue(row, 'ticket price'));

      const current = aggregated.get(key);
      if (current) {
        current.totalTicketPrice = Math.max(current.totalTicketPrice, amount);
        current.paymentStatus = current.paymentStatus === 'paid' || paymentStatus === 'paid' ? 'paid' : 'pending';
        if (!current.phoneNumber) current.phoneNumber = getValue(row, 'phone number');
        if (!current.dateOfBirth) current.dateOfBirth = normalizeDateOfBirth(getValue(row, 'date of birth'));
        if (!current.orderNumber) current.orderNumber = getValue(row, 'order number');
        if (!current.orderDate) current.orderDate = getValue(row, 'order date');
        continue;
      }

      aggregated.set(key, {
        key,
        firstName,
        lastName,
        email,
        totalTicketPrice: amount,
        paymentStatus,
        phoneNumber: getValue(row, 'phone number'),
        dateOfBirth: normalizeDateOfBirth(getValue(row, 'date of birth')),
        orderNumber: getValue(row, 'order number'),
        orderDate: getValue(row, 'order date'),
      });
    }

    const existingDrivers = await getDriversBySeason(seasonId);
    const driverByEmail = new Map(existingDrivers.filter((d) => d.email).map((d) => [d.email.toLowerCase(), d]));
    const driverByName = new Map(existingDrivers.map((d) => [d.name.toLowerCase(), d]));

    const existingPayments = await getPaymentsByRound(roundId);
    const paymentByDriver = new Map(existingPayments.map((payment) => [payment.driverId, payment]));

    // Preview mode: return what would change without writing to the database
    const isPreview = String(formData.get('preview') || '').toLowerCase() === 'true';
    if (isPreview) {
      const changes: PreviewChange[] = [];
      for (const row of Array.from(aggregated.values())) {
        const fullName = `${row.firstName} ${row.lastName}`.trim();
        const normalizedEmail = row.email.toLowerCase();
        let driver = normalizedEmail ? driverByEmail.get(normalizedEmail) : undefined;
        if (!driver && fullName) driver = driverByName.get(fullName.toLowerCase());
        const existingPayment = driver ? paymentByDriver.get(driver.id) : undefined;
        changes.push({
          driverName: fullName || row.email || 'Unknown',
          isNew: !driver,
          action: existingPayment ? 'update' : 'create',
          paymentStatus: row.paymentStatus,
          currentPaymentStatus: existingPayment?.status ?? null,
        });
      }
      return NextResponse.json({
        preview: true,
        changes,
        totalRows: parsedRows.length - 1,
        skippedRows,
      });
    }

    let createdDrivers = 0;
    let createdPayments = 0;
    let updatedPayments = 0;

    for (const row of Array.from(aggregated.values())) {
      const fullName = `${row.firstName} ${row.lastName}`.trim();
      const normalizedEmail = row.email.toLowerCase();

      let driver = normalizedEmail ? driverByEmail.get(normalizedEmail) : undefined;
      if (!driver && fullName) {
        driver = driverByName.get(fullName.toLowerCase());
      }

      if (!driver) {
        const fallbackName = fullName || row.email || `Imported Driver ${Date.now()}`;
        const driverId = `driver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();

        driver = {
          id: driverId,
          name: fallbackName,
          firstName: row.firstName || undefined,
          lastName: row.lastName || undefined,
          email: row.email || '',
          mobileNumber: row.phoneNumber || undefined,
          dateOfBirth: row.dateOfBirth || undefined,
          division: 'New' as const,
          status: 'ACTIVE' as const,
          teamName: '',
          lastUpdated: now,
          aliases: [],
          homeTrack: undefined,
          avatar: undefined,
          raceHistory: undefined,
        };

        await addDriver(driver, seasonId);
        createdDrivers++;

        if (driver.email) {
          driverByEmail.set(driver.email.toLowerCase(), driver);
        }
        driverByName.set(driver.name.toLowerCase(), driver);
      }

      const existingPayment = paymentByDriver.get(driver.id);
      const paymentDateRaw = row.orderDate.trim();
      const parsedPaymentDate = paymentDateRaw ? new Date(paymentDateRaw) : null;
      const paymentDate = parsedPaymentDate && !Number.isNaN(parsedPaymentDate.getTime())
        ? parsedPaymentDate.toISOString()
        : new Date().toISOString();

      if (existingPayment) {
        const updatedPayment: Payment = {
          ...existingPayment,
          amount: row.totalTicketPrice > 0 ? row.totalTicketPrice : existingPayment.amount,
          status: row.paymentStatus,
          paymentMethod: 'csv-import',
          paymentDate,
          referenceNumber: row.orderNumber || existingPayment.referenceNumber,
          notes: 'Imported from check-in CSV',
        };

        await updatePayment(updatedPayment);
        paymentByDriver.set(driver.id, updatedPayment);
        updatedPayments++;
      } else {
        const newPayment: Payment = {
          id: `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          seasonId,
          roundId,
          driverId: driver.id,
          amount: row.totalTicketPrice > 0 ? row.totalTicketPrice : 0,
          status: row.paymentStatus,
          paymentMethod: 'csv-import',
          paymentDate,
          referenceNumber: row.orderNumber || undefined,
          notes: 'Imported from check-in CSV',
        };

        await createPayment(newPayment);
        paymentByDriver.set(driver.id, newPayment);
        createdPayments++;
      }
    }

    cache.invalidate(`drivers:${seasonId}`);
    cache.invalidatePattern('drivers:');
    cache.invalidatePattern('division-changes:');

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: parsedRows.length - 1,
        processedDrivers: aggregated.size,
        skippedRows,
        createdDrivers,
        createdPayments,
        updatedPayments,
      },
    });
  } catch (error) {
    console.error('Error importing payments CSV:', error);
    return NextResponse.json({ error: 'Failed to import payments CSV' }, { status: 500 });
  }
}
