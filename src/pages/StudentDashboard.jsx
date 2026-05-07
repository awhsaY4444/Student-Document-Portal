import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, FilePlus2, Files, Hourglass, CheckCircle2, XCircle } from 'lucide-react';
import { api, documentUrl } from '../api/client.js';
import ApplicationTable from '../components/ApplicationTable.jsx';
import Modal from '../components/Modal.jsx';
import StatCard from '../components/StatCard.jsx';
import Timeline from '../components/Timeline.jsx';
import Badge from '../components/Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { paymentReceiptPdf } from '../utils/pdf.js';
import { rupees, shortDate } from '../utils/format.js';

const emptyForm = {
  full_name: '',
  register_number: '',
  department: 'Computer Science',
  year: '3rd Year',
  email: '',
  phone: '',
  document_type: 'Transcript',
  purpose: '',
  additional_notes: ''
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState({});

  const latest = applications[0];

  useEffect(() => {
    load();
    api.config().then(setConfig).catch(() => {});
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [appData, statData] = await Promise.all([api.listApplications(), api.stats()]);
      setApplications(appData.applications);
      setStats(statData.stats);
      const docs = {};
      await Promise.all(
        appData.applications.map(async (app) => {
          const bundle = await api.getApplication(app.id);
          docs[app.id] = bundle.documents;
        })
      );
      setDocuments(docs);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openForm() {
    setForm({
      ...emptyForm,
      full_name: user.name || '',
      register_number: user.register_number || '',
      department: user.department || 'Computer Science',
      year: user.year || '3rd Year',
      email: user.email || '',
      phone: user.phone || ''
    });
    setShowForm(true);
  }

  async function loadRazorpayCheckout() {
    if (window.Razorpay) return true;
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      await new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
      return Boolean(window.Razorpay);
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    return Boolean(window.Razorpay);
  }

  async function pay(amount, documentType) {
    const orderData = await api.createOrder({ amount, documentType });

    if (orderData.noPaymentRequired) {
      return {
        razorpay_order_id: orderData.order.id,
        razorpay_payment_id: `pay_free_${Date.now()}`,
        razorpay_signature: 'free_receipt'
      };
    }

    if (!config?.razorpayConfigured || !config?.razorpayKeyId) {
      throw new Error('Razorpay test keys are not configured. Please contact the academic office.');
    }

    const checkoutLoaded = await loadRazorpayCheckout();
    if (!checkoutLoaded) {
      throw new Error('Unable to load Razorpay Checkout. Please check your connection and try again.');
    }

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: config?.razorpayKeyId,
        amount: orderData.order.amount,
        currency: 'INR',
        name: 'NIT Document Cell',
        description: documentType,
        order_id: orderData.order.id,
        handler: resolve,
        modal: { ondismiss: () => reject(new Error('Payment popup closed')) },
        prefill: { name: form.full_name, email: form.email, contact: form.phone },
        theme: { color: '#17335c' }
      });
      checkout.open();
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const amount = config?.metadata?.prices?.[form.document_type] || 0;
      const paymentResult = await pay(amount, form.document_type);
      await api.verifyPayment(paymentResult);
      const result = await api.createApplication({
        ...form,
        order_id: paymentResult.razorpay_order_id,
        payment_id: paymentResult.razorpay_payment_id
      });
      const receiptBlob = paymentReceiptPdf(result.application, result.payment);
      await api.uploadDocument(result.application.id, 'receipt', receiptBlob, `${result.application.id}-receipt.pdf`);
      toast.success('Application submitted successfully.');
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const downloadRows = useMemo(
    () =>
      applications.flatMap((app) =>
        (documents[app.id] || []).map((doc) => ({
          ...doc,
          app
        }))
      ),
    [applications, documents]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Dashboard</h2>
          <p className="text-sm text-slate-500">Request certificates, track office status, and download issued documents.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold" onClick={openForm}>
          <FilePlus2 className="h-4 w-4" />
          New Application
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={stats?.totalApplications ?? 0} icon={Files} />
        <StatCard label="Pending" value={stats?.pending ?? 0} tone="pending" icon={Hourglass} />
        <StatCard label="Approved" value={stats?.approved ?? 0} tone="approved" icon={CheckCircle2} />
        <StatCard label="Rejected" value={stats?.rejected ?? 0} tone="rejected" icon={XCircle} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <section className="erp-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Applications</h3>
            {loading ? <span className="text-xs text-slate-500">Refreshing...</span> : null}
          </div>
          <ApplicationTable applications={applications.slice(0, 8)} />
        </section>

        <section className="erp-card p-4">
          <h3 className="mb-3 font-bold text-slate-900">Application Status Timeline</h3>
          <Timeline application={latest} />
        </section>
      </div>

      <section className="erp-card p-4">
        <h3 className="mb-3 font-bold text-slate-900">Download Center</h3>
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="table-th px-3 py-2">Application ID</th>
                <th className="table-th px-3 py-2">Document</th>
                <th className="table-th px-3 py-2">Type</th>
                <th className="table-th px-3 py-2">Status</th>
                <th className="table-th px-3 py-2">Uploaded</th>
                <th className="table-th px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {downloadRows.map((doc) => (
                <tr key={doc.id}>
                  <td className="table-td px-3 py-2 font-semibold text-college-navy">{doc.application_id}</td>
                  <td className="table-td px-3 py-2">{doc.file_name}</td>
                  <td className="table-td px-3 py-2">{doc.type === 'receipt' ? 'Payment Receipt' : doc.app.document_type}</td>
                  <td className="table-td px-3 py-2"><Badge value={doc.app.status} /></td>
                  <td className="table-td px-3 py-2">{shortDate(doc.uploaded_at)}</td>
                  <td className="table-td px-3 py-2">
                    <a className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold" href={documentUrl(doc.file_url)} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </td>
                </tr>
              ))}
              {!downloadRows.length ? (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan="6">No downloadable documents yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {showForm ? (
        <Modal title="New Document Application" onClose={() => setShowForm(false)} width="max-w-4xl">
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Full Name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
              <Field label="Register Number" value={form.register_number} onChange={(value) => setForm({ ...form, register_number: value })} />
              <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Phone Number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <Select label="Department" value={form.department} options={config?.metadata?.departments || []} onChange={(value) => setForm({ ...form, department: value })} />
              <Select label="Year" value={form.year} options={config?.metadata?.years || []} onChange={(value) => setForm({ ...form, year: value })} />
              <Select label="Document Type" value={form.document_type} options={config?.metadata?.documentTypes || []} onChange={(value) => setForm({ ...form, document_type: value })} />
              <div className="erp-card bg-college-panel px-3 py-2">
                <div className="text-xs font-semibold uppercase text-slate-500">Fee</div>
                <div className="mt-1 text-xl font-bold text-college-navy">{rupees(config?.metadata?.prices?.[form.document_type] || 0)}</div>
              </div>
            </div>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">Purpose / Reason</span>
              <textarea className="form-input min-h-24" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} required />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">Additional Notes</span>
              <textarea className="form-input min-h-20" value={form.additional_notes} onChange={(event) => setForm({ ...form, additional_notes: event.target.value })} />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary px-4 py-2 text-sm font-semibold" disabled={submitting}>
                {submitting ? 'Processing...' : 'Submit and Pay'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)} required>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
