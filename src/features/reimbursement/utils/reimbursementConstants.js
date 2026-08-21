// Status badge colours using Tailwind class strings
export const REIMBURSEMENT_STATUS_STYLES = {
    'Pending':      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
    'L1 Approved':  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
    'L2 Approved':  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    'Approved':     { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
    'Rejected':     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
    'Reimbursed':   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    'Cancelled':    { bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200',  dot: 'bg-slate-400'  }
};

export const CLAIM_STATUSES = ['Pending', 'L1 Approved', 'L2 Approved', 'Approved', 'Rejected', 'Reimbursed', 'Cancelled'];

export const STATUS_SORT_ORDER = {
    'Pending':     0,
    'L1 Approved': 1,
    'L2 Approved': 2,
    'Approved':    3,
    'Reimbursed':  4,
    'Rejected':    5,
    'Cancelled':   6
};

/** Category icon mapping (lucide-react icon names as strings) */
export const CATEGORY_ICON_MAP = {
    'Travel':           'Plane',
    'Food & Meals':     'UtensilsCrossed',
    'Accommodation':    'Hotel',
    'Internet & Phone': 'Wifi',
    'Medical':          'Stethoscope',
    'Fuel & Conveyance':'Fuel',
    'Office Supplies':  'Package',
    'Other':            'ReceiptText'
};

/**
 * Format a number as INR currency.
 * e.g. 12500 → "₹12,500"
 */
export const formatINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style:    'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(amount));
};

/** Returns a status style object — falls back to slate for unknown statuses */
export const getStatusStyle = (status) =>
    REIMBURSEMENT_STATUS_STYLES[status] || REIMBURSEMENT_STATUS_STYLES['Pending'];

/** Returns true if a claim can still be cancelled by the employee */
export const isCancellable = (status) => status === 'Pending';

/** Returns true if a claim can be actioned (approved/rejected) by an approver */
export const isActionable = (status) => ['Pending', 'L1 Approved', 'L2 Approved'].includes(status);

/** Returns true if a claim is in a terminal state */
export const isTerminal = (status) => ['Approved', 'Rejected', 'Reimbursed', 'Cancelled'].includes(status);
