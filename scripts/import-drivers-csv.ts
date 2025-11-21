/**
 * Import Drivers from CSV
 * 
 * This script imports drivers from a CSV file.
 * Run with: npm run import-drivers-csv [seasonId]
 * If seasonId is not provided, it will use the first season in the database.
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

// CSV data embedded in the script
const CSV_DATA = `id,season_id,name,email,division,team_name,status,last_updated,first_name,last_name,date_of_birth,home_track,aliases,created_at,mobile_number
,,Aditya Bolitho,adityabolitho@gmail.com,Division 1,,ACTIVE,,Aditya,Bolitho,,,Aditya,,0493 541 060
,,Aiden Fidanza,AidenFidanza9@gmail.com,Division 1,,ACTIVE,,Aiden,Fidanza,,,Aiden,,0491 680 730
,,Andre Polendakis,andre.polendakis@outlook.com,Division 1,,ACTIVE,,Andre,Polendakis,,,Ambrosion,,0417 942 138
,,Anthony Allen,tony.r31@gmail.com,Division 1,,ACTIVE,,Anthony,Allen,,,Fat Tony,,0477 997 667
,,Bailey Saunders,bagel7@outlook.com,Division 1,,ACTIVE,,Bailey,Saunders,,,Bagelz,,0419 091 032
,,Brook Senapadphakorn,Brookns89@gmail.com,Division 1,,ACTIVE,,Brook,Senapadphakorn,,,Brook,,0415 664 659
,,Bryce Mizzi,mizzibryce98@hotmail.com,Division 1,,ACTIVE,,Bryce,Mizzi,,,Bryce,,0435 935 369
,,Canice Aqeel,jeklund@bigpond.net.au,Division 1,,ACTIVE,,Canice,Aqeel,,,Car,,0418 300 184
,,Damon Martin,damonjbmp@gmail.com,Division 1,,ACTIVE,,Damon,Martin,,,Martin,,0405 862 507
,,Darko Veselinov,darkoveselinov@hotmail.com,Division 1,,ACTIVE,,Darko,Veselinov,,,Dare,,0423 043 311
,,David Vo ,thedavidvo@gmail.com,Division 1,,ACTIVE,,David,Vo,,,Dvo,,0435 751 977
,,Ethan Jamieson,ethanjamo30@gmail.com,Division 1,,ACTIVE,,Ethan,Jamieson,,,Jamo,,0490 004 862
,,Jacob Rundle,jrundle35@icloud.com,Division 1,,ACTIVE,,Jacob,Rundle,,,JJ44,,0438 345 521
,,Jake Cooper,minicoopsie@gmail.com,Division 1,,ACTIVE,,Jake,Cooper,,,Weezy,,0403 695 005
,,Jenee Dunlop,jeneedunlop12@gmail.com,Division 1,,ACTIVE,,Jenee,Dunlop,,,Jamd,,0421 933 126
,,Joel Sprott,joelh.sprott@gmail.com,Division 1,,ACTIVE,,Joel,Sprott,,,Joel,,0412 931 986
,,Josh Hamilton,dnrjshamilton@gmail.com,Division 1,,ACTIVE,,Josh,Hamilton,,,Josh,,0478 731 798
,,Joshua Clark,Clarkjsc1@hotmail.com,Division 1,,ACTIVE,,Joshua,Clark,,,Josh C,,0426 158 084
,,Kristian Admiraal,ka95comp@gmail.com,Division 1,,ACTIVE,,Kristian,Admiraal,,,Kristian,,0449 718 264
,,Luke De Vuono,lukedevuono@gmail.com,Division 1,,ACTIVE,,Luke,De,,,Nerdstaunch,,0455 497 556
,,Patrick Mouser,patmou.home@gmail.com,Division 1,,ACTIVE,,Patrick,Mouser,,,Patrick,,0480 396 168
,,Phillip Zajkov,philzajk@gmail.com,Division 1,,ACTIVE,,Phillip,Zajkov,,,Carlos Sainz,,0401 661 451
,,Quang Tran Thai,quangthaitranbpc@gmail.com,Division 1,,ACTIVE,,Quang,Tran,,,Quang,,0413 834 859
,,Ryan Notman,notcam@me.com,Division 1,,ACTIVE,,Ryan,Notman,,,Ryan Notman,,0477 957 808
,,Ted Hercus,tedh@internode.on.net,Division 1,,ACTIVE,,Ted,Hercus,,,Ted,,0452 423 283
,,Tony Kazakovski,tonykazak@gmail.com,Division 1,,ACTIVE,,Tony,Kazakovski,,,Tony Kazakovski,,0425 339 784
,,Tyron Wade,tyronwade56@yaboo.com,Division 1,,ACTIVE,,Tyron,Wade,,,Brawl,,0427 611 400
,,Shannon Murray,smurray999@hotmail.com,Division 1,,ACTIVE,,Shannon,Murray,,,BigDawg,,
,,Andreas Polendakis,andreas.polendakis@hotmail.com,Division 2,,ACTIVE,,Andreas,Polendakis,,,AmBrosion,,0400 991 992
,,Anthony Mateo,anthonymateo22@gmail.com,Division 2,,ACTIVE,,Anthony,Mateo,,,AMateo,,0468 855 100
,,Aston Crespo-Demicoli,astoncd05@yahoo.com,Division 2,,ACTIVE,,Aston,Crespo-Demicoli,,,DB5,,0451 379 119
,,Avery Lloyd,aveesry@gmail.com,Division 2,,ACTIVE,,Avery,Lloyd,,,AveryOnTrack,,0444 570 346
,,Ben Sathananthan,ben.sath@hotmail.com,Division 2,,ACTIVE,,Ben,Sathananthan,,,Sath,,0498 492 034
,,Brock Martin,brockchad@icloud.com,Division 2,,ACTIVE,,Brock,Martin,,,Brock,,0490 065 941
,,Cam Van Lierop,crazymanxd2@gmail.com,Division 2,,ACTIVE,,Cam,Van,,,Cam,,0478 210 892
,,Christian Morina,christian_morina@hotmail.com,Division 2,,ACTIVE,,Christian,Morina,,,Christian,,0422 275 534
,,Christopher Dergacz,dergacz.chris@gmail.com,Division 2,,ACTIVE,,Christopher,Dergacz,,,Dergz,,0427 956 651
,,Curtis Oakley,curttyphoon@hotmail.com,Division 2,,ACTIVE,,Curtis,Oakley,,,Cur71s,,0439 287 847
,,Daniel Martinez-Garcia,daniel@bferanis.com.au,Division 2,,ACTIVE,,Daniel,Martinez-Garcia,,,The White Helmet Racer,,0476 459 172
,,Ethan Clark,ethan.clark@australiamail.com,Division 2,,ACTIVE,,Ethan,Clark,,,Clarky,,0409 554 580
,,Gary Kerrison,apexhunter3296@gmail.com,Division 2,,ACTIVE,,Gary,Kerrison,,,Gary,,0413 816 982
,,Harrison Gojic,harrisontherandom@gmail.com ,Division 2,,ACTIVE,,Harrison,Gojic,,,Harrison,, 0412 950 905
,,Henry Beames,henry@beamesboys.com,Division 2,,ACTIVE,,Henry,Beames,,,Henry,,0418 920 603
,,Jacob Miller,Jacobmiller937@gmail.com,Division 2,,ACTIVE,,Jacob,Miller,,,Miller,,0418 964 529
,,Jadyn Kondinski,jadynkondinski_@outlook.com,Division 2,,ACTIVE,,Jadyn,Kondinski,,,Jadyn,,0423 603 740
,,Juan Echeverri,juan.echeverri189@gmail.com,Division 2,,ACTIVE,,Juan,Echeverri,,,Juan,,0425 560 003
,,Lachlan Beythien,lach007@hotmail.com,Division 2,,ACTIVE,,Lachlan,Beythien,,,Lachie21,,0409 112 830
,,Lachlan Gervasoni,locky.gervasoni@outlook.com,Division 2,,ACTIVE,,Lachlan,Gervasoni,,,Locky,,0448 555 231
,,Lachlan Timms,lftimms.10@gmail.com,Division 2,,INACTIVE,,Lachlan,Timms,,,,,0499 036 792
,,Lachy berriman,lachlanberriman@gmail.com,Division 2,,ACTIVE,,Lachy,berriman,,,Lachy B,,0427 427 898
,,Luca Speziale,lucatspeziale@gmail.com,Division 2,,ACTIVE,,Luca,Speziale,,,Luca,,0405 115 881
,,Mathew Redmond,0clubby@gmail.com,Division 2,,ACTIVE,,Mathew,Redmond,,,CLUBBY,,0401 406 502
,,Mitchell Blunt,m.blunt91@yahoo.com,Division 2,,ACTIVE,,Mitchell,Blunt,,,Arbee,,0404 783 854
,,Mitchell Skipper,skip.bats@gmail.com,Division 2,,ACTIVE,,Mitchell,Skipper,,,Skip,,0476 400 442
,,Ollie Towle,towleollie@gmail.com,Division 2,,ACTIVE,,Ollie,Towle,,,Ollie Towle,,0402 796 001
,,Riley Gorman,mattgorman@hotmail.com,Division 2,,ACTIVE,,Riley,Gorman,,,Riley,,0481 351 934      
,,Rodolfo Alday,rodolfoaldayg@gmail.com,Division 2,,ACTIVE,,Rodolfo,Alday,,,Rodolfo,,0455 934 679
,,Rohan Kapadia,rohanthekiwi@gmail.com,Division 2,,ACTIVE,,Rohan,Kapadia,,,Rohan,,
,,Ryan Comerford,hello@ryancomerford.me,Division 2,,ACTIVE,,Ryan,Comerford,,,Ryan,,0448 181 103
,,Sammy Priest,ameliaerin86@gmail.com,Division 2,,ACTIVE,,Sammy,Priest,,,Sammy,,0424 564 764
,,Sean Wolfe,wolfe.vlct@bigpond.com,Division 2,,ACTIVE,,Sean,Wolfe,,,Wolfe,,0401 659 200
,,Simon Chapple,simonchapple.personaltraining@gmail.com,Division 2,,ACTIVE,,Simon,Chapple,,,Sonik,,0421 063 459
,,Tom Evans,tjevans1812@gmail.com,Division 2,,ACTIVE,,Tom,Evans,,,Tommy,,0450 176 510
,,Trent Pilven,trentpilven@yahoo.com,Division 2,,ACTIVE,,Trent,Pilven,,,TP82,,0423 712 330
,,Ari Purton,ari@securitytek.com.au,Division 3,,ACTIVE,,Ari,Purton,,,Ant_Assassin,,0499 555 486
,,Cheran Kulawickrama,ckulawickrama@gmail.com,Division 3,,ACTIVE,,Cheran,Kulawickrama,,,Cheran,,0456 498 193
,,Chris Gaspardis,chris.gaspardis@gmail.com,Division 3,,ACTIVE,,Chris,Gaspardis,,,Caspar,,0418 438 822
,,Daniel Lonigro,danlon013@gmail.com,Division 3,,ACTIVE,,Daniel,Lonigro,,,Loni,,0424 856 685
,,Edward Marshall,elliott.marshall@crocobyte.com,Division 3,,ACTIVE,,Edward,Marshall,,,Edward,,0451 542 643
,,Greg Waddington,gregwaddington0@gmail.com,Division 3,,ACTIVE,,Greg,Waddington,,,Greg,,0411 758 279
,,Hadley de Ridder,hadleyderidder@gmail.com,Division 3,,ACTIVE,,Hadley,de Ridder,,,Had,,0419 381 800
,,Hansi Powell,ghislainecoghill@gmail.com,Division 3,,ACTIVE,,Hansi,Powell,,,Hansi,,0401 315 129
,,Jasper George,richard@georgemigration.com.au,Division 3,,ACTIVE,,Jasper,George,,,Jazzy,,0402 247 789
,,Jonathan Cardenas,jonathan.cardenas@gmail.com,Division 3,,ACTIVE,,Jonathan,Cardenas,,,Max_5,,0433 134 599
,,Jordan Racine,jordanracine@gmail.com,Division 3,,ACTIVE,,Jordan,Racine,,,Jojo,,0422 435 343
,,Julian Acevedo,julian.acevedo12@gmail.com,Division 3,,ACTIVE,,Julian,Acevedo,,,Julianwh12,,0412 654 041
,,Kyle Waddington,kylewaddington2@gmail.com,Division 3,,ACTIVE,,Kyle,Waddington,,,Kyle,,0432 745 165
,,Logan Sheehan,bret@sfpp.com.au,Division 3,,ACTIVE,,Logan,Sheehan,,,Logan,,0419 362 844
,,Luke Waddington,lukejw_84@hotmail.com,Division 3,,ACTIVE,,Luke,Waddington,,,Waddo,,0475 735 092
,,Miles Auster,miles.auster@gmail.com,Division 3,,ACTIVE,,Miles,Auster,,,Miles,,0420 358 130
,,Paul Godson,pb.godson@gmail.com,Division 3,,ACTIVE,,Paul,Godson,,,Dingles,,0400 909 739
,,Rusty Sharman,rustysharman11@gmail.com,Division 3,,ACTIVE,,Rusty,Sharman,,,Rusty,,0480 577 028
,,Saad Saeed,saadie.98@gmail.com,Division 3,,ACTIVE,,Saad,Saeed,,,Saadie,,0478 417 474
,,Sam Annand,sam.g.annand@gmail.com,Division 3,,ACTIVE,,Sam,Annand,,,Sam Annand,,0412 076 376
,,Stephen Tsering,stephentsering@gmail.com,Division 3,,ACTIVE,,Stephen,Tsering,,,Stephen Tsering,,0420 836 237
,,Steven Clark,stevenclark1@live.com,Division 3,,ACTIVE,,Steven,Clark,,,Steve,,0408 683 192
,,Travis Delany,travis@dirtpakexcavations.com.au,Division 3,,ACTIVE,,Travis,Delany,,,Trav,,0400 264 866
,,Abigail Hardy,swaggy.gails876@gmail.com,Division 4,,ACTIVE,,Abigail,Hardy,,,Gail,,0434 487 148
,,Alan Notman,notcam@live.com,Division 4,,ACTIVE,,Alan,Notman,,,Noddy,,0438 444 808
,,Alex Suzic,,Division 4,,ACTIVE,,Alex,Suzic,,,Alex,,
,,Alyssa Harper,alyssa.harp3r@gmail.com,Division 4,,ACTIVE,,Alyssa,Harper,,,Aly,,0493 599 507
,,Brad Smith,brad_smith87@live.com.au,Division 4,,ACTIVE,,Brad,Smith,,,Brad,,0400 490 046
,,Brett Mouser,bmouser@ozemail.com.au,Division 4,,ACTIVE,,Brett,Mouser,,,Brett,,0407 827 493
,,Cody Harper,codyelitelegit@gmail.com,Division 4,,ACTIVE,,Cody,Harper,,,Cody,,0494 126 194
,,Colin Crewes,colin.crewes@gmail.com,Division 4,,ACTIVE,,Colin,Crewes,,,Crewesa19,,0433 981 887
,,Craig Delany,delany2407@gmail.com,Division 4,,ACTIVE,,Craig,Delany,,,Craig,,0438 334 083
,,Damon Hardy,damon_hardy@hotmail.com,Division 4,,ACTIVE,,Damon,Hardy,,,TWTY20,,0419 843 069
,,Darcy Baird,darcybaird3002@gmail.com,Division 4,,ACTIVE,,Darcy,Baird,,,Darcy,,0475 606 239
,,Gordon McSephney,gordon.mcsephney@gmail.com,Division 4,,ACTIVE,,Gordon,McSephney,,,Flash,,0411 383 231
,,Hadley Field,fieldhadley55@gmail.com,Division 4,,ACTIVE,,Hadley,Field,,,Hadley,,0480 228 044
,,Jaidyn Goolagong,jaidyngoolagong@outlook.com,Division 4,,ACTIVE,,Jaidyn,Goolagong,,,Jaidyn G,,0420 377 619
,,John Shaba,shaba.john.j@gmail.com,Division 4,,ACTIVE,,John,Shaba,,,Shabz,,0413 769 918
,,Kyan Hazelman,justynhazelman@gmail.com,Division 4,,ACTIVE,,Kyan,Hazelman,,,Kyan,,0433 339 981
,,Loc Tran,loctran2206@gmail.com,Division 4,,ACTIVE,,Loc,Tran,,,Loc,,0408 039 015
,,Mark Scharnhop,marks34@gmx.de,Division 4,,ACTIVE,,Mark,Scharnhop,,,MS34,,0432 889 989
,,Michael Howard,howie_00@hotmail.com,Division 4,,ACTIVE,,Michael,Howard,,,Mike,,0422 764 166
,,Oscar Bostock,pauldbostock@hotmail.com,Division 4,,ACTIVE,,Oscar,Bostock,,,Oscar,,0422 280 492
,,Peter Suzic,,Division 4,,ACTIVE,,Peter,Suzic,,,Peter,,
,,Shawn Kostin,skf2040@gmail.com,Division 4,,ACTIVE,,Shawn,Kostin,,,Stroll,,0419 112 246
,,Thomas Baldock,tgb.aus@gmail.com,Division 4,,ACTIVE,,Thomas,Baldock,,,Tgb,,0420 251 580
,,Brooke Warren,brookelouisewarren@hotmail.com,New,,INACTIVE,,Brooke,Warren,,,,,0402 587 278
,,Christos Polendakis,chrispolendakis1@outlook.com,New,,INACTIVE,,Christos,Polendakis,,,,,0438 633 959
,,Dinesh Choudhary Rathod,rathoddinesh684@gmail.com,New,,INACTIVE,,Dinesh,Choudhary,,,,,0434 216 595
,,Gagan Dasari,akshrchwdry@gmail.com,New,,INACTIVE,,Gagan,Dasari,,,,,0481 333 453
,,Jack Dunn,jackodunn007@gmail.com,New,,INACTIVE,,Jack,Dunn,,,,,0447 005 811
,,Shazwan Thobrani,shazwanthobrani@gmail.com,New,,INACTIVE,,Shazwan,Thobrani,,,,,0497 111 369
,,Vien Nguyen,vien.nh@outlook.com,New,,INACTIVE,,Vien,Nguyen,,,,,0468 538 535
,,William Yu,yuwilliam050703@gmail.com,New,,INACTIVE,,William,Yu,,,,,0481 771 900`;

interface DriverRow {
  id: string;
  season_id: string;
  name: string;
  email: string;
  division: string;
  team_name: string;
  status: string;
  last_updated: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  home_track: string;
  aliases: string;
  created_at: string;
  mobile_number: string;
}

function parseCSV(csvText: string): DriverRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: DriverRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line handling quoted values and commas within quotes
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value
    
    const row: any = {};
    headers.forEach((header, index) => {
      // Handle cases where there are fewer values than headers
      row[header] = (values[index] !== undefined ? values[index] : '').trim();
    });
    rows.push(row as DriverRow);
  }
  
  return rows;
}

function generateDriverId(index: number): string {
  // Generate unique ID with timestamp, index, and random string
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `driver-${timestamp}-${index}-${random}`;
}

function cleanMobileNumber(mobile: string): string {
  if (!mobile || mobile.trim() === '') return '';
  // Remove spaces and keep only digits and + sign (for international numbers)
  return mobile.replace(/\s+/g, '').trim();
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

async function importDrivers() {
  try {
    console.log('Starting driver import from CSV...\n');
    
    // Get season_id from command line argument or use first season
    const seasonIdArg = process.argv[2];
    let seasonId = seasonIdArg;
    
    if (!seasonId) {
      console.log('No season_id provided, fetching first season from database...');
      const seasons = await sql`SELECT id, name FROM seasons ORDER BY start_date DESC LIMIT 1` as any[];
      if (seasons.length === 0) {
        throw new Error('No seasons found in database. Please create a season first or provide season_id as argument.');
      }
      seasonId = seasons[0].id;
      console.log(`Using season: ${seasons[0].name} (${seasonId})\n`);
    } else {
      // Verify season exists
      const season = await sql`SELECT id, name FROM seasons WHERE id = ${seasonId}` as any[];
      if (season.length === 0) {
        throw new Error(`Season with id ${seasonId} not found in database.`);
      }
      console.log(`Using season: ${season[0].name} (${seasonId})\n`);
    }
    
    // Parse CSV
    const driverRows = parseCSV(CSV_DATA);
    console.log(`Parsed ${driverRows.length} drivers from CSV\n`);
    
    if (driverRows.length === 0) {
      throw new Error('No drivers found in CSV data');
    }
    
    // Get existing drivers to check for duplicates
    const existingDrivers = await sql`
      SELECT id, name, email FROM drivers WHERE season_id = ${seasonId}
    ` as any[];
    const existingEmails = new Set(existingDrivers.map(d => d.email?.toLowerCase().trim()).filter(Boolean));
    const existingNames = new Set(existingDrivers.map(d => d.name?.toLowerCase().trim()).filter(Boolean));
    
    console.log(`Found ${existingDrivers.length} existing drivers in season\n`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    const currentTimestamp = getCurrentTimestamp();
    
    for (let index = 0; index < driverRows.length; index++) {
      const row = driverRows[index];
      try {
        // Skip if name is empty
        if (!row.name || row.name.trim() === '') {
          console.log(`⚠ Skipping row ${index + 1} with empty name`);
          skippedCount++;
          continue;
        }
        
        const name = row.name.trim();
        const email = (row.email || '').trim();
        const mobileNumber = cleanMobileNumber(row.mobile_number || '');
        const division = (row.division || '').trim();
        const status = (row.status || 'ACTIVE').trim().toUpperCase();
        const firstName = (row.first_name || '').trim();
        const lastName = (row.last_name || '').trim();
        const aliases = (row.aliases || '').trim();
        const teamName = (row.team_name || '').trim();
        const dateOfBirth = (row.date_of_birth || '').trim();
        const homeTrack = (row.home_track || '').trim();
        
        // Check for duplicates by email or name
        if (email && existingEmails.has(email.toLowerCase())) {
          console.log(`⚠ Skipping ${name} - email ${email} already exists`);
          skippedCount++;
          continue;
        }
        
        if (existingNames.has(name.toLowerCase())) {
          console.log(`⚠ Skipping ${name} - name already exists`);
          skippedCount++;
          continue;
        }
        
        // Generate ID
        const driverId = generateDriverId(index);
        
        // Validate required fields
        if (!division) {
          throw new Error(`Missing division for ${name}`);
        }
        
        // Insert driver
        await sql`
          INSERT INTO drivers (
            id, season_id, name, email, mobile_number, division, team_name, status,
            last_updated, first_name, last_name, date_of_birth, home_track, aliases
          ) VALUES (
            ${driverId}, ${seasonId}, ${name}, ${email || ''}, ${mobileNumber},
            ${division}, ${teamName || ''}, ${status},
            ${currentTimestamp}, ${firstName || ''}, ${lastName || ''},
            ${dateOfBirth || ''}, ${homeTrack || ''}, ${aliases || ''}
          )
        `;
        
        // Add to existing sets to prevent duplicates within this import
        if (email) existingEmails.add(email.toLowerCase());
        existingNames.add(name.toLowerCase());
        
        importedCount++;
        console.log(`✓ Imported: ${name} (${division})`);
        
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Error importing ${row.name || 'unknown'}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Import Summary:');
    console.log(`  ✓ Successfully imported: ${importedCount}`);
    console.log(`  ⚠ Skipped (duplicates): ${skippedCount}`);
    console.log(`  ✗ Errors: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\n✓ Driver import completed!');
    
  } catch (error) {
    console.error('✗ Import failed:', error);
    process.exit(1);
  }
}

importDrivers()
  .then(() => {
    console.log('\nImport process complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

