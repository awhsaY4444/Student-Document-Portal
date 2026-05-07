import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import multer from 'multer';
import Razorpay from 'razorpay';
import {
  addDocument,
  authenticate,
  createApplication,
  databaseMode,
  dashboardStats,
  getApplicationBundle,
  getUserById,
  listApplications,
  listDocuments,
  listPayments,
  metadata,
  updateApplication
} from './lib/store.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'demo-college-erp-secret';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      })
    : null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsDir));

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: '12h' });
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, jwtSecret);
    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Invalid session' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }
    next();
  };
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function validateApplication(body) {
  const required = [
    'full_name',
    'register_number',
    'department',
    'year',
    'email',
    'phone',
    'document_type',
    'purpose'
  ];
  const missing = required.filter((field) => !String(body[field] || '').trim());
  if (missing.length) return `Missing required fields: ${missing.join(', ')}`;
  if (!metadata.documentTypes.includes(body.document_type)) return 'Unsupported document type';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'Enter a valid email address';
  if (!/^[0-9+\-\s]{8,15}$/.test(body.phone)) return 'Enter a valid phone number';
  return null;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: databaseMode(),
    razorpay: razorpay ? 'configured' : 'not_configured'
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayConfigured: Boolean(razorpay),
    metadata
  });
});

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await authenticate(email, password);
  res.json({ user, token: issueToken(user) });
}));

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/payments/order', requireAuth, allowRoles('student'), asyncRoute(async (req, res) => {
  const amount = Number(req.body.amount || 0);
  const documentType = req.body.documentType;
  if (!metadata.documentTypes.includes(documentType) || metadata.prices[documentType] !== amount) {
    return res.status(400).json({ message: 'Invalid payment amount for selected document' });
  }

  if (amount === 0) {
    return res.json({
      noPaymentRequired: true,
      order: {
        id: `order_free_${Date.now()}`,
        amount: 0,
        currency: 'INR',
        receipt: `free_${Date.now()}`
      }
    });
  }

  if (!razorpay) {
    return res.status(500).json({ message: 'Razorpay test keys are not configured on the server' });
  }

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: 'INR',
    receipt: `doc_${Date.now()}`
  });
  res.json({ order });
}));

app.post('/api/payments/verify', requireAuth, allowRoles('student'), (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (razorpay_order_id?.startsWith('order_free_') && razorpay_payment_id?.startsWith('pay_free_')) {
    return res.json({ verified: true, noPaymentRequired: true });
  }
  if (!razorpay) {
    return res.status(500).json({ message: 'Razorpay test keys are not configured on the server' });
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Incomplete Razorpay payment verification details' });
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(razorpay_signature);
  const signatureMatches =
    expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  if (!signatureMatches) return res.status(400).json({ message: 'Payment verification failed' });
  res.json({ verified: true });
});

app.get('/api/applications', requireAuth, asyncRoute(async (req, res) => {
  const filters = {
    search: req.query.search,
    department: req.query.department,
    documentType: req.query.documentType,
    status: req.query.status
  };
  if (req.user.role === 'student') filters.studentId = req.user.id;
  const applications = await listApplications(filters);
  res.json({ applications });
}));

app.post('/api/applications', requireAuth, allowRoles('student'), asyncRoute(async (req, res) => {
  const validationError = validateApplication(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const amount = metadata.prices[req.body.document_type];
  const payload = {
    student_id: req.user.id,
    full_name: req.body.full_name.trim(),
    register_number: req.body.register_number.trim(),
    department: req.body.department,
    year: req.body.year,
    email: req.body.email.trim(),
    phone: req.body.phone.trim(),
    document_type: req.body.document_type,
    purpose: req.body.purpose.trim(),
    additional_notes: req.body.additional_notes?.trim() || '',
    amount
  };
  const payment = {
    order_id: req.body.order_id,
    payment_id: req.body.payment_id
  };
  if (!payment.order_id || !payment.payment_id) {
    return res.status(400).json({ message: 'Completed payment details are required' });
  }
  const result = await createApplication(payload, payment);
  res.status(201).json(result);
}));

app.get('/api/applications/:id', requireAuth, asyncRoute(async (req, res) => {
  const bundle = await getApplicationBundle(req.params.id);
  if (req.user.role === 'student' && bundle.application.student_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only view your own applications' });
  }
  res.json(bundle);
}));

app.patch('/api/applications/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => {
  const allowedStatuses = ['under_review', 'approved', 'rejected'];
  if (req.body.status && !allowedStatuses.includes(String(req.body.status))) {
    return res.status(400).json({ message: 'Invalid request status' });
  }
  const application = await updateApplication(req.params.id, {
    status: req.body.status,
    admin_remarks: req.body.admin_remarks
  });
  res.json({ application });
}));

app.get('/api/applications/:id/documents', requireAuth, asyncRoute(async (req, res) => {
  const bundle = await getApplicationBundle(req.params.id);
  if (req.user.role === 'student' && bundle.application.student_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only view your own documents' });
  }
  res.json({ documents: bundle.documents });
}));

app.post('/api/applications/:id/documents', requireAuth, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF file is required' });
  const type = req.body.type || 'approved';
  if (!['approved', 'receipt'].includes(type)) return res.status(400).json({ message: 'Invalid document type' });
  const bundle = await getApplicationBundle(req.params.id);
  const isStudentReceipt =
    req.user.role === 'student' && type === 'receipt' && bundle.application.student_id === req.user.id;
  if (req.user.role !== 'admin' && !isStudentReceipt) {
    return res.status(403).json({ message: 'You do not have permission to upload this document' });
  }

  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const diskName = `${req.params.id}-${type}-${Date.now()}-${safeName}`;
  fs.writeFileSync(path.join(uploadsDir, diskName), req.file.buffer);
  const localUrl = `/uploads/${diskName}`;

  const document = await addDocument({
    applicationId: req.params.id,
    type,
    fileName: req.file.originalname,
    fileBuffer: req.file.buffer,
    mimeType: req.file.mimetype || 'application/pdf',
    localUrl
  });
  res.status(201).json({ document });
}));

app.get('/api/stats', requireAuth, asyncRoute(async (req, res) => {
  const stats = await dashboardStats(req.user);
  res.json({ stats });
}));

app.get('/api/analytics', requireAuth, allowRoles('dean'), asyncRoute(async (req, res) => {
  const applications = await listApplications();
  const payments = await listPayments();
  const byDepartment = Object.values(
    applications.reduce((acc, item) => {
      acc[item.department] ||= { name: item.department, requests: 0 };
      acc[item.department].requests += 1;
      return acc;
    }, {})
  );
  const byDocumentType = Object.values(
    applications.reduce((acc, item) => {
      acc[item.document_type] ||= { name: item.document_type, requests: 0 };
      acc[item.document_type].requests += 1;
      return acc;
    }, {})
  );
  const monthlyRequests = Object.values(
    applications.reduce((acc, item) => {
      const month = new Date(item.created_at).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      acc[month] ||= { month, requests: 0 };
      acc[month].requests += 1;
      return acc;
    }, {})
  );
  const revenue = Object.values(
    payments.reduce((acc, item) => {
      const month = new Date(item.created_at).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      acc[month] ||= { month, revenue: 0 };
      acc[month].revenue += Number(item.amount || 0);
      return acc;
    }, {})
  );
  res.json({
    byDepartment,
    byDocumentType,
    monthlyRequests,
    revenue,
    recentActivities: applications.slice(0, 8),
    latestApprovals: applications.filter((item) => item.status === 'approved').slice(0, 6),
    payments: payments.slice(0, 8)
  });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Something went wrong' });
});

app.listen(port, () => {
  console.log(`Document portal API running on http://localhost:${port}`);
});
