// src/components/orders/OrderTimeline.tsx
import React from 'react';
import { OrderStatus } from '@/lib/types/order.types';
import { Check, Clock } from 'lucide-react';

// ─── Timeline Steps ────────────────────────────────────────────────────────────

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending',          label: 'Order Placed' },
  { status: 'confirmed',        label: 'Confirmed' },
  { status: 'processing',       label: 'Processing' },
  { status: 'packed',           label: 'Packed' },
  { status: 'dispatched',       label: 'Dispatched' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered',        label: 'Delivered' },
];

const CANCEL_STATUSES: OrderStatus[] = [
  'cancelled', 'failed', 'on_hold'
];

const RETURN_STATUSES: OrderStatus[] = [
  'return_requested', 'return_approved', 'return_rejected',
  'return_picked', 'return_received', 'refund_initiated', 'refund_completed', 'returns'
];

const RETURN_TIMELINE_STEPS: { status: string; label: string }[] = [
  { status: 'requested', label: 'Return Requested' },
  { status: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { status: 'picked_up', label: 'Picked Up' },
  { status: 'received', label: 'Received at Facility' },
  { status: 'approved', label: 'Return Approved' },
  { status: 'completed', label: 'Refund Completed' },
];

const RETURN_STATUS_ORDER: Record<string, number> = {
  requested: 0,
  pickup_scheduled: 1,
  picked_up: 2,
  received: 3,
  approved: 4,
  rejected: 4,
  completed: 5,
};

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  placed: 0,
  confirmed: 1,
  processing: 2,
  packed: 3,
  dispatched: 4,
  shipped: 4,
  partially_shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
  cancelled: -1,
  returns: 10,
  return_requested: 7,
  return_in_progress: 8,
  return_approved: 8,
  return_rejected: 8,
  return_picked: 9,
  return_received: 10,
  exchange_requested: 7,
  refund_initiated: 11,
  refund_completed: 12,
  failed: -1,
  on_hold: -1,
};

interface StatusHistoryEntry {
  status: OrderStatus;
  updatedAt?: string;
  timestamp?: string;
  note?: string;
}

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  returnRequest?: {
    status: string;
    requestedAt?: string;
    resolvedAt?: string;
    pickupDate?: string;
  };
  compact?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderTimeline({ currentStatus, statusHistory, returnRequest, compact = false }: OrderTimelineProps) {
  const isCancelled = CANCEL_STATUSES.includes(currentStatus);
  const isReturn = RETURN_STATUSES.includes(currentStatus) || !!returnRequest;
  const currentStep = STATUS_ORDER[currentStatus] ?? 0;

  // For cancelled/failed orders, just show a single status
  if (isCancelled) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-red-700 font-sans capitalize">
            {currentStatus.replace(/_/g, ' ')}
          </p>
          {statusHistory && statusHistory.length > 0 && (
            <p className="text-[10px] text-stone-400 font-sans">
              {formatDate(statusHistory[statusHistory.length - 1].updatedAt || statusHistory[statusHistory.length - 1].timestamp || '')}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact horizontal stepper
    const visibleSteps = TIMELINE_STEPS.slice(0, 5); // pending → dispatched
    return (
      <div className="flex items-center gap-0">
        {visibleSteps.map((step, idx) => {
          const stepIdx = STATUS_ORDER[step.status];
          const isDone = stepIdx <= currentStep;
          const isCurrent = step.status === currentStatus || 
            (currentStatus === 'shipped' && step.status === 'dispatched');

          return (
            <React.Fragment key={step.status}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone
                      ? 'bg-stone-900 border-stone-900'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  {isDone && <Check size={10} className="text-white" />}
                </div>
                <p className={`text-[9px] font-sans mt-1 whitespace-nowrap ${
                  isCurrent ? 'text-stone-900 font-semibold' : isDone ? 'text-stone-500' : 'text-stone-300'
                }`}>
                  {step.label}
                </p>
              </div>
              {idx < visibleSteps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 mb-5 transition-all ${
                    STATUS_ORDER[visibleSteps[idx + 1].status] <= currentStep
                      ? 'bg-stone-900'
                      : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Full vertical timeline
  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, idx) => {
        const stepIdx = STATUS_ORDER[step.status];
        const isDone = stepIdx <= currentStep;
        const isCurrent = step.status === currentStatus ||
          (currentStatus === 'shipped' && step.status === 'dispatched');
        const historyEntry = statusHistory?.find(h => h.status === step.status);
        const isLast = idx === TIMELINE_STEPS.length - 1;

        return (
          <div key={step.status} className="flex items-start gap-3">
            {/* Line + dot */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                  isCurrent
                    ? 'bg-stone-900 border-stone-900 shadow-lg shadow-stone-900/20'
                    : isDone
                    ? 'bg-stone-900 border-stone-900'
                    : 'bg-white border-stone-200'
                }`}
              >
                {isDone ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <Clock size={10} className="text-stone-300" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-8 transition-all ${
                    STATUS_ORDER[TIMELINE_STEPS[idx + 1].status] <= currentStep
                      ? 'bg-stone-900'
                      : 'bg-stone-100'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? '' : ''}`}>
              <p
                className={`text-xs font-sans font-medium ${
                  isCurrent
                    ? 'text-stone-900'
                    : isDone
                    ? 'text-stone-600'
                    : 'text-stone-300'
                }`}
              >
                {step.label}
              </p>
              {historyEntry && (
                <p className="text-[10px] text-stone-400 font-sans mt-0.5">
                  {formatDate(historyEntry.updatedAt || historyEntry.timestamp || '')}
                  {historyEntry.note && (
                    <span className="ml-1 text-stone-400">— {historyEntry.note}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Return flow appended */}
      {isReturn && returnRequest && (
        <div className="mt-2 border-t border-dashed border-stone-200 pt-6">
          <p className="text-[10px] uppercase tracking-widest text-orange-500 font-sans font-semibold mb-4">Return Journey</p>
          <div className="space-y-0">
            {RETURN_TIMELINE_STEPS.map((step, idx) => {
              const stepIdx = RETURN_STATUS_ORDER[step.status];
              const currentReturnStep = RETURN_STATUS_ORDER[returnRequest.status] ?? 0;
              
              let isDone = false;
              if (returnRequest.status === 'rejected') {
                isDone = stepIdx < currentReturnStep;
              } else {
                isDone = stepIdx <= currentReturnStep;
              }

              const isRejected = returnRequest.status === 'rejected' && step.status === 'approved';
              const isCurrent = step.status === returnRequest.status || isRejected;
              const isLast = idx === RETURN_TIMELINE_STEPS.length - 1;

              // Override label for rejected step
              const label = isRejected ? 'Return Rejected' : step.label;
              const activeColor = isRejected ? 'bg-red-500 border-red-500' : 'bg-orange-500 border-orange-500';
              const textColor = isRejected ? 'text-red-700' : (isCurrent ? 'text-stone-900' : (isDone ? 'text-stone-600' : 'text-stone-300'));

              return (
                <div key={step.status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                        isCurrent
                          ? `${activeColor} shadow-lg shadow-orange-500/20`
                          : isDone
                          ? activeColor
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      {isDone || isRejected ? (
                        <Check size={12} className="text-white" />
                      ) : (
                        <Clock size={10} className="text-stone-300" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-8 transition-all ${
                          RETURN_STATUS_ORDER[RETURN_TIMELINE_STEPS[idx + 1].status] <= currentReturnStep
                            ? (isRejected ? 'bg-red-500' : 'bg-orange-500')
                            : 'bg-stone-100'
                        }`}
                      />
                    )}
                  </div>

                  <div className={`pb-6 ${isLast ? '' : ''}`}>
                    <p className={`text-xs font-sans font-medium ${textColor}`}>
                      {label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {isReturn && !returnRequest && (
        <div className="flex items-start gap-3 mt-2 border-t border-dashed border-stone-200 pt-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-orange-700 font-sans capitalize">
              {currentStatus.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
