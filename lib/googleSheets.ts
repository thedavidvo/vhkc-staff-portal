import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// Initialize Google Sheets API client
export async function getSheetsClient() {
  // Check if environment variables are set
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your environment variables.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

// Read all rows from a sheet
export async function readSheet(sheetName: string): Promise<any[][]> {
  // Check if environment variables are set
  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials not configured. Returning empty data.');
    return [];
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });
    return response.data.values || [];
  } catch (error: any) {
    // If sheet doesn't exist or is empty, return empty array instead of throwing
    if (error?.code === 400 || error?.message?.includes('Unable to parse range')) {
      console.warn(`Sheet "${sheetName}" not found or empty. Returning empty array.`);
      return [];
    }
    console.error(`Error reading sheet ${sheetName}:`, error);
    // Return empty array instead of throwing to prevent API routes from failing
    return [];
  }
}

// Write rows to a sheet (overwrites existing data)
export async function writeSheet(sheetName: string, values: any[][]): Promise<void> {
  // Check if environment variables are set
  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials not configured. Cannot write data.');
    throw new Error('Google Sheets credentials not configured');
  }

  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  } catch (error) {
    console.error(`Error writing sheet ${sheetName}:`, error);
    throw error;
  }
}

// Append a row to a sheet
export async function appendRow(sheetName: string, values: any[]): Promise<void> {
  // Check if environment variables are set
  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials not configured. Cannot append data.');
    throw new Error('Google Sheets credentials not configured');
  }

  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
  } catch (error: any) {
    console.error(`Error appending row to sheet ${sheetName}:`, error);
    // If sheet doesn't exist, we might get a 400 error
    if (error?.code === 400) {
      throw new Error(`Sheet "${sheetName}" not found or invalid range`);
    }
    throw error;
  }
}

// Update a specific row by ID
export async function updateRowById(sheetName: string, id: string, values: any[]): Promise<void> {
  const sheets = await getSheetsClient();
  try {
    const allRows = await readSheet(sheetName);
    if (allRows.length < 2) {
      throw new Error('Sheet has no data rows');
    }
    
    const headerRow = allRows[0];
    const idColumnIndex = headerRow.findIndex((h: string) => h && h.toLowerCase() === 'id');
    
    if (idColumnIndex === -1) {
      throw new Error('ID column not found in sheet');
    }
    
    const rowIndex = allRows.findIndex((row, index) => index > 0 && row[idColumnIndex] === id);
    
    if (rowIndex === -1) {
      throw new Error(`Row with ID ${id} not found`);
    }
    
    // Ensure values array matches header length
    const fullValues = headerRow.map((_, index) => values[index] ?? allRows[rowIndex][index] ?? '');
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A${rowIndex + 1}:Z${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [fullValues] },
    });
  } catch (error) {
    console.error(`Error updating row in sheet ${sheetName}:`, error);
    throw error;
  }
}

// Delete a row by ID
export async function deleteRowById(sheetName: string, id: string): Promise<void> {
  const sheets = await getSheetsClient();
  try {
    const allRows = await readSheet(sheetName);
    if (allRows.length < 2) {
      return; // No data rows to delete
    }
    
    const headerRow = allRows[0];
    const idColumnIndex = headerRow.findIndex((h: string) => h && h.toLowerCase() === 'id');
    
    if (idColumnIndex === -1) {
      throw new Error('ID column not found in sheet');
    }
    
    const rowIndex = allRows.findIndex((row, index) => index > 0 && row[idColumnIndex] === id);
    
    if (rowIndex === -1) {
      return; // Row not found, nothing to delete
    }
    
    const sheetId = await getSheetId(sheetName);
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });
  } catch (error) {
    console.error(`Error deleting row from sheet ${sheetName}:`, error);
    throw error;
  }
}

// Get sheet ID by name
export async function getSheetId(sheetName: string): Promise<number> {
  const sheets = await getSheetsClient();
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    return sheet.properties?.sheetId || 0;
  } catch (error) {
    console.error(`Error getting sheet ID for ${sheetName}:`, error);
    throw error;
  }
}

