import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  useAdminGetSellerById, 
  useAdminVerifySeller,
  useAdminSuspendSeller,
  useAdminUnsuspendSeller,
  useAdminUpdateCommission,
  useAdminUpdateLevel,
  useAdminAdjustWallet,
  useAdminVerifyBank,
  useAdminUpdateDocumentStatus,
  useAdminUpdatePayoutStatus
} from '@/lib/hooks/useAdminSeller';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminSellerDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useAuth();
  const { data: seller, isLoading } = useAdminGetSellerById(id as string);

  const verifySeller = useAdminVerifySeller();
  const suspendSeller = useAdminSuspendSeller();
  const unsuspendSeller = useAdminUnsuspendSeller();
  const updateCommission = useAdminUpdateCommission();
  const updateLevel = useAdminUpdateLevel();
  const adjustWallet = useAdminAdjustWallet();
  const verifyBank = useAdminVerifyBank();
  const updateDoc = useAdminUpdateDocumentStatus();
  const updatePayout = useAdminUpdatePayoutStatus();

  // State
  const [commissionRate, setCommissionRate] = useState('');
  const [level, setLevel] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  if (authLoading || isLoading) return <div className="p-8">Loading...</div>;
  if (!user || user.role !== 'admin') return <div className="p-8">Access Denied</div>;
  if (!seller) return <div className="p-8">Seller not found</div>;

  return (
    <AdminLayout title="Seller Details">
      <Head><title>Seller Details | Admin Dashboard</title></Head>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Controls */}
          <div className="flex justify-between items-center bg-white p-6 rounded-lg border shadow-sm">
            <div>
              <h1 className="text-2xl font-bold">{seller.businessName || 'Unnamed Business'}</h1>
              <p className="text-gray-500">
                Status: <span className="font-semibold uppercase text-sm px-2 py-1 bg-gray-100 rounded">
                  {seller.verificationStatus === 'not_submitted' ? 'Not Submitted' :
                   seller.verificationStatus === 'documents_received' ? 'Documents Received' :
                   seller.verificationStatus === 'under_review' ? 'Under Review' :
                   seller.verificationStatus === 'approved' ? 'Approved' :
                   seller.verificationStatus === 'rejected' ? 'Rejected' :
                   seller.verificationStatus === 'suspended' ? 'Suspended' :
                   seller.verificationStatus || 'Unknown'}
                </span> 
                {' '} | Level: <span className="font-semibold capitalize">{seller.sellerLevel || 'Bronze'}</span>
              </p>
            </div>
            <div className="flex space-x-3">
              {seller.verificationStatus !== 'approved' && (
                <Button variant="outline" onClick={() => verifySeller.mutate({ id: seller.id || seller._id, status: 'approved' }, { onSuccess: () => toast.success('Seller verified') })}>
                  Verify / Approve
                </Button>
              )}
              {seller.verificationStatus === 'suspended' ? (
                <Button variant="default" onClick={() => unsuspendSeller.mutate(seller.id || seller._id, { onSuccess: () => toast.success('Seller unsuspended') })}>
                  Unsuspend
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild><Button variant="destructive">Suspend</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Suspend Seller</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <Label>Reason</Label>
                      <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
                      <Button variant="destructive" onClick={() => {
                        suspendSeller.mutate({ id: seller.id, reason: suspendReason }, { onSuccess: () => toast.success('Seller suspended') })
                      }}>Confirm Suspend</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
              <TabsTrigger value="payouts">Payouts & Wallet</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p><strong>Business Name:</strong> {seller.businessName}</p>
                    <p><strong>Type:</strong> <span className="capitalize">{seller.businessType?.replace('_', ' ')}</span></p>
                    <p><strong>GST Number:</strong> {seller.gstNumber || 'N/A'}</p>
                    <p><strong>PAN Number:</strong> {seller.panNumber || 'N/A'}</p>
                    <p><strong>Phone:</strong> {seller.businessPhone || 'N/A'}</p>
                    <p><strong>Email:</strong> {seller.businessEmail || 'N/A'}</p>
                    <p><strong>Website:</strong> {seller.website || 'N/A'}</p>
                    {seller.businessAddress && (
                      <p><strong>Address:</strong> {seller.businessAddress.street}, {seller.businessAddress.city}, {seller.businessAddress.state} {seller.businessAddress.postalCode}, {seller.businessAddress.country}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Store Information</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p><strong>Store Name:</strong> {seller.store?.name || 'Not configured'}</p>
                    <p><strong>Description:</strong> {seller.store?.description || 'N/A'}</p>
                    <p><strong>Categories:</strong> {seller.store?.categories?.join(', ') || 'N/A'}</p>
                    <p><strong>Verified Store:</strong> {seller.store?.isVerified ? 'Yes' : 'No'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {seller.bankDetails ? (
                      <>
                        <p><strong>Bank:</strong> {seller.bankDetails.bankName}</p>
                        <p><strong>Account Holder:</strong> {seller.bankDetails.accountHolder}</p>
                        <p><strong>Account:</strong> {seller.bankDetails.accountNumber}</p>
                        <p><strong>IFSC:</strong> {seller.bankDetails.ifscCode}</p>
                        <p><strong>Type:</strong> <span className="capitalize">{seller.bankDetails.accountType}</span></p>
                        <p><strong>Status:</strong> {seller.bankDetails.isVerified ? <span className="text-green-600 font-semibold">Verified</span> : <span className="text-yellow-600 font-semibold">Unverified</span>}</p>
                        <div className="flex gap-2">
                          {!seller.bankDetails.isVerified && (
                            <Button size="sm" variant="outline" onClick={() => verifyBank.mutate({ id: seller.id || seller._id, status: 'verified' })}>Approve</Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500">No bank details added.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="mt-6">
                <Card>
                  <CardHeader><CardTitle>Warehouses</CardTitle></CardHeader>
                  <CardContent>
                    {seller.warehouses && seller.warehouses.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {seller.warehouses.map((wh: any) => (
                          <div key={wh.id || wh._id} className="border p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold">{wh.name} {wh.isDefault && <span className="text-xs bg-stone-900 text-white px-2 py-1 rounded ml-2">Default</span>}</h4>
                            <p className="text-sm text-gray-600 mt-1">{wh.address?.street}, {wh.address?.city}, {wh.address?.state} {wh.address?.postalCode}, {wh.address?.country}</p>
                            {wh.contactPhone && <p className="text-sm text-gray-500 mt-1">📞 {wh.contactPhone}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No warehouses configured.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="kyc">
              <Card>
                <CardHeader><CardTitle>Document Moderation</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seller.documents?.map((doc: any) => {
                        const docId = doc.id || doc._id;
                        return (
                          <TableRow key={docId}>
                            <TableCell>{doc.type}</TableCell>
                            <TableCell>{doc.status}</TableCell>
                            <TableCell>
                              <a href={doc.fileUrl || doc.url} target="_blank" rel="noreferrer" className="text-blue-500 underline">View</a>
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button size="sm" variant="outline" onClick={() => updateDoc.mutate({ id: seller.id || seller._id, docId, status: 'approved' })}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => updateDoc.mutate({ id: seller.id || seller._id, docId, status: 'rejected', reason: 'Invalid document' })}>Reject</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!seller.documents?.length && <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No documents found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Wallet Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">${seller.wallet?.balance?.toFixed(2) || '0.00'}</div>
                    <Dialog>
                      <DialogTrigger asChild><Button>Adjust Balance</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Adjust Wallet Balance</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Amount (use negative for deduction)</Label>
                            <Input type="number" step="0.01" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} />
                          </div>
                          <div>
                            <Label>Reason</Label>
                            <Input value={walletReason} onChange={e => setWalletReason(e.target.value)} />
                          </div>
                          <Button onClick={() => {
                            adjustWallet.mutate({ id: seller.id, amount: parseFloat(walletAmount), reason: walletReason }, {
                              onSuccess: () => { toast.success('Wallet adjusted'); setWalletAmount(''); setWalletReason(''); }
                            })
                          }}>Apply Adjustment</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Payout Requests</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seller.payouts?.map((payout: any) => (
                          <TableRow key={payout.id}>
                            <TableCell>${payout.amount}</TableCell>
                            <TableCell>{payout.status}</TableCell>
                            <TableCell className="space-x-2">
                              {payout.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => updatePayout.mutate({ id: seller.id, payoutId: payout.id, status: 'completed' })}>Mark Completed</Button>
                                  <Button size="sm" variant="destructive" onClick={() => updatePayout.mutate({ id: seller.id, payoutId: payout.id, status: 'failed' })}>Fail</Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Commission Rate</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Platform Commission (%)</Label>
                      <div className="flex gap-2 mt-2">
                        <Input type="number" defaultValue={seller.commissionRate || 10} onChange={e => setCommissionRate(e.target.value)} />
                        <Button onClick={() => updateCommission.mutate({ id: seller.id, commissionRate: parseFloat(commissionRate) })}>Update</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Seller Level</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Level (e.g. Standard, Premium, Enterprise)</Label>
                      <div className="flex gap-2 mt-2">
                        <Input defaultValue={seller.level || 'Standard'} onChange={e => setLevel(e.target.value)} />
                        <Button onClick={() => updateLevel.mutate({ id: seller.id, level })}>Update</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
    </AdminLayout>
  );
}
