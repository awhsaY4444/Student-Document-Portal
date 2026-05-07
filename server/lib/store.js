import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';

const prices = {
  Transcript: 1000,
  Marksheet: 1000,
  'Fee Receipt': 0,
  'Bonafide Certificate': 1000,
  'Transfer Certificate': 1000
};

export const metadata = {
  prices,
  departments: ['Computer Science', 'Information Technology', 'ECE', 'Mechanical', 'Civil'],
  years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
  documentTypes: Object.keys(prices),
  statuses: ['pending', 'under_review', 'approved', 'rejected']
};

export function databaseMode() {
  return 'mysql';
}

function appId(next) {
  return `APP-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '_');
}

function dbDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function isoDate(value) {
  if (!value) return value;
  return new Date(value).toISOString();
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    amount: Number(row.amount || 0),
    created_at: isoDate(row.created_at),
    updated_at: isoDate(row.updated_at),
    uploaded_at: isoDate(row.uploaded_at)
  };
}

function safeUser(user) {
  if (!user) return null;
  const { password_hash: _passwordHash, ...profile } = user;
  return profile;
}

async function nextApplicationId(connection) {
  const year = new Date().getFullYear();
  const [rows] = await connection.execute(
    'select id from applications where id like ? order by id desc limit 1',
    [`APP-${year}-%`]
  );
  const latest = rows[0]?.id;
  const next = latest ? Number(String(latest).split('-').pop()) + 1 : 1;
  return appId(next);
}

export async function authenticate(email, password) {
  const [rows] = await pool.execute('select * from users where lower(email) = lower(?) limit 1', [email]);
  const user = rows[0];
  const passwordMatches = user?.password_hash && (await bcrypt.compare(password, user.password_hash));
  if (!user || !passwordMatches) throw new Error('Invalid email or password');
  if (!user.role) throw new Error('User profile or role not found');
  return safeUser(user);
}

export async function getUserById(id) {
  const [rows] = await pool.execute('select * from users where id = ? limit 1', [id]);
  return safeUser(rows[0]);
}

export async function listApplications(filters = {}) {
  const clauses = [];
  const values = [];

  if (filters.studentId) {
    clauses.push('student_id = ?');
    values.push(filters.studentId);
  }
  if (filters.department) {
    clauses.push('department = ?');
    values.push(filters.department);
  }
  if (filters.documentType) {
    clauses.push('document_type = ?');
    values.push(filters.documentType);
  }
  if (filters.status) {
    clauses.push('status = ?');
    values.push(normalizeStatus(filters.status));
  }
  if (filters.search) {
    clauses.push('(full_name like ? or register_number like ? or id like ?)');
    const term = `%${filters.search}%`;
    values.push(term, term, term);
  }

  const where = clauses.length ? ` where ${clauses.join(' and ')}` : '';
  const [rows] = await pool.execute(`select * from applications${where} order by created_at desc`, values);
  return rows.map(mapRow);
}

export async function getApplication(id) {
  const [rows] = await pool.execute('select * from applications where id = ? limit 1', [id]);
  if (!rows[0]) throw new Error('Application not found');
  return mapRow(rows[0]);
}

export async function createApplication(payload, payment) {
  const now = dbDate();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const id = await nextApplicationId(connection);
    const application = {
      id,
      ...payload,
      status: 'under_review',
      payment_status: 'paid',
      admin_remarks: '',
      created_at: now,
      updated_at: now
    };
    const paymentRow = {
      id: `PAY-${crypto.randomUUID()}`,
      application_id: id,
      payment_id: payment.payment_id,
      order_id: payment.order_id,
      amount: payload.amount,
      status: 'paid',
      created_at: now
    };

    await connection.execute(
      `insert into applications
        (id, student_id, full_name, register_number, department, year, email, phone, document_type, purpose,
         additional_notes, status, payment_status, amount, admin_remarks, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        application.id,
        application.student_id,
        application.full_name,
        application.register_number,
        application.department,
        application.year,
        application.email,
        application.phone,
        application.document_type,
        application.purpose,
        application.additional_notes,
        application.status,
        application.payment_status,
        application.amount,
        application.admin_remarks,
        application.created_at,
        application.updated_at
      ]
    );

    await connection.execute(
      `insert into payments (id, application_id, payment_id, order_id, amount, status, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentRow.id,
        paymentRow.application_id,
        paymentRow.payment_id,
        paymentRow.order_id,
        paymentRow.amount,
        paymentRow.status,
        paymentRow.created_at
      ]
    );

    await connection.commit();
    return { application: mapRow(application), payment: mapRow(paymentRow) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateApplication(id, updates) {
  const cleanUpdates = {
    ...updates,
    status: updates.status ? normalizeStatus(updates.status) : undefined,
    updated_at: dbDate()
  };
  Object.keys(cleanUpdates).forEach((key) => cleanUpdates[key] === undefined && delete cleanUpdates[key]);

  const fields = [];
  const values = [];
  if (Object.prototype.hasOwnProperty.call(cleanUpdates, 'status')) {
    fields.push('status = ?');
    values.push(cleanUpdates.status);
  }
  if (Object.prototype.hasOwnProperty.call(cleanUpdates, 'admin_remarks')) {
    fields.push('admin_remarks = ?');
    values.push(cleanUpdates.admin_remarks);
  }
  fields.push('updated_at = ?');
  values.push(cleanUpdates.updated_at, id);

  await pool.execute(`update applications set ${fields.join(', ')} where id = ?`, values);
  return getApplication(id);
}

export async function listPayments() {
  const [rows] = await pool.execute('select * from payments order by created_at desc');
  return rows.map(mapRow);
}

export async function listDocuments(applicationId) {
  const [rows] = await pool.execute(
    'select * from documents where application_id = ? order by uploaded_at desc',
    [applicationId]
  );
  return rows.map(mapRow);
}

export async function addDocument({ applicationId, type, fileName, localUrl }) {
  const document = {
    id: `DOC-${crypto.randomUUID()}`,
    application_id: applicationId,
    type,
    file_name: fileName,
    file_url: localUrl,
    uploaded_at: dbDate()
  };

  await pool.execute(
    `insert into documents (id, application_id, type, file_name, file_url, uploaded_at)
     values (?, ?, ?, ?, ?, ?)`,
    [document.id, document.application_id, document.type, document.file_name, document.file_url, document.uploaded_at]
  );

  return mapRow(document);
}

export async function getApplicationBundle(id) {
  const application = await getApplication(id);
  const documents = await listDocuments(id);
  const payments = (await listPayments()).filter((payment) => payment.application_id === id);
  return { application, documents, payments };
}

export async function dashboardStats(user) {
  const applications = await listApplications(user.role === 'student' ? { studentId: user.id } : {});
  const payments = await listPayments();
  const scopedPayments = payments.filter((payment) =>
    applications.some((application) => application.id === payment.application_id)
  );

  return {
    totalApplications: applications.length,
    pending: applications.filter((item) => ['pending', 'under_review'].includes(item.status)).length,
    approved: applications.filter((item) => item.status === 'approved').length,
    rejected: applications.filter((item) => item.status === 'rejected').length,
    revenue: scopedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  };
}
