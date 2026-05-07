import Badge from './Badge.jsx';
import { rupees, shortDate } from '../utils/format.js';

export default function ApplicationTable({ applications, actions }) {
  return (
    <div className="overflow-x-auto border border-slate-200">
      <table className="min-w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="table-th px-3 py-2">Application ID</th>
            <th className="table-th px-3 py-2">Student Name</th>
            <th className="table-th px-3 py-2">Register Number</th>
            <th className="table-th px-3 py-2">Department</th>
            <th className="table-th px-3 py-2">Document Type</th>
            <th className="table-th px-3 py-2">Payment</th>
            <th className="table-th px-3 py-2">Status</th>
            <th className="table-th px-3 py-2">Applied Date</th>
            {actions ? <th className="table-th px-3 py-2">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-slate-50">
              <td className="table-td px-3 py-2 font-semibold text-college-navy">{app.id}</td>
              <td className="table-td px-3 py-2">{app.full_name}</td>
              <td className="table-td px-3 py-2">{app.register_number}</td>
              <td className="table-td px-3 py-2">{app.department}</td>
              <td className="table-td px-3 py-2">{app.document_type}</td>
              <td className="table-td px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge value={app.payment_status} />
                  <span>{rupees(app.amount)}</span>
                </div>
              </td>
              <td className="table-td px-3 py-2">
                <Badge value={app.status} />
              </td>
              <td className="table-td px-3 py-2">{shortDate(app.created_at)}</td>
              {actions ? <td className="table-td px-3 py-2">{actions(app)}</td> : null}
            </tr>
          ))}
          {!applications.length ? (
            <tr>
              <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={actions ? 9 : 8}>
                No records found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
