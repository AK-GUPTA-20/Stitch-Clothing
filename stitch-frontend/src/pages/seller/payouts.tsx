import React, { useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useGetPayouts, useRequestPayout, useGetWallet } from '@/lib/hooks/useSeller';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function PayoutsPage() {
  const { data: payoutsData, isLoading: isLoadingPayouts } = useGetPayouts();
  const payouts = payoutsData?.payouts || [];
  const { data: wallet } = useGetWallet();
  const requestPayout = useRequestPayout();
  const [amount, setAmount] = useState('');

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return toast.error('Enter a valid amount');
    if (wallet && val > wallet.balance) return toast.error('Insufficient balance');

    requestPayout.mutate(val, {
      onSuccess: () => {
        toast.success('Payout requested successfully');
        setAmount('');
      },
      onError: () => toast.error('Failed to request payout'),
    });
  };

  if (isLoadingPayouts) return <SellerLayout title="Payouts"><div>Loading...</div></SellerLayout>;

  return (
    <SellerLayout title="Payouts" description="Manage your withdrawals and payout history.">
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Payout</CardTitle>
            <CardDescription>Available balance: ${wallet?.balance?.toFixed(2) || '0.00'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" disabled={requestPayout.isPending}>
                  Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts && payouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout: any) => (
                  <TableRow key={payout.id}>
                    <TableCell>{new Date(payout.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell>${payout.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payout.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payout.status}
                      </span>
                    </TableCell>
                    <TableCell>{payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No payouts found.</p>
          )}
        </CardContent>
      </Card>
    </SellerLayout>
  );
}
