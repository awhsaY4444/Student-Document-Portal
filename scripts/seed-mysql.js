import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

dotenv.config();

const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')} in .env`);
  process.exit(1);
}

const departments = ['Computer Science', 'Information Technology', 'ECE', 'Mechanical', 'Civil'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const firstNames = [
  'Aarav',
  'Aditi',
  'Akash',
  'Ananya',
  'Arjun',
  'Bhavana',
  'Deepak',
  'Divya',
  'Harish',
  'Isha',
  'Karthik',
  'Kavya',
  'Meera',
  'Naveen',
  'Pooja',
  'Rahul',
  'Riya',
  'Sanjay',
  'Sneha',
  'Vikram'
];
const lastNames = ['Sharma', 'Rao', 'Kumar', 'Patel', 'Nair', 'Reddy', 'Iyer', 'Menon', 'Gupta', 'Joshi'];

function accounts() {
  const students = Array.from({ length: 50 }, (_, index) => {
    const serial = index + 1;
    const roll = `070526${String(serial).padStart(2, '0')}`;
    const fullName = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
    return {
      id: `stu-${roll}`,
      name: fullName,
      email: `nit${roll}@ac.in`,
      password: `nit${roll}`,
      role: 'student',
      register_number: roll,
      department: departments[index % departments.length],
      year: years[index % years.length],
      phone: `90070${String(52600 + serial).padStart(5, '0')}`
    };
  });

  return [
    ...students,
    {
      id: 'admin-nit-2026',
      name: 'Academic Office Admin',
      email: 'nitadmin@ac.in',
      password: 'adminnit2026',
      role: 'admin'
    },
    {
      id: 'dean-nit-2026',
      name: 'Dean Academics',
      email: 'nitdean@ac.in',
      password: 'deannit2026',
      role: 'dean'
    }
  ];
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5
});

let seeded = 0;
for (const account of accounts()) {
  const passwordHash = await bcrypt.hash(account.password, 10);
  await pool.execute(
    `insert into users
      (id, name, email, password_hash, role, register_number, department, year, phone)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)
     on duplicate key update
      name = values(name),
      password_hash = values(password_hash),
      role = values(role),
      register_number = values(register_number),
      department = values(department),
      year = values(year),
      phone = values(phone)`,
    [
      account.id,
      account.name,
      account.email,
      passwordHash,
      account.role,
      account.register_number || null,
      account.department || null,
      account.year || null,
      account.phone || null
    ]
  );
  seeded += 1;
}

await pool.end();
console.log(`Seeded ${seeded} MySQL accounts.`);
