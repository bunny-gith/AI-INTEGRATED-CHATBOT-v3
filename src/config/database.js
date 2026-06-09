const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DB_PATH || './healthcare_bot.db';
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.initializeTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  async initializeTables() {
    const tables = [
      // Babies vaccination table
      `CREATE TABLE IF NOT EXISTS babies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        beneficiary_id TEXT UNIQUE NOT NULL,
        mother_name TEXT NOT NULL,
        baby_name TEXT,
        dob DATE NOT NULL,
        phone_number TEXT NOT NULL,
        mother_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Vaccination records table
      `CREATE TABLE IF NOT EXISTS vaccination_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        beneficiary_id TEXT NOT NULL,
        vaccine_name TEXT NOT NULL,
        vaccination_date DATE,
        next_due_date DATE,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (beneficiary_id) REFERENCES babies (beneficiary_id)
      )`,

      // Health workers table
      `CREATE TABLE IF NOT EXISTS health_workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        designation TEXT,
        phone_number TEXT UNIQUE NOT NULL,
        pincode TEXT NOT NULL,
        facility_name TEXT,
        facility_type TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,


      // New table for callback requests
      `CREATE TABLE IF NOT EXISTS callback_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        language TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        completed_at DATETIME,
        counselor_name TEXT,
        feedback_rating INTEGER,
        feedback_text TEXT,
        feedback_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Outbreaks table for disease outbreak alerts
      `CREATE TABLE IF NOT EXISTS outbreaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        disease_name TEXT NOT NULL,
        location TEXT NOT NULL,
        state TEXT,
        district TEXT,
        pincode TEXT,
        severity TEXT DEFAULT 'moderate', -- low, moderate, high, critical
        description TEXT,
        symptoms TEXT,
        prevention_measures TEXT,
        reported_date DATE NOT NULL,
        status TEXT DEFAULT 'active', -- active, resolved, monitoring
        source TEXT, -- API source or manual entry
        affected_population INTEGER,
        deaths INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // User locations for targeted alerts
      `CREATE TABLE IF NOT EXISTS user_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        pincode TEXT,
        district TEXT,
        state TEXT,
        latitude REAL,
        longitude REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Alert logs for tracking sent notifications
      `CREATE TABLE IF NOT EXISTS alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outbreak_id INTEGER,
        phone_number TEXT NOT NULL,
        alert_type TEXT NOT NULL, -- sms, whatsapp, both
        message TEXT NOT NULL,
        status TEXT DEFAULT 'sent', -- sent, delivered, failed
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (outbreak_id) REFERENCES outbreaks (id)
      )`,

      // Human validation requests for AI responses
      `CREATE TABLE IF NOT EXISTS validation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        user_query TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        confidence_score INTEGER NOT NULL,
        urgency_level TEXT NOT NULL,
        validation_reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, validated, rejected
        validated_by TEXT,
        validated_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        validated_at DATETIME
      )`,

      // Testing results for accuracy validation
      `CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        input_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        expected_keywords TEXT NOT NULL,
        score REAL NOT NULL,
        passed INTEGER NOT NULL,
        test_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Overall test runs
      `CREATE TABLE IF NOT EXISTS test_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        overall_accuracy REAL NOT NULL,
        categories_tested INTEGER NOT NULL,
        total_categories INTEGER NOT NULL,
        results_json TEXT NOT NULL,
        test_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Remove duplicate rows created before uniqueness constraints existed.
    await this.run(`
      DELETE FROM vaccination_records
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM vaccination_records
        GROUP BY beneficiary_id, vaccine_name
      )
    `);

    await this.run(`
      DELETE FROM outbreaks
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM outbreaks
        GROUP BY disease_name, location, reported_date, source
      )
    `);

    await this.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccination_records_unique
      ON vaccination_records (beneficiary_id, vaccine_name)
    `);

    await this.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_outbreaks_unique
      ON outbreaks (disease_name, location, reported_date, source)
    `);

    // Add columns required by COWIN sync if they don't exist
    try {
      await this.run('ALTER TABLE vaccination_records ADD COLUMN dose INTEGER');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await this.run('ALTER TABLE vaccination_records ADD COLUMN source TEXT');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add new columns to existing callback_requests table if they don't exist
    try {
      await this.run('ALTER TABLE callback_requests ADD COLUMN completed_at DATETIME');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await this.run('ALTER TABLE callback_requests ADD COLUMN counselor_name TEXT');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await this.run('ALTER TABLE callback_requests ADD COLUMN feedback_rating INTEGER');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await this.run('ALTER TABLE callback_requests ADD COLUMN feedback_text TEXT');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await this.run('ALTER TABLE callback_requests ADD COLUMN feedback_at DATETIME');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Insert sample data
    await this.insertSampleData();
  }

  async insertSampleData() {
    // VIZAG-SPECIFIC SAMPLE DATA
    // Database configured for Visakhapatnam (Vizag) city, Andhra Pradesh
    // All sample data reflects local demographics, health facilities, and regional health challenges

    // Sample babies data - Vizag specific names and demographics
    const sampleBabies = [
      ['VZG001', 'Lakshmi Naidu', 'Baby Naidu', '2024-01-15', '+918916543210', 'MOTH001'],
      ['VZG002', 'Padma Rao', 'Baby Rao', '2024-02-20', '+918916543211', 'MOTH002'],
      ['VZG003', 'Saritha Reddy', 'Baby Reddy', '2024-03-10', '+918916543212', 'MOTH003'],
      ['VZG004', 'Anjali Patnaik', 'Baby Patnaik', '2024-04-05', '+918916543213', 'MOTH004'],
      ['VZG005', 'Kavita Sahu', 'Baby Sahu', '2024-05-22', '+918916543214', 'MOTH005'],
      ['VZG006', 'Meera Choudhury', 'Baby Choudhury', '2024-06-18', '+918916543215', 'MOTH006'],
      ['VZG007', 'Sunita Behera', 'Baby Behera', '2024-07-12', '+918916543216', 'MOTH007'],
      ['VZG008', 'Priya Mohanty', 'Baby Mohanty', '2024-08-08', '+918916543217', 'MOTH008'],
      ['VZG009', 'Deepa Panda', 'Baby Panda', '2024-09-25', '+918916543218', 'MOTH009'],
      ['VZG010', 'Rashmi Das', 'Baby Das', '2024-10-14', '+918916543219', 'MOTH010'],
      ['VZG011', 'Nandini Swain', 'Baby Swain', '2024-11-03', '+918916543220', 'MOTH011'],
      ['VZG012', 'Rekha Jena', 'Baby Jena', '2024-12-01', '+918916543221', 'MOTH012'],
      ['VZG013', 'Anita Tripathy', 'Baby Tripathy', '2023-12-15', '+918916543222', 'MOTH013'],
      ['VZG014', 'Kiran Rath', 'Baby Rath', '2023-11-20', '+918916543223', 'MOTH014'],
      ['VZG015', 'Poonam Mishra', 'Baby Mishra', '2023-10-30', '+918916543224', 'MOTH015'],
      ['VZG016', 'Sarika Nayak', 'Baby Nayak', '2025-01-15', '+918916543225', 'MOTH016']
    ];

    for (const baby of sampleBabies) {
      await this.run(
        `INSERT OR IGNORE INTO babies (beneficiary_id, mother_name, baby_name, dob, phone_number, mother_id)
         VALUES (?, ?, ?, ?, ?, ?)`, baby
      );
    }

    // Sample vaccination records - categorized scenarios
    const sampleVaccinations = [
      // === FULLY UP TO DATE BABIES ===

      // Baby VZG015 (born 2023-10-30, 1y 11m) - COMPLETELY UP TO DATE
      ['VZG015', 'BCG', '2023-10-30', 'completed'],
      ['VZG015', 'Hepatitis B', '2023-10-30', 'completed'],
      ['VZG015', 'OPV 1', '2023-12-30', 'completed'],
      ['VZG015', 'Pentavalent 1', '2023-12-30', 'completed'],
      ['VZG015', 'Rotavirus 1', '2023-12-30', 'completed'],
      ['VZG015', 'OPV 2', '2024-02-29', 'completed'],
      ['VZG015', 'Pentavalent 2', '2024-02-29', 'completed'],
      ['VZG015', 'Rotavirus 2', '2024-02-29', 'completed'],
      ['VZG015', 'OPV 3', '2024-04-30', 'completed'],
      ['VZG015', 'Pentavalent 3', '2024-04-30', 'completed'],
      ['VZG015', 'IPV', '2024-04-30', 'completed'],
      ['VZG015', 'Measles 1', '2024-10-30', 'completed'],
      ['VZG015', 'DPT Booster', '2024-10-30', 'completed'],
      ['VZG015', 'OPV Booster', '2024-10-30', 'completed'],
      ['VZG015', 'Measles 2', '2024-10-30', 'completed'],

      // === UPCOMING VACCINATIONS DUE ===

      // Baby VZG001 (born 2024-01-15, 1y 8m) - NEXT VACCINE DUE SOON
      ['VZG001', 'BCG', '2024-01-15', 'completed'],
      ['VZG001', 'Hepatitis B', '2024-01-15', 'completed'],
      ['VZG001', 'OPV 1', '2024-03-15', 'completed'],
      ['VZG001', 'Pentavalent 1', '2024-03-15', 'completed'],
      ['VZG001', 'Rotavirus 1', '2024-03-15', 'completed'],
      ['VZG001', 'OPV 2', '2024-05-15', 'completed'],
      ['VZG001', 'Pentavalent 2', '2024-05-15', 'completed'],
      ['VZG001', 'Rotavirus 2', '2024-05-15', 'completed'],
      ['VZG001', 'OPV 3', '2024-07-15', 'completed'],
      ['VZG001', 'Pentavalent 3', '2024-07-15', 'completed'],
      ['VZG001', 'IPV', '2024-07-15', 'completed'],
      // Measles 1 due around 2025-01-15 (not yet due)

      // Baby VZG004 (born 2024-04-05, 1y 5m) - NEXT VACCINE DUE
      ['VZG004', 'BCG', '2024-04-05', 'completed'],
      ['VZG004', 'Hepatitis B', '2024-04-05', 'completed'],
      ['VZG004', 'OPV 1', '2024-06-05', 'completed'],
      ['VZG004', 'Pentavalent 1', '2024-06-05', 'completed'],
      // Next: OPV 2, Pentavalent 2, Rotavirus 2 due around 2024-08-05

      // === OVERDUE VACCINATIONS ===

      // Baby VZG002 (born 2024-02-20, 1y 7m) - HAS OVERDUE VACCINATIONS
      ['VZG002', 'BCG', '2024-02-20', 'completed'],
      ['VZG002', 'Hepatitis B', '2024-02-20', 'completed'],
      // Missing: OPV 1, Pentavalent 1, Rotavirus 1 (should have been done by 2024-04-20)
      // Missing: OPV 2, Pentavalent 2, Rotavirus 2 (should have been done by 2024-06-20)

      // Baby VZG003 (born 2024-03-10, 1y 6m) - HAS OVERDUE VACCINATIONS
      ['VZG003', 'BCG', '2024-03-10', 'completed'],
      ['VZG003', 'Hepatitis B', '2024-03-10', 'completed'],
      // Missing: OPV 1, Pentavalent 1, Rotavirus 1 (should have been done by 2024-05-10)

      // Baby VZG014 (born 2023-11-20, 2y 0m) - HAS OVERDUE VACCINATIONS
      ['VZG014', 'BCG', '2023-11-20', 'completed'],
      ['VZG014', 'Hepatitis B', '2023-11-20', 'completed'],
      ['VZG014', 'OPV 1', '2024-01-20', 'completed'],
      ['VZG014', 'Pentavalent 1', '2024-01-20', 'completed'],
      ['VZG014', 'OPV 2', '2024-03-20', 'completed'],
      ['VZG014', 'Pentavalent 2', '2024-03-20', 'completed'],
      ['VZG014', 'OPV 3', '2024-05-20', 'completed'],
      ['VZG014', 'Pentavalent 3', '2024-05-20', 'completed'],
      // Missing: IPV (should have been done by 2024-05-20)
      // Missing: Measles 1 (should have been done by 2024-05-20)
      // Missing: DPT Booster, OPV Booster (should have been done by 2024-11-20)
      // Missing: Measles 2 (should have been done by 2024-11-20)

      // Baby VZG016 (born 2025-01-15, 8 months) - HAS UPCOMING VACCINATIONS
      ['VZG016', 'BCG', '2025-01-15', 'completed'],
      ['VZG016', 'Hepatitis B', '2025-01-15', 'completed'],
      ['VZG016', 'OPV 1', '2025-03-15', 'completed'],
      ['VZG016', 'Pentavalent 1', '2025-03-15', 'completed'],
      ['VZG016', 'Rotavirus 1', '2025-03-15', 'completed'],
      ['VZG016', 'OPV 2', '2025-05-15', 'completed'],
      ['VZG016', 'Pentavalent 2', '2025-05-15', 'completed'],
      ['VZG016', 'Rotavirus 2', '2025-05-15', 'completed'],
      // Next: OPV 3, Pentavalent 3, Rotavirus 3, IPV due around 2025-07-15 (upcoming)
    ];

    for (const vaccination of sampleVaccinations) {
      await this.run(
        `INSERT OR IGNORE INTO vaccination_records (beneficiary_id, vaccine_name, vaccination_date, status)
         VALUES (?, ?, ?, ?)`, vaccination
      );
    }

    // Sample health workers data - Vizag specific
    const sampleHealthWorkers = [
      ['Dr. Venkata Rao', 'Medical Officer', '+918916540001', '530001', 'King George Hospital', 'GH', 'Beach Road, Vizag'],
      ['Nurse Lakshmi', 'ANM', '+918916540002', '530002', 'MVP Colony PHC', 'PHC', 'MVP Colony, Vizag'],
      ['Dr. Saritha Reddy', 'Pediatrician', '+918916540003', '530003', 'Andhra Medical College', 'GH', 'Maharanipeta, Vizag'],
      ['Nurse Padma', 'Staff Nurse', '+918916540004', '530004', 'Dwaraka Nagar UHC', 'UHC', 'Dwaraka Nagar, Vizag'],
      ['Dr. Rajesh Kumar', 'General Physician', '+918916540005', '530005', 'Siripuram CHC', 'CHC', 'Siripuram, Vizag'],
      ['Nurse Anjali', 'ANM', '+918916540006', '530006', 'Gajuwaka PHC', 'PHC', 'Gajuwaka, Vizag'],
      ['Dr. Mohan Rao', 'Medical Officer', '+918916540007', '530007', 'Pendurthi CHC', 'CHC', 'Pendurthi, Vizag'],
      ['Nurse Kavita', 'Staff Nurse', '+918916540008', '530008', 'Bheemunipatnam PHC', 'PHC', 'Bheemunipatnam, Vizag'],
      ['Dr. Priya Singh', 'Pediatrician', '+918916540009', '530009', 'Visakhapatnam Port Trust Hospital', 'GH', 'Port Area, Vizag'],
      ['Nurse Sunita', 'ANM', '+918916540010', '530010', 'Anakapalle CHC', 'CHC', 'Anakapalle, Vizag Rural'],
      ['Dr. Arjun Patnaik', 'General Physician', '+918916540011', '530011', 'Yendada PHC', 'PHC', 'Yendada, Vizag'],
      ['Nurse Meera', 'Staff Nurse', '+918916540012', '530012', 'Madhurawada UHC', 'UHC', 'Madhurawada, Vizag'],
      ['Dr. Suresh Babu', 'Medical Officer', '+918916540013', '530013', 'NAD X-Ray Junction PHC', 'PHC', 'NAD, Vizag'],
      ['Nurse Rekha', 'ANM', '+918916540014', '530014', 'Srinagar Colony CHC', 'CHC', 'Srinagar Colony, Vizag'],
      ['Dr. Anita Choudhury', 'Pediatrician', '+918916540015', '530015', 'RK Beach Area Clinic', 'MC', 'RK Beach, Vizag']
    ];

    for (const worker of sampleHealthWorkers) {
      await this.run(
        `INSERT OR IGNORE INTO health_workers (name, designation, phone_number, pincode, facility_name, facility_type, address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, worker
      );
    }

    // Sample outbreak data - Vizag specific
    const sampleOutbreaks = [
      ['Dengue', 'Visakhapatnam', 'Andhra Pradesh', 'Visakhapatnam', '530001', 'high',
       'Dengue fever outbreak in Vizag city areas. Increased mosquito activity due to recent rains and urban flooding.',
       'High fever, severe headache, pain behind eyes, joint pain, rash',
       'Use mosquito repellents, wear long sleeves, eliminate standing water, use bed nets',
       '2024-09-15', 'active', 'Andhra Pradesh Health Dept', 120, 1],

      ['Chikungunya', 'Anakapalle', 'Andhra Pradesh', 'Visakhapatnam Rural', '531001', 'moderate',
       'Chikungunya outbreak in rural areas around Vizag due to mosquito breeding in coconut plantations.',
       'Sudden high fever, severe joint pain, headache, muscle pain, rash',
       'Use mosquito repellents, wear protective clothing, eliminate water collections',
       '2024-09-20', 'active', 'NVBDCP', 85, 0],

      ['Malaria', 'Araku Valley', 'Andhra Pradesh', 'Visakhapatnam Agency', '531149', 'moderate',
       'Malaria cases in tribal areas and forest regions near Vizag.',
       'High fever with chills, sweating, headache, nausea, body aches',
       'Use mosquito nets, apply repellents, eliminate breeding sites, take preventive medication',
       '2024-09-10', 'active', 'NVBDCP', 45, 2],

      ['Japanese Encephalitis', 'Pendurthi', 'Andhra Pradesh', 'Visakhapatnam', '531173', 'high',
       'JE outbreak in peri-urban areas with pig farming and rice cultivation.',
       'High fever, headache, neck stiffness, convulsions, coma in severe cases',
       'Vaccination, mosquito control, avoid pig farming areas during outbreaks',
       '2024-09-05', 'monitoring', 'IDSP', 25, 1],

      ['Leptospirosis', 'Vizag Port Area', 'Andhra Pradesh', 'Visakhapatnam', '530035', 'moderate',
       'Leptospirosis cases among port workers and fishermen due to rat urine contamination.',
       'High fever, headache, muscle pain, jaundice, red eyes',
       'Wear protective gear, avoid contaminated water, rodent control',
       '2024-08-28', 'active', 'Port Health Organization', 15, 0]
    ];

    for (const outbreak of sampleOutbreaks) {
      await this.run(
        `INSERT OR IGNORE INTO outbreaks
         (disease_name, location, state, district, pincode, severity, description, symptoms, prevention_measures, reported_date, status, source, affected_population, deaths)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, outbreak
      );
    }

    // Sample user locations for alert targeting - Vizag specific
    const sampleUserLocations = [
      ['+918916543210', '530001', 'Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185],
      ['+918916543211', '530002', 'Visakhapatnam', 'Andhra Pradesh', 17.7218, 83.3013],
      ['+918916543212', '530003', 'Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185],
      ['+918916543213', '530004', 'Visakhapatnam', 'Andhra Pradesh', 17.7389, 83.3278],
      ['+918916543214', '530005', 'Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185],
      ['+918916543215', '531001', 'Anakapalle', 'Andhra Pradesh', 17.6913, 82.9962],
      ['+918916543216', '531173', 'Pendurthi', 'Andhra Pradesh', 17.8258, 83.2028],
      ['+918916543217', '530035', 'Visakhapatnam Port', 'Andhra Pradesh', 17.6797, 83.2654]
    ];

    for (const location of sampleUserLocations) {
      await this.run(
        `INSERT OR IGNORE INTO user_locations
         (phone_number, pincode, district, state, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?)`, location
      );
    }

  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new Database();
