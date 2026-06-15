import React, { useState, useRef, useCallback } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useGetDocuments, useUploadDocument, useDeleteDocument, useGetMe } from '@/lib/hooks/useSeller';
import { useToast } from '@/lib/context/ToastContext';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileCheck,
  Info,
  X,
  Eye,
} from 'lucide-react';

const DOC_TYPES = [
  { value: 'id_proof', label: 'ID Proof', hint: 'Aadhaar, PAN, Passport, Voter ID' },
  {
    value: 'address_proof',
    label: 'Address Proof',
    hint: 'Utility bill, Bank statement, Rental agreement',
  },
  {
    value: 'business_registration',
    label: 'Business Registration',
    hint: 'GST certificate, Udyam registration, MCA certificate',
  },
  { value: 'tax_document', label: 'Tax Document', hint: 'PAN card, Form 26AS, ITR' },
  { value: 'bank_statement', label: 'Bank Statement', hint: 'Last 3 months statement' },
  {
    value: 'gst_certificate',
    label: 'GST Certificate',
    hint: 'GST registration certificate',
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function DocStatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    verified: {
      label: 'Verified',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 size={10} />,
    },
    approved: {
      label: 'Approved',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 size={10} />,
    },
    rejected: {
      label: 'Rejected',
      cls: 'bg-red-50 text-red-700 border-red-200',
      icon: <AlertCircle size={10} />,
    },
    pending: {
      label: 'Pending Review',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock size={10} />,
    },
  };
  const c = cfg[status ?? 'pending'] ?? cfg['pending'];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}
    >
      {c.icon} {c.label}
    </span>
  );
}

export default function KYCDocumentsPage() {
  const { data: docsData, isLoading, error, refetch } = useGetDocuments();
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('id_proof');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: sellerData } = useGetMe();
  const documents: any[] =
    (docsData as any)?.documents ?? (Array.isArray(docsData) ? docsData : []);
  const kycStatus = (sellerData as any)?.verificationStatus;

  const validateFile = (file: File): string => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only PDF, JPG, and PNG files are allowed';
    if (file.size > MAX_FILE_SIZE)
      return `File size must be under 5 MB (current: ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    return '';
  };

  const handleFileSelect = (file: File) => {
    const err = validateFile(file);
    setFileError(err);
    if (!err) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('No File', 'Please select a file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', docType);
    uploadDoc.mutate(formData, {
      onSuccess: () => {
        toast.success('Document Uploaded', 'Your document is under review.');
        setSelectedFile(null);
        setFileError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: (err: any) =>
        toast.error('Upload Failed', err?.message || 'Could not upload document.'),
    });
  };

  const handleDelete = (docId: string) => {
    if (!confirm('Remove this document?')) return;
    deleteDoc.mutate(docId, {
      onSuccess: () => toast.success('Document Removed', 'Document has been removed.'),
      onError: (err: any) =>
        toast.error('Error', err?.message || 'Could not remove document.'),
    });
  };

  if (isLoading) {
    return (
      <SellerLayout title="KYC Documents" description="Upload and manage your verification documents">
        <div className="grid md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-64 bg-stone-100 rounded-2xl" />
          ))}
        </div>
      </SellerLayout>
    );
  }

  if (error && documents.length === 0) {
    return (
      <SellerLayout title="KYC Documents" description="Upload and manage your verification documents">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-stone-700 mb-1">Could not load documents</h3>
          <p className="text-xs text-stone-400 mb-4">Check your connection and try again.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 hover:border-stone-400 text-xs font-semibold text-stone-700 rounded-xl transition-colors"
          >
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      </SellerLayout>
    );
  }

  if (!sellerData && !isLoading) {
    return (
      <SellerLayout title="KYC Documents" description="Upload and manage your verification documents">
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-stone-200 rounded-2xl px-6">
          <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-2">Business Profile Required</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
            You must complete your core business profile settings before you can upload KYC verification documents.
          </p>
          <a
            href="/seller/profile"
            className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors"
          >
            Complete Business Profile
          </a>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout
      title="KYC Documents"
      description="Upload and manage your verification documents"
    >
      <div className="space-y-5">
        {/* KYC Status Banner */}
        {kycStatus && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              kycStatus === 'approved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : kycStatus === 'rejected' || kycStatus === 'suspended'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {kycStatus === 'approved' ? (
              <CheckCircle2 size={16} />
            ) : kycStatus === 'rejected' || kycStatus === 'suspended' ? (
              <AlertCircle size={16} />
            ) : (
              <Clock size={16} />
            )}
            <div className="flex flex-col">
              <p className="text-xs font-semibold">
                KYC Status:{' '}
                {kycStatus === 'approved'
                  ? 'Verified'
                  : kycStatus === 'rejected'
                  ? 'Rejected — please re-upload'
                  : kycStatus === 'documents_received'
                  ? 'Documents Received — awaiting review'
                  : kycStatus === 'under_review'
                  ? 'Under Review'
                  : kycStatus === 'suspended'
                  ? 'Suspended'
                  : 'Not Submitted'}
              </p>
              {kycStatus === 'rejected' && (sellerData as any)?.verificationRemarks && (
                <p className="text-[10px] text-red-600 mt-0.5">
                  Reason: {(sellerData as any).verificationRemarks}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Upload Card */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60">
              <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">
                Upload Document
              </h3>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-semibold mb-1.5">
                  Document Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/5 transition-all bg-white"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-stone-400">
                  <Info size={9} className="inline mr-0.5" />
                  {DOC_TYPES.find((t) => t.value === docType)?.hint}
                </p>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-stone-400 bg-stone-50'
                    : fileError
                    ? 'border-red-300 bg-red-50'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={18} className="text-emerald-500 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-stone-800 truncate max-w-[180px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setFileError('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-stone-400 hover:text-red-500 ml-1 shrink-0"
                      aria-label="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={22}
                      className={`mx-auto mb-2 ${isDragging ? 'text-stone-600' : 'text-stone-300'}`}
                    />
                    <p className="text-xs font-medium text-stone-500">
                      Drop file here or{' '}
                      <span className="text-stone-800 underline">browse</span>
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">PDF, JPG, PNG — max 5 MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              {fileError && (
                <p className="flex items-center gap-1 text-[11px] text-red-500">
                  <AlertCircle size={10} /> {fileError}
                </p>
              )}

              <button
                type="submit"
                disabled={uploadDoc.isPending || !selectedFile || !!fileError}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadDoc.isPending ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={12} /> Upload Document
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
              <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">
                Uploaded Documents
              </h3>
              <span className="text-[10px] text-stone-400">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-stone-50">
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck size={28} className="text-stone-200 mb-3" />
                  <p className="text-xs font-medium text-stone-500">No documents uploaded</p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Upload your first verification document
                  </p>
                </div>
              ) : (
                documents.map((doc: any) => {
                  const docId = doc.id ?? doc._id;
                  return (
                    <div key={docId} className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-stone-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 capitalize">
                          {(doc.type ?? 'document').replace(/_/g, ' ')}
                        </p>
                        <div className="mt-1">
                          <DocStatusBadge status={doc.status} />
                        </div>
                        {doc.rejectionReason && (
                          <p className="text-[10px] text-red-500 mt-1">{doc.rejectionReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                            title="View document"
                          >
                            <Eye size={13} />
                          </a>
                        )}
                        {doc.status !== 'verified' && (
                          <button
                            onClick={() => handleDelete(docId)}
                            disabled={deleteDoc.isPending}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove document"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
